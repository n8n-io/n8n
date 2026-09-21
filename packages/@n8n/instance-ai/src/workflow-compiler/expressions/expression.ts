import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

/**
 * Structural expressions. The planner and patterns build these instead of
 * free-form n8n expression strings so references can be checked statically
 * (does the node exist, can it run first, is the field known) before the
 * workflow is serialized.
 */
export type Expression =
	| { type: 'literal'; value?: unknown }
	/** A field on the output of an earlier IR step (`$('Node').item.json.path`). */
	| { type: 'field'; stepId: string; path: string[] }
	/** A field on the current item (`$json.path`). */
	| { type: 'input'; path: string[] }
	/** First non-null value. */
	| { type: 'coalesce'; values: Expression[] }
	/** String interpolation of literals and expressions. */
	| { type: 'template'; parts: Array<string | Expression> }
	/** Escape hatch for a reviewed raw n8n expression body (without `={{ }}`). */
	| { type: 'raw'; code: string };

export const expressionSchema: z.ZodType<Expression, z.ZodTypeDef, unknown> = z.lazy(() =>
	z.discriminatedUnion('type', [
		z.object({ type: z.literal('literal'), value: z.unknown() }),
		z.object({ type: z.literal('field'), stepId: z.string().min(1), path: z.array(z.string()) }),
		z.object({ type: z.literal('input'), path: z.array(z.string()) }),
		z.object({ type: z.literal('coalesce'), values: z.array(expressionSchema).min(1) }),
		z.object({
			type: z.literal('template'),
			parts: z.array(z.union([z.string(), expressionSchema])),
		}),
		z.object({ type: z.literal('raw'), code: z.string().min(1) }),
	]),
);

/** Marker wrapper so an expression can sit inside otherwise plain parameter JSON. */
export const expressionParamSchema = z.object({ $expr: expressionSchema });
export type ExpressionParam = z.infer<typeof expressionParamSchema>;

export function expr(expression: Expression): ExpressionParam {
	return { $expr: expression };
}

export function isExpressionParam(value: unknown): value is ExpressionParam {
	return (
		typeof value === 'object' &&
		value !== null &&
		'$expr' in value &&
		expressionSchema.safeParse(value.$expr).success
	);
}

export const field = (stepId: string, ...path: string[]): Expression => ({
	type: 'field',
	stepId,
	path,
});
export const input = (...path: string[]): Expression => ({ type: 'input', path });
export const literal = (value: unknown): Expression => ({ type: 'literal', value });
export const template = (...parts: Array<string | Expression>): Expression => ({
	type: 'template',
	parts,
});
export const coalesce = (...values: Expression[]): Expression => ({ type: 'coalesce', values });

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function compilePath(path: string[]): string {
	return path
		.map((segment) => (IDENTIFIER.test(segment) ? `.${segment}` : `[${JSON.stringify(segment)}]`))
		.join('');
}

/** Resolves an IR step id to the n8n node name it compiled to. */
export type StepNameResolver = (stepId: string) => string | undefined;

export class ExpressionCompileError extends Error {
	constructor(
		message: string,
		readonly stepId?: string,
	) {
		super(message);
		this.name = 'ExpressionCompileError';
	}
}

/** Compiles the expression body (the part inside `{{ }}`). */
export function compileExpressionBody(
	expression: Expression,
	resolveName: StepNameResolver,
): string {
	const body = (inner: Expression) => compileExpressionBody(inner, resolveName);
	switch (expression.type) {
		case 'literal':
			return JSON.stringify(expression.value ?? null);
		case 'field': {
			const nodeName = resolveName(expression.stepId);
			if (!nodeName) {
				const message = `Expression references unknown step "${expression.stepId}".`;
				throw new ExpressionCompileError(message, expression.stepId);
			}
			return `$(${JSON.stringify(nodeName)}).item.json${compilePath(expression.path)}`;
		}
		case 'input':
			return `$json${compilePath(expression.path)}`;
		case 'coalesce':
			return expression.values.map((value) => `(${body(value)})`).join(' ?? ');
		case 'template':
			return expression.parts
				.map((part) =>
					typeof part === 'string' ? JSON.stringify(part) : `String(${body(part)} ?? '')`,
				)
				.join(' + ');
		case 'raw':
			return expression.code;
	}
}

/**
 * Compiles an expression to an n8n parameter value: a plain literal stays a
 * literal, everything else becomes an `={{ ... }}` expression string.
 */
export function compileExpression(expression: Expression, resolveName: StepNameResolver): unknown {
	if (expression.type === 'literal') return expression.value;
	const wrap = (inner: Expression) => `{{ ${compileExpressionBody(inner, resolveName)} }}`;
	if (expression.type !== 'template') return `=${wrap(expression)}`;
	return `=${expression.parts.map((part) => (typeof part === 'string' ? part : wrap(part))).join('')}`;
}

/** Collects every step reference in an expression tree. */
export function referencedSteps(expression: Expression, into = new Set<string>()): Set<string> {
	if (expression.type === 'field') into.add(expression.stepId);
	if (expression.type === 'coalesce')
		for (const value of expression.values) referencedSteps(value, into);
	if (expression.type === 'template') {
		for (const part of expression.parts) if (typeof part !== 'string') referencedSteps(part, into);
	}
	return into;
}

/** Walks a parameter tree and compiles every embedded expression. */
export function compileParameterTree(value: unknown, resolveName: StepNameResolver): unknown {
	if (isExpressionParam(value)) return compileExpression(value.$expr, resolveName);
	if (Array.isArray(value)) return value.map((item) => compileParameterTree(item, resolveName));
	if (isRecord(value)) {
		const result: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value))
			result[key] = compileParameterTree(item, resolveName);
		return result;
	}
	return value;
}

/** Collects every step reference in a parameter tree. */
export function referencedStepsInTree(value: unknown, into = new Set<string>()): Set<string> {
	if (isExpressionParam(value)) return referencedSteps(value.$expr, into);
	if (Array.isArray(value)) for (const item of value) referencedStepsInTree(item, into);
	else if (isRecord(value)) {
		for (const item of Object.values(value)) referencedStepsInTree(item, into);
	}
	return into;
}

import { safeRegex } from 'n8n-workflow';

import type { AnySchema, Infer, JsonSchema } from './schema';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isExpression = (value: unknown) => typeof value === 'string' && value.startsWith('=');

function typeMatches(value: unknown, type: JsonSchema['type']): boolean {
	switch (type) {
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number';
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'array':
			return Array.isArray(value);
		case 'object':
			return isRecord(value);
		case 'null':
			return value === null;
		default:
			return true;
	}
}

const describe = (schema: JsonSchema) =>
	schema.enum
		? `one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`
		: (schema.type ?? 'a value');

const tagOf = (branch: JsonSchema, propertyName: string) =>
	branch.properties?.[propertyName]?.const;

/**
 * Validate a value against the JSON Schema subset contracts use. With `allowExpressions`,
 * any field except a discriminator or an `x-n8n-literal` field may hold a `={{ }}` string
 * (build time); at run time n8n has already resolved them.
 */
export function validate(
	value: unknown,
	schema: JsonSchema,
	options: { path?: string; allowExpressions?: boolean } = {},
): string[] {
	const issues: string[] = [];
	const visit = (current: unknown, node: JsonSchema, at: string): void => {
		if (current === undefined) return;
		if (options.allowExpressions && isExpression(current)) {
			if (node['x-n8n-literal']) issues.push(`${at}: must be a plain value, not an expression`);
			return;
		}
		if (node.oneOf && node.discriminator) {
			const name = node.discriminator.propertyName;
			const tag = isRecord(current) ? current[name] : undefined;
			const branch = node.oneOf.find((candidate) => tagOf(candidate, name) === tag);
			if (!branch) {
				const tags = node.oneOf.map((candidate) => JSON.stringify(tagOf(candidate, name)));
				issues.push(`${at}: needs "${name}" set to one of ${tags.join(', ')}`);
				return;
			}
			return visit(current, branch, at);
		}
		const union = node.anyOf ?? node.oneOf;
		if (union) {
			if (!union.some((option) => validate(current, option, options).length === 0)) {
				issues.push(`${at}: does not match any allowed shape`);
			}
			return;
		}
		if (node.const !== undefined && current !== node.const) {
			issues.push(`${at}: must be ${JSON.stringify(node.const)}`);
			return;
		}
		if (node.enum && !node.enum.includes(current)) {
			issues.push(`${at}: must be ${describe(node)}, got ${JSON.stringify(current)}`);
			return;
		}
		if (node.type && !typeMatches(current, node.type)) {
			issues.push(`${at}: must be ${describe(node)}, got ${JSON.stringify(current)}`);
			return;
		}
		if (typeof current === 'string') {
			if (node.minLength && current.length < node.minLength)
				issues.push(`${at}: must not be empty`);
			if (node.pattern && !safeRegex.test(node.pattern, current)) {
				issues.push(
					`${at}: ${JSON.stringify(current)} is not ${node['x-n8n-hint'] ?? node.pattern}`,
				);
			}
		}
		if (typeof current === 'number') {
			if (node.minimum !== undefined && current < node.minimum) {
				issues.push(`${at}: must be at least ${node.minimum}`);
			}
			if (node.maximum !== undefined && current > node.maximum) {
				issues.push(`${at}: must be at most ${node.maximum}`);
			}
		}
		if (Array.isArray(current)) {
			if (node.minItems && current.length < node.minItems) {
				issues.push(`${at}: needs at least ${node.minItems} item(s)`);
			}
			const items = node.items;
			if (items) current.forEach((item, index) => visit(item, items, `${at}[${index}]`));
			return;
		}
		if (!isRecord(current)) return;
		for (const key of node.required ?? []) {
			if (current[key] === undefined) issues.push(`${at}.${key}: is required`);
		}
		const unknown = Object.entries(current).flatMap(([key, child]) => {
			const property =
				node.properties?.[key] ??
				Object.entries(node.patternProperties ?? {}).find(([pattern]) =>
					safeRegex.test(pattern, key),
				)?.[1];
			if (property) visit(child, property, `${at}.${key}`);
			else if (isRecord(node.additionalProperties)) {
				visit(child, node.additionalProperties, `${at}.${key}`);
			} else if (node.additionalProperties === false) return [key];
			return [];
		});
		if (unknown.length > 0) {
			const known = Object.keys(node.properties ?? {}).join(', ');
			issues.push(`${at}: unknown field(s) ${unknown.join(', ')}. Allowed: ${known}`);
		}
	};
	visit(value, schema, options.path ?? 'input');
	return issues;
}

/** Type guard: `value` matches `schema`. */
export const matches = <S extends AnySchema>(schema: S, value: unknown): value is Infer<S> =>
	validate(value, schema.json).length === 0;

/** One plausible value for `schema`, for verification fixtures when a node declares none. */
export function exampleOf(schema: JsonSchema): unknown {
	if (schema.const !== undefined) return schema.const;
	if (schema.default !== undefined) return schema.default;
	if (schema.enum) return schema.enum[0];
	const union = schema.oneOf ?? schema.anyOf;
	if (union) {
		const first = union.find((option) => option.type !== 'null') ?? union[0];
		return first ? exampleOf(first) : null;
	}
	switch (schema.type) {
		case 'string':
			return schema.format === 'date' ? '2026-01-01' : 'example';
		case 'number':
		case 'integer':
			return 1;
		case 'boolean':
			return true;
		case 'null':
			return null;
		case 'array':
			return schema.items ? [exampleOf(schema.items)] : [];
		default:
			return Object.fromEntries(
				Object.entries(schema.properties ?? {}).map(([key, child]) => [key, exampleOf(child)]),
			);
	}
}

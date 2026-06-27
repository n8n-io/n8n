import { z } from 'zod';

import type {
	IntegrationAction,
	IntegrationActionDefinition,
	IntegrationContextQuery,
	IntegrationContextQueryDefinition,
	IntegrationToolOperationDefinition,
} from './integration-tool-types';

export interface RawContextToolOperation {
	query: IntegrationContextQuery;
	input: Record<string, unknown>;
}

export type RawContextToolInput = {
	query?: IntegrationContextQuery;
	input?: Record<string, unknown>;
	queries?: RawContextToolOperation[];
};

export interface RawActionToolOperation {
	action: IntegrationAction;
	input: Record<string, unknown>;
}

export type RawActionToolInput = {
	action?: IntegrationAction;
	input?: Record<string, unknown>;
	actions?: RawActionToolOperation[];
};

export const MAX_BATCH_OPERATIONS = 20;

export function buildContextInputSchema(definitions: IntegrationContextQueryDefinition[]) {
	const definitionsByName = toDefinitionMap(definitions);
	const querySchema = z.enum(toZodEnumValues(definitions.map((definition) => definition.name)));
	const operationSchema = z
		.object({
			query: querySchema,
			input: z.record(z.string(), z.unknown()),
		})
		.strict();

	return z
		.object({
			query: querySchema.optional(),
			input: z.record(z.string(), z.unknown()).optional(),
			queries: z.array(operationSchema).min(1).max(MAX_BATCH_OPERATIONS).optional(),
		})
		.strict()
		.superRefine((input, ctx) => {
			if (input.queries !== undefined) {
				if (input.query !== undefined || input.input !== undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Provide either query/input or queries, not both.',
					});
				}
				input.queries.forEach((operation, index) => {
					validateOperationSchema(definitionsByName, operation, ctx, ['queries', index]);
				});
				return;
			}

			if (input.query === undefined || input.input === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Provide query and input, or provide queries for a batch.',
				});
				return;
			}

			validateOperationSchema(definitionsByName, { query: input.query, input: input.input }, ctx);
		});
}

export function buildActionInputSchema(definitions: IntegrationActionDefinition[]) {
	const definitionsByName = toDefinitionMap(definitions);
	const actionSchema = z.enum(toZodEnumValues(definitions.map((definition) => definition.name)));
	const operationSchema = z
		.object({
			action: actionSchema,
			input: z.record(z.string(), z.unknown()),
		})
		.strict();

	return z
		.object({
			action: actionSchema.optional(),
			input: z.record(z.string(), z.unknown()).optional(),
			actions: z.array(operationSchema).min(1).max(MAX_BATCH_OPERATIONS).optional(),
		})
		.strict()
		.superRefine((input, ctx) => {
			if (input.actions !== undefined) {
				if (input.action !== undefined || input.input !== undefined) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: 'Provide either action/input or actions, not both.',
					});
				}
				input.actions.forEach((operation, index) => {
					validateOperationSchema(definitionsByName, operation, ctx, ['actions', index]);
				});
				return;
			}

			if (input.action === undefined || input.input === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Provide action and input, or provide actions for a batch.',
				});
				return;
			}

			validateOperationSchema(definitionsByName, { action: input.action, input: input.input }, ctx);
		});
}

export function toSingleContextOperation(input: RawContextToolInput): RawContextToolOperation {
	if (input.query === undefined || input.input === undefined) {
		throw new Error('Integration context tool input was not validated.');
	}
	return { query: input.query, input: input.input };
}

export function toSingleActionOperation(input: RawActionToolInput): RawActionToolOperation {
	if (input.action === undefined || input.input === undefined) {
		throw new Error('Integration action tool input was not validated.');
	}
	return { action: input.action, input: input.input };
}

function validateOperationSchema<TName extends string>(
	definitionsByName: Map<TName, IntegrationToolOperationDefinition<TName>>,
	operation:
		| { query: TName; input: Record<string, unknown> }
		| { action: TName; input: Record<string, unknown> },
	ctx: z.RefinementCtx,
	pathPrefix: Array<string | number> = [],
): void {
	const operationName = 'query' in operation ? operation.query : operation.action;
	const definition = definitionsByName.get(operationName);
	if (!definition) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: pathPrefix,
			message: `Unknown integration tool operation: ${operationName}`,
		});
		return;
	}
	const result = definition.inputSchema.safeParse(operation);
	if (!result.success) addSchemaIssues(ctx, result.error, pathPrefix);
}

function addSchemaIssues(
	ctx: z.RefinementCtx,
	error: z.ZodError,
	pathPrefix: Array<string | number> = [],
): void {
	for (const issue of error.issues) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: [...pathPrefix, ...issue.path],
			message: issue.message,
		});
	}
}

function toZodEnumValues<T extends string>(values: T[]): [T, ...T[]] {
	if (values.length === 0) {
		throw new Error('Integration tools require at least one operation.');
	}
	return values as [T, ...T[]];
}

function toDefinitionMap<TName extends string>(
	definitions: Array<IntegrationToolOperationDefinition<TName>>,
): Map<TName, IntegrationToolOperationDefinition<TName>> {
	const definitionsByName = new Map<TName, IntegrationToolOperationDefinition<TName>>();
	for (const definition of definitions) {
		if (definitionsByName.has(definition.name)) {
			throw new Error(`Duplicate integration tool operation definition: ${definition.name}`);
		}
		definitionsByName.set(definition.name, definition);
	}
	return definitionsByName;
}

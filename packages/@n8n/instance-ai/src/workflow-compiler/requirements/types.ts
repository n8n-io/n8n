import { z } from 'zod';

export const requirementSourceSchema = z.enum([
	'user',
	'workflow',
	'workspace',
	'policy',
	'decision',
	'default',
]);
export type RequirementSource = z.infer<typeof requirementSourceSchema>;

export const requirementValueSchema = z.discriminatedUnion('status', [
	z.object({ status: z.literal('resolved'), value: z.unknown(), source: requirementSourceSchema }),
	z.object({ status: z.literal('missing'), question: z.string() }),
	z.object({
		status: z.literal('ambiguous'),
		candidates: z.array(z.unknown()),
		question: z.string(),
	}),
]);
export type RequirementValue = z.infer<typeof requirementValueSchema>;

export const intentSchema = z.enum(['create', 'edit', 'debug']);
export type Intent = z.infer<typeof intentSchema>;

/** One thing the workflow must do, as decomposed from the request. */
export const requestedActionSchema = z.object({
	id: z.string(),
	/** Verb phrase from the request, e.g. "notify #sales in Slack". */
	text: z.string(),
	/** Integration hint when the text names one. */
	integration: z.string().optional(),
	/** Chosen registry operation once decided. */
	operationId: z.string().optional(),
	/** Semantic parameter values for the chosen operation. */
	params: z.record(z.string(), z.unknown()).default({}),
	/** The action only runs when a condition holds. */
	conditional: z.string().optional(),
});
export type RequestedAction = z.infer<typeof requestedActionSchema>;

export const requirementsSchema = z.object({
	intent: requirementValueSchema,
	trigger: requirementValueSchema,
	/** Trigger parameters keyed by semantic name (method, path, cron…). */
	triggerParams: z.record(z.string(), requirementValueSchema).default({}),
	actions: z.array(requestedActionSchema).default([]),
	respond: requirementValueSchema.optional(),
	responseFields: z.array(z.string()).default([]),
	requiredFields: z.array(z.string()).default([]),
	emailFields: z.array(z.string()).default([]),
	workflowName: requirementValueSchema,
	errorPolicy: requirementValueSchema,
	/** Extra values the user supplied through clarification, keyed by requirement path. */
	answers: z.record(z.string(), z.unknown()).default({}),
});
export type Requirements = z.infer<typeof requirementsSchema>;

export interface RequirementIssue {
	/** Requirement path, e.g. `triggerParams.path` or `actions.notify.channel`. */
	field: string;
	reason: string;
	question: string;
	/** Candidates when the requirement is ambiguous rather than missing. */
	candidates?: unknown[];
}

export function resolved<T>(value: T, source: RequirementSource): RequirementValue {
	return { status: 'resolved', value, source };
}

export function missing(question: string): RequirementValue {
	return { status: 'missing', question };
}

export function ambiguous(candidates: unknown[], question: string): RequirementValue {
	return { status: 'ambiguous', candidates, question };
}

export function valueOf<T>(
	requirement: RequirementValue | undefined,
	guard: (value: unknown) => value is T,
): T | undefined {
	return requirement?.status === 'resolved' && guard(requirement.value)
		? requirement.value
		: undefined;
}

export const isString = (value: unknown): value is string => typeof value === 'string';

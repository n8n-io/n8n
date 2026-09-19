import { z } from 'zod';

import { expressionSchema, type Expression } from '../expressions/expression';

/**
 * Workflow intermediate representation. The planner (patterns, decisions or a
 * generative fallback) produces this; the compiler turns it into n8n JSON.
 * Everything that determines order, branching, wiring and failure handling
 * lives here, so the n8n JSON is only a compiled artifact.
 */

export const credentialRefSchema = z.object({
	credentialType: z.string().min(1),
	credentialId: z.string().min(1).optional(),
	name: z.string().optional(),
});
export type CredentialRef = z.infer<typeof credentialRefSchema>;

export const operationRefSchema = z.object({
	/** Registry operation id, e.g. `slack.message.post`. */
	operationId: z.string().min(1),
});
export type OperationRef = z.infer<typeof operationRefSchema>;

export const errorPolicySchema = z.enum([
	'fail_workflow',
	'retry',
	'retry_exponential',
	'continue_marked',
	'continue_error_output',
	'dead_letter',
]);
export type ErrorPolicy = z.infer<typeof errorPolicySchema>;

export const retryPolicySchema = z.object({
	maxAttempts: z.number().int().min(1).max(10),
	backoff: z.enum(['fixed', 'exponential']),
	waitMs: z.number().int().min(0).max(300_000).default(1000),
});
export type RetryPolicy = z.infer<typeof retryPolicySchema>;

export const dataContractFieldSchema = z.object({
	name: z.string().min(1),
	type: z.enum(['string', 'number', 'boolean', 'object', 'array', 'unknown']).default('unknown'),
	nullable: z.boolean().default(false),
});
export const dataContractSchema = z.object({
	fields: z.array(dataContractFieldSchema),
	/** `one` for a single item, `many` when the producer emits a list of items. */
	cardinality: z.enum(['one', 'many']).default('many'),
});
export type DataContract = z.infer<typeof dataContractSchema>;

const comparisonOps = [
	'exists',
	'not_exists',
	'equals',
	'not_equals',
	'contains',
	'is_true',
	'is_false',
	'gt',
	'lt',
	'gte',
	'lte',
] as const;

export type ComparisonOp = (typeof comparisonOps)[number];

export interface ComparisonCondition {
	op: ComparisonOp;
	left: Expression;
	right?: Expression;
}

export interface CompoundCondition {
	op: 'and' | 'or';
	conditions: Condition[];
}

export type Condition = ComparisonCondition | CompoundCondition;

export function isCompoundCondition(condition: Condition): condition is CompoundCondition {
	return condition.op === 'and' || condition.op === 'or';
}

export const conditionSchema: z.ZodType<Condition, z.ZodTypeDef, unknown> = z.lazy(() =>
	z.union([
		z.object({
			op: z.enum(comparisonOps),
			left: expressionSchema,
			right: expressionSchema.optional(),
		}),
		z.object({ op: z.enum(['and', 'or']), conditions: z.array(conditionSchema).min(1) }),
	]),
);

/** Parameter values are plain JSON with `{ $expr }` wrappers for expressions. */
export const parametersSchema = z.record(z.string(), z.unknown());

const stepBase = {
	id: z.string().min(1),
	/** Human label, becomes the node name. Defaults to a name derived from the operation. */
	label: z.string().min(1).optional(),
	notes: z.string().optional(),
};

export const triggerKindSchema = z.enum([
	'webhook',
	'schedule',
	'manual',
	'form',
	'chat',
	'poll',
	'event',
]);

export const triggerIrSchema = z.object({
	...stepBase,
	kind: z.literal('trigger'),
	triggerKind: triggerKindSchema,
	operation: operationRefSchema,
	params: parametersSchema.default({}),
	credential: credentialRefSchema.optional(),
	outputContract: dataContractSchema.optional(),
});
export type TriggerIR = z.infer<typeof triggerIrSchema>;

export type StepIR =
	| TriggerIR
	| ActionIR
	| BranchIR
	| SwitchIR
	| ParallelIR
	| MapIR
	| CallWorkflowIR
	| RespondIR
	| TransformIR
	| ValidateIR
	| CodeIR
	| NoopIR;

export interface ActionIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'action';
	operation: OperationRef;
	params: Record<string, unknown>;
	credential?: CredentialRef;
	onError?: ErrorPolicy;
	retry?: RetryPolicy;
	outputContract?: DataContract;
}

export interface BranchIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'branch';
	condition: Condition;
	then: StepIR[];
	else: StepIR[];
}

export interface SwitchIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'switch';
	on: Expression;
	cases: Array<{ value: string; steps: StepIR[] }>;
	fallback?: StepIR[];
}

export interface ParallelIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'parallel';
	branches: StepIR[][];
	/** `all` joins the branches with a Merge node; `none` leaves them open. */
	join: 'all' | 'none';
}

export interface MapIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'map';
	batchSize: number;
	steps: StepIR[];
}

export interface CallWorkflowIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'call_workflow';
	/** Saved workflow id, or a bundle-local reference resolved at publish time. */
	workflowId?: string;
	workflowRef?: string;
	inputs: Record<string, unknown>;
	wait: boolean;
}

export interface RespondIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'respond';
	status: number;
	body: Record<string, unknown>;
}

export interface TransformIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'transform';
	fields: Record<string, unknown>;
	includeInput: boolean;
}

export interface ValidateIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'validate';
	rules: Array<{ field: string[]; rule: 'required' | 'email' | 'string' | 'number' | 'boolean' }>;
	/** `respond_400` needs a webhook trigger with `responseMode: responseNode`. */
	onInvalid: 'respond_400' | 'stop';
}

export interface CodeIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'code';
	language: 'javascript' | 'python';
	source: string;
	mode: 'all_items' | 'each_item';
}

export interface NoopIR {
	id: string;
	label?: string;
	notes?: string;
	kind: 'noop';
}

export const stepIrSchema: z.ZodType<StepIR, z.ZodTypeDef, unknown> = z.lazy(() =>
	z.discriminatedUnion('kind', [
		triggerIrSchema,
		z.object({
			...stepBase,
			kind: z.literal('action'),
			operation: operationRefSchema,
			params: parametersSchema.default({}),
			credential: credentialRefSchema.optional(),
			onError: errorPolicySchema.optional(),
			retry: retryPolicySchema.optional(),
			outputContract: dataContractSchema.optional(),
		}),
		z.object({
			...stepBase,
			kind: z.literal('branch'),
			condition: conditionSchema,
			then: z.array(stepIrSchema),
			else: z.array(stepIrSchema),
		}),
		z.object({
			...stepBase,
			kind: z.literal('switch'),
			on: expressionSchema,
			cases: z.array(z.object({ value: z.string(), steps: z.array(stepIrSchema) })).min(1),
			fallback: z.array(stepIrSchema).optional(),
		}),
		z.object({
			...stepBase,
			kind: z.literal('parallel'),
			branches: z.array(z.array(stepIrSchema)).min(2),
			join: z.enum(['all', 'none']),
		}),
		z.object({
			...stepBase,
			kind: z.literal('map'),
			batchSize: z.number().int().min(1),
			steps: z.array(stepIrSchema).min(1),
		}),
		z.object({
			...stepBase,
			kind: z.literal('call_workflow'),
			workflowId: z.string().optional(),
			workflowRef: z.string().optional(),
			inputs: parametersSchema.default({}),
			wait: z.boolean().default(true),
		}),
		z.object({
			...stepBase,
			kind: z.literal('respond'),
			status: z.number().int().min(100).max(599).default(200),
			body: parametersSchema.default({}),
		}),
		z.object({
			...stepBase,
			kind: z.literal('transform'),
			fields: parametersSchema,
			includeInput: z.boolean().default(true),
		}),
		z.object({
			...stepBase,
			kind: z.literal('validate'),
			rules: z
				.array(
					z.object({
						field: z.array(z.string()).min(1),
						rule: z.enum(['required', 'email', 'string', 'number', 'boolean']),
					}),
				)
				.min(1),
			onInvalid: z.enum(['respond_400', 'stop']),
		}),
		z.object({
			...stepBase,
			kind: z.literal('code'),
			language: z.enum(['javascript', 'python']),
			source: z.string().min(1),
			mode: z.enum(['all_items', 'each_item']).default('all_items'),
		}),
		z.object({ ...stepBase, kind: z.literal('noop') }),
	]),
);

export const workflowIrSchema = z.object({
	/** Bundle-local id, stable across compiles of the same plan. */
	id: z.string().min(1),
	name: z.string().min(1),
	description: z.string().optional(),
	triggers: z.array(triggerIrSchema).min(1),
	steps: z.array(stepIrSchema),
	errorPolicy: errorPolicySchema.default('fail_workflow'),
	/** Every workflow in a bundle that this one calls. */
	settings: z
		.object({
			executionOrder: z.enum(['v0', 'v1']).default('v1'),
			timezone: z.string().optional(),
			errorWorkflowRef: z.string().optional(),
		})
		.default({}),
	contract: z
		.object({ inputs: dataContractSchema.optional(), outputs: dataContractSchema.optional() })
		.optional(),
	/** Pattern ids that produced this workflow, for observability. */
	patternIds: z.array(z.string()).default([]),
});
export type WorkflowIR = z.infer<typeof workflowIrSchema>;

export const workflowDependencySchema = z.object({
	from: z.string().min(1),
	to: z.string().min(1),
	kind: z.enum(['call', 'event']),
});
export type WorkflowDependency = z.infer<typeof workflowDependencySchema>;

export const bundleIrSchema = z.object({
	workflows: z.array(workflowIrSchema).min(1),
	dependencies: z.array(workflowDependencySchema).default([]),
});
export type BundleIR = z.infer<typeof bundleIrSchema>;

/** Depth-first walk over every step (nested steps included). */
export function* walkSteps(steps: readonly StepIR[]): Generator<StepIR> {
	for (const step of steps) {
		yield step;
		switch (step.kind) {
			case 'branch':
				yield* walkSteps(step.then);
				yield* walkSteps(step.else);
				break;
			case 'switch':
				for (const c of step.cases) yield* walkSteps(c.steps);
				if (step.fallback) yield* walkSteps(step.fallback);
				break;
			case 'parallel':
				for (const branch of step.branches) yield* walkSteps(branch);
				break;
			case 'map':
				yield* walkSteps(step.steps);
				break;
			default:
				break;
		}
	}
}

export function allSteps(workflow: WorkflowIR): StepIR[] {
	return [...workflow.triggers, ...walkSteps(workflow.steps)];
}

/**
 * Config-based evaluation tool — create, read, and mutate an `EvaluationConfig`
 * attached to a workflow via the evaluation-config API. This is the simplified,
 * off-canvas eval form (name + start/end node + judged metrics + a Data Table
 * dataset), distinct from the on-canvas eval nodes the `evals` tool wires.
 *
 * The dataset is a Data Table the agent creates/populates via the `data-tables`
 * tool; here it is only linked by id.
 */
import { Tool } from '@n8n/agents';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, UpsertEvaluationConfigInput } from '../../types';
import { EVAL_CONFIG_TOOL_ID } from '../tool-ids';

export { EVAL_CONFIG_TOOL_ID };

// ── Shared schemas ───────────────────────────────────────────────────────────

const metricInputSchema = z.object({
	name: z.string().min(1).describe('Human-readable metric name, e.g. "Correctness"'),
	preset: z
		.enum(['correctness', 'helpfulness'])
		.describe(
			'Judged metric preset. "correctness" compares the answer to an expected answer (requires expectedAnswer); "helpfulness" judges the answer against the user query (requires userQuery).',
		),
	provider: z.string().min(1).describe('LLM judge provider, e.g. "openai" or "anthropic"'),
	credentialId: z.string().min(1).describe('Credential id for the LLM judge model'),
	model: z.string().min(1).describe('LLM judge model name, e.g. "gpt-4o"'),
	outputType: z
		.enum(['numeric', 'boolean'])
		.default('numeric')
		.describe('Score type the judge returns'),
	actualAnswer: z
		.string()
		.min(1)
		.describe(
			"n8n expression resolving to the workflow's produced answer, e.g. {{ $json.output }}",
		),
	userQuery: z
		.string()
		.optional()
		.describe('n8n expression for the user query (required for the "helpfulness" preset)'),
	expectedAnswer: z
		.string()
		.optional()
		.describe(
			'n8n expression for the expected/ground-truth answer (required for the "correctness" preset)',
		),
	prompt: z.string().optional().describe('Optional override for the judge prompt'),
});

const configFields = {
	name: z.string().min(1).describe('Evaluation name'),
	startNodeName: z
		.string()
		.min(1)
		.describe('Name of the node where the evaluation run begins (fed the test input)'),
	endNodeName: z.string().min(1).describe('Name of the node whose output is judged'),
	dataTableId: z
		.string()
		.min(1)
		.describe(
			'Id of the Data Table holding the test dataset (create/populate it via data-tables first)',
		),
	metrics: z.array(metricInputSchema).min(1).describe('One or more judged metrics'),
};

const listAction = z.object({
	action: z.literal('list').describe('List config-based evaluations on a workflow'),
	workflowId: z.string().min(1),
});

const getAction = z.object({
	action: z.literal('get').describe('Get a single config-based evaluation'),
	workflowId: z.string().min(1),
	configId: z.string().min(1),
});

const createAction = z.object({
	action: z.literal('create').describe('Create a config-based evaluation on a workflow'),
	workflowId: z.string().min(1),
	...configFields,
});

const updateAction = z.object({
	action: z.literal('update').describe('Update an existing config-based evaluation'),
	workflowId: z.string().min(1),
	configId: z.string().min(1),
	...configFields,
});

const deleteAction = z.object({
	action: z.literal('delete').describe('Delete a config-based evaluation'),
	workflowId: z.string().min(1),
	configId: z.string().min(1),
});

const allActions = [listAction, getAction, createAction, updateAction, deleteAction] as const;

type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

const confirmationSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const confirmationResumeSchema = z.object({
	approved: z.boolean(),
});

type ResumeData = z.infer<typeof confirmationResumeSchema>;

interface ConfirmationToolContext {
	resumeData: ResumeData | undefined;
	suspend: (payload: z.infer<typeof confirmationSuspendSchema>) => Promise<never>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const UNAVAILABLE = {
	error: 'Config-based evaluations are not available on this instance.',
} as const;

/** Tool input for create/update is structurally the service payload. */
function toUpsertInput(
	input: Extract<FullInput, { action: 'create' | 'update' }>,
): UpsertEvaluationConfigInput {
	return {
		name: input.name,
		startNodeName: input.startNodeName,
		endNodeName: input.endNodeName,
		dataTableId: input.dataTableId,
		metrics: input.metrics,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleList(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'list' }>,
) {
	const service = context.evaluationConfigService;
	if (!service) return UNAVAILABLE;
	const configs = await service.list(input.workflowId);
	return { configs };
}

async function handleGet(context: InstanceAiContext, input: Extract<FullInput, { action: 'get' }>) {
	const service = context.evaluationConfigService;
	if (!service) return UNAVAILABLE;
	const config = await service.get(input.workflowId, input.configId);
	if (!config) return { error: `Evaluation config "${input.configId}" not found` };
	return { config };
}

async function handleCreate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'create' }>,
	ctx: ConfirmationToolContext,
) {
	const service = context.evaluationConfigService;
	if (!service) return UNAVAILABLE;

	const resumeData = ctx.resumeData;
	if (resumeData === undefined || resumeData === null) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Set up evaluation "${input.name}"`,
			severity: 'info' as const,
		});
	}
	if (!resumeData.approved) return { denied: true, reason: 'User denied the action' };

	try {
		const config = await service.create(input.workflowId, toUpsertInput(input));
		return { config };
	} catch (error) {
		return { error: errorMessage(error) };
	}
}

async function handleUpdate(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'update' }>,
	ctx: ConfirmationToolContext,
) {
	const service = context.evaluationConfigService;
	if (!service) return UNAVAILABLE;

	const resumeData = ctx.resumeData;
	if (resumeData === undefined || resumeData === null) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Update evaluation "${input.name}"`,
			severity: 'warning' as const,
		});
	}
	if (!resumeData.approved) return { denied: true, reason: 'User denied the action' };

	try {
		const config = await service.update(input.workflowId, input.configId, toUpsertInput(input));
		return { config };
	} catch (error) {
		return { error: errorMessage(error) };
	}
}

async function handleDelete(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'delete' }>,
	ctx: ConfirmationToolContext,
) {
	const service = context.evaluationConfigService;
	if (!service) return { success: false, ...UNAVAILABLE };

	const resumeData = ctx.resumeData;
	if (resumeData === undefined || resumeData === null) {
		return await ctx.suspend({
			requestId: nanoid(),
			message: `Delete evaluation "${input.configId}"`,
			severity: 'destructive' as const,
		});
	}
	if (!resumeData.approved)
		return { success: false, denied: true, reason: 'User denied the action' };

	await service.delete(input.workflowId, input.configId);
	return { success: true };
}

// ── Tool factory ─────────────────────────────────────────────────────────────

export function createEvalConfigTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(EVAL_CONFIG_TOOL_ID)
		.description(
			'Manage configuration-based evaluations on a workflow. ' +
				'A config-based eval attaches a name, a start/end node, judged metrics, and a Data Table ' +
				'dataset to the workflow via the evaluation-config API (no eval nodes are added to the canvas). ' +
				'Create/populate the dataset Data Table with the data-tables tool first, then link it by id.',
		)
		.input(inputSchema)
		.suspend(confirmationSuspendSchema)
		.resume(confirmationResumeSchema)
		.handler(async (input: FullInput, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'get':
					return await handleGet(context, input);
				case 'create':
					return await handleCreate(context, input, ctx);
				case 'update':
					return await handleUpdate(context, input, ctx);
				case 'delete':
					return await handleDelete(context, input, ctx);
				default:
					// Defensive: the input schema is a discriminated union, so this is
					// unreachable for validated input — guards against an unknown action.
					return { error: 'Unknown eval-config action' };
			}
		})
		.build();
}

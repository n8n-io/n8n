/**
 * Consolidated executions tool — list, get, run, debug, get-node-output, stop.
 */
import { createTool } from '@mastra/core/tools';
import { instanceAiConfirmationSeveritySchema } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_TIMEOUT_MS = 600_000;

// ── Action schemas ─────────────────────────────────────────────────────────

const listAction = z.object({
	action: z.literal('list').describe('List recent workflow executions'),
	workflowId: z.string().optional().describe('Workflow ID'),
	status: z
		.string()
		.optional()
		.describe('Filter by status (e.g. "success", "error", "running", "waiting")'),
	limit: z
		.number()
		.int()
		.positive()
		.max(100)
		.optional()
		.describe('Max results to return (default 20)'),
});

const getAction = z.object({
	action: z.literal('get').describe('Get execution status without blocking (poll running ones)'),
	executionId: z.string().describe('Execution ID'),
});

const runAction = z.object({
	action: z.literal('run').describe('Execute a workflow and wait for completion'),
	workflowId: z.string().describe('Workflow ID'),
	inputData: z
		.record(z.unknown())
		.optional()
		.describe(
			'Input data passed to the workflow trigger. Works for ANY trigger type — ' +
				'the system injects inputData as the trigger node output, bypassing the need for a real event. ' +
				'For webhook triggers, inputData is the request body (do NOT wrap in { body: ... }). ' +
				'For event-based triggers (e.g. Linear, GitHub, Slack), pass inputData matching ' +
				'the shape the trigger would emit (e.g. { action: "create", data: { ... } }).',
		),
	timeout: z
		.number()
		.int()
		.min(1000)
		.max(MAX_TIMEOUT_MS)
		.optional()
		.describe('Max wait time in milliseconds (default 300000, max 600000)'),
});

const debugAction = z.object({
	action: z.literal('debug').describe('Analyze a failed execution with structured diagnostics'),
	executionId: z.string().describe('Execution ID'),
});

const getNodeOutputAction = z.object({
	action: z
		.literal('get-node-output')
		.describe('Retrieve raw output of a specific node from an execution'),
	executionId: z.string().describe('Execution ID'),
	nodeName: z.string().describe('Name of the node whose output to retrieve'),
	startIndex: z.number().int().min(0).optional().describe('Item index to start from (default 0)'),
	maxItems: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.describe('Maximum number of items to return (default 10, max 50)'),
});

const stopAction = z.object({
	action: z.literal('stop').describe('Cancel a running workflow execution'),
	executionId: z.string().describe('Execution ID'),
});

const inputSchema = sanitizeInputSchema(
	z.discriminatedUnion('action', [
		listAction,
		getAction,
		runAction,
		debugAction,
		getNodeOutputAction,
		stopAction,
	]),
);

type Input = z.infer<typeof inputSchema>;

// ── Suspend / resume schemas (used by `run`) ───────────────────────────────

const suspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
});

const resumeSchema = z.object({
	approved: z.boolean(),
});

// ── Handlers ───────────────────────────────────────────────────────────────

async function handleList(context: InstanceAiContext, input: Extract<Input, { action: 'list' }>) {
	const executions = await context.executionService.list({
		workflowId: input.workflowId,
		status: input.status,
		limit: input.limit,
	});
	return { executions };
}

async function handleGet(context: InstanceAiContext, input: Extract<Input, { action: 'get' }>) {
	return await context.executionService.getStatus(input.executionId);
}

async function handleRun(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'run' }>,
	resumeData: z.infer<typeof resumeSchema> | undefined,
	suspend: ((payload: z.infer<typeof suspendSchema>) => Promise<void>) | undefined,
) {
	if (context.permissions?.runWorkflow === 'blocked') {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'Action blocked by admin',
		};
	}

	const needsApproval = context.permissions?.runWorkflow !== 'always_allow';

	// If approval is required and this is the first call, suspend for confirmation
	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		const workflowName = await context.workflowService
			.get(input.workflowId)
			.then((wf) => wf.name)
			.catch(() => input.workflowId);
		await suspend?.({
			requestId: nanoid(),
			message: `Execute workflow "${workflowName}" (ID: ${input.workflowId})?`,
			severity: 'warning' as const,
		});
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'Awaiting confirmation',
		};
	}

	// If resumed with denial
	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return {
			executionId: '',
			status: 'error' as const,
			denied: true,
			reason: 'User denied the action',
		};
	}

	// Approved or always_allow — execute
	return await context.executionService.run(input.workflowId, input.inputData, {
		timeout: input.timeout,
	});
}

async function handleDebug(context: InstanceAiContext, input: Extract<Input, { action: 'debug' }>) {
	return await context.executionService.getDebugInfo(input.executionId);
}

async function handleGetNodeOutput(
	context: InstanceAiContext,
	input: Extract<Input, { action: 'get-node-output' }>,
) {
	return await context.executionService.getNodeOutput(input.executionId, input.nodeName, {
		startIndex: input.startIndex,
		maxItems: input.maxItems,
	});
}

async function handleStop(context: InstanceAiContext, input: Extract<Input, { action: 'stop' }>) {
	return await context.executionService.stop(input.executionId);
}

// ── Tool factory ───────────────────────────────────────────────────────────

export function createExecutionsTool(context: InstanceAiContext) {
	return createTool({
		id: 'executions',
		description:
			'Manage workflow executions — list, inspect, run, debug, get node output, and stop.',
		inputSchema,
		suspendSchema,
		resumeSchema,
		execute: async (input: Input, ctx) => {
			switch (input.action) {
				case 'list':
					return await handleList(context, input);
				case 'get':
					return await handleGet(context, input);
				case 'run': {
					const resumeData = ctx?.agent?.resumeData as z.infer<typeof resumeSchema> | undefined;

					const suspend = ctx?.agent?.suspend as
						| ((payload: z.infer<typeof suspendSchema>) => Promise<void>)
						| undefined;
					return await handleRun(context, input, resumeData, suspend);
				}
				case 'debug':
					return await handleDebug(context, input);
				case 'get-node-output':
					return await handleGetNodeOutput(context, input);
				case 'stop':
					return await handleStop(context, input);
			}
		},
	});
}

import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { Mock, MockedFunction } from 'vitest';

vi.mock('../generate-tool-ref-pin-data.service', () => ({
	generateToolRefPinData: vi.fn().mockResolvedValue({}),
}));

import type { InstanceAiContext } from '../../../types';
import { createEvalsTool } from '../evals.tool';
import { generateToolRefPinData } from '../generate-tool-ref-pin-data.service';

const mockGenerateToolRefPinData = generateToolRefPinData as MockedFunction<
	typeof generateToolRefPinData
>;

/** Minimal AI workflow: trigger + agent node. Agent references $json.user_query. */
function aiWf(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: '1',
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.user_query }}' },
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

/** AI workflow whose agent has an ai_tool connection (triggers tool_use default metric). */
function aiWfWithTools(): WorkflowJSON {
	return {
		name: 'AI Flow With Tools',
		nodes: [
			{
				id: '1',
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.user_query }}' },
			},
			{
				id: '3',
				name: 'SomeTool',
				type: '@n8n/n8n-nodes-langchain.toolCode',
				typeVersion: 1,
				position: [200, 200],
				parameters: {},
			},
		],
		connections: {
			SomeTool: {
				ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]],
			},
		},
	} as unknown as WorkflowJSON;
}

/** Workflow with EvaluationTrigger wired to a DataTable. */
function evalConfiguredWf(): WorkflowJSON {
	return {
		name: 'Eval Flow',
		nodes: [
			{
				id: '1',
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.user_query }}' },
			},
			{
				id: '3',
				name: 'Eval Trigger',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				position: [0, -200],
				parameters: { dataTableId: { mode: 'id', value: 'dt-existing' } },
			},
		],
		connections: {
			'Eval Trigger': {
				main: [[{ node: 'Agent', type: 'main', index: 0 }]],
			},
		},
	} as unknown as WorkflowJSON;
}

/** AI workflow where the agent reads from a named node ref: $('Voice or Text').item.json.text */
function aiWfWithNamedRef(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: '1',
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: "={{ $('Voice or Text').item.json.text }}" },
			},
			{
				id: '3',
				name: 'Voice or Text',
				type: 'n8n-nodes-base.set',
				typeVersion: 3,
				position: [-200, 0],
				parameters: {},
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

/** AI workflow where the agent reads both a direct $json ref and a named-node ref. */
function aiWfWithDirectAndNamedRef(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: '1',
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: '2',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: {
					text: '={{ $json.user_query }}',
					systemMessage: "={{ $('Memory').item.json.context }}",
				},
			},
			{
				id: '3',
				name: 'Memory',
				type: 'n8n-nodes-base.set',
				typeVersion: 3,
				position: [-200, 0],
				parameters: {},
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

function aiWfWithMultipleAgents(): WorkflowJSON {
	return {
		name: 'Multi AI Flow',
		nodes: [
			{
				id: '1',
				name: 'First Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [0, 0],
				parameters: { text: '={{ $json.first_input }}' },
			},
			{
				id: '2',
				name: 'Second Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.second_input }}' },
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

function makeCtx(
	wf: WorkflowJSON,
	dataTableOverrides?: Partial<InstanceAiContext['dataTableService']>,
): InstanceAiContext {
	return {
		userId: 'u1',
		workflowService: {
			getAsWorkflowJSON: vi.fn().mockResolvedValue(wf),
			updateFromWorkflowJSON: vi.fn().mockResolvedValue({
				id: 'w1',
				versionId: 'v-1',
				checksum: 'checksum-1',
			}),
		},
		dataTableService: {
			create: vi.fn().mockResolvedValue({
				id: 'dt-new',
				name: 'AI Flow — eval samples',
				projectId: 'p-from-service',
				columns: [],
			}),
			insertRows: vi.fn().mockResolvedValue({
				insertedCount: 0,
				dataTableId: 'dt-new',
				tableName: 'x',
				projectId: 'p',
			}),
			queryRows: vi.fn().mockResolvedValue({ count: 0, data: [] }),
			...dataTableOverrides,
		},
		executionService: {} as never,
		credentialService: {} as never,
		nodeService: {} as never,
		logger: {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn(),
		},
	} as unknown as InstanceAiContext;
}

// ── action: offer ──────────────────────────────────────────────────────────

describe('evalsTool — action: offer (eligibility precheck + chat message)', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns eligible:false with reason no-ai-nodes and never suspends for a non-AI workflow', async () => {
		const wf = {
			name: 'Plain',
			nodes: [
				{
					id: '1',
					name: 'T',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const ctx = makeCtx(wf);
		const tool = createEvalsTool(ctx);
		const suspend = vi.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'no-ai-nodes' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns eligible:false with reason already-configured when EvaluationTrigger is present', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);
		const suspend = vi.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'already-configured' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns eligible:true with aiNodeNames and a chat-ready message, never suspends', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = vi.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			eligible: true,
			aiNodeNames: ['Agent'],
		});
		expect(result.message).toEqual(expect.stringMatching(/test cases/i));
	});

	it('asks for a target agent when the workflow has multiple AI nodes', async () => {
		const ctx = makeCtx(aiWfWithMultipleAgents());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			eligible: true,
			requiresTargetAgentSelection: true,
			aiNodeNames: ['First Agent', 'Second Agent'],
		});
		expect(result.message).toEqual(expect.stringMatching(/which AI node/i));
	});
});

// ── action: recommend-metric ───────────────────────────────────────────────

describe('evals tool — recommend-metric action', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns { approved: true, metricId } when user approves the recommendation', async () => {
		// Agent has ai_tool connection → recommended is 'tool_use'
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'recommend-metric', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ approved: true, metricId: 'tool_use' });
	});

	it('returns { approved: false } when user denies, so the orchestrator can fall back to select-metrics', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'recommend-metric', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ approved: false });
	});

	it('suspends with a confirmation widget naming the recommended metric on first call', async () => {
		// Plain agent (no tools / retrievers) → recommended is 'correctness'
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = vi.fn();

		await tool.handler!({ action: 'recommend-metric', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: 'info',
				requestId: expect.any(String) as unknown,
				message: expect.stringContaining('Correctness') as unknown,
			}),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.not.objectContaining({ inputType: expect.anything() as unknown }),
		);
	});
});

// ── action: select-metrics ─────────────────────────────────────────────────

describe('evals tool — select-metrics action', () => {
	beforeEach(() => vi.clearAllMocks());

	it('returns the workflow-default metric ids when user approves with default selections', async () => {
		// Agent has ai_tool connection → defaults are ['correctness', 'tool_use']
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: ['Correctness', 'Tool use'] }],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({
			chosenMetricIds: ['correctness', 'tool_use'],
			answers: [{ questionId: 'q1', selectedOptions: ['Correctness', 'Tool use'] }],
		});
	});

	it('maps recommended option labels with descriptions back to metric ids', async () => {
		type SelectMetricsSuspendPayload = {
			questions: Array<{ options?: string[] }>;
		};
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);
		const suspend = vi
			.fn<(...args: [SelectMetricsSuspendPayload]) => Promise<void>>()
			.mockResolvedValue(undefined);

		await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		const payload = suspend.mock.calls[0]?.[0];
		if (!payload) {
			throw new Error('Expected metric selection payload');
		}
		const recommendedToolUseOption = payload.questions[0]?.options?.find((option) =>
			option.startsWith('Tool use (recommended) — '),
		);
		if (!recommendedToolUseOption) {
			throw new Error('Expected recommended tool-use option');
		}

		const answers = [{ questionId: 'q1', selectedOptions: [recommendedToolUseOption] }];
		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true, answers } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({
			chosenMetricIds: ['tool_use'],
			answers,
		});
	});

	it('falls back to ["correctness"] when user dismisses the widget (resumeData.approved=false)', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ chosenMetricIds: ['correctness'], answers: [] });
	});

	it('falls back to ["correctness"] when user submits empty selection', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: {
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: [] }],
				},
			},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({
			chosenMetricIds: ['correctness'],
			answers: [{ questionId: 'q1', selectedOptions: [] }],
		});
	});

	it('returns skipped when workflow has no AI nodes', async () => {
		const wf = {
			name: 'Plain',
			nodes: [
				{
					id: '1',
					name: 'T',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const ctx = makeCtx(wf);
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'no-ai-nodes' });
	});

	it('builds option labels with workflow-specific descriptions and a recommendation marker', async () => {
		const workflow: WorkflowJSON = {
			name: 'Chef Workflow',
			nodes: [
				{
					id: 't',
					name: 'Trigger',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'a',
					name: 'Chef Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
				{
					id: 'c',
					name: 'Calculator',
					type: '@n8n/n8n-nodes-langchain.toolCalculator',
					typeVersion: 1,
					position: [400, 0],
					parameters: {},
				},
			],
			connections: {
				Calculator: { ai_tool: [[{ node: 'Chef Agent', type: 'ai_tool', index: 0 }]] },
			},
		} as unknown as WorkflowJSON;
		const ctx = makeCtx(workflow);
		const tool = createEvalsTool(ctx);
		const suspend = vi.fn();
		await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				questions: [
					expect.objectContaining({
						options: expect.arrayContaining([
							expect.stringMatching(/^Correctness.*Chef Agent/) as unknown,
							expect.stringMatching(/Tool use.*recommended.*Calculator/) as unknown,
						]) as unknown,
					}),
				],
			}),
		);
	});
});

// ── action: propose (changed) ──────────────────────────────────────────────

describe('evals tool — propose action (changed)', () => {
	beforeEach(() => vi.clearAllMocks());

	it('creates an EMPTY data table by default and never inserts rows', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', projectId: 'p1', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		// dataTableService.create is called — creates empty table
		expect(ctx.dataTableService.create).toHaveBeenCalledTimes(1);
		// columns include the agent input and the expected output required by correctness
		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'AI Flow — eval samples',
			[
				{ name: 'user_query', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			{ projectId: 'p1' },
		);

		// insertRows must NOT be called
		expect(ctx.dataTableService.insertRows).not.toHaveBeenCalled();

		expect(result).toMatchObject({
			success: true,
			shouldDelegateToEvalSetupAgent: true,
			workflowId: 'w1',
			projectId: 'p1',
			dataTableId: 'dt-new',
		});
	});

	it('returns a structured `table` artifact when create-empty creates a new table', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', projectId: 'p1', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(result.table).toEqual({
			id: 'dt-new',
			name: 'AI Flow — eval samples',
			// projectId comes from the DataTable service's response (authoritative),
			// not just from input.projectId — so the artifacts panel can fetch the
			// table even when the orchestrator didn't pass projectId.
			projectId: 'p-from-service',
		});
	});

	it('uses input.projectId when the DataTable service does not return one', async () => {
		const ctx = makeCtx(aiWf(), {
			create: vi.fn().mockResolvedValue({
				id: 'dt-new',
				name: 'AI Flow — eval samples',
				columns: [],
				// no projectId on the service response
			}),
		});
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', projectId: 'p-input', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(result.table).toMatchObject({ projectId: 'p-input' });
	});

	it('omits `table` when datasetChoice is link-existing (we did not produce it)', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{
				action: 'propose',
				workflowId: 'w1',
				projectId: 'p1',
				metrics: ['correctness'],
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-old',
			},
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(result.table).toBeUndefined();
		expect(result.dataTableId).toBe('dt-old');
	});

	it('drops unknown metric ids', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{
				action: 'propose',
				workflowId: 'w1',
				metrics: ['correctness', 'nope', 'tool_use'],
			},
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('Correctness');
		expect(task).toContain('Tool use');
		expect(task).not.toContain('nope');
	});

	it('falls back to ["correctness"] when metrics is empty', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: [] }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		const task = result.task as string;
		expect(task).toContain('Correctness');
	});

	it('returns skipped when no AI nodes', async () => {
		const wf = {
			name: 'Plain',
			nodes: [
				{
					id: '1',
					name: 'T',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
			],
			connections: {},
		} as unknown as WorkflowJSON;
		const ctx = makeCtx(wf);
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'Workflow has no AI/LLM nodes.' });
	});

	it('returns skipped when EvaluationTrigger already exists', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			skipped: true,
			reason: expect.stringMatching(/already/i) as unknown,
		});
	});

	it('uses existingDataTableId without creating a new table when datasetChoice="link-existing"', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{
				action: 'propose',
				workflowId: 'w1',
				datasetChoice: 'link-existing',
				existingDataTableId: 'dt-old',
				metrics: ['correctness'],
			},
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: true,
			shouldDelegateToEvalSetupAgent: true,
			dataTableId: 'dt-old',
		});
		const task = result.task as string;
		expect(task).toContain('dt-old');
	});

	it('does not create a table when datasetChoice="later"', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', datasetChoice: 'later', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(result).not.toHaveProperty('dataTableId');
		const task = result.task as string;
		expect(task).toContain('Do not create a DataTable');
	});

	it('rejects datasetChoice="link-existing" when existingDataTableId is missing', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', datasetChoice: 'link-existing' },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(result).toEqual({
			skipped: true,
			reason: 'existing-data-table-id-required',
		});
	});

	it('requires targetAgentNodeName when proposing evals for a multi-agent workflow', async () => {
		const ctx = makeCtx(aiWfWithMultipleAgents());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			skipped: true,
			reason: 'target-agent-required',
			aiNodeNames: ['First Agent', 'Second Agent'],
		});
	});

	it('uses targetAgentNodeName to analyze the selected agent in a multi-agent workflow', async () => {
		const ctx = makeCtx(aiWfWithMultipleAgents());
		const tool = createEvalsTool(ctx);

		await tool.handler!(
			{
				action: 'propose',
				workflowId: 'w1',
				targetAgentNodeName: 'Second Agent',
				metrics: ['correctness'],
			},
			{ agent: {} } as never,
		);

		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'second_input', type: 'string' }]) as unknown,
			undefined,
		);
		expect(ctx.dataTableService.create).not.toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'first_input', type: 'string' }]) as unknown,
			undefined,
		);
	});
});

// ── action: offer with named refs ──────────────────────────────────────────

describe('evals tool — offer with named refs', () => {
	beforeEach(() => vi.clearAllMocks());

	it('expands the offer message with disclosure when agent has named refs', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: undefined },
		} as never)) as { message: string };

		expect(result.message).toMatch(/This workflow uses AI node/);
		expect(result.message).toMatch(/Voice or Text/);
		expect(result.message).toMatch(/Set node/);
		expect(result.message).toMatch(/`text`/);
	});

	it('keeps the offer message short when no named refs are present', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: undefined },
		} as never)) as { message: string };

		expect(result.message).not.toMatch(/Set node/);
		expect(result.message).not.toMatch(/route that data/);
	});
});

// ── action: propose with named refs ───────────────────────────────────────

/** AI workflow whose memory tool reads a chat_id from a Telegram trigger. */
function aiWfWithToolRef(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: 't',
				name: 'Telegram Trigger',
				type: 'n8n-nodes-base.telegramTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: { updates: ['message'] },
			},
			{
				id: 'a',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.user_query }}' },
			},
			{
				id: 'm',
				name: 'Postgres Memory',
				type: '@n8n/n8n-nodes-langchain.memoryPostgres',
				typeVersion: 1,
				position: [200, 200],
				parameters: { sessionIdExpression: "={{ $('Telegram Trigger').item.json.chat_id }}" },
			},
		],
		connections: {
			'Postgres Memory': { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
		},
	} as unknown as WorkflowJSON;
}

function aiWfWithTwoToolRefs(): WorkflowJSON {
	return {
		name: 'AI Flow',
		nodes: [
			{
				id: 't',
				name: 'Telegram Trigger',
				type: 'n8n-nodes-base.telegramTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: { updates: ['message'] },
			},
			{
				id: 'a',
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 0],
				parameters: { text: '={{ $json.user_query }}' },
			},
			{
				id: 'm',
				name: 'Postgres Memory',
				type: '@n8n/n8n-nodes-langchain.memoryPostgres',
				typeVersion: 1,
				position: [200, 200],
				parameters: {
					sessionIdExpression: "={{ $('Telegram Trigger').item.json.chat_id }}",
					tableName: "={{ $('Telegram Trigger').item.json.sender_id }}",
				},
			},
		],
		connections: {
			'Postgres Memory': { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
		},
	} as unknown as WorkflowJSON;
}

describe('evals tool — propose with tool-ref pinData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGenerateToolRefPinData.mockResolvedValue({});
	});

	it('writes generated pinData onto the workflow when sub-component refs are detected', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
		const ctx = makeCtx(aiWfWithToolRef());
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		const update = ctx.workflowService.updateFromWorkflowJSON as Mock;
		expect(update).toHaveBeenCalledTimes(1);
		expect(update).toHaveBeenCalledWith(
			'w1',
			expect.objectContaining({
				pinData: {
					'Telegram Trigger': [{ json: { chat_id: '42' } }],
				},
			}),
			{},
		);
	});

	it('omits pinData-covered sub-component refs from the dataset columns', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
		const create = vi.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithToolRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		// chat_id was covered by pinData → must NOT appear; user_query (direct $json) stays.
		expect(create).not.toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'chat_id', type: 'string' }]) as unknown,
			undefined,
		);
		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'user_query', type: 'string' }]) as unknown,
			undefined,
		);
	});

	it('keeps sub-component refs in the dataset when generated pinData is missing that field', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
		const create = vi.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithTwoToolRefs(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'sender_id', type: 'string' }]) as unknown,
			undefined,
		);
		expect(create).not.toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([{ name: 'chat_id', type: 'string' }]) as unknown,
			undefined,
		);
	});

	it('does not call updateFromWorkflowJSON when no sub-component refs exist', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(mockGenerateToolRefPinData).not.toHaveBeenCalled();
	});

	it('skips the workflow update when generation produced nothing', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({});
		const ctx = makeCtx(aiWfWithToolRef());
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});
});

describe('evals tool — propose with named refs', () => {
	beforeEach(() => vi.clearAllMocks());

	it('includes named-ref columns in the DataTable schema', async () => {
		const create = vi
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'Wf — eval samples', columns: [] });
		const ctx = makeCtx(aiWfWithNamedRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String),
			expect.arrayContaining([{ name: 'text', type: 'string' }]),
			undefined,
		);
	});

	it('combines direct $json refs and named-ref columns in DataTable', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithDirectAndNamedRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([
				{ name: 'context', type: 'string' },
				{ name: 'user_query', type: 'string' },
			]) as unknown,
			undefined,
		);
	});
});

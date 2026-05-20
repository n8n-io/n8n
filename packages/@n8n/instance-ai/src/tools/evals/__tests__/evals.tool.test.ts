import type { WorkflowJSON } from '@n8n/workflow-sdk';

import type { InstanceAiContext } from '../../../types';
import { createEvalsTool } from '../evals.tool';
import * as sampleRowsService from '../generate-sample-rows.service';

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

function aiWfWithUnsafeDirectRefs(): WorkflowJSON {
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
				parameters: { text: '={{ $json["user-input"] }} {{ $json["123_id"] }}' },
			},
		],
		connections: {},
	} as unknown as WorkflowJSON;
}

/** AI workflow whose agent has an ai_tool connection. */
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

function evalConfiguredWfWithMultipleTargets(): WorkflowJSON {
	return {
		name: 'Multi Eval Flow',
		nodes: [
			{
				id: 'a1',
				name: 'First Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, -100],
				parameters: { text: '={{ $json.first_input }}' },
			},
			{
				id: 'a2',
				name: 'Second Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				typeVersion: 1,
				position: [200, 100],
				parameters: { text: '={{ $json.second_input }}' },
			},
			{
				id: 'e1',
				name: 'Eval Trigger A',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				position: [0, -100],
				parameters: { dataTableId: { mode: 'id', value: 'dt-first' } },
			},
			{
				id: 'e2',
				name: 'Eval Trigger B',
				type: 'n8n-nodes-base.evaluationTrigger',
				typeVersion: 1,
				position: [0, 100],
				parameters: { dataTableId: { mode: 'id', value: 'dt-second' } },
			},
		],
		connections: {
			'Eval Trigger A': {
				main: [[{ node: 'First Agent', type: 'main', index: 0 }]],
			},
			'Eval Trigger B': {
				main: [[{ node: 'Second Agent', type: 'main', index: 0 }]],
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

/** AI workflow where agent and memory read different nested fields from the same event object. */
function aiWfWithNestedAgentAndMemoryRefs(): WorkflowJSON {
	return {
		name: 'Telegram AI Flow',
		nodes: [
			{
				id: '1',
				name: 'Telegram Trigger',
				type: 'n8n-nodes-base.telegramTrigger',
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
				parameters: { text: '={{ $json.message.text }}' },
			},
			{
				id: '3',
				name: 'Postgres Memory',
				type: '@n8n/n8n-nodes-langchain.memoryPostgres',
				typeVersion: 1,
				position: [200, 200],
				parameters: { sessionIdExpression: '={{ $json.message.chat.id }}' },
			},
		],
		connections: {
			'Telegram Trigger': {
				main: [[{ node: 'Agent', type: 'main', index: 0 }]],
			},
			'Postgres Memory': {
				ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]],
			},
		},
	} as unknown as WorkflowJSON;
}

/** AI workflow with two named refs that share the same source field name. */
function aiWfWithNamedRefCollision(): WorkflowJSON {
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
					text: "={{ $('Voice or Text').item.json.text }}",
					systemMessage: "={{ $('Memory Buffer').item.json.text }}",
				},
			},
			{
				id: '3',
				name: 'Voice or Text',
				type: 'n8n-nodes-base.set',
				typeVersion: 3,
				position: [-200, 0],
				parameters: {},
			},
			{
				id: '4',
				name: 'Memory Buffer',
				type: 'n8n-nodes-base.set',
				typeVersion: 3,
				position: [-200, 200],
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
			getAsWorkflowJSON: jest.fn().mockResolvedValue(wf),
			updateFromWorkflowJSON: jest.fn().mockResolvedValue(undefined),
		},
		dataTableService: {
			create: jest.fn().mockResolvedValue({
				id: 'dt-new',
				name: 'AI Flow — eval samples',
				projectId: 'p-from-service',
				columns: [],
			}),
			insertRows: jest.fn().mockResolvedValue({
				insertedCount: 0,
				dataTableId: 'dt-new',
				tableName: 'x',
				projectId: 'p',
			}),
			getSchema: jest.fn().mockResolvedValue([]),
			addColumn: jest.fn().mockResolvedValue(undefined),
			queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
			...dataTableOverrides,
		},
		executionService: {
			list: jest.fn().mockResolvedValue([]),
			getNodeOutput: jest.fn(),
		} as never,
		credentialService: {} as never,
		nodeService: {} as never,
		logger: {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn(),
		},
	} as unknown as InstanceAiContext;
}

// ── action: offer ──────────────────────────────────────────────────────────

describe('evalsTool — action: offer (eligibility precheck + chat message)', () => {
	beforeEach(() => jest.clearAllMocks());

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
		const suspend = jest.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'no-ai-nodes' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns eligible:false with reason already-configured when EvaluationTrigger is present', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'already-configured' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns eligible:true with aiNodeNames and a chat-ready message, never suspends', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			eligible: true,
			aiNodeNames: ['Agent'],
		});
		expect(result.message).toEqual(expect.stringMatching(/test cases/i));
		expect(result.message).not.toContain('`');
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
		expect(result.message).not.toContain('`');
		expect(result.message).not.toMatch(/evals/i);
	});
});

// ── action: recommend-metric ───────────────────────────────────────────────

describe('evals tool — recommend-metric action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns the agent-chosen metric id when user approves the recommendation', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'recommend-metric', workflowId: 'w1', metricId: 'tool_use' },
			{
				agent: { resumeData: { approved: true } },
			} as never,
		)) as Record<string, unknown>;

		expect(result).toEqual({ approved: true, metricId: 'tool_use' });
	});

	it('returns { approved: false } when user denies, so the orchestrator can fall back to select-metrics', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'recommend-metric', workflowId: 'w1', metricId: 'helpfulness' },
			{
				agent: { resumeData: { approved: false } },
			} as never,
		)) as Record<string, unknown>;

		expect(result).toEqual({ approved: false });
	});

	it('suspends with a confirmation widget naming the agent-chosen metric on first call', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.handler!({ action: 'recommend-metric', workflowId: 'w1', metricId: 'tool_use' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: 'info',
				requestId: expect.any(String) as unknown,
				message: expect.stringContaining('Tool use') as unknown,
			}),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('SomeTool') as unknown,
			}),
		);
		expect(suspend).toHaveBeenCalledWith(
			expect.not.objectContaining({ inputType: expect.anything() as unknown }),
		);
	});

	it('keeps the recommended metric prompt free of code spans for tool workflows', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.handler!({ action: 'recommend-metric', workflowId: 'w1', metricId: 'tool_use' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.not.stringContaining('`') as unknown,
			}),
		);
	});
});

// ── action: offer-data-population ──────────────────────────────────────────

describe('evals tool — offer-data-population action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('suspends with an approval prompt before populating test cases', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.handler!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				severity: 'info',
				requestId: expect.any(String) as unknown,
				message: expect.stringMatching(/sample test cases/i) as unknown,
			}),
		);
	});

	it('populates the wired table after the user approves population', async () => {
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ user_query: 'How do I reset my password?' }]);
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true } },
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			approved: true,
			workflowId: 'w1',
			targetAgentNodeName: 'Agent',
			status: 'generated',
			rowCount: 1,
			table: {
				id: 'dt-existing',
				name: 'x',
				rowCount: 1,
				inputColumns: ['user_query'],
			},
		});
		expect(ctx.dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-existing',
			[{ user_query: 'How do I reset my password?' }],
			undefined,
		);
	});

	it('populates the table wired to the requested eval target after approval', async () => {
		jest
			.spyOn(sampleRowsService, 'generateSampleRows')
			.mockResolvedValue([{ second_input: 'How late is the trail open?' }]);
		const ctx = makeCtx(evalConfiguredWfWithMultipleTargets());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{
				action: 'offer-data-population',
				workflowId: 'w1',
				targetAgentNodeName: 'Second Agent',
			},
			{ agent: { resumeData: { approved: true } } } as never,
		)) as Record<string, unknown>;

		expect(result).toMatchObject({
			approved: true,
			workflowId: 'w1',
			targetAgentNodeName: 'Second Agent',
			status: 'generated',
		});
		expect(ctx.dataTableService.insertRows).toHaveBeenCalledWith(
			'dt-second',
			[{ second_input: 'How late is the trail open?' }],
			undefined,
		);
		expect(ctx.dataTableService.insertRows).not.toHaveBeenCalledWith(
			'dt-first',
			expect.anything(),
			expect.anything(),
		);
	});

	it('skips when there is no wired test-case table to populate', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toMatchObject({
			approved: false,
			skipped: true,
		});
	});
});

// ── action: select-metrics ─────────────────────────────────────────────────

describe('evals tool — select-metrics action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns the workflow-default metric ids when user approves with default selections', async () => {
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
		const suspend = jest
			.fn<Promise<void>, [SelectMetricsSuspendPayload]>()
			.mockResolvedValue(undefined);

		await tool.handler!(
			{ action: 'select-metrics', workflowId: 'w1', recommendedMetricId: 'tool_use' },
			{
				agent: { suspend, resumeData: undefined },
			} as never,
		);

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

	it('returns no chosen metrics when user dismisses the widget', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ chosenMetricIds: [], answers: [] });
	});

	it('returns no chosen metrics when user submits an empty selection', async () => {
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
			chosenMetricIds: [],
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
		const suspend = jest.fn();
		await tool.handler!(
			{ action: 'select-metrics', workflowId: 'w1', recommendedMetricId: 'tool_use' },
			{
				agent: { suspend, resumeData: undefined },
			} as never,
		);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				questions: [
					expect.objectContaining({
						options: expect.arrayContaining([
							expect.stringMatching(/^Correctness.*Chef Agent/) as unknown,
							expect.stringMatching(/^Tool use \(recommended\).*Calculator/) as unknown,
						]) as unknown,
					}),
				],
			}),
		);
	});
});

// ── action: propose (changed) ──────────────────────────────────────────────

describe('evals tool — propose action (changed)', () => {
	beforeEach(() => jest.clearAllMocks());

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

	it('uses normalized column names in the created table and setup task', async () => {
		const ctx = makeCtx(aiWfWithUnsafeDirectRefs());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'AI Flow — eval samples',
			[
				{ name: 'user_input', type: 'string' },
				{ name: 'column_123_id', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			undefined,
		);
		const task = result.task as string;
		expect(task).toContain('- user_input');
		expect(task).toContain('- column_123_id');
		expect(task).not.toContain('- user-input');
		expect(task).not.toContain('- 123_id');
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
			create: jest.fn().mockResolvedValue({
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

	it('creates the expected tools column when tool_use is selected', async () => {
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', metrics: ['tool_use'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).toHaveBeenCalledWith(
			'AI Flow With Tools — eval samples',
			[
				{ name: 'user_query', type: 'string' },
				{ name: 'expected_tools', type: 'string' },
			],
			undefined,
		);
		expect(result.task).not.toContain('Correctness');
		expect(result.task).toContain('expectedTools');
		expect(result.task).toContain('intermediateSteps');
	});

	it('returns skipped when metrics is empty', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: [] }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'metrics-required' });
		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
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
	beforeEach(() => jest.clearAllMocks());

	it('expands the offer message with disclosure when agent has named refs', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: undefined },
		} as never)) as { message: string };

		expect(result.message).toMatch(/This workflow uses AI node/);
		expect(result.message).toMatch(/Voice or Text/);
		expect(result.message).toMatch(/Set node/);
		expect(result.message).toMatch(/text/);
		expect(result.message).not.toContain('`');
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

describe('evals tool — propose with sub-component refs', () => {
	beforeEach(() => jest.clearAllMocks());

	it('keeps memory refs as dataset columns and rewrites them to the eval row shape', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithToolRef(), { create });
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{ action: 'propose', workflowId: 'w1', metrics: ['correctness'] },
			{
				agent: {},
			} as never,
		)) as { task: string };

		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([
				{ name: 'chat_id', type: 'string' },
				{ name: 'user_query', type: 'string' },
			]) as unknown,
			undefined,
		);
		expect(result.task).toContain(
			"Replace `$('Telegram Trigger').item.json.chat_id` with `{{ $json.chat_id }}`",
		);
		expect(result.task).not.toContain("$('Agent').item.json.chat_id");
		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('keeps every memory ref in the dataset columns', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithTwoToolRefs(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([
				{ name: 'chat_id', type: 'string' },
				{ name: 'sender_id', type: 'string' },
			]) as unknown,
			undefined,
		);
	});

	it('does not update the workflow during proposal', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});
});

describe('evals tool — propose with named refs', () => {
	beforeEach(() => jest.clearAllMocks());

	it('includes named-ref columns in the DataTable schema', async () => {
		const create = jest
			.fn()
			.mockResolvedValue({ id: 'dt-1', name: 'Wf — eval samples', columns: [] });
		const ctx = makeCtx(aiWfWithNamedRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String),
			[
				{ name: 'text', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			undefined,
		);
	});

	it('combines direct $json refs and named-ref columns in DataTable', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
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

	it('flattens nested agent and memory refs into separate DataTable columns', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithNestedAgentAndMemoryRefs(), { create });
		const tool = createEvalsTool(ctx);

		const result = (await tool.handler!(
			{
				action: 'propose',
				workflowId: 'w1',
				metrics: ['correctness'],
			},
			{
				agent: {},
			} as never,
		)) as { task: string };

		expect(create).toHaveBeenCalledWith(
			expect.any(String) as unknown,
			expect.arrayContaining([
				{ name: 'message_text', type: 'string' },
				{ name: 'message_chat_id', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			]) as unknown,
			undefined,
		);
		expect(result.task).toContain('Eval Production Adapter');
		expect(result.task).toContain('value: "={{ $json.message.text }}"');
		expect(result.task).toContain('value: "={{ $json.message.chat.id }}"');
		expect(result.task).toContain('Replace `$json.message.text` with `{{ $json.message_text }}`');
		expect(result.task).toContain(
			'Replace `$json.message.chat.id` with `{{ $json.message_chat_id }}`',
		);
	});

	it('does not include the raw field name when named refs collide', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithNamedRefCollision(), { create });
		const tool = createEvalsTool(ctx);

		await tool.handler!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String),
			[
				{ name: 'voice_or_text_text', type: 'string' },
				{ name: 'memory_buffer_text', type: 'string' },
				{ name: 'expected_output', type: 'string' },
			],
			undefined,
		);
	});
});

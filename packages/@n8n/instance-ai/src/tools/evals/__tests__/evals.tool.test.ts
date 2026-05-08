import type { WorkflowJSON } from '@n8n/workflow-sdk';

jest.mock('../generate-tool-ref-pin-data.service', () => ({
	generateToolRefPinData: jest.fn().mockResolvedValue({}),
}));

import { generateToolRefPinData } from '../generate-tool-ref-pin-data.service';
import type { InstanceAiContext } from '../../../types';
import { createEvalsTool } from '../evals.tool';

const mockGenerateToolRefPinData = generateToolRefPinData as jest.MockedFunction<
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
			queryRows: jest.fn().mockResolvedValue({ count: 0, data: [] }),
			...dataTableOverrides,
		},
		executionService: {} as never,
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

describe('evalsTool — action: offer (proactive approve/deny widget)', () => {
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

		const result = (await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'no-ai-nodes' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns eligible:false with reason already-configured when EvaluationTrigger is present', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		const result = (await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: false, reason: 'already-configured' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('suspends with the strict approve/deny widget on the first call when eligible', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledTimes(1);
		const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toMatchObject({
			severity: 'info',
			message: expect.stringMatching(/AI outputs can vary between runs/i) as unknown,
		});
		expect(payload).toHaveProperty('requestId');
		expect(payload).not.toHaveProperty('inputType');
		expect(payload).not.toHaveProperty('questions');
	});

	it('builds a singular message when there is exactly one AI node', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		const message = suspend.mock.calls[0][0].message as string;
		expect(message).toContain('This workflow uses AI node `Agent`.');
		expect(message).toContain('AI outputs can vary between runs');
		expect(message).toContain('Want to set one up?');
	});

	it('returns approved:true with aiNodeNames when the user approves', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: true, approved: true, aiNodeNames: ['Agent'] });
	});

	it('returns approved:false when the user denies', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ eligible: true, approved: false });
	});
});

// ── action: select-metrics ─────────────────────────────────────────────────

describe('evals tool — select-metrics action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('returns the workflow-default metric ids when user approves with default selections', async () => {
		// Agent has ai_tool connection → defaults are ['correctness', 'tool_use']
		const ctx = makeCtx(aiWfWithTools());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
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

	it('falls back to ["correctness"] when user dismisses the widget (resumeData.approved=false)', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ chosenMetricIds: ['correctness'], answers: [] });
	});

	it('falls back to ["correctness"] when user submits empty selection', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
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

		const result = (await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'no-ai-nodes' });
	});

	it('suspends with inputType="questions" and a single multi-type question', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledTimes(1);
		const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toMatchObject({
			severity: 'info',
			inputType: 'questions',
		});
		expect(payload).toHaveProperty('requestId');
		const questions = payload.questions as Array<Record<string, unknown>>;
		expect(Array.isArray(questions)).toBe(true);
		expect(questions).toHaveLength(1);
		expect(questions[0]).toMatchObject({ type: 'multi' });
		expect(Array.isArray(questions[0].options)).toBe(true);
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
		await tool.execute!({ action: 'select-metrics', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);
		const payload = suspend.mock.calls[0][0];
		const options: string[] = payload.questions[0].options;

		// Each option contains the metric name and a description.
		expect(options.find((o) => o.startsWith('Correctness'))).toMatch(/Chef Agent/);
		// Tool_use, since agent has tools, is the recommended metric.
		expect(options.find((o) => o.includes('Tool use'))).toMatch(/recommended/);
		expect(options.find((o) => o.includes('Tool use'))).toMatch(/Calculator/);
	});
});

// ── action: propose (changed) ──────────────────────────────────────────────

describe('evals tool — propose action (changed)', () => {
	beforeEach(() => jest.clearAllMocks());

	it('creates an EMPTY data table by default and never inserts rows', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!(
			{ action: 'propose', workflowId: 'w1', projectId: 'p1', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		// dataTableService.create is called — creates empty table
		expect(ctx.dataTableService.create).toHaveBeenCalledTimes(1);
		const createCall = (ctx.dataTableService.create as jest.Mock).mock.calls[0];
		// columns come from analyzeAgentInputColumns → 'user_query' (from $json.user_query in parameters)
		expect(createCall[1]).toEqual([{ name: 'user_query', type: 'string' }]);

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

		const result = (await tool.execute!(
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

		const result = (await tool.execute!(
			{ action: 'propose', workflowId: 'w1', projectId: 'p-input', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(result.table).toMatchObject({ projectId: 'p-input' });
	});

	it('omits `table` when datasetChoice is link-existing (we did not produce it)', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!(
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

		const result = (await tool.execute!(
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

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: [] }, {
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

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'Workflow has no AI/LLM nodes.' });
	});

	it('returns skipped when EvaluationTrigger already exists', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'propose', workflowId: 'w1' }, {
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

		const result = (await tool.execute!(
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

		const result = (await tool.execute!(
			{ action: 'propose', workflowId: 'w1', datasetChoice: 'later', metrics: ['correctness'] },
			{ agent: {} } as never,
		)) as Record<string, unknown>;

		expect(ctx.dataTableService.create).not.toHaveBeenCalled();
		expect(result).not.toHaveProperty('dataTableId');
		const task = result.task as string;
		expect(task).toContain('Do not create a DataTable');
	});
});

// ── action: offer-data-population ──────────────────────────────────────────

describe('evals tool — offer-data-population action', () => {
	beforeEach(() => jest.clearAllMocks());

	it('suspends with approve/deny when an EvaluationTrigger exists and the table is empty', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		// queryRows returns empty → table is empty → should suspend
		ctx.dataTableService.queryRows = jest.fn().mockResolvedValue({ count: 0, data: [] });
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalledTimes(1);
		const payload = suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toMatchObject({
			severity: 'info',
			message: expect.stringMatching(/populate/i) as unknown,
		});
		expect(payload).toHaveProperty('requestId');
	});

	it('returns skipped when the workflow has no eval target', async () => {
		const ctx = makeCtx(aiWf()); // no EvaluationTrigger wired to DataTable
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: {},
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'no-eval-target' });
	});

	it('returns skipped when the table already has rows', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		ctx.dataTableService.queryRows = jest
			.fn()
			.mockResolvedValue({ count: 1, data: [{ user_query: 'hello' }] });
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		const result = (await tool.execute!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ skipped: true, reason: 'already-populated' });
		expect(suspend).not.toHaveBeenCalled();
	});

	it('returns approved=true with workflow + table ids on user approval', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		ctx.dataTableService.queryRows = jest.fn().mockResolvedValue({ count: 0, data: [] });
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { resumeData: { approved: true } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({
			approved: true,
			workflowId: 'w1',
			dataTableId: 'dt-existing',
		});
	});

	it('returns approved=false on user denial', async () => {
		const ctx = makeCtx(evalConfiguredWf());
		ctx.dataTableService.queryRows = jest.fn().mockResolvedValue({ count: 0, data: [] });
		const tool = createEvalsTool(ctx);

		const result = (await tool.execute!({ action: 'offer-data-population', workflowId: 'w1' }, {
			agent: { resumeData: { approved: false } },
		} as never)) as Record<string, unknown>;

		expect(result).toEqual({ approved: false });
	});
});

// ── action: offer with named refs ──────────────────────────────────────────

describe('evals tool — offer with named refs', () => {
	beforeEach(() => jest.clearAllMocks());

	it('expands the offer message with disclosure when agent has named refs', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		expect(suspend).toHaveBeenCalled();
		const message = (suspend.mock.calls[0][0] as Record<string, unknown>).message as string;
		expect(message).toMatch(/This workflow uses AI node/);
		expect(message).toMatch(/Voice or Text/);
		expect(message).toMatch(/Set node in the production path/);
		expect(message).toMatch(/`text`/);
	});

	it('keeps the offer message short when no named refs are present', async () => {
		const ctx = makeCtx(aiWf());
		const tool = createEvalsTool(ctx);
		const suspend = jest.fn();

		await tool.execute!({ action: 'offer', workflowId: 'w1' }, {
			agent: { suspend, resumeData: undefined },
		} as never);

		const message = (suspend.mock.calls[0][0] as Record<string, unknown>).message as string;
		expect(message).not.toMatch(/Set node/);
		expect(message).not.toMatch(/production path/);
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

describe('evals tool — propose with tool-ref pinData', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockGenerateToolRefPinData.mockResolvedValue({});
	});

	it('writes generated pinData onto the workflow when sub-component refs are detected', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
		const ctx = makeCtx(aiWfWithToolRef());
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		const update = ctx.workflowService.updateFromWorkflowJSON as jest.Mock;
		expect(update).toHaveBeenCalledTimes(1);
		const [, patchedWorkflow] = update.mock.calls[0];
		expect(patchedWorkflow.pinData).toEqual({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
	});

	it('omits pinData-covered sub-component refs from the dataset columns', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({
			'Telegram Trigger': [{ json: { chat_id: '42' } }],
		});
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithToolRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		const columnsArg = create.mock.calls[0][1] as Array<{ name: string; type: string }>;
		const names = columnsArg.map((c) => c.name);
		// chat_id was covered by pinData → must NOT appear; user_query (direct $json) stays.
		expect(names).not.toContain('chat_id');
		expect(names).toContain('user_query');
	});

	it('does not call updateFromWorkflowJSON when no sub-component refs exist', async () => {
		const ctx = makeCtx(aiWfWithNamedRef());
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(ctx.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		expect(mockGenerateToolRefPinData).not.toHaveBeenCalled();
	});

	it('skips the workflow update when generation produced nothing', async () => {
		mockGenerateToolRefPinData.mockResolvedValue({});
		const ctx = makeCtx(aiWfWithToolRef());
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
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

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		expect(create).toHaveBeenCalledWith(
			expect.any(String),
			expect.arrayContaining([{ name: 'text', type: 'string' }]),
			undefined,
		);
	});

	it('combines direct $json refs and named-ref columns in DataTable', async () => {
		const create = jest.fn().mockResolvedValue({ id: 'dt-1', name: 'x', columns: [] });
		const ctx = makeCtx(aiWfWithDirectAndNamedRef(), { create });
		const tool = createEvalsTool(ctx);

		await tool.execute!({ action: 'propose', workflowId: 'w1', metrics: ['correctness'] }, {
			agent: {},
		} as never);

		const columnsArg = create.mock.calls[0][1] as Array<{ name: string; type: string }>;
		const names = columnsArg.map((c) => c.name).sort();
		expect(names).toEqual(['context', 'user_query']);
	});
});

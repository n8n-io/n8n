import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';
import { mock } from 'vitest-mock-extended';

import type { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { NodeTypes } from '@/node-types';

import { NodeToolExecutorService } from '../../json-schema/node-tool-executor.service';
import type { NodeToolResolverService } from '../../json-schema/node-tool-resolver.service';
import type {
	CompiledNodeToolset,
	CompiledOperationTool,
} from '../../json-schema/node-mcp-poc.types';
import { addFinancialReportRowTask } from '../cases/add-financial-report-row';
import { listUnreadEmailsFromSenderTask } from '../cases/list-unread-emails-from-sender';
import { updateOrderStatusTask } from '../cases/update-order-status';
import { mapWithConcurrency } from '../concurrency';
import { executeNodeMcpEvalFixture, runWithNodeMcpEvalCase } from '../eval-context';
import { buildJudgePrompt } from '../judge';
import { renderBenchmarkReport } from '../report';
import { classifyToolOutcome, scoreRun } from '../scoring';
import { summarizeRuns } from '../summary';

const financialReportsDocumentId = '1bR2qGRMfSTnb0Di-ENY5-ahx_7sM4Qh5IiqWLWLtQeo';

const description: INodeTypeDescription = {
	displayName: 'Google Sheets',
	name: 'googleSheets',
	group: ['transform'],
	version: 4.7,
	description: 'Test Google Sheets',
	defaults: { name: 'Google Sheets' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Columns',
			name: 'columns',
			type: 'json',
			default: '',
			required: true,
		},
	],
};

const toolset: CompiledNodeToolset = {
	endpoint: {
		endpoint: 'eval-action-lookup',
		type: 'json-schema',
		binding: {
			nodeType: 'n8n-nodes-base.googleSheets',
			nodeVersion: 4.7,
			projectId: 'project',
			userId: 'user',
			credentials: {},
		},
		flavor: { resolver: 'generic-single', hideOptions: false },
	},
	tools: [],
};

const inputFields = {
	columns: z.object({
		mappingMode: z.string(),
		value: z.record(z.string(), z.unknown()),
	}),
};

const tool: CompiledOperationTool = {
	name: 'sheet_append',
	description: 'Append a row',
	destructive: false,
	resource: 'sheet',
	operation: 'append',
	inputSchema: z.object(inputFields).strict(),
	inputFields,
	jsonSchema: {},
	properties: description.properties,
	hiddenDefaults: {},
	dynamicParameters: [],
	deferredOptions: [],
};

describe('Node MCP benchmark', () => {
	afterEach(() => {
		delete process.env.N8N_NODE_MCP_POC_EVAL_ENABLED;
	});

	it('limits parallel benchmark work to the configured concurrency', async () => {
		let active = 0;
		let maxActive = 0;
		const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
			active++;
			maxActive = Math.max(maxActive, active);
			await new Promise((resolve) => setTimeout(resolve, 5));
			active--;
			return value * 2;
		});

		expect(maxActive).toBe(2);
		expect(results).toEqual([2, 4, 6, 8]);
	});

	it('returns a fixture only after execution input validation succeeds', async () => {
		const ephemeralNodeExecutor = mock<EphemeralNodeExecutor>();
		const nodeTypes = mock<NodeTypes>();
		const resolver = mock<NodeToolResolverService>();
		nodeTypes.getByNameAndVersion.mockReturnValue({ description } as INodeType);
		const service = new NodeToolExecutorService(ephemeralNodeExecutor, nodeTypes, resolver);
		process.env.N8N_NODE_MCP_POC_EVAL_ENABLED = 'true';

		await expect(
			runWithNodeMcpEvalCase(addFinancialReportRowTask.id, async () => {
				return await service.execute(toolset, tool, {});
			}),
		).rejects.toThrow('Invalid tool input');
		expect(ephemeralNodeExecutor.executeInline).not.toHaveBeenCalled();

		const result = await runWithNodeMcpEvalCase(addFinancialReportRowTask.id, async () => {
			return await service.execute(toolset, tool, {
				columns: {
					mappingMode: 'defineBelow',
					value: { Month: '01/01/2027', 'Amount $': '5000' },
				},
			});
		});
		expect(result.status).toBe('success');
		expect(ephemeralNodeExecutor.executeInline).not.toHaveBeenCalled();
	});

	it('combines the LLM execution verdict with deterministic final-answer checks', () => {
		const result = scoreRun(
			addFinancialReportRowTask,
			{
				model: 'anthropic/claude-sonnet-5',
				version: '1',
				validExecution: true,
				matchingToolCallId: 'call-1',
				reason: 'The append call used resolved resource IDs and the required column values.',
			},
			'Added 01/01/2027 and 5000 to Financial reports.',
		);

		expect(result).toEqual({ success: true, reasons: [] });
	});

	it('reports the LLM judge reason when execution is invalid', () => {
		const result = scoreRun(
			addFinancialReportRowTask,
			{
				model: 'anthropic/claude-sonnet-5',
				version: '1',
				validExecution: false,
				matchingToolCallId: null,
				reason: 'The list-mode value is a display name rather than the resolved spreadsheet ID.',
			},
			'Added 01/01/2027 and 5000 to Financial reports.',
		);

		expect(result).toEqual({
			success: false,
			reasons: [
				'Judge rejected tool execution: The list-mode value is a display name rather than the resolved spreadsheet ID.',
			],
		});
	});

	it('gives the judge correct examples and explicit resource-locator mistakes', () => {
		const prompt = buildJudgePrompt(addFinancialReportRowTask, []);

		expect(prompt).toContain(financialReportsDocumentId);
		expect(prompt).toContain('{ "mode": "list", "value": "Financial reports" } is invalid');
		expect(prompt).toContain('embedded schema');
	});

	it('does not retain sensitive names, addresses, or message themes in the email case', () => {
		const serialized = JSON.stringify(listUnreadEmailsFromSenderTask);

		expect(serialized).not.toMatch(/Alex Carrasco|alex\.carrasco|@n8n\.io|Nodes team|Yehor/i);
	});

	it('classifies MCP error envelopes even when the agent event is not marked as an error', () => {
		expect(
			classifyToolOutcome(false, {
				structuredContent: { status: 'error', code: 'VALIDATION_ERROR' },
				isError: true,
			}),
		).toBe('semantic_invalid');
		expect(
			classifyToolOutcome(false, {
				content: [{ type: 'text', text: 'MCP error -32602: Input validation error' }],
				isError: true,
			}),
		).toBe('protocol_invalid');
	});

	it('rejects incomplete Gmail fixture input instead of returning filtered results', async () => {
		process.env.N8N_NODE_MCP_POC_EVAL_ENABLED = 'true';
		const gmailToolset: CompiledNodeToolset = {
			endpoint: {
				endpoint: 'eval-gmail-json-schema-generic-batch',
				type: 'json-schema',
				binding: {
					nodeType: 'n8n-nodes-base.gmail',
					nodeVersion: 2.2,
					projectId: 'project',
					userId: 'user',
					credentials: {},
				},
				flavor: { resolver: 'generic-batch', hideOptions: false },
			},
			tools: [],
		};
		const gmailTool: CompiledOperationTool = {
			name: 'message_getAll',
			description: 'Get messages',
			destructive: false,
			resource: 'message',
			operation: 'getAll',
			inputSchema: z.object({}),
			inputFields: {},
			jsonSchema: {},
			properties: [],
			hiddenDefaults: {},
			dynamicParameters: [],
			deferredOptions: [],
		};

		const result = await runWithNodeMcpEvalCase(listUnreadEmailsFromSenderTask.id, async () =>
			executeNodeMcpEvalFixture(gmailToolset, gmailTool, {}),
		);

		expect(result).toEqual({
			status: 'error',
			error: 'Evaluation fixture rejected incomplete Gmail filters',
		});
	});

	it('uses deterministic supporting reads for the update case', async () => {
		process.env.N8N_NODE_MCP_POC_EVAL_ENABLED = 'true';
		const readTool: CompiledOperationTool = {
			...tool,
			name: 'sheet_read',
			resource: 'sheet',
			operation: 'read',
		};

		const result = await runWithNodeMcpEvalCase(updateOrderStatusTask.id, async () =>
			executeNodeMcpEvalFixture(toolset, readTool, {}),
		);

		expect(result).toEqual(
			expect.objectContaining({
				status: 'success',
				data: expect.arrayContaining([
					{ json: { row_number: 3, Order: 'O-23523', Status: 'In Progress' } },
				]),
			}),
		);
	});

	it('renders category summaries and run drill-down data', () => {
		const run = {
			runId: 'run-1',
			taskId: addFinancialReportRowTask.id,
			model: 'anthropic/test',
			variant: 'eval-action-lookup',
			repetition: 1,
			startedAt: new Date(0).toISOString(),
			durationMs: 100,
			finalAnswer: 'done',
			success: true,
			verdictReasons: [],
			toolCalls: [],
		};
		const summary = summarizeRuns([run], [addFinancialReportRowTask]);
		const html = renderBenchmarkReport(summary);

		expect(summary.categories.map(({ category }) => category)).toContain('resource-mapping');
		expect(summary.flavors.map(({ flavor }) => flavor)).toEqual(['generic-batch', 'action-lookup']);
		expect(summary.arms[0]?.evaluationName).toBe('Google Sheets append row');
		expect(html).toContain('Results by flavor');
		expect(html).toContain('Google Sheets append row');
		expect(html).toContain('Evaluation × model × flavor');
		expect(html).toContain('Individual runs');
		expect(html).toContain('run-1');
	});
});

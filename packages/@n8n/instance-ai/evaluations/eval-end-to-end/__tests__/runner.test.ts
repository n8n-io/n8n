import type { WorkflowResponse } from '../../clients/n8n-client';
import type { CapturedEvent } from '../../types';
import {
	applyEvalDataTableId,
	buildEvalPrompt,
	buildWorkflowCreatePayload,
	evaluateTopology,
	extractConfirmationRequestId,
	filterToolSelectionForMode,
	findEvaluationTriggerDataTableId,
	isApprovableConfirmation,
	provisionEvalDataTable,
} from '../runner';
import type { EvalEndToEndCase, EvalEndToEndToolSelectionResult } from '../types';

function makeWorkflow(nodes: Array<Record<string, unknown>> = []): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Test',
		active: false,
		nodes,
		connections: {},
		pinData: {},
	} as unknown as WorkflowResponse;
}

function makeCase(slug = 'demo'): EvalEndToEndCase {
	return {
		slug,
		workflowPath: `/tmp/${slug}.json`,
		workflow: makeWorkflow([
			{
				name: 'Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				parameters: {},
			},
		]),
		mode: 'eligible',
	};
}

describe('eval-end-to-end runner — pure helpers', () => {
	describe('buildWorkflowCreatePayload', () => {
		it('builds a payload with a unique name and strips per-node credentials', () => {
			const testCase = makeCase('chat-with-database');
			testCase.workflow.nodes = [
				{
					name: 'Agent',
					type: '@n8n/n8n-nodes-langchain.agent',
					typeVersion: 1,
					parameters: {},
					credentials: { openAiApi: { id: 'cred-1', name: 'OpenAI' } },
				},
			] as unknown as WorkflowResponse['nodes'];

			const payload = buildWorkflowCreatePayload(testCase, 'project-1');

			expect(payload.name).toMatch(/^eval-end-to-end-chat-with-database-/);
			expect(payload.projectId).toBe('project-1');
			expect(payload.nodes[0]).not.toHaveProperty('credentials');
		});

		it('omits projectId when none is provided', () => {
			const payload = buildWorkflowCreatePayload(makeCase());
			expect(payload).not.toHaveProperty('projectId');
		});
	});

	describe('buildEvalPrompt', () => {
		it('asks the agent to add evals AND populate the dataset for an eligible workflow', () => {
			const prompt = buildEvalPrompt({
				workflowId: 'wf-1',
				workflowName: 'Demo',
				mode: 'eligible',
			});
			expect(prompt).toContain('wf-1');
			expect(prompt).toContain('Demo');
			expect(prompt).toContain('EvaluationTrigger');
			expect(prompt).toContain('eval-data');
		});

		it('tells the agent NOT to add new evals when the workflow is already configured', () => {
			const prompt = buildEvalPrompt({
				workflowId: 'wf-1',
				workflowName: 'Demo',
				mode: 'already-configured',
			});
			expect(prompt).toContain('already has eval nodes');
			expect(prompt).toContain('Do not add new evals');
		});

		it('tells the agent to respect a no-ai-nodes outcome', () => {
			const prompt = buildEvalPrompt({
				workflowId: 'wf-1',
				workflowName: 'Demo',
				mode: 'no-ai-nodes',
			});
			expect(prompt).toContain('not applicable');
			expect(prompt).toContain('do not force it');
		});
	});

	describe('filterToolSelectionForMode', () => {
		const raw: EvalEndToEndToolSelectionResult = {
			evalsToolCalled: false,
			evalSetupAgentCalled: false,
			evalDataToolCalled: false,
			findings: [
				{ severity: 'error', code: 'evals_tool_not_called', message: 'x' },
				{ severity: 'error', code: 'eval_setup_agent_not_called', message: 'y' },
				{ severity: 'error', code: 'eval_data_tool_not_called', message: 'z' },
			],
		};

		it('keeps tool-not-called findings as errors when mode is eligible', () => {
			const filtered = filterToolSelectionForMode(raw, 'eligible');
			expect(filtered.findings).toHaveLength(3);
		});

		it('drops tool-not-called findings when mode is already-configured', () => {
			const filtered = filterToolSelectionForMode(raw, 'already-configured');
			expect(filtered.findings).toHaveLength(0);
		});

		it('drops tool-not-called findings when mode is no-ai-nodes', () => {
			const filtered = filterToolSelectionForMode(raw, 'no-ai-nodes');
			expect(filtered.findings).toHaveLength(0);
		});
	});

	describe('isApprovableConfirmation', () => {
		it('approves any confirmation-request event', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { requestId: 'r1' },
			};
			expect(isApprovableConfirmation(event)).toBe(true);
		});

		it('skips non-confirmation events', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'tool-call',
				data: { toolName: 'evals' },
			};
			expect(isApprovableConfirmation(event)).toBe(false);
		});
	});

	describe('extractConfirmationRequestId', () => {
		it('reads top-level requestId', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { requestId: 'r1' },
			};
			expect(extractConfirmationRequestId(event)).toBe('r1');
		});

		it('reads requestId nested under payload', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: { payload: { requestId: 'r2' } },
			};
			expect(extractConfirmationRequestId(event)).toBe('r2');
		});

		it('returns undefined when no requestId is present', () => {
			const event: CapturedEvent = {
				timestamp: 0,
				type: 'confirmation-request',
				data: {},
			};
			expect(extractConfirmationRequestId(event)).toBeUndefined();
		});
	});

	describe('findEvaluationTriggerDataTableId', () => {
		it('returns the dataTableId from the EvaluationTrigger parameters', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: 'dt-42' },
				},
			]);
			expect(findEvaluationTriggerDataTableId(wf)).toBe('dt-42');
		});

		it('unwraps a credential-style { value } object', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'dt-99' } },
				},
			]);
			expect(findEvaluationTriggerDataTableId(wf)).toBe('dt-99');
		});

		it('returns undefined when there is no EvaluationTrigger', () => {
			expect(findEvaluationTriggerDataTableId(makeWorkflow([]))).toBeUndefined();
		});
	});

	describe('applyEvalDataTableId', () => {
		it('rewrites the dataTableId on every EvaluationTrigger and Evaluation node', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { __rl: true, mode: 'id', value: 'placeholder' } },
				},
				{
					name: 'EvalNode',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: { dataTableId: { mode: 'id', value: 'placeholder' } },
				},
				{
					name: 'NotEval',
					type: 'n8n-nodes-base.set',
					typeVersion: 1,
					parameters: { dataTableId: 'unrelated' },
				},
			]);

			const patched = applyEvalDataTableId(wf, 'real-id-123');

			const params = (n: number) =>
				(patched.nodes[n] as { parameters: Record<string, unknown> }).parameters;
			expect((params(0).dataTableId as { value: string }).value).toBe('real-id-123');
			expect((params(1).dataTableId as { value: string }).value).toBe('real-id-123');
			// Untouched non-eval node
			expect(params(2).dataTableId).toBe('unrelated');
		});

		it('handles the plain-string variant of dataTableId', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: 'placeholder' },
				},
			]);

			const patched = applyEvalDataTableId(wf, 'real-id-123');
			expect(
				(patched.nodes[0] as { parameters: Record<string, unknown> }).parameters.dataTableId,
			).toBe('real-id-123');
		});

		it('does not mutate the input workflow', () => {
			const original = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: { value: 'placeholder' } },
				},
			]);

			applyEvalDataTableId(original, 'real-id-123');
			const params = (original.nodes[0] as { parameters: Record<string, unknown> }).parameters;
			expect((params.dataTableId as { value: string }).value).toBe('placeholder');
		});
	});

	describe('provisionEvalDataTable', () => {
		it('creates the DataTable then inserts seed rows and returns the new id', async () => {
			const createDataTable = jest.fn().mockResolvedValue({ id: 'dt-new', name: 'tbl' });
			const insertDataTableRows = jest.fn().mockResolvedValue(undefined);

			const id = await provisionEvalDataTable({
				client: { createDataTable, insertDataTableRows },
				projectId: 'proj-1',
				spec: {
					name: 'tbl',
					columns: [{ name: 'input', type: 'string' }],
					rows: [{ input: 'a' }, { input: 'b' }],
				},
			});

			expect(id).toBe('dt-new');
			expect(createDataTable).toHaveBeenCalledWith('proj-1', {
				name: 'tbl',
				columns: [{ name: 'input', type: 'string' }],
			});
			expect(insertDataTableRows).toHaveBeenCalledWith('proj-1', 'dt-new', [
				{ input: 'a' },
				{ input: 'b' },
			]);
		});

		it('skips insertion when the spec has zero rows', async () => {
			const createDataTable = jest.fn().mockResolvedValue({ id: 'dt-new', name: 'tbl' });
			const insertDataTableRows = jest.fn();

			await provisionEvalDataTable({
				client: { createDataTable, insertDataTableRows },
				projectId: 'proj-1',
				spec: { name: 'tbl', columns: [{ name: 'c', type: 'string' }], rows: [] },
			});

			expect(insertDataTableRows).not.toHaveBeenCalled();
		});
	});

	describe('evaluateTopology', () => {
		it('reports both trigger and node found and the dataTableId', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalTrigger',
					type: 'n8n-nodes-base.evaluationTrigger',
					typeVersion: 1,
					parameters: { dataTableId: 'dt-7' },
				},
				{
					name: 'EvalNode',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: {},
				},
			]);
			const result = evaluateTopology(wf);
			expect(result.evaluationTriggerFound).toBe(true);
			expect(result.evaluationNodeFound).toBe(true);
			expect(result.dataTableId).toBe('dt-7');
		});

		it('reports missing pieces independently', () => {
			const wf = makeWorkflow([
				{
					name: 'EvalNode',
					type: 'n8n-nodes-base.evaluation',
					typeVersion: 1,
					parameters: {},
				},
			]);
			const result = evaluateTopology(wf);
			expect(result.evaluationTriggerFound).toBe(false);
			expect(result.evaluationNodeFound).toBe(true);
			expect(result.dataTableId).toBeUndefined();
		});
	});
});

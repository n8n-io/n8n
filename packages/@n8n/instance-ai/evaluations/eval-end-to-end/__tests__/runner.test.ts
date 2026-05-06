import type { WorkflowResponse } from '../../clients/n8n-client';
import type { CapturedEvent } from '../../types';
import {
	buildEvalPrompt,
	buildWorkflowCreatePayload,
	evaluateTopology,
	extractConfirmationRequestId,
	findEvaluationTriggerDataTableId,
	isApprovableConfirmation,
} from '../runner';
import type { EvalEndToEndCase } from '../types';

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
		it('asks the agent to add evals AND populate the dataset via eval-data', () => {
			const prompt = buildEvalPrompt({ workflowId: 'wf-1', workflowName: 'Demo' });
			expect(prompt).toContain('wf-1');
			expect(prompt).toContain('Demo');
			expect(prompt).toContain('EvaluationTrigger');
			expect(prompt).toContain('eval-data');
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

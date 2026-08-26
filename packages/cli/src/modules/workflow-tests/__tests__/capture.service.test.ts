import type { IExecutionResponse } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { ExecutionRepository } from '@n8n/db';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { CaptureService } from '../capture.service';

/** Build a minimal execution fixture. Only the fields the service reads are populated. */
function buildExecution(overrides: {
	nodes: Array<{ name: string; type: string; credentials?: Record<string, unknown> }>;
	connections: Record<string, { main: Array<Array<{ node: string }> | null> }>;
	runData: Record<
		string,
		Array<{
			executionIndex: number;
			data?: { main: Array<Array<Record<string, unknown>> | null> };
		}>
	>;
}): IExecutionResponse {
	return {
		workflowData: {
			nodes: overrides.nodes,
			connections: overrides.connections,
		},
		data: {
			resultData: {
				runData: overrides.runData,
			},
		},
	} as unknown as IExecutionResponse;
}

describe('CaptureService', () => {
	let executionRepository: MockProxy<ExecutionRepository>;
	let captureService: CaptureService;

	beforeEach(() => {
		executionRepository = mock<ExecutionRepository>();
		captureService = new CaptureService(executionRepository);
	});

	describe('buildCapture', () => {
		it('identifies the trigger as the executed node with no incoming main connection', () => {
			// webhook -> set -> http -> set2
			const execution = buildExecution({
				nodes: [
					{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					{ name: 'Set', type: 'n8n-nodes-base.set' },
					{ name: 'Http', type: 'n8n-nodes-base.httpRequest' },
					{ name: 'Set2', type: 'n8n-nodes-base.set' },
				],
				connections: {
					Webhook: { main: [[{ node: 'Set' }]] },
					Set: { main: [[{ node: 'Http' }]] },
					Http: { main: [[{ node: 'Set2' }]] },
				},
				runData: {
					Webhook: [{ executionIndex: 0, data: { main: [[{ json: { a: 1 } }]] } }],
					Set: [{ executionIndex: 1, data: { main: [[{ json: { a: 1 } }]] } }],
					Http: [{ executionIndex: 2, data: { main: [[{ json: { b: 2 } }]] } }],
					Set2: [{ executionIndex: 3, data: { main: [[{ json: { b: 2 } }]] } }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.triggerNodeName).toBe('Webhook');
		});

		it('mocks a node that has non-empty credentials', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{
						name: 'Slack',
						type: 'n8n-nodes-base.slack',
						credentials: { slackApi: { id: '1', name: 'Slack account' } },
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Slack' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					Slack: [{ executionIndex: 1, data: { main: [[{ json: { ok: true } }]] } }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.fixtures.Slack).toEqual([{ json: { ok: true } }]);
			expect(capture.expectations.some((e) => e.nodeName === 'Slack')).toBe(false);
		});

		it('mocks a node whose type is in EXTERNAL_NODE_TYPES', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'Http', type: 'n8n-nodes-base.httpRequest' },
				],
				connections: {
					Trigger: { main: [[{ node: 'Http' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					Http: [{ executionIndex: 1, data: { main: [[{ json: { status: 200 } }]] } }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.fixtures.Http).toEqual([{ json: { status: 200 } }]);
			expect(capture.expectations.some((e) => e.nodeName === 'Http')).toBe(false);
		});

		it('sorts expectations by executionIndex ascending', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'A', type: 'n8n-nodes-base.set' },
					{ name: 'B', type: 'n8n-nodes-base.set' },
				],
				connections: {
					Trigger: { main: [[{ node: 'A' }, { node: 'B' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					// Note: B has a lower executionIndex than A, but is captured after in runData order.
					B: [{ executionIndex: 1, data: { main: [[{ json: { n: 'b' } }]] } }],
					A: [{ executionIndex: 2, data: { main: [[{ json: { n: 'a' } }]] } }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.expectations.map((e) => e.nodeName)).toEqual(['B', 'A']);
		});

		it('sanitizes items to json only, dropping pairedItem and binary', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'Set', type: 'n8n-nodes-base.set' },
				],
				connections: {
					Trigger: { main: [[{ node: 'Set' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					Set: [
						{
							executionIndex: 1,
							data: {
								main: [
									[
										{
											json: { foo: 'bar' },
											pairedItem: { item: 0 },
											binary: { data: { data: 'base64', mimeType: 'text/plain' } },
										},
									],
								],
							},
						},
					],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.expectations[0].outputs).toEqual([[{ json: { foo: 'bar' } }]]);
		});

		it('keeps all branches for a multi-branch (IF) node, using [] for the null branch', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'If', type: 'n8n-nodes-base.if' },
				],
				connections: {
					Trigger: { main: [[{ node: 'If' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					If: [
						{
							executionIndex: 1,
							data: { main: [[{ json: { branch: 'true' } }], null] },
						},
					],
				},
			});

			const capture = captureService.buildCapture(execution);

			const ifExpectation = capture.expectations.find((e) => e.nodeName === 'If');
			expect(ifExpectation?.outputs).toEqual([[{ json: { branch: 'true' } }], []]);
		});

		it('throws when no trigger node can be identified', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'A', type: 'n8n-nodes-base.set' },
					{ name: 'B', type: 'n8n-nodes-base.set' },
				],
				connections: {
					A: { main: [[{ node: 'B' }]] },
					B: { main: [[{ node: 'A' }]] },
				},
				runData: {
					A: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					B: [{ executionIndex: 1, data: { main: [[{ json: {} }]] } }],
				},
			});

			expect(() => captureService.buildCapture(execution)).toThrow(UnexpectedError);
			expect(() => captureService.buildCapture(execution)).toThrow(
				'Could not identify the trigger node from this execution',
			);
		});

		it('breaks a trigger tie by picking the lowest executionIndex', () => {
			// Neither A nor B has an incoming main connection; B has the lower executionIndex.
			const execution = buildExecution({
				nodes: [
					{ name: 'A', type: 'n8n-nodes-base.manualTrigger' },
					{ name: 'B', type: 'n8n-nodes-base.manualTrigger' },
				],
				connections: {},
				runData: {
					A: [{ executionIndex: 5, data: { main: [[{ json: {} }]] } }],
					B: [{ executionIndex: 2, data: { main: [[{ json: {} }]] } }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.triggerNodeName).toBe('B');
		});

		it('mocks a credentialed node with no main output data, skipping its fixture', () => {
			const execution = buildExecution({
				nodes: [
					{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' },
					{
						name: 'FailedApi',
						type: 'n8n-nodes-base.slack',
						credentials: { slackApi: { id: '1', name: 'Slack account' } },
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'FailedApi' }]] },
				},
				runData: {
					Trigger: [{ executionIndex: 0, data: { main: [[{ json: {} }]] } }],
					// Node errored: no `data` at all, so there is no main output to mock.
					FailedApi: [{ executionIndex: 1 }],
				},
			});

			const capture = captureService.buildCapture(execution);

			expect(capture.fixtures.FailedApi).toBeUndefined();
			expect(capture.expectations.some((e) => e.nodeName === 'FailedApi')).toBe(false);
		});
	});

	describe('captureFromExecution', () => {
		it('loads the execution via findSingleExecution, builds the capture, and returns it with workflowId', async () => {
			const execution = {
				...buildExecution({
					nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }],
					connections: {},
					runData: {
						Trigger: [{ executionIndex: 0, data: { main: [[{ json: { ok: true } }]] } }],
					},
				}),
				workflowId: 'workflow-123',
			} as unknown as IExecutionResponse;
			executionRepository.findSingleExecution.mockResolvedValue(execution);

			const result = await captureService.captureFromExecution('execution-1');

			expect(executionRepository.findSingleExecution).toHaveBeenCalledWith('execution-1', {
				includeData: true,
				unflattenData: true,
			});
			expect(result.workflowId).toBe('workflow-123');
			expect(result.capture).toEqual(captureService.buildCapture(execution));
		});

		it('throws when the execution cannot be found', async () => {
			executionRepository.findSingleExecution.mockResolvedValue(undefined);

			await expect(captureService.captureFromExecution('missing-execution')).rejects.toThrow(
				NotFoundError,
			);
			await expect(captureService.captureFromExecution('missing-execution')).rejects.toThrow(
				'Execution missing-execution not found',
			);
		});
	});
});

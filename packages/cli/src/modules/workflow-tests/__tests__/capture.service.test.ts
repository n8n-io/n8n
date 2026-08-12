import type { IExecutionResponse } from '@n8n/db';
import { UnexpectedError } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import type { ExecutionRepository } from '@n8n/db';

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
	});
});

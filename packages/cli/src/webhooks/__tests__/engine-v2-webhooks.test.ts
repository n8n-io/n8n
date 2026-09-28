import type { StepSlots } from '@n8n/engine';
import type { INode, WebhookResponseMode } from 'n8n-workflow';
import { WorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { EngineV2PayloadGuard } from '@/services/engine-v2-payload-guard.service';
import { EngineV2Webhooks } from '@/webhooks/engine-v2-webhooks';

const engineV2Webhooks = new EngineV2Webhooks(
	mock<EngineV2Dispatcher>(),
	mock<EngineV2PayloadGuard>(),
	mock<EngineDataPlaneProxyService>(),
);

describe('EngineV2Webhooks.assertSupported', () => {
	const assertSupported = (responseMode: WebhookResponseMode) => {
		const proxy = mock<EngineDataPlaneProxyService>();
		proxy.isAvailable.mockReturnValue(true);
		const webhooks = new EngineV2Webhooks(
			mock<EngineV2Dispatcher>(),
			mock<EngineV2PayloadGuard>(),
			proxy,
		);

		webhooks.assertSupported({
			workflowStartNode: mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters: {},
			}),
			responseMode,
			executionId: undefined,
		});
	};

	// The engine mode no longer reaches this check, so these modes pass with a
	// remote data plane and in-process alike.
	it.each(['onReceived', 'lastNode', 'responseNode'] as const)(
		'allows %s responses in every engine mode',
		(responseMode) => {
			expect(() => assertSupported(responseMode)).not.toThrow();
		},
	);
});

describe('EngineV2Webhooks.toRun', () => {
	it('converts a completed outcome with outputs', async () => {
		const outputs: StepSlots = [[{ json: { answer: 42 } }], null];

		const run = await engineV2Webhooks.toRun(
			{ status: 'completed', lastNode: { nodeName: 'Last node', outputs } },
			'webhook',
		);

		expect(run).toMatchObject({
			mode: 'webhook',
			status: 'success',
			storedAt: 'db',
			data: {
				resultData: {
					lastNodeExecuted: 'Last node',
					runData: {
						'Last node': [
							{
								executionIndex: 0,
								executionStatus: 'success',
								source: [],
								executionTime: 0,
								data: { main: [[{ json: { answer: 42 } }], []] },
							},
						],
					},
				},
			},
		});
		expect(run.startedAt).toBeInstanceOf(Date);
		expect(run.data.resultData.runData['Last node'][0].startTime).toEqual(expect.any(Number));
	});

	it('converts a failed outcome', async () => {
		const run = await engineV2Webhooks.toRun(
			{
				status: 'failed',
				nodeName: 'Broken node',
				error: { name: 'Error', message: 'The node failed' },
			},
			'webhook',
		);

		expect(run.status).toBe('error');
		expect(run.data.resultData.lastNodeExecuted).toBe('Broken node');
		expect(run.data.resultData.runData).toEqual({});
		expect(run.data.resultData.error).toBeInstanceOf(WorkflowOperationError);
		expect(run.data.resultData.error?.message).toBe('The node failed');
	});

	it('converts a completed outcome with no last node data', async () => {
		const run = await engineV2Webhooks.toRun({ status: 'completed' }, 'webhook');

		expect(run.status).toBe('success');
		expect(run.data.resultData.lastNodeExecuted).toBeUndefined();
		expect(run.data.resultData.runData).toEqual({});
		expect(run.data.resultData.error).toBeUndefined();
	});
});

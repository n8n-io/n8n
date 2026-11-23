import type { StepSlots } from '@n8n/engine';
import type { INode, WebhookResponseMode } from 'n8n-workflow';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, WorkflowOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import type { EngineV2Dispatcher } from '@/services/engine-v2-dispatcher.service';
import { EngineV2Webhooks } from '@/webhooks/engine-v2-webhooks';

const engineV2Webhooks = new EngineV2Webhooks(
	mock<EngineV2Dispatcher>(),
	mock<EngineDataPlaneProxyService>(),
);

describe('EngineV2Webhooks.assertSupported', () => {
	const assertSupported = (
		responseMode: WebhookResponseMode,
		parameters: INode['parameters'] = {},
	) => {
		const proxy = mock<EngineDataPlaneProxyService>();
		proxy.isAvailable.mockReturnValue(true);
		const webhooks = new EngineV2Webhooks(mock<EngineV2Dispatcher>(), proxy);

		webhooks.assertSupported({
			workflowStartNode: mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				parameters,
			}),
			responseMode,
			executionId: undefined,
			formHasMorePages: false,
		});
	};

	// The engine mode no longer reaches this check, so these modes pass with a
	// remote data plane and in-process alike.
	it.each(['onReceived', 'lastNode', 'responseNode', 'streaming'] as const)(
		'allows %s responses in every engine mode',
		(responseMode) => {
			expect(() => assertSupported(responseMode)).not.toThrow();
		},
	);

	describe('form trigger', () => {
		const assertForm = (responseMode: WebhookResponseMode, formHasMorePages: boolean) => {
			const proxy = mock<EngineDataPlaneProxyService>();
			proxy.isAvailable.mockReturnValue(true);
			new EngineV2Webhooks(mock<EngineV2Dispatcher>(), proxy).assertSupported({
				workflowStartNode: mock<INode>({
					name: 'On form submission',
					type: FORM_TRIGGER_NODE_TYPE,
					parameters: {},
				}),
				responseMode,
				executionId: undefined,
				formHasMorePages,
			});
		};

		it('allows a single-page form', () => {
			expect(() => assertForm('onReceived', false)).not.toThrow();
		});

		// The GET that renders the form has the trigger's own mode. Only the submit has 'formPage'.
		it.each(['onReceived', 'formPage'] as const)(
			'refuses a form with more pages or a Form Ending in %s mode',
			(responseMode) => {
				expect(() => assertForm(responseMode, true)).toThrow(
					'Engine v2 cannot run a form that has more pages or a Form Ending yet.',
				);
			},
		);
	});

	it('refuses a response mode that engine v2 does not support', () => {
		expect(() => assertSupported('hostedChat')).toThrow("'hostedChat' response mode");
	});

	// The streaming node sends its headers before it outputs the raw body, so a
	// later refusal could not answer with a 400.
	it.each([true, '={{ true }}'])('refuses a streaming response with rawBody %s', (rawBody) => {
		expect(() => assertSupported('streaming', { options: { rawBody } })).toThrow(
			'Engine v2 cannot stream a response for the "Webhook" trigger with the Raw Body option yet.',
		);
	});

	it('allows a streaming response with rawBody turned off', () => {
		expect(() => assertSupported('streaming', { options: { rawBody: false } })).not.toThrow();
	});

	it('allows the raw body when the response does not stream', () => {
		expect(() => assertSupported('lastNode', { options: { rawBody: true } })).not.toThrow();
	});
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
				nodeId: 'broken-node',
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

describe('EngineV2Webhooks.assertSupported on a resume', () => {
	const EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';

	const assertResume = (
		responseMode: WebhookResponseMode,
		available = true,
		type = 'n8n-nodes-base.wait',
	) => {
		const proxy = mock<EngineDataPlaneProxyService>();
		proxy.isAvailable.mockReturnValue(available);
		new EngineV2Webhooks(mock<EngineV2Dispatcher>(), proxy).assertSupported({
			workflowStartNode: mock<INode>({ name: 'Wait', type, parameters: {} }),
			responseMode,
			executionId: EXECUTION_ID,
			formHasMorePages: false,
		});
	};

	it('lets the waiting node answer on receipt', () => {
		expect(() => assertResume('onReceived')).not.toThrow();
	});

	it('refuses lastNode, since the data plane answers the end of a run only to its start', () => {
		expect(() => assertResume('lastNode')).toThrow(
			'Engine v2 cannot answer a resume request with the last node yet. Set the waiting node to respond immediately.',
		);
	});

	it('skips the trigger checks, so a waiting Form node can resume', () => {
		expect(() => assertResume('onReceived', true, FORM_NODE_TYPE)).not.toThrow();
	});

	it.each(['responseNode', 'formPage'] as const)(
		'refuses %s, where a later node would answer the resume request',
		(mode) => {
			expect(() => assertResume(mode)).toThrow(
				'Engine v2 cannot answer a resume request from a Respond to Webhook node or from the next form page yet.',
			);
		},
	);

	it('refuses a response mode that engine v2 does not support', () => {
		expect(() => assertResume('hostedChat')).toThrow("'hostedChat' response mode");
	});

	it('still needs the engine module', () => {
		expect(() => assertResume('onReceived', false)).toThrow('N8N_ENABLED_MODULES');
	});
});

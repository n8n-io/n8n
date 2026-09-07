import type { WebhookRepository } from '@n8n/db';
import { createDeclarativeWebhook, createDeclarativeWebhookMethods } from 'n8n-core';
import type {
	IDataObject,
	IDeclarativeWebhookTrigger,
	INode,
	INodeType,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { NodeConnectionTypes, Workflow } from 'n8n-workflow';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import type { NodeTypes } from '@/node-types';
import type { CacheService } from '@/services/cache/cache.service';
import { shouldAssignExecuteMethod } from '@/utils';
import { WebhookService } from '@/webhooks/webhook.service';

/**
 * Drives a declarative webhook trigger through the full WebhookService flow —
 * createWebhookIfNotExists → runWebhook → deleteWebhook — with the vendor
 * "hook registry" mocked by nock, the way E2eTestDeclarativeWebhookTrigger is
 * meant to be used.
 */
describe('declarative webhook trigger through WebhookService', () => {
	const registryUrl = 'http://registry.test';

	const trigger: IDeclarativeWebhookTrigger = {
		type: 'webhook',
		lifecycle: {
			checkExists: {
				routing: {
					request: { method: 'GET', url: '={{ $parameter.url }}/hooks' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'hooks' } }] },
				},
				matchOn: [{ itemProperty: 'target_url', value: '={{ $webhookUrl }}' }],
				store: { webhookId: '={{ $item.id }}' },
			},
			create: {
				routing: {
					request: {
						method: 'POST',
						url: '={{ $parameter.url }}/hooks',
						body: { target_url: '={{ $webhookUrl }}', events: '={{ $parameter.events }}' },
					},
				},
				store: { webhookId: '={{ $response.id }}' },
			},
			delete: {
				routing: {
					request: {
						method: 'DELETE',
						url: '={{ $parameter.url + "/hooks/" + $staticData.webhookId }}',
					},
				},
			},
		},
		handler: {
			filter: {
				allowed: '={{ $parameter.events }}',
				actual: '={{ $request.body.event }}',
				wildcard: '*',
			},
		},
	};

	const nodeType: INodeType = {
		description: {
			displayName: 'Declarative Webhook Trigger',
			name: 'declarativeWebhookTrigger',
			group: ['trigger'],
			version: 1,
			description: '',
			defaults: {},
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{ displayName: 'URL', name: 'url', type: 'string', default: '' },
				{ displayName: 'Events', name: 'events', type: 'multiOptions', options: [], default: [] },
			],
			webhooks: [
				{ name: 'default', httpMethod: 'POST', responseMode: 'onReceived', path: 'webhook' },
			],
			trigger,
		},
	};
	// Attach what DirectoryLoader.applySpecialNodeParameters attaches.
	nodeType.webhookMethods = { default: createDeclarativeWebhookMethods(nodeType, trigger) };
	nodeType.webhook = createDeclarativeWebhook(trigger);

	const node: INode = {
		id: 'n1',
		name: 'Trigger',
		type: 'declarativeWebhookTrigger',
		typeVersion: 1,
		position: [0, 0],
		parameters: { url: registryUrl, events: ['created'] },
	};

	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
	const webhookService = new WebhookService(
		mock(),
		mock<WebhookRepository>(),
		mock<CacheService>(),
		nodeTypes,
	);

	const additionalData = {
		executionId: 'e1',
		webhookBaseUrl: 'http://localhost:5678/webhook',
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
	} as IWorkflowExecuteAdditionalData;

	const workflow = new Workflow({
		id: 'wf1',
		nodes: [node],
		connections: {},
		active: true,
		nodeTypes,
	});

	const webhookData = {
		node: node.name,
		httpMethod: 'POST',
		path: 'webhook',
		workflowId: workflow.id,
		webhookDescription: { name: 'default', httpMethod: 'POST', path: 'webhook' },
		workflowExecuteAdditionalData: additionalData,
	} as IWebhookData;

	const staticData = () => workflow.getStaticData('node', node);

	const runIncomingWebhook = async (body: IDataObject) => {
		const requestData = {
			...additionalData,
			httpRequest: { body, headers: {}, query: {}, params: {} },
		} as IWorkflowExecuteAdditionalData;
		return await webhookService.runWebhook(
			workflow,
			webhookData,
			node,
			requestData,
			'webhook',
			null,
		);
	};

	beforeAll(() => nock.disableNetConnect());
	afterAll(() => nock.enableNetConnect());
	afterEach(() => nock.cleanAll());

	let registeredTargetUrl: string;

	test('activation registers the webhook and stores its id', async () => {
		let createBody: IDataObject | undefined;
		const scope = nock(registryUrl)
			.get('/hooks')
			.reply(200, { hooks: [] })
			.post('/hooks', (body) => {
				createBody = body as IDataObject;
				return true;
			})
			.reply(200, { id: 'h1' });

		await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');

		expect(scope.isDone()).toBe(true);
		expect(staticData().webhookId).toBe('h1');
		expect(createBody).toEqual({
			target_url: expect.stringContaining('/webhook'),
			events: ['created'],
		});
		registeredTargetUrl = createBody!.target_url as string;
	});

	test('re-activation finds the registration and recovers a forgotten id', async () => {
		const scope = nock(registryUrl)
			.get('/hooks')
			.reply(200, { hooks: [{ id: 'h1', target_url: registeredTargetUrl }] });

		delete staticData().webhookId;

		await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');

		expect(scope.isDone()).toBe(true);
		expect(staticData().webhookId).toBe('h1');
	});

	test('a matching delivery starts the workflow with the body', async () => {
		const response = await runIncomingWebhook({ event: 'created', n: 1 });

		expect(response).toEqual({ workflowData: [[{ json: { event: 'created', n: 1 } }]] });
	});

	test('a non-matching delivery responds 200 without a run', async () => {
		const response = await runIncomingWebhook({ event: 'deleted' });

		expect(response).toEqual({});
	});

	test('a declarative webhook trigger with requestDefaults never gets a synthesized execute', () => {
		// Regression: with an assigned execute, runNode routes deliveries through
		// RoutingNode (a bare GET to requestDefaults.baseURL) instead of the
		// webhook pass-through — the trigger's output becomes the API root listing.
		const withRequestDefaults = {
			...nodeType,
			description: { ...nodeType.description, requestDefaults: { baseURL: registryUrl } },
		};

		expect(shouldAssignExecuteMethod(withRequestDefaults)).toBe(false);
	});

	test('deactivation deregisters and clears static data', async () => {
		const scope = nock(registryUrl).delete('/hooks/h1').reply(200, {});

		await webhookService.deleteWebhook(workflow, webhookData, 'trigger', 'update');

		expect(scope.isDone()).toBe(true);
		expect(staticData().webhookId).toBeUndefined();
	});
});

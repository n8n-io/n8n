import { WebhookEntity } from '@n8n/db';
import type { WebhookRepository } from '@n8n/db';
import type {
	INode,
	INodeProperties,
	INodeType,
	IWebhookData,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	Workflow,
	WebhookPathTakenError,
	webhookDescriptionFields,
	fromParameter,
} from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import { mock } from 'vitest-mock-extended';

import config from '@/config';
import type { NodeTypes } from '@/node-types';
import type { CacheService } from '@/services/cache/cache.service';
import { WebhookService } from '@/webhooks/webhook.service';

const createWebhook = (method: string, path: string, webhookId?: string, pathSegments?: number) =>
	Object.assign(new WebhookEntity(), {
		method,
		webhookPath: path,
		webhookId,
		pathSegments,
	}) as WebhookEntity;

describe('WebhookService', () => {
	const webhookRepository = mock<WebhookRepository>();
	const cacheService = mock<CacheService>();
	const nodeTypes = mock<NodeTypes>();
	const webhookService = new WebhookService(mock(), webhookRepository, cacheService, nodeTypes);
	const additionalData = mock<IWorkflowExecuteAdditionalData>();

	beforeEach(() => {
		config.load(config.default);
		vi.clearAllMocks();
		cacheService.set.mockResolvedValue(undefined);
	});

	[true, false].forEach((isCacheEnabled) => {
		const tag = '[' + ['cache', isCacheEnabled ? 'enabled' : 'disabled'].join(' ') + ']';

		describe(`findWebhook() - static case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const path = 'user/profile';
				const mockWebhook = createWebhook(method, path);

				webhookRepository.find.mockResolvedValue([mockWebhook]);

				const returnedWebhook = await webhookService.findWebhook(method, path);

				expect(returnedWebhook).toBe(mockWebhook);
			});

			test('should return the first webhook if multiple match the path and method', async () => {
				const method = 'GET';
				const path = 'user/profile';
				const firstWebhook = createWebhook(method, path);
				const secondWebhook = createWebhook(method, path);

				webhookRepository.find.mockResolvedValue([firstWebhook, secondWebhook]);

				const returnedWebhook = await webhookService.findWebhook(method, path);

				expect(returnedWebhook).toBe(firstWebhook);
			});

			test('should return null if not found', async () => {
				webhookRepository.find.mockResolvedValue([]); // static
				webhookRepository.findBy.mockResolvedValue([]);

				const returnValue = await webhookService.findWebhook('GET', 'user/profile');

				expect(returnValue).toBeNull();
			});
		});

		describe(`findWebhook() - dynamic case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const webhookId = uuid();
				const path = 'user/:id/posts';
				const mockWebhook = createWebhook(method, path, webhookId, 3);

				webhookRepository.find.mockResolvedValue([]); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook]); // dynamic

				const returnedWebhook = await webhookService.findWebhook(
					method,
					[webhookId, 'user/123/posts'].join('/'),
				);

				expect(returnedWebhook).toBe(mockWebhook);
			});

			test('should handle subset dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = uuid();
				const path1 = 'user/:id/posts';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);

				const method2 = 'GET';
				const webhookId2 = uuid();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);

				webhookRepository.find.mockResolvedValue([]); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]); // dynamic

				const fullPath1 = [webhookId1, 'user/123/posts'].join('/');
				const returnedWebhook1 = await webhookService.findWebhook(method1, fullPath1);

				const fullPath2 = [webhookId1, 'user/123/posts/456/comments'].join('/');
				const returnedWebhook2 = await webhookService.findWebhook(method2, fullPath2);

				expect(returnedWebhook1).toBe(mockWebhook1);
				expect(returnedWebhook2).toBe(mockWebhook2);
			});

			test('should handle single-segment dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = uuid();
				const path1 = ':var';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);

				const method2 = 'GET';
				const webhookId2 = uuid();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);

				webhookRepository.find.mockResolvedValue([]); // static
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]); // dynamic

				const fullPath = [webhookId1, 'user/123/posts/456'].join('/');
				const returnedWebhook = await webhookService.findWebhook(method1, fullPath);

				expect(returnedWebhook).toBe(mockWebhook1);
			});

			test('should return null if not found', async () => {
				const fullPath = [uuid(), 'user/:id/posts'].join('/');

				webhookRepository.find.mockResolvedValue([]); // static
				webhookRepository.findBy.mockResolvedValue([]); // dynamic

				const returnValue = await webhookService.findWebhook('GET', fullPath);

				expect(returnValue).toBeNull();
			});
		});
	});

	describe('findTriggerWebhooksByPath()', () => {
		const triggerRow = (fields: Partial<WebhookEntity>) =>
			Object.assign(new WebhookEntity(), {
				workflowId: 'wf-1',
				node: 'Webhook',
				method: 'POST',
				...fields,
			}) as WebhookEntity;

		test('should return every method row of the static trigger serving the method', async () => {
			const get = triggerRow({ webhookPath: 'orders', method: 'GET' });
			const post = triggerRow({ webhookPath: 'orders', method: 'POST' });
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([get, post]);

			expect(await webhookService.findTriggerWebhooksByPath('orders', 'GET')).toEqual([get, post]);
		});

		test('should exclude rows of a different trigger sharing the path', async () => {
			// two workflows can share a path under disjoint methods (the key is (path, method))
			const mine = triggerRow({ webhookPath: 'orders', method: 'GET' });
			const theirs = triggerRow({ webhookPath: 'orders', method: 'POST', workflowId: 'wf-2' });
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([mine, theirs]);

			expect(await webhookService.findTriggerWebhooksByPath('orders', 'GET')).toEqual([mine]);
		});

		test('should resolve an unambiguous path without a method', async () => {
			const only = triggerRow({ webhookPath: 'orders' });
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([only]);
			webhookRepository.findDynamicWebhooksByWebhookId.mockResolvedValue([]);

			expect(await webhookService.findTriggerWebhooksByPath('orders')).toEqual([only]);
		});

		test('should refuse a selector-less path a dynamic template also serves', async () => {
			// the concrete path is static on GET and templated on POST, so without a method
			// there is no single trigger to name — a lone static row must not be accepted
			const webhookId = uuid();
			const concretePath = `${webhookId}/orders/42`;
			const staticGet = triggerRow({ webhookPath: concretePath, method: 'GET' });
			const dynamicPost = triggerRow({
				webhookPath: 'orders/:id',
				method: 'POST',
				webhookId,
				workflowId: 'wf-2',
			});
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([staticGet]);
			webhookRepository.findDynamicWebhooksByWebhookId.mockResolvedValue([dynamicPost]);

			expect(await webhookService.findTriggerWebhooksByPath(concretePath)).toEqual([]);
		});

		test('should fall through to dynamic when no static row serves the method', async () => {
			// a static row for *another* method must not shadow the routed template
			const webhookId = uuid();
			const staticGet = triggerRow({ webhookPath: `${webhookId}/orders`, method: 'GET' });
			const dynamicPost = triggerRow({
				webhookPath: 'orders/:id',
				method: 'POST',
				webhookId,
				workflowId: 'wf-2',
			});
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([staticGet]);
			webhookRepository.findDynamicWebhooksByWebhookId.mockResolvedValue([dynamicPost]);

			expect(
				await webhookService.findTriggerWebhooksByPath(`${webhookId}/orders/42`, 'POST'),
			).toEqual([dynamicPost]);
		});

		test('should pick the dynamic template among rows serving the method', async () => {
			// the winner must come from method-eligible candidates only
			const webhookId = uuid();
			const getTemplate = triggerRow({ webhookPath: 'user/:id', method: 'GET', webhookId });
			const postTemplate = triggerRow({
				webhookPath: ':id/user',
				method: 'POST',
				webhookId,
				workflowId: 'wf-2',
			});
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([]);
			webhookRepository.findDynamicWebhooksByWebhookId.mockResolvedValue([
				getTemplate,
				postTemplate,
			]);

			expect(
				await webhookService.findTriggerWebhooksByPath(`${webhookId}/user/user`, 'POST'),
			).toEqual([postTemplate]);
		});

		test('should return an empty array when nothing matches', async () => {
			webhookRepository.findStaticWebhooksByPath.mockResolvedValue([]);
			webhookRepository.findDynamicWebhooksByWebhookId.mockResolvedValue([]);

			expect(await webhookService.findTriggerWebhooksByPath('orders', 'GET')).toEqual([]);
		});
	});

	describe('findWebhookConflicts', () => {
		test('should return conflicting webhooks', async () => {
			const method = 'GET';
			const path = 'user/profile';
			const mockWebhooks = [
				createWebhook(method, path),
				createWebhook('POST', path),
				createWebhook('GET', 'user/:id'),
			];

			const node1 = {
				id: '1',
				webhookId: 'webhook1',
				name: 'Webhook1',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
				parameters: {
					path: 'conflicting-path',
				},
			} as unknown as INode;

			const node2 = {
				id: '2',
				webhookId: 'webhook2',
				name: 'Webhook2',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
				parameters: {
					path: 'conflicting-path',
				},
			} as unknown as INode;

			const nodeType = {
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path: '/webhook',
							isFullPath: true,
							restartWebhook: false,
						},
					],
					properties: [] as INodeProperties[],
				},
			} as INodeType;

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [node1, node2],
				connections: {},
				active: true,
				nodeTypes,
			});

			webhookRepository.find.mockResolvedValue(mockWebhooks);
			webhookRepository.findBy.mockResolvedValue([]);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();

			const conflicts = await webhookService.findWebhookConflicts(workflow, additionalData);

			expect(conflicts).toHaveLength(1);
		});

		test('should ignore restarting webhooks (wait forms) in conflict checks', async () => {
			const node1 = {
				id: '1',
				webhookId: 'webhook1',
				name: 'Webhook1',
				type: 'n8n-nodes-base.wait',
				disabled: false,
				parameters: {
					resume: 'webhook',
					options: {
						webhookSuffix: 'same-suffix',
					},
				},
			} as unknown as INode;

			const node2 = {
				id: '2',
				webhookId: 'webhook2',
				name: 'Webhook2',
				type: 'n8n-nodes-base.wait',
				disabled: false,
				parameters: {
					resume: 'webhook',
					options: {
						webhookSuffix: 'same-suffix',
					},
				},
			} as unknown as INode;

			const nodeType = {
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path: '/webhook',
							isFullPath: true,
							restartWebhook: true,
						},
					],
					properties: [] as INodeProperties[],
				},
			} as INodeType;

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [node1, node2],
				connections: {},
				active: true,
				nodeTypes,
			});

			webhookRepository.find.mockResolvedValue([]);
			webhookRepository.findBy.mockResolvedValue([]);

			const additionalData = mock<IWorkflowExecuteAdditionalData>();

			const conflicts = await webhookService.findWebhookConflicts(workflow, additionalData);

			expect(conflicts).toHaveLength(0);
		});
	});

	describe('getWebhookMethods()', () => {
		test('should return all methods for webhook', async () => {
			const path = 'user/profile';

			webhookRepository.find.mockResolvedValue([
				createWebhook('GET', path),
				createWebhook('POST', path),
				createWebhook('PUT', path),
				createWebhook('PATCH', path),
			]);

			const returnedMethods = await webhookService.getWebhookMethods(path);

			expect(returnedMethods).toEqual(['GET', 'POST', 'PUT', 'PATCH']);
		});

		test('should return empty array if no webhooks found', async () => {
			webhookRepository.find.mockResolvedValue([]);

			const returnedMethods = await webhookService.getWebhookMethods('user/profile');

			expect(returnedMethods).toEqual([]);
		});

		test('should return dynamic webhook method when static search returns nothing', async () => {
			const webhookId = uuid();
			const dynamicPath = `${webhookId}/user/1`;
			const mockDynamicWebhook = createWebhook('POST', 'user/:id', webhookId, 2);

			// Mock static webhook search to return empty
			webhookRepository.find.mockResolvedValue([]);
			// Mock dynamic webhook search to return a webhook
			webhookRepository.findBy.mockResolvedValue([mockDynamicWebhook]);

			const returnedMethods = await webhookService.getWebhookMethods(dynamicPath);

			expect(returnedMethods).toEqual(['POST']);
		});
	});

	describe('deleteWorkflowWebhooks()', () => {
		test('should delete all webhooks of the workflow', async () => {
			const mockWorkflowWebhooks = [
				createWebhook('PUT', 'users'),
				createWebhook('GET', 'user/:id'),
				createWebhook('POST', ':var'),
			];

			webhookRepository.findBy.mockResolvedValue(mockWorkflowWebhooks);

			const workflowId = uuid();

			await webhookService.deleteWorkflowWebhooks(workflowId);

			expect(webhookRepository.remove).toHaveBeenCalledWith(mockWorkflowWebhooks);
		});

		test('should not delete any webhooks if none found', async () => {
			webhookRepository.findBy.mockResolvedValue([]);

			const workflowId = uuid();

			await webhookService.deleteWorkflowWebhooks(workflowId);

			expect(webhookRepository.remove).toHaveBeenCalledWith([]);
		});
	});

	describe('getRegisteredWebhooks()', () => {
		test('returns the webhooks registered for the workflow', async () => {
			const rows = [createWebhook('GET', 'users'), createWebhook('POST', 'user/:id')];
			webhookRepository.findBy.mockResolvedValue(rows);

			const result = await webhookService.getRegisteredWebhooks('wf-1');

			expect(result).toBe(rows);
			expect(webhookRepository.findBy).toHaveBeenCalledWith({ workflowId: 'wf-1' });
		});
	});

	describe('storeWebhook()', () => {
		const buildWebhook = (overrides: Partial<WebhookEntity> = {}) =>
			Object.assign(new WebhookEntity(), {
				method: 'GET',
				webhookPath: 'payment-webhook',
				workflowId: 'workflow-1',
				node: 'Webhook',
				...overrides,
			}) as WebhookEntity;

		test('should store webhook in DB and cache it', async () => {
			const webhook = buildWebhook();

			await webhookService.storeWebhook(webhook);

			expect(webhookRepository.insert).toHaveBeenCalledWith(webhook);
			expect(cacheService.set).toHaveBeenCalledWith(webhook.cacheKey, webhook);
		});

		test('should reject storing a webhook whose path belongs to another workflow', async () => {
			const webhook = buildWebhook({ workflowId: 'workflow-1' });
			const existing = buildWebhook({ workflowId: 'workflow-2', node: 'Other' });

			webhookRepository.insert.mockRejectedValueOnce(new Error('duplicate key'));
			webhookRepository.findOneBy.mockResolvedValueOnce(existing);

			await expect(webhookService.storeWebhook(webhook)).rejects.toThrow(WebhookPathTakenError);

			expect(webhookRepository.update).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});

		test('should refresh an existing webhook owned by the same workflow', async () => {
			const webhook = buildWebhook({ workflowId: 'workflow-1' });
			const existing = buildWebhook({ workflowId: 'workflow-1' });

			webhookRepository.insert.mockRejectedValueOnce(new Error('duplicate key'));
			webhookRepository.findOneBy.mockResolvedValueOnce(existing);

			await webhookService.storeWebhook(webhook);

			expect(webhookRepository.update).toHaveBeenCalledWith(
				{ method: webhook.method, webhookPath: webhook.webhookPath },
				webhook,
			);
			expect(cacheService.set).toHaveBeenCalledWith(webhook.cacheKey, webhook);
		});

		test('should surface the original error when the failure is not a duplicate path', async () => {
			const webhook = buildWebhook();
			const dbError = new Error('connection lost');

			webhookRepository.insert.mockRejectedValueOnce(dbError);
			webhookRepository.findOneBy.mockResolvedValueOnce(null);

			await expect(webhookService.storeWebhook(webhook)).rejects.toBe(dbError);

			expect(webhookRepository.update).not.toHaveBeenCalled();
			expect(cacheService.set).not.toHaveBeenCalled();
		});
	});

	describe('createWebhook()', () => {
		it('normalizes the path and adds dynamic path metadata', () => {
			webhookRepository.create.mockImplementation(
				(data) => Object.assign(new WebhookEntity(), data) as WebhookEntity,
			);

			const webhook = webhookService.createWebhook(
				{
					workflowId: 'wf-1',
					webhookPath: ' /:id/team/ ',
					node: 'Webhook',
					method: 'GET',
				},
				'hook-id',
			);

			expect(webhook).toEqual(
				expect.objectContaining({
					webhookPath: ':id/team',
					webhookId: 'hook-id',
					pathLength: 2,
				}),
			);
		});
	});

	describe('getStaticWebhookKeys()', () => {
		const webhookNodeType = {
			description: {
				properties: [
					{
						displayName: 'Path',
						name: 'path',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Method',
						name: 'httpMethod',
						type: 'string',
						default: 'GET',
					},
				],
				webhooks: [
					{
						name: 'default',
						httpMethod: '={{$parameter["httpMethod"]}}',
						path: '={{$parameter["path"]}}',
						isFullPath: true,
					},
				],
			},
		} as INodeType;

		const createWebhookNode = (overrides: Partial<INode> = {}) =>
			({
				id: 'webhook-node',
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				position: [0, 0],
				webhookId: 'webhook-id',
				parameters: { path: '/test/', httpMethod: 'GET' },
				...overrides,
			}) as INode;

		beforeEach(() => {
			nodeTypes.getByNameAndVersion.mockReturnValue(webhookNodeType);
		});

		it('returns the method and normalized static path', () => {
			expect(webhookService.getStaticWebhookKeys([createWebhookNode()])).toEqual(['GET test']);
		});

		it.each([
			['disabled node', { disabled: true }],
			['node without a webhook id', { webhookId: undefined }],
			['node without a path', { parameters: { httpMethod: 'GET' } }],
			['expression path', { parameters: { path: '={{ "/test" }}', httpMethod: 'GET' } }],
			['empty path', { parameters: { path: '/', httpMethod: 'GET' } }],
			['dynamic path', { parameters: { path: '/users/:id', httpMethod: 'GET' } }],
		] satisfies Array<[string, Partial<INode>]>)('skips a %s', (_name, overrides) => {
			expect(webhookService.getStaticWebhookKeys([createWebhookNode(overrides)])).toEqual([]);
		});

		it('skips nodes without a full-path webhook', () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { ...webhookNodeType.description, webhooks: [{ isFullPath: false }] },
			} as INodeType);

			expect(webhookService.getStaticWebhookKeys([createWebhookNode()])).toEqual([]);
		});
	});

	describe('getNodeWebhooks()', () => {
		const workflow = new Workflow({
			id: 'test-workflow',
			nodes: [],
			connections: {},
			active: true,
			nodeTypes,
		});

		test('should return empty array if node is disabled', async () => {
			const node = { disabled: true } as INode;

			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);

			expect(webhooks).toEqual([]);
		});

		test('should return webhooks for node with webhook definitions', async () => {
			const node = {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
			} as INode;

			const nodeType = {
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path: '/webhook',
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			} as INodeType;

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0]).toMatchObject({
				httpMethod: 'GET',
				node: 'Webhook',
				workflowId: 'test-workflow',
			});
		});

		test('should trim surrounding whitespace and slashes from the path', async () => {
			const node = {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
			} as INode;

			const nodeType = {
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path: ' /path/ ',
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			} as INodeType;

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].path).not.toMatch(/\s/);
			expect(webhooks[0].path).toMatch(/\/path$/);
		});

		test('should resolve declared fields natively, without the expression engine', async () => {
			const node = {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
				parameters: { path: 'native-path', httpMethod: 'POST' },
			} as unknown as INode;

			const fields = webhookDescriptionFields({
				httpMethod: fromParameter('httpMethod', 'GET'),
				path: fromParameter('path'),
			});
			const nodeType = {
				description: {
					webhooks: [
						{
							name: 'default',
							...fields,
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			} as INodeType;

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			const engineSpy = vi.spyOn(workflow.expression, 'getSimpleParameterValue');

			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0]).toMatchObject({ httpMethod: 'POST' });
			expect(webhooks[0].path).toMatch(/\/native-path$/);
			// fields with declared resolvers must never engage the expression engine
			const engineEvaluatedValues = engineSpy.mock.calls.map((call) => call[1]);
			expect(engineEvaluatedValues).not.toContain(fields.path);
			expect(engineEvaluatedValues).not.toContain(fields.httpMethod);
		});
	});

	describe('createWebhookIfNotExists()', () => {
		const workflow = new Workflow({
			id: 'test-workflow',
			nodes: [
				mock<INode>({
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 1,
					parameters: {},
				}),
			],
			connections: {},
			active: false,
			nodeTypes,
		});

		const webhookData = mock<IWebhookData>({
			node: 'Webhook',
			webhookDescription: {
				name: 'default',
				httpMethod: 'GET',
				path: '/webhook',
			},
		});

		const defaultWebhookMethods = {
			checkExists: vi.fn(),
			create: vi.fn(),
		};

		const nodeType = mock<INodeType>({
			webhookMethods: { default: defaultWebhookMethods },
		});

		test('should create webhook if it does not exist', async () => {
			defaultWebhookMethods.checkExists.mockResolvedValue(false);
			defaultWebhookMethods.create.mockResolvedValue(true);
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');

			expect(defaultWebhookMethods.checkExists).toHaveBeenCalled();
			expect(defaultWebhookMethods.create).toHaveBeenCalled();
		});

		test('should not create webhook if it already exists', async () => {
			defaultWebhookMethods.checkExists.mockResolvedValue(true);
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');

			expect(defaultWebhookMethods.checkExists).toHaveBeenCalled();
			expect(defaultWebhookMethods.create).not.toHaveBeenCalled();
		});

		test('should handle case when webhook methods are not defined', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({} as INodeType);

			await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');
			// Test passes if no error is thrown when webhook methods are undefined
		});
	});

	describe('deleteWebhook()', () => {
		test('should call runWebhookMethod with delete', async () => {
			const workflow = mock<Workflow>();
			const webhookData = mock<IWebhookData>();
			const runWebhookMethodSpy = vi.spyOn(webhookService as any, 'runWebhookMethod');

			await webhookService.deleteWebhook(workflow, webhookData, 'trigger', 'init');

			expect(runWebhookMethodSpy).toHaveBeenCalledWith(
				'delete',
				workflow,
				webhookData,
				'trigger',
				'init',
			);
		});
	});

	describe('runWebhook()', () => {
		const workflow = mock<Workflow>();
		const webhookData = mock<IWebhookData>();
		const node = mock<INode>();
		const responseData = { workflowData: [] };

		test('should throw error if node does not have webhooks', async () => {
			const nodeType = {} as INodeType;
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			await expect(
				webhookService.runWebhook(workflow, webhookData, node, additionalData, 'trigger', null),
			).rejects.toThrow('Node does not have any webhooks defined');
		});

		test('should execute webhook and return response data', async () => {
			const nodeType = mock<INodeType>({
				webhook: vi.fn().mockResolvedValue(responseData),
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const result = await webhookService.runWebhook(
				workflow,
				webhookData,
				node,
				additionalData,
				'trigger',
				null,
			);

			expect(result).toEqual(responseData);
			expect(nodeType.webhook).toHaveBeenCalled();
		});

		test('should run close functions after webhook completes', async () => {
			const closeFunction = vi.fn().mockResolvedValue(undefined);
			const nodeType = mock<INodeType>({
				webhook: vi.fn().mockImplementation(async function (this: any) {
					this.closeFunctions.push(closeFunction);
					return responseData;
				}),
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			await webhookService.runWebhook(workflow, webhookData, node, additionalData, 'trigger', null);

			expect(closeFunction).toHaveBeenCalledTimes(1);
		});

		test('should run close functions even when webhook throws', async () => {
			const closeFunction = vi.fn().mockResolvedValue(undefined);
			const nodeType = mock<INodeType>({
				webhook: vi.fn().mockImplementation(async function (this: any) {
					this.closeFunctions.push(closeFunction);
					throw new Error('webhook failed');
				}),
			});
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			await expect(
				webhookService.runWebhook(workflow, webhookData, node, additionalData, 'trigger', null),
			).rejects.toThrow('webhook failed');

			expect(closeFunction).toHaveBeenCalledTimes(1);
		});
	});

	describe('findCached()', () => {
		test('should not cache dynamic webhooks', async () => {
			const method = 'GET';
			const webhookId = uuid();
			const fullPath = `${webhookId}/user/123/posts`;
			const dynamicWebhook = createWebhook(method, 'user/:id/posts', webhookId, 3);

			webhookRepository.find.mockResolvedValueOnce([]); // static lookup
			webhookRepository.findBy.mockResolvedValueOnce([dynamicWebhook]); // dynamic lookup

			const result1 = await webhookService.findWebhook(method, fullPath);
			expect(result1).toBe(dynamicWebhook);

			expect(cacheService.set).not.toHaveBeenCalled();

			webhookRepository.find.mockResolvedValueOnce([]);
			webhookRepository.findBy.mockResolvedValueOnce([dynamicWebhook]);

			const result2 = await webhookService.findWebhook(method, fullPath);
			expect(result2).toBe(dynamicWebhook);

			expect(webhookRepository.find).toHaveBeenCalledTimes(2);
			expect(webhookRepository.findBy).toHaveBeenCalledTimes(2);
		});
	});

	describe('isDynamicPath', () => {
		test.each(['a', 'a/b'])('should treat static path (%s) as static', (path) => {
			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});

			const node = mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
			});

			const nodeType = mock<INodeType>({
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path,
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].webhookId).toBeUndefined();
		});

		test.each([':', '/:'])('should treat literal colon path (%s) as static', (path) => {
			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});

			const nodeWithWebhookId = mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				webhookId: undefined,
			});

			const nodeType = mock<INodeType>({
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path,
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const webhooks = webhookService.getNodeWebhooks(workflow, nodeWithWebhookId, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].webhookId).toBeUndefined();
		});

		test('should treat dynamic path (user/:id) as dynamic', () => {
			const workflow = new Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});

			const nodeWithWebhookId = mock<INode>({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
				webhookId: 'test-webhook-id',
			});

			const nodeType = mock<INodeType>({
				description: {
					webhooks: [
						{
							name: 'default',
							httpMethod: 'GET',
							path: 'user/:id',
							isFullPath: false,
							restartWebhook: false,
						},
					],
				},
			});

			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

			const webhooks = webhookService.getNodeWebhooks(workflow, nodeWithWebhookId, additionalData);

			expect(webhooks).toHaveLength(1);
			expect(webhooks[0].webhookId).toBe('test-webhook-id');
		});
	});
});

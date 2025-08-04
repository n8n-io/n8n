'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const config_1 = __importDefault(require('@/config'));
const webhook_service_1 = require('@/webhooks/webhook.service');
const createWebhook = (method, path, webhookId, pathSegments) =>
	Object.assign(new db_1.WebhookEntity(), {
		method,
		webhookPath: path,
		webhookId,
		pathSegments,
	});
describe('WebhookService', () => {
	const webhookRepository = (0, jest_mock_extended_1.mock)();
	const cacheService = (0, jest_mock_extended_1.mock)();
	const nodeTypes = (0, jest_mock_extended_1.mock)();
	const webhookService = new webhook_service_1.WebhookService(
		(0, jest_mock_extended_1.mock)(),
		webhookRepository,
		cacheService,
		nodeTypes,
	);
	const additionalData = (0, jest_mock_extended_1.mock)();
	beforeEach(() => {
		config_1.default.load(config_1.default.default);
		jest.clearAllMocks();
	});
	[true, false].forEach((isCacheEnabled) => {
		const tag = '[' + ['cache', isCacheEnabled ? 'enabled' : 'disabled'].join(' ') + ']';
		describe(`findWebhook() - static case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const path = 'user/profile';
				const mockWebhook = createWebhook(method, path);
				webhookRepository.findOneBy.mockResolvedValue(mockWebhook);
				const returnedWebhook = await webhookService.findWebhook(method, path);
				expect(returnedWebhook).toBe(mockWebhook);
			});
			test('should return null if not found', async () => {
				webhookRepository.findOneBy.mockResolvedValue(null);
				webhookRepository.findBy.mockResolvedValue([]);
				const returnValue = await webhookService.findWebhook('GET', 'user/profile');
				expect(returnValue).toBeNull();
			});
		});
		describe(`findWebhook() - dynamic case ${tag}`, () => {
			test('should return the webhook if found', async () => {
				const method = 'GET';
				const webhookId = (0, uuid_1.v4)();
				const path = 'user/:id/posts';
				const mockWebhook = createWebhook(method, path, webhookId, 3);
				webhookRepository.findOneBy.mockResolvedValue(null);
				webhookRepository.findBy.mockResolvedValue([mockWebhook]);
				const returnedWebhook = await webhookService.findWebhook(
					method,
					[webhookId, 'user/123/posts'].join('/'),
				);
				expect(returnedWebhook).toBe(mockWebhook);
			});
			test('should handle subset dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = (0, uuid_1.v4)();
				const path1 = 'user/:id/posts';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);
				const method2 = 'GET';
				const webhookId2 = (0, uuid_1.v4)();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);
				webhookRepository.findOneBy.mockResolvedValue(null);
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]);
				const fullPath1 = [webhookId1, 'user/123/posts'].join('/');
				const returnedWebhook1 = await webhookService.findWebhook(method1, fullPath1);
				const fullPath2 = [webhookId1, 'user/123/posts/456/comments'].join('/');
				const returnedWebhook2 = await webhookService.findWebhook(method2, fullPath2);
				expect(returnedWebhook1).toBe(mockWebhook1);
				expect(returnedWebhook2).toBe(mockWebhook2);
			});
			test('should handle single-segment dynamic path case', async () => {
				const method1 = 'GET';
				const webhookId1 = (0, uuid_1.v4)();
				const path1 = ':var';
				const mockWebhook1 = createWebhook(method1, path1, webhookId1, 3);
				const method2 = 'GET';
				const webhookId2 = (0, uuid_1.v4)();
				const path2 = 'user/:id/posts/:postId/comments';
				const mockWebhook2 = createWebhook(method2, path2, webhookId2, 3);
				webhookRepository.findOneBy.mockResolvedValue(null);
				webhookRepository.findBy.mockResolvedValue([mockWebhook1, mockWebhook2]);
				const fullPath = [webhookId1, 'user/123/posts/456'].join('/');
				const returnedWebhook = await webhookService.findWebhook(method1, fullPath);
				expect(returnedWebhook).toBe(mockWebhook1);
			});
			test('should return null if not found', async () => {
				const fullPath = [(0, uuid_1.v4)(), 'user/:id/posts'].join('/');
				webhookRepository.findOneBy.mockResolvedValue(null);
				webhookRepository.findBy.mockResolvedValue([]);
				const returnValue = await webhookService.findWebhook('GET', fullPath);
				expect(returnValue).toBeNull();
			});
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
	});
	describe('deleteWorkflowWebhooks()', () => {
		test('should delete all webhooks of the workflow', async () => {
			const mockWorkflowWebhooks = [
				createWebhook('PUT', 'users'),
				createWebhook('GET', 'user/:id'),
				createWebhook('POST', ':var'),
			];
			webhookRepository.findBy.mockResolvedValue(mockWorkflowWebhooks);
			const workflowId = (0, uuid_1.v4)();
			await webhookService.deleteWorkflowWebhooks(workflowId);
			expect(webhookRepository.remove).toHaveBeenCalledWith(mockWorkflowWebhooks);
		});
		test('should not delete any webhooks if none found', async () => {
			webhookRepository.findBy.mockResolvedValue([]);
			const workflowId = (0, uuid_1.v4)();
			await webhookService.deleteWorkflowWebhooks(workflowId);
			expect(webhookRepository.remove).toHaveBeenCalledWith([]);
		});
	});
	describe('createWebhook()', () => {
		test('should store webhook in DB', async () => {
			const mockWebhook = createWebhook('GET', 'user/:id');
			await webhookService.storeWebhook(mockWebhook);
			expect(webhookRepository.upsert).toHaveBeenCalledWith(mockWebhook, ['method', 'webhookPath']);
		});
	});
	describe('getNodeWebhooks()', () => {
		const workflow = new n8n_workflow_1.Workflow({
			id: 'test-workflow',
			nodes: [],
			connections: {},
			active: true,
			nodeTypes,
		});
		test('should return empty array if node is disabled', async () => {
			const node = { disabled: true };
			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);
			expect(webhooks).toEqual([]);
		});
		test('should return webhooks for node with webhook definitions', async () => {
			const node = {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
			};
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
			};
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			const webhooks = webhookService.getNodeWebhooks(workflow, node, additionalData);
			expect(webhooks).toHaveLength(1);
			expect(webhooks[0]).toMatchObject({
				httpMethod: 'GET',
				node: 'Webhook',
				workflowId: 'test-workflow',
			});
		});
	});
	describe('createWebhookIfNotExists()', () => {
		const workflow = new n8n_workflow_1.Workflow({
			id: 'test-workflow',
			nodes: [
				(0, jest_mock_extended_1.mock)({
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
		const webhookData = (0, jest_mock_extended_1.mock)({
			node: 'Webhook',
			webhookDescription: {
				name: 'default',
				httpMethod: 'GET',
				path: '/webhook',
			},
		});
		const defaultWebhookMethods = {
			checkExists: jest.fn(),
			create: jest.fn(),
		};
		const nodeType = (0, jest_mock_extended_1.mock)({
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
			nodeTypes.getByNameAndVersion.mockReturnValue({});
			await webhookService.createWebhookIfNotExists(workflow, webhookData, 'trigger', 'init');
		});
	});
	describe('deleteWebhook()', () => {
		test('should call runWebhookMethod with delete', async () => {
			const workflow = (0, jest_mock_extended_1.mock)();
			const webhookData = (0, jest_mock_extended_1.mock)();
			const runWebhookMethodSpy = jest.spyOn(webhookService, 'runWebhookMethod');
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
		const workflow = (0, jest_mock_extended_1.mock)();
		const webhookData = (0, jest_mock_extended_1.mock)();
		const node = (0, jest_mock_extended_1.mock)();
		const responseData = { workflowData: [] };
		test('should throw error if node does not have webhooks', async () => {
			const nodeType = {};
			nodeTypes.getByNameAndVersion.mockReturnValue(nodeType);
			await expect(
				webhookService.runWebhook(workflow, webhookData, node, additionalData, 'trigger', null),
			).rejects.toThrow('Node does not have any webhooks defined');
		});
		test('should execute webhook and return response data', async () => {
			const nodeType = (0, jest_mock_extended_1.mock)({
				webhook: jest.fn().mockResolvedValue(responseData),
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
	});
	describe('findCached()', () => {
		test('should not cache dynamic webhooks', async () => {
			const method = 'GET';
			const webhookId = (0, uuid_1.v4)();
			const fullPath = `${webhookId}/user/123/posts`;
			const dynamicWebhook = createWebhook(method, 'user/:id/posts', webhookId, 3);
			webhookRepository.findOneBy.mockResolvedValueOnce(null);
			webhookRepository.findBy.mockResolvedValueOnce([dynamicWebhook]);
			const result1 = await webhookService.findWebhook(method, fullPath);
			expect(result1).toBe(dynamicWebhook);
			expect(cacheService.set).not.toHaveBeenCalled();
			webhookRepository.findOneBy.mockResolvedValueOnce(null);
			webhookRepository.findBy.mockResolvedValueOnce([dynamicWebhook]);
			const result2 = await webhookService.findWebhook(method, fullPath);
			expect(result2).toBe(dynamicWebhook);
			expect(webhookRepository.findOneBy).toHaveBeenCalledTimes(2);
			expect(webhookRepository.findBy).toHaveBeenCalledTimes(2);
		});
	});
	describe('isDynamicPath', () => {
		test.each(['a', 'a/b'])('should treat static path (%s) as static', (path) => {
			const workflow = new n8n_workflow_1.Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});
			const node = (0, jest_mock_extended_1.mock)({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
			});
			const nodeType = (0, jest_mock_extended_1.mock)({
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
			const workflow = new n8n_workflow_1.Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});
			const nodeWithWebhookId = (0, jest_mock_extended_1.mock)({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
			});
			const nodeType = (0, jest_mock_extended_1.mock)({
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
			const workflow = new n8n_workflow_1.Workflow({
				id: 'test-workflow',
				nodes: [],
				connections: {},
				active: true,
				nodeTypes,
			});
			const nodeWithWebhookId = (0, jest_mock_extended_1.mock)({
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				disabled: false,
				webhookId: 'test-webhook-id',
			});
			const nodeType = (0, jest_mock_extended_1.mock)({
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
//# sourceMappingURL=webhook.service.test.js.map

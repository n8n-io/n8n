'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const db_1 = require('@n8n/db');
const jest_mock_extended_1 = require('jest-mock-extended');
const uuid_1 = require('uuid');
const not_found_error_1 = require('@/errors/response-errors/not-found.error');
const webhook_not_found_error_1 = require('@/errors/response-errors/webhook-not-found.error');
const test_webhooks_1 = require('@/webhooks/test-webhooks');
const WebhookHelpers = __importStar(require('@/webhooks/webhook-helpers'));
const AdditionalData = __importStar(require('@/workflow-execute-additional-data'));
jest.mock('@/workflow-execute-additional-data');
const mockedAdditionalData = AdditionalData;
const workflowEntity = (0, jest_mock_extended_1.mock)({
	id: (0, db_1.generateNanoId)(),
	nodes: [],
});
const httpMethod = 'GET';
const path = (0, uuid_1.v4)();
const userId = '04ab4baf-85df-478f-917b-d303934a97de';
const webhook = (0, jest_mock_extended_1.mock)({
	httpMethod,
	path,
	workflowId: workflowEntity.id,
	userId,
});
describe('TestWebhooks', () => {
	const registrations = (0, jest_mock_extended_1.mock)();
	const webhookService = (0, jest_mock_extended_1.mock)();
	const testWebhooks = new test_webhooks_1.TestWebhooks(
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		registrations,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		webhookService,
	);
	beforeAll(() => {
		jest.useFakeTimers();
	});
	beforeEach(() => {
		jest.resetAllMocks();
	});
	describe('needsWebhook()', () => {
		const args = {
			userId,
			workflowEntity,
			additionalData: (0, jest_mock_extended_1.mock)(),
		};
		test('if webhook is needed, should register then create webhook and return true', async () => {
			const workflow = (0, jest_mock_extended_1.mock)();
			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			const needsWebhook = await testWebhooks.needsWebhook(args);
			const [registerOrder] = registrations.register.mock.invocationCallOrder;
			const [createOrder] = webhookService.createWebhookIfNotExists.mock.invocationCallOrder;
			expect(registerOrder).toBeLessThan(createOrder);
			expect(needsWebhook).toBe(true);
		});
		test('if webhook activation fails, should deactivate workflow webhooks', async () => {
			const msg = 'Failed to add webhook to active webhooks';
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			jest.spyOn(registrations, 'register').mockRejectedValueOnce(new Error(msg));
			registrations.getAllRegistrations.mockResolvedValue([]);
			const needsWebhook = testWebhooks.needsWebhook(args);
			await expect(needsWebhook).rejects.toThrowError(msg);
		});
		test('if no webhook is found to start workflow, should return false', async () => {
			webhook.webhookDescription.restartWebhook = true;
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			const result = await testWebhooks.needsWebhook(args);
			expect(result).toBe(false);
		});
		test('returns false if a triggerToStartFrom with triggerData is given', async () => {
			const workflow = (0, jest_mock_extended_1.mock)();
			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook]);
			const needsWebhook = await testWebhooks.needsWebhook({
				...args,
				triggerToStartFrom: {
					name: 'trigger',
					data: (0, jest_mock_extended_1.mock)(),
				},
			});
			expect(needsWebhook).toBe(false);
		});
		test('returns true, registers and then creates webhook if triggerToStartFrom is given with no triggerData', async () => {
			const workflow = (0, jest_mock_extended_1.mock)();
			const webhook2 = (0, jest_mock_extended_1.mock)({
				node: 'trigger',
				httpMethod,
				path,
				workflowId: workflowEntity.id,
				userId,
			});
			jest.spyOn(testWebhooks, 'toWorkflow').mockReturnValueOnce(workflow);
			jest.spyOn(WebhookHelpers, 'getWorkflowWebhooks').mockReturnValue([webhook, webhook2]);
			const needsWebhook = await testWebhooks.needsWebhook({
				...args,
				triggerToStartFrom: { name: 'trigger' },
			});
			const [registerOrder] = registrations.register.mock.invocationCallOrder;
			const [createOrder] = webhookService.createWebhookIfNotExists.mock.invocationCallOrder;
			expect(registerOrder).toBeLessThan(createOrder);
			expect(registrations.register.mock.calls[0][0].webhook.node).toBe(webhook2.node);
			expect(webhookService.createWebhookIfNotExists.mock.calls[0][1].node).toBe(webhook2.node);
			expect(needsWebhook).toBe(true);
		});
	});
	describe('executeWebhook()', () => {
		test('if webhook is not registered, should throw', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);
			const promise = testWebhooks.executeWebhook(
				(0, jest_mock_extended_1.mock)({ params: { path } }),
				(0, jest_mock_extended_1.mock)(),
			);
			await expect(promise).rejects.toThrowError(webhook_not_found_error_1.WebhookNotFoundError);
		});
		test('if webhook is registered but missing from workflow, should throw', async () => {
			jest.spyOn(testWebhooks, 'getActiveWebhook').mockResolvedValue(webhook);
			jest.spyOn(testWebhooks, 'getWebhookMethods').mockResolvedValue([]);
			const registration = (0, jest_mock_extended_1.mock)({
				pushRef: 'some-session-id',
				workflowEntity,
			});
			await registrations.register(registration);
			const promise = testWebhooks.executeWebhook(
				(0, jest_mock_extended_1.mock)({ params: { path } }),
				(0, jest_mock_extended_1.mock)(),
			);
			await expect(promise).rejects.toThrowError(not_found_error_1.NotFoundError);
		});
	});
	describe('deactivateWebhooks()', () => {
		test('should add additional data to workflow', async () => {
			registrations.getAllRegistrations.mockResolvedValue([{ workflowEntity, webhook }]);
			const workflow = testWebhooks.toWorkflow(workflowEntity);
			await testWebhooks.deactivateWebhooks(workflow);
			expect(mockedAdditionalData.getBase).toHaveBeenCalledWith(userId);
		});
	});
	describe('getWebhookMethods()', () => {
		test('should normalize trailing slash', async () => {
			const METHOD = 'POST';
			const PATH_WITH_SLASH = 'register/';
			const PATH_WITHOUT_SLASH = 'register';
			registrations.getAllKeys.mockResolvedValue([`${METHOD}|${PATH_WITHOUT_SLASH}`]);
			const resultWithSlash = await testWebhooks.getWebhookMethods(PATH_WITH_SLASH);
			const resultWithoutSlash = await testWebhooks.getWebhookMethods(PATH_WITHOUT_SLASH);
			expect(resultWithSlash).toEqual([METHOD]);
			expect(resultWithoutSlash).toEqual([METHOD]);
		});
	});
});
//# sourceMappingURL=test-webhooks.test.js.map

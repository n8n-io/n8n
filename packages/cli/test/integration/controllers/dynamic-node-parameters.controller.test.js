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
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const jest_mock_extended_1 = require('jest-mock-extended');
const dynamic_node_parameters_service_1 = require('@/services/dynamic-node-parameters.service');
const AdditionalData = __importStar(require('@/workflow-execute-additional-data'));
const users_1 = require('../shared/db/users');
const utils_1 = require('../shared/utils');
describe('DynamicNodeParametersController', () => {
	const additionalData = (0, jest_mock_extended_1.mock)();
	const service = (0, backend_test_utils_1.mockInstance)(
		dynamic_node_parameters_service_1.DynamicNodeParametersService,
	);
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['dynamic-node-parameters'] });
	let ownerAgent;
	beforeAll(async () => {
		const owner = await (0, users_1.createOwner)();
		ownerAgent = testServer.authAgentFor(owner);
	});
	beforeEach(() => {
		jest.clearAllMocks();
		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(additionalData);
	});
	const commonRequestParams = {
		credentials: {},
		currentNodeParameters: {},
		nodeTypeAndVersion: { name: 'TestNode', version: 1 },
		path: 'path',
	};
	describe('POST /dynamic-node-parameters/options', () => {
		it('should take params via body', async () => {
			service.getOptionsViaMethodName.mockResolvedValue([]);
			await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);
		});
		it('should take params with loadOptions', async () => {
			const expectedResult = [{ name: 'Test Option', value: 'test' }];
			service.getOptionsViaLoadOptions.mockResolvedValue(expectedResult);
			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
					loadOptions: { type: 'test' },
				})
				.expect(200);
			expect(response.body).toEqual({ data: expectedResult });
		});
		it('should return empty array when no method or loadOptions provided', async () => {
			const response = await ownerAgent
				.post('/dynamic-node-parameters/options')
				.send({
					...commonRequestParams,
				})
				.expect(200);
			expect(response.body).toEqual({ data: [] });
		});
	});
	describe('POST /dynamic-node-parameters/resource-locator-results', () => {
		it('should return resource locator results', async () => {
			const expectedResult = { results: [] };
			service.getResourceLocatorResults.mockResolvedValue(expectedResult);
			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					filter: 'testFilter',
					paginationToken: 'testToken',
				})
				.expect(200);
			expect(response.body).toEqual({ data: expectedResult });
		});
		it('should handle resource locator results without pagination', async () => {
			const mockResults = (0, jest_mock_extended_1.mock)();
			service.getResourceLocatorResults.mockResolvedValue(mockResults);
			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send({
					methodName: 'testMethod',
					...commonRequestParams,
				})
				.expect(200);
		});
		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/resource-locator-results')
				.send(commonRequestParams)
				.expect(400);
		});
	});
	describe('POST /dynamic-node-parameters/resource-mapper-fields', () => {
		it('should return resource mapper fields', async () => {
			const expectedResult = { fields: [] };
			service.getResourceMappingFields.mockResolvedValue(expectedResult);
			const response = await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
					loadOptions: 'testLoadOptions',
				})
				.expect(200);
			expect(response.body).toEqual({ data: expectedResult });
		});
		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});
	describe('POST /dynamic-node-parameters/local-resource-mapper-fields', () => {
		it('should return local resource mapper fields', async () => {
			const expectedResult = { fields: [] };
			service.getLocalResourceMappingFields.mockResolvedValue(expectedResult);
			const response = await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send({
					...commonRequestParams,
					methodName: 'testMethod',
				})
				.expect(200);
			expect(response.body).toEqual({ data: expectedResult });
		});
		it('should return a 400 if methodName is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/local-resource-mapper-fields')
				.send(commonRequestParams)
				.expect(400);
		});
	});
	describe('POST /dynamic-node-parameters/action-result', () => {
		it('should return action result with handler', async () => {
			const expectedResult = { test: true };
			service.getActionResult.mockResolvedValue(expectedResult);
			const response = await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					handler: 'testHandler',
					payload: { someData: 'test' },
				})
				.expect(200);
			expect(response.body).toEqual({ data: expectedResult });
		});
		it('should return a 400 if handler is not defined', async () => {
			await ownerAgent
				.post('/dynamic-node-parameters/action-result')
				.send({
					...commonRequestParams,
					payload: { someData: 'test' },
				})
				.expect(400);
		});
	});
});
//# sourceMappingURL=dynamic-node-parameters.controller.test.js.map

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
const jest_mock_extended_1 = require('jest-mock-extended');
const dynamic_node_parameters_controller_1 = require('@/controllers/dynamic-node-parameters.controller');
const AdditionalData = __importStar(require('@/workflow-execute-additional-data'));
describe('DynamicNodeParametersController', () => {
	let service;
	let controller;
	let mockUser;
	let baseAdditionalData;
	beforeEach(() => {
		service = (0, jest_mock_extended_1.mock)();
		controller = new dynamic_node_parameters_controller_1.DynamicNodeParametersController(service);
		mockUser = { id: 'user123' };
		baseAdditionalData = (0, jest_mock_extended_1.mock)();
		jest.spyOn(AdditionalData, 'getBase').mockResolvedValue(baseAdditionalData);
	});
	describe('getOptions', () => {
		const basePayload = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			currentNodeParameters: {},
		};
		it('should call getOptionsViaMethodName when methodName is provided', async () => {
			const payload = {
				...basePayload,
				methodName: 'testMethod',
			};
			const req = { user: mockUser };
			const expectedResult = [{ name: 'test', value: 'value' }];
			service.getOptionsViaMethodName.mockResolvedValue(expectedResult);
			const result = await controller.getOptions(req, (0, jest_mock_extended_1.mock)(), payload);
			expect(service.getOptionsViaMethodName).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
		it('should call getOptionsViaLoadOptions when loadOptions is provided', async () => {
			const loadOptions = {
				routing: {
					operations: {},
				},
			};
			const payload = {
				...basePayload,
				loadOptions,
			};
			const req = { user: mockUser };
			const expectedResult = [{ name: 'test', value: 'value' }];
			service.getOptionsViaLoadOptions.mockResolvedValue(expectedResult);
			const result = await controller.getOptions(req, (0, jest_mock_extended_1.mock)(), payload);
			expect(service.getOptionsViaLoadOptions).toHaveBeenCalledWith(
				loadOptions,
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
		it('should return empty array when no method or load options are provided', async () => {
			const req = { user: mockUser };
			const result = await controller.getOptions(
				req,
				(0, jest_mock_extended_1.mock)(),
				basePayload,
			);
			expect(result).toEqual([]);
		});
	});
	describe('getResourceLocatorResults', () => {
		const basePayload = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};
		it('should call getResourceLocatorResults with correct parameters', async () => {
			const payload = {
				...basePayload,
				filter: 'testFilter',
				paginationToken: 'testToken',
			};
			const req = { user: mockUser };
			const expectedResult = { results: [{ name: 'test', value: 'value' }] };
			service.getResourceLocatorResults.mockResolvedValue(expectedResult);
			const result = await controller.getResourceLocatorResults(
				req,
				(0, jest_mock_extended_1.mock)(),
				payload,
			);
			expect(service.getResourceLocatorResults).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
				'testFilter',
				'testToken',
			);
			expect(result).toEqual(expectedResult);
		});
	});
	describe('getResourceMappingFields', () => {
		const basePayload = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};
		it('should call getResourceMappingFields with correct parameters', async () => {
			const req = { user: mockUser };
			const expectedResult = { fields: [] };
			service.getResourceMappingFields.mockResolvedValue(expectedResult);
			const result = await controller.getResourceMappingFields(
				req,
				(0, jest_mock_extended_1.mock)(),
				basePayload,
			);
			expect(service.getResourceMappingFields).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
	});
	describe('getLocalResourceMappingFields', () => {
		const basePayload = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			methodName: 'testMethod',
			currentNodeParameters: {},
		};
		it('should call getLocalResourceMappingFields with correct parameters', async () => {
			const req = { user: mockUser };
			const expectedResult = { fields: [] };
			service.getLocalResourceMappingFields.mockResolvedValue(expectedResult);
			const result = await controller.getLocalResourceMappingFields(
				req,
				(0, jest_mock_extended_1.mock)(),
				basePayload,
			);
			expect(service.getLocalResourceMappingFields).toHaveBeenCalledWith(
				'testMethod',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
			);
			expect(result).toEqual(expectedResult);
		});
	});
	describe('getActionResult', () => {
		const basePayload = {
			path: '/test/path',
			nodeTypeAndVersion: { name: 'TestNode', version: 1 },
			handler: 'testHandler',
			currentNodeParameters: {},
		};
		it('should call getActionResult with correct parameters', async () => {
			const payload = {
				...basePayload,
				payload: { test: 'value' },
			};
			const req = { user: mockUser };
			const expectedResult = 'test result';
			service.getActionResult.mockResolvedValue(expectedResult);
			const result = await controller.getActionResult(
				req,
				(0, jest_mock_extended_1.mock)(),
				payload,
			);
			expect(service.getActionResult).toHaveBeenCalledWith(
				'testHandler',
				'/test/path',
				baseAdditionalData,
				{ name: 'TestNode', version: 1 },
				{},
				{ test: 'value' },
				undefined,
			);
			expect(result).toEqual(expectedResult);
		});
	});
});
//# sourceMappingURL=dynamic-node-parameters.controller.test.js.map

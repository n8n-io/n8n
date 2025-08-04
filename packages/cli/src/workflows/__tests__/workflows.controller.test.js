'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const axios_1 = __importDefault(require('axios'));
const jest_mock_extended_1 = require('jest-mock-extended');
const bad_request_error_1 = require('@/errors/response-errors/bad-request.error');
const workflows_controller_1 = require('../workflows.controller');
jest.mock('axios');
describe('WorkflowsController', () => {
	const controller = Object.create(workflows_controller_1.WorkflowsController.prototype);
	const axiosMock = axios_1.default.get;
	const req = (0, jest_mock_extended_1.mock)();
	const res = (0, jest_mock_extended_1.mock)();
	describe('getFromUrl', () => {
		describe('should return workflow data', () => {
			it('when the URL points to a valid JSON file', async () => {
				const mockWorkflowData = {
					nodes: [],
					connections: {},
				};
				axiosMock.mockResolvedValue({ data: mockWorkflowData });
				const query = { url: 'https://example.com/workflow.json' };
				const result = await controller.getFromUrl(req, res, query);
				expect(result).toEqual(mockWorkflowData);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});
		});
		describe('should throw a BadRequestError', () => {
			const query = { url: 'https://example.com/invalid.json' };
			it('when the URL does not point to a valid JSON file', async () => {
				axiosMock.mockRejectedValue(new Error('Network Error'));
				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(
					bad_request_error_1.BadRequestError,
				);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});
			it('when the data is not a valid n8n workflow JSON', async () => {
				const invalidWorkflowData = {
					nodes: 'not an array',
					connections: 'not an object',
				};
				axiosMock.mockResolvedValue({ data: invalidWorkflowData });
				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(
					bad_request_error_1.BadRequestError,
				);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});
			it('when the data is missing required fields', async () => {
				const incompleteWorkflowData = {
					nodes: [],
				};
				axiosMock.mockResolvedValue({ data: incompleteWorkflowData });
				await expect(controller.getFromUrl(req, res, query)).rejects.toThrow(
					bad_request_error_1.BadRequestError,
				);
				expect(axiosMock).toHaveBeenCalledWith(query.url);
			});
		});
	});
});
//# sourceMappingURL=workflows.controller.test.js.map

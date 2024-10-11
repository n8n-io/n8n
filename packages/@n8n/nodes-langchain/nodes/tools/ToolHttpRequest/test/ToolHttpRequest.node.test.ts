import get from 'lodash/get';
import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import type { N8nTool } from '../../../../utils/N8nTool';
import { ToolHttpRequest } from '../ToolHttpRequest.node';

const createExecuteFunctionsMock = (parameters: IDataObject, requestMock: any) => {
	const nodeParameters = parameters;

	return {
		getNodeParameter(parameter: string) {
			return get(nodeParameters, parameter);
		},
		getNode() {
			return {
				name: 'HTTP Request',
			};
		},
		getInputData() {
			return [{ json: {} }];
		},
		getWorkflow() {
			return {
				name: 'Test Workflow',
			};
		},
		continueOnFail() {
			return false;
		},
		addInputData() {
			return { index: 0 };
		},
		addOutputData() {
			return;
		},
		helpers: {
			httpRequest: requestMock,
		},
	} as unknown as IExecuteFunctions;
};

describe('ToolHttpRequest', () => {
	let httpTool: ToolHttpRequest;
	let mockRequest: jest.Mock;

	describe('Binary response', () => {
		beforeEach(() => {
			httpTool = new ToolHttpRequest();
			mockRequest = jest.fn();
		});

		it('should return the error when receiving a binary response', async () => {
			mockRequest.mockResolvedValue({
				body: Buffer.from(''),
				headers: {
					'content-type': 'image/jpeg',
				},
			});

			const { response } = await httpTool.supplyData.call(
				createExecuteFunctionsMock(
					{
						method: 'GET',
						url: 'https://httpbin.org/image/jpeg',
						options: {},
						placeholderDefinitions: {
							values: [],
						},
					},
					mockRequest,
				),
				0,
			);

			const res = await (response as N8nTool).invoke('');

			expect(res).toContain('error');
			expect(res).toContain('Binary data is not supported');
		});

		it('should return the response text when receiving a text response', async () => {
			mockRequest.mockResolvedValue({
				body: 'Hello World',
				headers: {
					'content-type': 'text/plain',
				},
			});

			const { response } = await httpTool.supplyData.call(
				createExecuteFunctionsMock(
					{
						method: 'GET',
						url: 'https://httpbin.org/text/plain',
						options: {},
						placeholderDefinitions: {
							values: [],
						},
					},
					mockRequest,
				),
				0,
			);

			const res = await (response as N8nTool).invoke('');
			expect(res).toEqual('Hello World');
		});

		it('should return the response text when receiving a text response with a charset', async () => {
			mockRequest.mockResolvedValue({
				body: 'こんにちは世界',
				headers: {
					'content-type': 'text/plain; charset=iso-2022-jp',
				},
			});

			const { response } = await httpTool.supplyData.call(
				createExecuteFunctionsMock(
					{
						method: 'GET',
						url: 'https://httpbin.org/text/plain',
						options: {},
						placeholderDefinitions: {
							values: [],
						},
					},
					mockRequest,
				),
				0,
			);

			const res = await (response as N8nTool).invoke('');
			expect(res).toEqual('こんにちは世界');
		});

		it('should return the response object when receiving a JSON response', async () => {
			const mockJson = { hello: 'world' };

			mockRequest.mockResolvedValue({
				body: mockJson,
				headers: {
					'content-type': 'application/json',
				},
			});

			const { response } = await httpTool.supplyData.call(
				createExecuteFunctionsMock(
					{
						method: 'GET',
						url: 'https://httpbin.org/json',
						options: {},
						placeholderDefinitions: {
							values: [],
						},
					},
					mockRequest,
				),
				0,
			);

			const res = await (response as N8nTool).invoke('');
			expect(jsonParse(res)).toEqual(mockJson);
		});
	});
});

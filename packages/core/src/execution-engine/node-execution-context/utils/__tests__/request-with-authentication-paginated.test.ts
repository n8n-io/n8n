import { mock, mockDeep } from 'jest-mock-extended';
import type {
	IExecuteFunctions,
	INode,
	PaginationOptions,
	Workflow,
	IWorkflowExecuteAdditionalData,
	IRequestOptions,
	IN8nHttpFullResponse,
} from 'n8n-workflow';

import { getRequestHelperFunctions } from '../request-helper-functions';

const node = {
	name: 'Test Node',
	type: 'test.node',
	typeVersion: 1,
} as INode;

const workflow = mockDeep<Workflow>();
workflow.expression.getParameterValue.mockImplementation((value: any) => value);
const additionalData = mock<IWorkflowExecuteAdditionalData>();

describe('requestWithAuthenticationPaginated', () => {
	const helpers = getRequestHelperFunctions(workflow as unknown as Workflow, node, additionalData);
	// Mock the helpers context that would be `this` in execution
	const executeFunctions = mock<IExecuteFunctions>({
		helpers: {
			requestWithAuthentication: jest.fn(),
			request: jest.fn(),
		},
		getNode: () => node,
	});

	// We need to bind the function to our mock context
	const requestWithAuthenticationPaginated =
		helpers.requestWithAuthenticationPaginated.bind(executeFunctions);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('should throw error on 404 when failOnError is true (default) and status not allowed', async () => {
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
			body: 'Not Found',
			headers: {},
			statusCode: 404,
			statusMessage: 'Not Found',
		} as IN8nHttpFullResponse);

		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			qs: {},
		};

		const paginationOptions: PaginationOptions = {
			continue: false, // Stop after first request
			request: {},
			requestInterval: 0,
		};

		await expect(
			requestWithAuthenticationPaginated(requestOptions, 0, paginationOptions),
		).rejects.toThrow('404 - "Not Found"');
	});

	test('should NOT throw error on 404 when included in allowedStatusCodes', async () => {
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
			body: 'Not Found',
			headers: {},
			statusCode: 404,
			statusMessage: 'Not Found',
		} as IN8nHttpFullResponse);

		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			qs: {},
		};

		const paginationOptions: PaginationOptions = {
			continue: false,
			request: {},
			requestInterval: 0,
			allowedStatusCodes: [404],
		};

		const result = await requestWithAuthenticationPaginated(requestOptions, 0, paginationOptions);
		expect(result).toHaveLength(1);
		expect(result[0].statusCode).toBe(404);
	});

	test('should NOT throw error on 500 when failOnError is false (Never Error)', async () => {
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
			body: 'Server Error',
			headers: {},
			statusCode: 500,
			statusMessage: 'Internal Server Error',
		} as IN8nHttpFullResponse);

		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			qs: {},
			simple: false, // failOnError = false
		};

		const paginationOptions: PaginationOptions = {
			continue: false,
			request: {},
			requestInterval: 0,
		};

		const result = await requestWithAuthenticationPaginated(requestOptions, 0, paginationOptions);
		expect(result).toHaveLength(1);
		expect(result[0].statusCode).toBe(500);
	});

	test('should throw error on 500 when failOnError is true and status not allowed', async () => {
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
			body: 'Server Error',
			headers: {},
			statusCode: 500,
			statusMessage: 'Internal Server Error',
		} as IN8nHttpFullResponse);

		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			qs: {},
			// simple defaults to true often, but in the helper it sets simple=false explicitly then checks later.
			// wait, the helper sets requestOptions.simple = false at the start.
			// then it uses `failOnError = requestOptions.simple !== false` inside the check.
			// If we pass in `simple: true` (or undefined), failOnError becomes true.
		};

		const paginationOptions: PaginationOptions = {
			continue: false,
			request: {},
			requestInterval: 0,
		};

		await expect(
			requestWithAuthenticationPaginated(requestOptions, 0, paginationOptions),
		).rejects.toThrow('500 - "Server Error"');
	});

	test('should NOT throw on 200', async () => {
		(executeFunctions.helpers.request as jest.Mock).mockResolvedValue({
			body: 'OK',
			headers: {},
			statusCode: 200,
			statusMessage: 'OK',
		} as IN8nHttpFullResponse);

		const requestOptions: IRequestOptions = {
			uri: 'https://example.com',
			qs: {},
		};

		const paginationOptions: PaginationOptions = {
			continue: false,
			request: {},
			requestInterval: 0,
		};

		const result = await requestWithAuthenticationPaginated(requestOptions, 0, paginationOptions);
		expect(result).toHaveLength(1);
		expect(result[0].statusCode).toBe(200);
	});
});

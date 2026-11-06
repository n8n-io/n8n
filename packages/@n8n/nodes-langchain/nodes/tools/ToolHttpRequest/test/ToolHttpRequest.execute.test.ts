import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ToolHttpRequest } from '../ToolHttpRequest.node';

describe('ToolHttpRequest execute', () => {
	const httpTool = new ToolHttpRequest();
	const helpers = mock<IExecuteFunctions['helpers']>();
	const ctx = mock<IExecuteFunctions>({ helpers });

	const setup = (items: INodeExecutionData[], typeVersion = 1.1) => {
		ctx.getInputData.mockReturnValue(items);
		ctx.getNode.mockReturnValue(
			mock<INode>({ type: 'toolHttpRequest', name: 'HTTP Request', typeVersion }),
		);
		ctx.getNodeParameter.mockImplementation((paramName: string, _: number, fallback?: string) => {
			switch (paramName) {
				case 'method':
					return 'GET';
				case 'url':
					return 'https://example.com/users/{id}/{field}';
				case 'placeholderDefinitions.values':
					return [
						{ name: 'id', type: 'string' },
						{ name: 'field', type: 'string' },
					];
				default:
					return fallback;
			}
		});
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should run one request per input item and pair each response', async () => {
		setup([{ json: { id: '1', field: 'name' } }, { json: { id: '2', field: 'email' } }]);
		helpers.httpRequest
			.mockResolvedValueOnce({ body: 'Ada', headers: { 'content-type': 'text/plain' } })
			.mockResolvedValueOnce({ body: { email: 'b@x.io' }, headers: {} });

		const result = await httpTool.execute.call(ctx);

		expect(helpers.httpRequest).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ url: 'https://example.com/users/1/name' }),
		);
		expect(helpers.httpRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ url: 'https://example.com/users/2/email' }),
		);
		expect(result).toEqual([
			[
				{ json: { response: 'Ada' }, pairedItem: { item: 0 } },
				{
					json: { response: JSON.stringify({ email: 'b@x.io' }, null, 2) },
					pairedItem: { item: 1 },
				},
			],
		]);
	});

	it('should leave input and output logging to the engine', async () => {
		setup([{ json: { id: '1', field: 'name' } }]);
		helpers.httpRequest.mockResolvedValue({ body: 'Ada', headers: {} });

		await httpTool.execute.call(ctx);

		expect(ctx.addInputData).not.toHaveBeenCalled();
		expect(ctx.addOutputData).not.toHaveBeenCalled();
		expect(ctx.logAiEvent).not.toHaveBeenCalled();
	});

	it('should return request failures as a response the agent can read', async () => {
		setup([{ json: { id: '1', field: 'name' } }]);
		helpers.httpRequest.mockRejectedValue(
			Object.assign(new Error('Request failed with status code 404'), {
				response: { status: 404, data: { error: 'not_found' } },
			}),
		);

		const [[item]] = await httpTool.execute.call(ctx);

		expect(item.json.response).toContain('HTTP 404');
		expect(item.json.response).toContain('not_found');
	});

	it('should return binary bodies as an error response', async () => {
		setup([{ json: { id: '1', field: 'name' } }]);
		helpers.httpRequest.mockResolvedValue({
			body: Buffer.from([0xff, 0xd8, 0xff]),
			headers: { 'content-type': 'image/jpeg' },
		});

		const [[item]] = await httpTool.execute.call(ctx);

		expect(item.json.response).toContain('Binary data is not supported');
	});

	it('should throw when the input does not match the tool schema', async () => {
		setup([{ json: { id: '1' } }]);

		await expect(httpTool.execute.call(ctx)).rejects.toThrow(NodeOperationError);
		expect(helpers.httpRequest).not.toHaveBeenCalled();
	});

	it('should throw when the model input is invalid on version 1', async () => {
		setup([{ json: { input: 'not json' } }], 1);
		helpers.httpRequest.mockResolvedValue({ body: 'Ada', headers: {} });

		await expect(httpTool.execute.call(ctx)).rejects.toThrow('Input is not a valid JSON');
		expect(helpers.httpRequest).not.toHaveBeenCalled();
	});

	it.each([{ input: '' }, {}])(
		'should not send the request when the input is empty on version 1: %j',
		async (json) => {
			setup([{ json }], 1);
			helpers.httpRequest.mockResolvedValue({ body: 'Ada', headers: {} });

			await expect(httpTool.execute.call(ctx)).rejects.toThrow(
				"Model did not provide parameter 'id'",
			);
			expect(helpers.httpRequest).not.toHaveBeenCalled();
		},
	);
});

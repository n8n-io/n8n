import type {
	IExecuteSingleFunctions,
	INodeExecutionData,
	IN8nHttpFullResponse,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { handleErrorPostReceive } from '../GenericFunctions';

describe('handleErrorPostReceive', () => {
	let mockThis: IExecuteSingleFunctions;

	beforeEach(() => {
		mockThis = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
		} as unknown as IExecuteSingleFunctions;
	});

	it('should raise an error when response status is 4xx or 5xx and error is mapped', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockImplementationOnce(() => 'group')
			.mockImplementationOnce(() => 'delete');

		(mockThis.getNode as jest.Mock).mockReturnValue({ name: 'Test Node' });

		const mockResponse: IN8nHttpFullResponse = {
			statusCode: 404,
			body: { __type: 'ResourceNotFoundException', message: 'Group not found' },
			headers: {},
		} as unknown as IN8nHttpFullResponse;

		await expect(handleErrorPostReceive.call(mockThis, [], mockResponse)).rejects.toThrowError(
			NodeApiError,
		);
	});

	it('should not raise an error when response status is not 4xx or 5xx', async () => {
		(mockThis.getNodeParameter as jest.Mock)
			.mockReturnValueOnce('group')
			.mockReturnValueOnce('delete');

		(mockThis.getNode as jest.Mock).mockReturnValue({ name: 'Test Node' });

		const mockResponse: IN8nHttpFullResponse = {
			statusCode: 200,
			body: {},
			headers: {},
		} as unknown as IN8nHttpFullResponse;

		const mockData: INodeExecutionData[] = [{ json: { key: 'value' } }];
		await expect(handleErrorPostReceive.call(mockThis, mockData, mockResponse)).resolves.toEqual(
			mockData,
		);
	});
});

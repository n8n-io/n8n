import { processGroupsResponse } from '../GenericFunctions';

describe('processGroupsResponse', () => {
	let mockContext: any;
	let mockGetNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNodeParameter = jest.fn();
		mockContext = {
			getNodeParameter: mockGetNodeParameter,
		};
	});

	test('should process groups response correctly', async () => {
		const response = {
			body: {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [
							{ GroupName: 'Group1', GroupId: '1' },
							{ GroupName: 'Group2', GroupId: '2' },
						],
					},
				},
			},
			statusCode: 200,
			statusMessage: 'OK',
			headers: {},
		};

		const result = await processGroupsResponse.call(mockContext, [], response);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ GroupName: 'Group1', GroupId: '1' });
		expect(result[1]).toEqual({ GroupName: 'Group2', GroupId: '2' });
	});
});

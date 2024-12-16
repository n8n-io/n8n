import type { IHttpRequestOptions } from 'n8n-workflow';
import { presendFields } from '../GenericFunctions';

describe('presendFields', () => {
	let mockContext: any;
	let requestOptions: IHttpRequestOptions;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
		};
		requestOptions = {
			url: 'https://example.com/api',
			headers: {},
		};
	});

	test('should add PathPrefix for ListUsers operation', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({ PathPrefix: 'test' });
		mockContext.getNodeParameter.mockReturnValueOnce(undefined);

		requestOptions.url = 'https://example.com/ListUsers';

		const result = await presendFields.call(mockContext, requestOptions);

		expect(result.url).toBe('https://example.com/ListUsers&PathPrefix=test');
	});

	test('should append user details for CreateUser operation', async () => {
		const additionalFields = {};
		const options = {
			PermissionsBoundary: 'boundary',
			Path: '/somepath',
			Tags: { tags: [{ key: 'key1', value: 'value1' }] },
		};

		mockContext.getNodeParameter.mockReturnValueOnce(additionalFields);
		mockContext.getNodeParameter.mockReturnValueOnce(options);
		mockContext.getNodeParameter.mockReturnValueOnce('username');

		requestOptions.url = 'https://example.com/CreateUser';

		const result = await presendFields.call(mockContext, requestOptions);

		expect(result.url).toContain('&UserName=username');
		expect(result.url).toContain('&PermissionsBoundary=boundary');
		expect(result.url).toContain('&Path=/somepath');
		expect(result.url).toContain('&Tags.member.1.Key=key1');
		expect(result.url).toContain('&Tags.member.1.Value=value1');
	});

	test('should throw error if options are missing for UpdateUser operation', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'UserName') {
				return { value: 'username' };
			}
			if (param === 'options') {
				return { NewUserName: undefined, NewPath: undefined };
			}
			return undefined;
		});

		mockContext.getNode = jest.fn().mockReturnValue({});

		requestOptions.url = 'https://example.com/UpdateUser';

		await expect(presendFields.call(mockContext, requestOptions)).rejects.toThrowError(
			'At least one of the options (NewUserName or NewPath) must be provided to update the user.',
		);
	});

	test('should add GroupName for AddUserToGroup operation', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce(undefined);
		mockContext.getNodeParameter.mockReturnValueOnce(undefined);
		mockContext.getNodeParameter.mockReturnValueOnce({ value: 'user1' });
		mockContext.getNodeParameter.mockReturnValueOnce({ value: 'group1' });

		requestOptions.url = 'https://example.com/AddUserToGroup';

		const result = await presendFields.call(mockContext, requestOptions);

		expect(result.url).toContain('&UserName=user1');
		expect(result.url).toContain('&GroupName=group1');
	});

	test('should append NewGroupName and NewPath for UpdateGroup operation', async () => {
		const options = {
			NewGroupName: 'newGroup',
			NewPath: '/newpath',
		};

		mockContext.getNodeParameter.mockReturnValueOnce(undefined);
		mockContext.getNodeParameter.mockReturnValueOnce(options);
		mockContext.getNodeParameter.mockReturnValueOnce({ value: 'group1' });

		requestOptions.url = 'https://example.com/UpdateGroup';

		const result = await presendFields.call(mockContext, requestOptions);

		expect(result.url).toContain('&GroupName=group1');
		expect(result.url).toContain('&NewGroupName=newGroup');
		expect(result.url).toContain('&NewPath=/newpath');
	});

	test('should add Path for CreateGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'GroupName') {
				return 'group1';
			}
			if (param === 'options') {
				return { Path: '/newpath' };
			}
			return undefined;
		});

		requestOptions.url = 'https://example.com/CreateGroup';

		const result = await presendFields.call(mockContext, requestOptions);

		expect(result.url).toContain('&GroupName=group1');
		expect(result.url).toContain('&Path=/newpath');
	});
});

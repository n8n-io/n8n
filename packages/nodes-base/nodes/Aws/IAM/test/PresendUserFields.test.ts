import { presendUserFields } from '../GenericFunctions';

describe('presendUserFields', () => {
	let mockContext: any;

	beforeEach(() => {
		mockContext = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({
				name: 'TestNode',
			})),
		};
	});

	it('should append PathPrefix to the URL for ListUsers operation', async () => {
		mockContext.getNodeParameter.mockReturnValueOnce({
			PathPrefix: 'some-prefix',
		});
		const requestOptions = {
			url: 'https://example.com?Action=ListUsers',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe('https://example.com?Action=ListUsers&PathPrefix=some-prefix');
	});

	it('should append user-related fields for CreateUser operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'UserName') return 'newUser';
			if (name === 'additionalFields') {
				return {
					PermissionsBoundary: 'some-permission',
					Path: '/new-path',
					Tags: { tags: [{ key: 'env', value: 'dev' }] },
				};
			}
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=CreateUser',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=CreateUser&UserName=newUser&PermissionsBoundary=some-permission&Path=/new-path&Tags.member.1.Key=env&Tags.member.1.Value=dev',
		);
	});

	it('should append NewUserName and NewPath for UpdateUser operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'UserName') return { mode: 'value', value: 'oldUser' };
			if (name === 'additionalFields') {
				return {
					NewUserName: 'newUser',
					NewPath: '/new-path',
				};
			}
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=UpdateUser',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=UpdateUser&UserName=oldUser&NewUserName=newUser&NewPath=/new-path',
		);
	});

	it('should append GroupName for AddUserToGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'UserName') return { mode: 'value', value: 'someUser' };
			if (name === 'GroupName') return { mode: 'value', value: 'someGroup' };
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=AddUserToGroup',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=AddUserToGroup&UserName=someUser&GroupName=someGroup',
		);
	});

	it('should append GroupName for RemoveUserFromGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'UserName') return { mode: 'value', value: 'someUser' };
			if (name === 'GroupName') return { mode: 'value', value: 'someGroup' };
			return undefined;
		});

		const requestOptions = {
			url: 'https://example.com?Action=RemoveUserFromGroup',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe(
			'https://example.com?Action=RemoveUserFromGroup&UserName=someUser&GroupName=someGroup',
		);
	});

	it('should handle missing additionalFields', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'additionalFields') {
				return {};
			}
		});

		const requestOptions = {
			url: 'https://example.com?Action=ListUsers',
			headers: {},
			body: {},
		};

		const options = await presendUserFields.call(mockContext, requestOptions);

		expect(options.url).toBe('https://example.com?Action=ListUsers');
	});
});

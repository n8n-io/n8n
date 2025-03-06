import { presendUserFields } from '../generalFunctions/presendFunctions';

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

	it('should append user-related fields for CreateUser operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'userNameNew') return 'newUser';
			if (name === 'additionalFields') {
				return {
					path: '/new-path/',
					tags: { tags: [{ key: 'env', value: 'dev' }] },
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
			'https://example.com?Action=CreateUser&UserName=newUser&Path=/new-path/&Tags.member.1.Key=env&Tags.member.1.Value=dev',
		);
	});

	it('should append newUserName and newPath for UpdateUser operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'userName') return { mode: 'value', value: 'oldUser' };
			if (name === 'newUserName') return 'newUser';
			if (name === 'additionalFields') {
				return {
					newPath: '/new-path/',
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
			'https://example.com?Action=UpdateUser&UserName=oldUser&NewUserName=newUser&NewPath=/new-path/',
		);
	});

	it('should append groupName for AddUserToGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'userName') return { mode: 'value', value: 'someUser' };
			if (name === 'groupName') return { mode: 'value', value: 'someGroup' };
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

	it('should append groupName for RemoveUserFromGroup operation', async () => {
		mockContext.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'userName') return { mode: 'value', value: 'someUser' };
			if (name === 'groupName') return { value: 'someGroup' }; // Corrected mock
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
});

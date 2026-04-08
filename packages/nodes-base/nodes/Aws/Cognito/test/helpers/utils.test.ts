import { mock } from 'jest-mock-extended';
import type { MockProxy } from 'jest-mock-extended';
import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import { NodeOperationError, NodeApiError } from 'n8n-workflow';

import {
	getUserPool,
	validateArn,
	simplifyUserPool,
	preSendUserFields,
	preSendAttributes,
	preSendDesiredDeliveryMediums,
	getUsersInGroup,
	simplifyUser,
	getUserNameFromExistingUsers,
} from '../../helpers/utils';
import { searchUsers } from '../../methods/listSearch';
import { awsApiRequest, awsApiRequestAllItems } from '../../transport/index';

jest.mock('../../transport/index', () => ({
	awsApiRequest: jest.fn(),
	awsApiRequestAllItems: jest.fn(),
}));

jest.mock('../../methods/listSearch', () => ({
	searchUsers: jest.fn(),
}));

describe('AWS Cognito - Helpers functions', () => {
	let loadOptionsFunctions: MockProxy<IExecuteSingleFunctions>;
	let mockRequestWithAuthentication: jest.Mock;
	let mockReturnJsonArray: jest.Mock;
	let requestOptions: IHttpRequestOptions;

	beforeEach(() => {
		loadOptionsFunctions = mock<IExecuteSingleFunctions>();
		mockRequestWithAuthentication = jest.fn();
		mockReturnJsonArray = jest.fn();
		loadOptionsFunctions.helpers.httpRequestWithAuthentication = mockRequestWithAuthentication;
		loadOptionsFunctions.helpers.returnJsonArray = mockReturnJsonArray;
		loadOptionsFunctions.getCredentials.mockResolvedValue({
			region: 'eu-central-1',
			accessKeyId: 'test',
			secretAccessKey: 'test',
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('getUserPool', () => {
		it('should fetch the user pool information', async () => {
			const userPoolId = 'eu-central-1_W3WwpiBXV';

			const mockResponse = {
				UserPool: {
					Id: userPoolId,
					Name: 'UserPoolSimple',
				},
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const userPool = await getUserPool.call(loadOptionsFunctions, userPoolId);

			expect(userPool).toEqual({ Id: userPoolId, Name: 'UserPoolSimple' });
		});

		it('should throw an error if user pool ID is missing', async () => {
			await expect(getUserPool.call(loadOptionsFunctions, '')).rejects.toThrowError(
				NodeOperationError,
			);
		});

		it('should throw an error if user pool is not found', async () => {
			const userPoolId = 'invalid-user-pool-id';

			(awsApiRequest as jest.Mock).mockResolvedValue({});

			await expect(getUserPool.call(loadOptionsFunctions, userPoolId)).rejects.toThrowError(
				NodeOperationError,
			);
		});
	});

	describe('getUsersInGroup', () => {
		it('should throw an error if UserPoolId is missing', async () => {
			loadOptionsFunctions.getNodeParameter.mockReturnValue(undefined);

			await expect(
				getUsersInGroup.call(loadOptionsFunctions, 'groupName', ''),
			).rejects.toThrowError(NodeOperationError);
		});

		it('should return an empty list if no users are found', async () => {
			(loadOptionsFunctions.getNodeParameter as jest.Mock).mockReturnValue('userPoolId');
			(awsApiRequestAllItems as jest.Mock).mockResolvedValue([]);

			const result = await getUsersInGroup.call(loadOptionsFunctions, 'groupName', 'userPoolId');
			expect(result).toEqual([]);
		});

		it('should return users correctly', async () => {
			const mockUsers = [
				{
					Username: 'user1',
					Enabled: true,
					Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
				},
				{
					Username: 'user2',
					Enabled: true,
					Attributes: [{ Name: 'email', Value: 'user2@example.com' }],
				},
			];

			(awsApiRequestAllItems as jest.Mock).mockResolvedValue(mockUsers);

			const result = await getUsersInGroup.call(loadOptionsFunctions, 'groupName', 'userPoolId');
			expect(result).toEqual([
				{
					Username: 'user1',
					Enabled: true,
					Attributes: [
						{
							Name: 'email',
							Value: 'user1@example.com',
						},
					],
				},
				{
					Username: 'user2',
					Enabled: true,
					Attributes: [
						{
							Name: 'email',
							Value: 'user2@example.com',
						},
					],
				},
			]);
		});

		it('should handle empty attributes and missing values', async () => {
			const mockUsers = [
				{
					Username: 'user1',
					Enabled: true,
					Attributes: [{ Name: 'email', Value: '' }],
				},
			];

			(awsApiRequestAllItems as jest.Mock).mockResolvedValue(mockUsers);

			const result = await getUsersInGroup.call(loadOptionsFunctions, 'groupName', 'userPoolId');
			expect(result).toEqual([
				{
					Username: 'user1',
					Enabled: true,
					Attributes: [
						{
							Name: 'email',
							Value: '',
						},
					],
				},
			]);
		});
	});

	describe('validateArn', () => {
		it('should validate the ARN format', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.arn') {
					return 'arn:aws:iam::123456789012:role/GroupRole';
				}
				return '';
			});

			requestOptions = {
				body: { additionalFields: { arn: 'arn:aws:iam::123456789012:role/GroupRole' } },
				headers: {},
				url: 'example.com',
			};

			const result = await validateArn.call(loadOptionsFunctions, requestOptions);

			expect(result).toEqual(requestOptions);
		});

		it('should throw an error if the ARN format is invalid', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.arn') {
					return 'invalid-arn';
				}
				return '';
			});

			requestOptions = {
				body: { additionalFields: { arn: 'invalid-arn' } },
				headers: {},
				url: 'example.com',
			};

			await expect(validateArn.call(loadOptionsFunctions, requestOptions)).rejects.toThrowError(
				NodeApiError,
			);
		});
	});

	describe('simplifyUserPool', () => {
		it('should simplify the user pool data when simple is true', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation(() => true);
			const items = [{ json: { UserPool: { Id: 'userPoolId', Name: 'UserPoolName' } } }];
			const result = await simplifyUserPool.call(loadOptionsFunctions, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});
			expect(result).toEqual([{ json: { UserPool: { Id: 'userPoolId', Name: 'UserPoolName' } } }]);
		});
	});

	describe('simplifyUserData', () => {
		it('should simplify a single user with UserAttributes when simple is true', async () => {
			loadOptionsFunctions.getNodeParameter.mockReturnValue(true);

			const items = [
				{
					json: {
						UserAttributes: [{ Name: 'email', Value: 'user@example.com' }],
					},
				},
			];

			const result = await simplifyUser.call(loadOptionsFunctions, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});

			expect(result).toEqual([{ json: { email: 'user@example.com' } }]);
		});

		it('should simplify multiple users in Users array when simple is true', async () => {
			loadOptionsFunctions.getNodeParameter.mockReturnValue(true);

			const items = [
				{
					json: {
						Users: [
							{
								Attributes: [{ Name: 'email', Value: 'user1@example.com' }],
							},
						],
					},
				},
			];

			const result = await simplifyUser.call(loadOptionsFunctions, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});

			expect(result).toEqual([
				{
					json: {
						Users: [{ email: 'user1@example.com' }],
					},
				},
			]);
		});

		it('should return original items when simple is false', async () => {
			const items = [
				{
					json: {
						UserAttributes: [{ Name: 'email', Value: 'user@example.com' }],
					},
				},
			];

			const result = await simplifyUser.call(loadOptionsFunctions, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});

			expect(result).toEqual(items);
		});
	});

	describe('getUserNameFromExistingUsers', () => {
		const userPoolId = 'eu-central-1_KkXQgdCJv';
		const userName = '03a438f2-10d1-70f1-f45a-09753ab5c4c3';

		it('should return the userName if email or phone is used for authentication', async () => {
			const isEmailOrPhone = true;

			const result = await getUserNameFromExistingUsers.call(
				loadOptionsFunctions,
				userName,
				userPoolId,
				isEmailOrPhone,
			);

			expect(result).toEqual(userName);
		});

		it('should return the username from ListUsers API when it is not email or phone authentication', async () => {
			const isEmailOrPhone = false;
			const mockApiResponse = {
				Users: [{ Username: 'existing-user' }],
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

			const result = await getUserNameFromExistingUsers.call(
				loadOptionsFunctions,
				userName,
				userPoolId,
				isEmailOrPhone,
			);

			expect(result).toEqual('existing-user');
		});

		it('should return undefined if no user is found in ListUsers API', async () => {
			const isEmailOrPhone = false;
			const mockApiResponse = {
				Users: [],
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockApiResponse);

			const result = await getUserNameFromExistingUsers.call(
				loadOptionsFunctions,
				userName,
				userPoolId,
				isEmailOrPhone,
			);

			expect(result).toBeUndefined();
		});
	});

	describe('preSendUserFields', () => {
		beforeEach(() => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'userPool') return 'test-pool-id';
				if (name === 'newUserName') return 'test@example.com';
				return undefined;
			});
		});

		it('should return the request body with the correct username when operation is "create" and valid email is provided', async () => {
			requestOptions = {
				body: JSON.stringify({ someField: 'value' }),
				method: 'POST',
				url: '',
				headers: {},
			};

			(awsApiRequest as jest.Mock).mockResolvedValue({
				UserPool: { UsernameAttributes: ['email'] },
			});

			const result = await preSendUserFields.call(loadOptionsFunctions, requestOptions);

			expect(result.body).toEqual(
				JSON.stringify({
					someField: 'value',
					Username: 'test@example.com',
				}),
			);
		});

		it('should return the request body with the correct username when operation is "update" and user exists', async () => {
			requestOptions = {
				body: JSON.stringify({ someField: 'value' }),
				method: 'POST',
				url: '',
				headers: {},
			};

			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'update';
				if (name === 'user') return 'existing-user';
				if (name === 'userPool') return 'eu-central-1_KkXQgdCJv';
				return undefined;
			});

			(awsApiRequest as jest.Mock).mockResolvedValue({
				UserPool: { UsernameAttributes: ['email'] },
			});

			(searchUsers as jest.Mock).mockResolvedValue({
				results: [{ name: 'existing-user', value: 'existing-user' }],
			});

			const result = await preSendUserFields.call(loadOptionsFunctions, requestOptions);

			expect(result.body).toEqual(
				JSON.stringify({
					someField: 'value',
					Username: 'existing-user',
				}),
			);
		});

		it('should return the request body without a username when operation is "update" and no user is found', async () => {
			requestOptions = {
				body: JSON.stringify({ someField: 'value' }),
				method: 'POST',
				url: '',
				headers: {},
			};

			loadOptionsFunctions.getNodeParameter.mockImplementationOnce((name: string) => {
				if (name === 'operation') return 'update';
				if (name === 'user') return 'non-existing-user';
				return undefined;
			});

			(awsApiRequest as jest.Mock).mockResolvedValue({
				UserPool: { UsernameAttributes: ['email'] },
			});

			(searchUsers as jest.Mock).mockResolvedValue({
				results: [],
			});

			const result = await preSendUserFields.call(loadOptionsFunctions, requestOptions);

			expect(result.body).toEqual(
				JSON.stringify({
					someField: 'value',
				}),
			);
		});
	});

	describe('preSendAttributes', () => {
		beforeEach(() => {
			requestOptions = {
				body: JSON.stringify({ someField: 'value' }),
				method: 'POST',
				url: '',
				headers: {},
			};
		});

		it('should throw an error if no user attributes are provided (update operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'update';
				if (name === 'userAttributes.attributes') return [];
				return undefined;
			});

			await expect(
				preSendAttributes.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError(
				new NodeOperationError(loadOptionsFunctions.getNode(), 'No user attributes provided', {
					description: 'At least one user attribute must be provided for the update operation.',
				}),
			);
		});

		it('should throw an error if a user attribute is invalid (empty value) (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [{ attributeType: 'standard', standardName: 'email', value: '' }];
				}
				return undefined;
			});

			await expect(
				preSendAttributes.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError(
				new NodeOperationError(loadOptionsFunctions.getNode(), 'Invalid User Attribute', {
					description: 'Each attribute must have a valid name and value.',
				}),
			);
		});

		it('should throw an error if email_verified is true but email is missing (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [{ attributeType: 'standard', standardName: 'email_verified', value: 'true' }];
				}
				return undefined;
			});

			await expect(
				preSendAttributes.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError(
				new NodeOperationError(
					loadOptionsFunctions.getNode(),
					'Missing required "email" attribute',
					{
						description:
							'"email_verified" is set to true, but the corresponding "email" attribute is not provided.',
					},
				),
			);
		});

		it('should throw an error if phone_number_verified is true but phone_number is missing (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{ attributeType: 'standard', standardName: 'phone_number_verified', value: 'true' },
					];
				}
				return undefined;
			});

			await expect(
				preSendAttributes.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError(
				new NodeOperationError(
					loadOptionsFunctions.getNode(),
					'Missing required "phone_number" attribute',
					{
						description:
							'"phone_number_verified" is set to true, but the corresponding "phone_number" attribute is not provided.',
					},
				),
			);
		});

		it('should add the user attribute to the body when valid (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{ attributeType: 'standard', standardName: 'email', value: 'test@example.com' },
						{ attributeType: 'standard', standardName: 'phone_number', value: '1234567890' },
					];
				}
				return undefined;
			});

			const result = await preSendAttributes.call(loadOptionsFunctions, requestOptions);

			expect(result.body).toEqual(
				JSON.stringify({
					someField: 'value',
					UserAttributes: [
						{ Name: 'email', Value: 'test@example.com' },
						{ Name: 'phone_number', Value: '1234567890' },
					],
				}),
			);
		});

		it('should correctly process custom attributes (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{
							attributeType: 'custom',
							customName: 'custom_attr',
							value: 'custom_value',
						},
					];
				}
				return undefined;
			});

			const result = await preSendAttributes.call(loadOptionsFunctions, requestOptions);

			expect(result.body).toEqual(
				JSON.stringify({
					someField: 'value',
					UserAttributes: [{ Name: 'custom:custom_attr', Value: 'custom_value' }],
				}),
			);
		});

		it('should throw an error if a custom attribute has no name or value (create operation)', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'operation') return 'create';
				if (name === 'additionalFields.userAttributes.attributes') {
					return [{ attributeType: 'custom', customName: '', value: '' }];
				}
				return undefined;
			});

			await expect(
				preSendAttributes.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError(
				new NodeOperationError(loadOptionsFunctions.getNode(), 'Invalid User Attribute', {
					description: 'Each attribute must have a valid name and value.',
				}),
			);
		});
	});

	describe('preSendDesiredDeliveryMediums', () => {
		beforeEach(() => {
			requestOptions = { body: {}, url: '' };
		});

		it('should not throw an error if EMAIL is selected and email is provided', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.desiredDeliveryMediums') {
					return ['EMAIL'];
				}
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{ standardName: 'email', value: 'test@example.com' },
						{ standardName: 'phone_number', value: '1234567890' },
					];
				}
				return undefined;
			});

			await expect(
				preSendDesiredDeliveryMediums.call(loadOptionsFunctions, requestOptions),
			).resolves.toEqual(requestOptions);
		});

		it('should throw an error if EMAIL is selected but email is missing', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.desiredDeliveryMediums') {
					return ['EMAIL'];
				}
				if (name === 'additionalFields.userAttributes.attributes') {
					return [{ standardName: 'phone_number', value: '1234567890' }];
				}
				return undefined;
			});

			await expect(
				preSendDesiredDeliveryMediums.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError('Missing required "email" attribute');
		});

		it('should not throw an error if SMS is selected and phone number is provided', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.desiredDeliveryMediums') {
					return ['SMS'];
				}
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{ standardName: 'email', value: 'test@example.com' },
						{ standardName: 'phone_number', value: '1234567890' },
					];
				}
				return undefined;
			});

			await expect(
				preSendDesiredDeliveryMediums.call(loadOptionsFunctions, requestOptions),
			).resolves.toEqual(requestOptions);
		});

		it('should throw an error if SMS is selected but phone number is missing', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.desiredDeliveryMediums') {
					return ['SMS'];
				}
				if (name === 'additionalFields.userAttributes.attributes') {
					return [{ standardName: 'email', value: 'test@example.com' }];
				}
				return undefined;
			});

			await expect(
				preSendDesiredDeliveryMediums.call(loadOptionsFunctions, requestOptions),
			).rejects.toThrowError('Missing required "phone_number" attribute');
		});

		it('should not throw an error if both EMAIL and SMS are selected and both attributes are provided', async () => {
			loadOptionsFunctions.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.desiredDeliveryMediums') {
					return ['EMAIL', 'SMS'];
				}
				if (name === 'additionalFields.userAttributes.attributes') {
					return [
						{ standardName: 'email', value: 'test@example.com' },
						{ standardName: 'phone_number', value: '1234567890' },
					];
				}
				return undefined;
			});

			await expect(
				preSendDesiredDeliveryMediums.call(loadOptionsFunctions, requestOptions),
			).resolves.toEqual(requestOptions);
		});
	});
});

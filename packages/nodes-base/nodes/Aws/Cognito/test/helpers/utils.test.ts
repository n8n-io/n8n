import type { IHttpRequestOptions } from 'n8n-workflow';
import { OperationalError, NodeOperationError, NodeApiError } from 'n8n-workflow';
import nock from 'nock';

import {
	parseRequestBody,
	preSendStringifyBody,
	getUserPool,
	processGroupResponse,
	validateArn,
	simplifyUserPool,
	simplifyUser,
	simplifyUsers,
	processGroupsResponse,
} from '../../helpers/utils';
import { awsApiRequest } from '../../transport/index';

jest.mock('../../transport/index', () => ({
	awsApiRequest: jest.fn(),
}));

describe('AWS Cognito - Helpers functions', () => {
	let mockNode: any;

	beforeEach(() => {
		mockNode = {
			getNodeParameter: jest.fn(),
			getNode: jest.fn(),
			getCredentials: jest.fn(),
			searchUsersForGroup: jest.fn(),
			httpRequestWithAuthentication: jest.fn(),
		};
		nock.cleanAll();
	});

	describe('parseRequestBody', () => {
		it('should correctly parse a JSON string', () => {
			const jsonString = '{"key": "value"}';
			expect(parseRequestBody(jsonString)).toEqual({ key: 'value' });
		});

		it('should throw an error if the JSON string is invalid', () => {
			const invalidJsonString = '{"key": "value"';
			expect(() => parseRequestBody(invalidJsonString)).toThrowError(OperationalError);
		});

		it('should return the same object if the body is already an object', () => {
			const data = { key: 'value' };
			expect(parseRequestBody(data)).toEqual(data);
		});
	});

	describe('preSendStringifyBody', () => {
		it('should stringify the body in requestOptions', async () => {
			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/api',
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: { key: 'value' },
			};
			const result = await preSendStringifyBody.call(mockNode, requestOptions);
			expect(result.body).toBe(JSON.stringify({ key: 'value' }));
		});
	});

	describe('getUserPool', () => {
		it('should fetch the user pool information', async () => {
			const userPoolId = 'eu-central-1_W3WwpiBXV';
			const baseUrl = 'https://cognito-idp.eu-central-1.amazonaws.com/';

			mockNode.getCredentials.mockReturnValue({
				aws: { id: 'your-aws-id', name: 'your-aws-name' },
			});

			const mockResponse = {
				UserPool: {
					Id: userPoolId,
					Name: 'UserPoolSimple',
				},
			};

			(awsApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const userPool = await getUserPool.call(mockNode, userPoolId);

			expect(userPool).toEqual({ UserPool: { Id: userPoolId, Name: 'UserPoolSimple' } });
		});

		it('should throw an error if user pool ID is missing', async () => {
			await expect(getUserPool.call(mockNode, '')).rejects.toThrowError(NodeOperationError);
		});

		it('should throw an error if user pool is not found', async () => {
			const userPoolId = 'invalid-user-pool-id';

			(awsApiRequest as jest.Mock).mockResolvedValue({});

			await expect(getUserPool.call(mockNode, userPoolId)).rejects.toThrowError(NodeOperationError);
		});
	});

	describe('processGroupResponse', () => {
		it('should return the group without users when "includeUsers" is false', async () => {
			mockNode.getNodeParameter.mockImplementation((name: string) =>
				name === 'includeUsers' ? false : undefined,
			);

			const response = {
				body: '{"Group": {"GroupName": "MyGroup"}}',
				headers: {},
				statusCode: 200,
			};
			const result = await processGroupResponse.call(mockNode, [], response);
			expect(result).toEqual([{ json: { GroupName: 'MyGroup' } }]);
		});
	});

	describe('processGroupsResponse', () => {
		it('should return the group without users when "includeUsers" is false', async () => {
			mockNode.getNodeParameter.mockImplementation((name: string) =>
				name === 'includeUsers' ? false : undefined,
			);

			const response = {
				body: '{"Group": {"GroupName": "MyGroup"}}',
				headers: {},
				statusCode: 200,
			};
			const result = await processGroupResponse.call(mockNode, [], response);
			expect(result).toEqual([{ json: { GroupName: 'MyGroup' } }]);
		});

		it('should handle empty groups', async () => {
			mockNode.getNodeParameter.mockImplementation((name: string, _index?: number) => {
				if (name === 'includeUsers') return true;
				if (name === 'userPoolId') return 'eu-central-1_W3WwpiBXV';
				return undefined;
			});

			mockNode.getCredentials.mockReturnValue({
				aws: { id: 'mockId', name: 'mockName' },
			});

			const response = {
				body: JSON.stringify({
					Groups: [],
				}),
				headers: {},
				statusCode: 200,
			};

			const items = [{ json: { someKey: 'someValue' } }];

			const result = await processGroupsResponse.call(mockNode, items, response);

			expect(result).toEqual([
				{
					json: {
						someKey: 'someValue',
						Groups: [],
					},
				},
			]);
		});
	});

	describe('validateArn', () => {
		it('should validate the ARN format', async () => {
			mockNode.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.arn') {
					return 'arn:aws:iam::123456789012:role/GroupRole';
				}
				return '';
			});

			const requestOptions = {
				body: { additionalFields: { arn: 'arn:aws:iam::123456789012:role/GroupRole' } },
				headers: {},
				url: 'example.com',
			};

			const result = await validateArn.call(mockNode, requestOptions);

			expect(result).toEqual(requestOptions);
		});

		it('should throw an error if the ARN format is invalid', async () => {
			mockNode.getNodeParameter.mockImplementation((name: string) => {
				if (name === 'additionalFields.arn') {
					return 'invalid-arn';
				}
				return '';
			});

			const requestOptions = {
				body: { additionalFields: { arn: 'invalid-arn' } },
				headers: {},
				url: 'example.com',
			};

			await expect(validateArn.call(mockNode, requestOptions)).rejects.toThrowError(NodeApiError);
		});
	});

	describe('simplifyUserPool', () => {
		it('should simplify the user pool data when simple is true', async () => {
			mockNode.getNodeParameter.mockImplementation(() => true);
			const items = [{ json: { UserPool: { Id: 'userPoolId', Name: 'UserPoolName' } } }];
			const result = await simplifyUserPool.call(mockNode, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});
			expect(result).toEqual([{ json: { UserPool: { Id: 'userPoolId', Name: 'UserPoolName' } } }]);
		});
	});

	describe('simplifyUser', () => {
		it('should simplify the user data when simple is true', async () => {
			mockNode.getNodeParameter.mockImplementation(() => true);
			const items = [{ json: { UserAttributes: [{ Name: 'email', Value: 'user@example.com' }] } }];
			const result = await simplifyUser.call(mockNode, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});
			expect(result).toEqual([{ json: { email: 'user@example.com' } }]);
		});
	});

	describe('simplifyUsers', () => {
		it('should simplify multiple users when simple is true', async () => {
			mockNode.getNodeParameter.mockImplementation(() => true);
			const items = [
				{ json: { Users: [{ Attributes: [{ Name: 'email', Value: 'user1@example.com' }] }] } },
			];
			const result = await simplifyUsers.call(mockNode, items, {
				body: {},
				headers: {},
				statusCode: 200,
			});
			expect(result).toEqual([{ json: { Users: [{ email: 'user1@example.com' }] } }]);
		});
	});
});

import nock from 'nock';

import { equalityTest, setup, workflowToTests } from '../../../../../test/nodes/Helpers';

describe('AWS Cognito - Get All Groups', () => {
	const workflows = ['nodes/Aws/Cognito/test/group/getAll.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should retrieve all groups from the user pool', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListGroups',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Groups: [
								{
									GroupName: 'MyNewGroup',
									Description: 'Updated',
									CreationDate: 1732740693.563,
									LastModifiedDate: 1733422336.443,
									Precedence: 0,
									RoleArn: 'arn:aws:iam::123456789012:group/Admins',
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
								{
									GroupName: 'MyNewTesttttt',
									Description: 'Updated description',
									CreationDate: 1733424987.825,
									LastModifiedDate: 1741609241.742,
									Precedence: 5,
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
								{
									GroupName: 'MyNewTest1',
									Description: 'test',
									CreationDate: 1733398042.783,
									LastModifiedDate: 1733691256.447,
									Precedence: 5,
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
							],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});

	describe('should retrieve all groups including users', () => {
		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://cognito-idp.eu-central-1.amazonaws.com/',
				mocks: [
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
						},
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListGroups',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						responseBody: {
							Groups: [
								{
									GroupName: 'MyNewGroup',
									Description: 'Updated',
									CreationDate: 1732740693.563,
									LastModifiedDate: 1733422336.443,
									Precedence: 0,
									RoleArn: 'arn:aws:iam::123456789012:group/Admins',
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
								{
									GroupName: 'MyNewTesttttt',
									Description: 'Updated description',
									CreationDate: 1733424987.825,
									LastModifiedDate: 1741609241.742,
									Precedence: 5,
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
								{
									GroupName: 'MyNewTest1',
									Description: 'test',
									CreationDate: 1733398042.783,
									LastModifiedDate: 1733691256.447,
									Precedence: 5,
									UserPoolId: 'eu-central-1_KkXQgdCJv',
									Users: [],
								},
							],
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							GroupName: 'MyNewGroup',
							MaxResults: 60,
						},
						responseBody: {
							Users: [],
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							GroupName: 'MyNewTesttttt',
							MaxResults: 60,
						},
						responseBody: {
							Users: [],
						},
					},
					{
						method: 'post',
						path: '/',
						statusCode: 200,
						requestHeaders: {
							'x-amz-target': 'AWSCognitoIdentityProviderService.ListUsersInGroup',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						requestBody: {
							UserPoolId: 'eu-central-1_KkXQgdCJv',
							GroupName: 'MyNewTest1',
							MaxResults: 60,
						},
						responseBody: {
							Users: [],
						},
					},
				],
			};

			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});

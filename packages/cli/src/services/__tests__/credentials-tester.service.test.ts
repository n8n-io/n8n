import mock from 'jest-mock-extended/lib/Mock';
import type { ICredentialType, INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsHelper } from '@/credentials-helper';
import type { NodeTypes } from '@/node-types';
import { CredentialsTester } from '@/services/credentials-tester.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

describe('CredentialsTester', () => {
	const credentialTypes = mock<CredentialTypes>();
	const nodeTypes = mock<NodeTypes>();
	const credentialsHelper = mock<CredentialsHelper>();
	const credentialsTester = new CredentialsTester(
		mock(),
		mock(),
		credentialTypes,
		nodeTypes,
		credentialsHelper,
	);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should find the OAuth2 credential test for a generic OAuth2 API credential', () => {
		credentialTypes.getByName.mockReturnValue(mock<ICredentialType>({ test: undefined }));
		credentialTypes.getSupportedNodes.mockReturnValue(['oAuth2Api']);
		credentialTypes.getParentTypes.mockReturnValue([]);
		nodeTypes.getByName.mockReturnValue(
			mock<INodeType>({
				description: { credentials: [{ name: 'oAuth2Api' }] },
			}),
		);

		const testFn = credentialsTester.getCredentialTestFunction('oAuth2Api');

		if (typeof testFn !== 'function') fail();

		expect(testFn.name).toBe('oauth2CredTest');
	});

	describe('testCredentials', () => {
		let mockTestFunction: jest.Mock;

		beforeEach(() => {
			mockTestFunction = jest.fn();
			credentialTypes.getByName.mockReturnValue(mock<ICredentialType>({ test: undefined }));
			credentialTypes.getSupportedNodes.mockReturnValue(['testCredentials']);
			credentialTypes.getParentTypes.mockReturnValue([]);
			nodeTypes.getByName.mockReturnValue(
				mock<INodeType>({
					methods: {
						credentialTest: {
							testCredentialsFunction: mockTestFunction,
						},
					},
					description: {
						credentials: [{ name: 'testCredentials', testedBy: 'testCredentialsFunction' }],
					},
				}),
			);
			jest
				.spyOn(WorkflowExecuteAdditionalData, 'getBase')
				.mockResolvedValue({} as IWorkflowExecuteAdditionalData);
		});

		it('should redact secrets in error messages', async () => {
			mockTestFunction.mockResolvedValue({
				status: 'Error',
				message: 'Test failed for apiKey secret_api_key',
			});

			const computedCredentialsData = {
				testNestedData: {
					access_token: 'abc123',
					secretData: {
						apiKey: 'secret_api_key',
					},
				},
			};
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(computedCredentialsData);

			const rawCredentialsData = {
				...computedCredentialsData,
				testNestedData: {
					...computedCredentialsData.testNestedData,
					secretData: {
						apiKey: '{{ $secrets.apiKey }}',
					},
				},
			};
			const redactedMessage = await credentialsTester.testCredentials(
				'user-id',
				'testCredentials',
				{
					id: 'credential-id',
					name: 'credential-name',
					type: 'oAuth2Api',
					data: rawCredentialsData,
				},
			);

			expect(redactedMessage.status).toBe('Error');
			expect(redactedMessage.message).toBe('Test failed for apiKey *****key');
		});

		it('should not redact secrets with value shorter than 3 characters', async () => {
			mockTestFunction.mockResolvedValue({
				status: 'Error',
				message: 'Test failed for apiKey se',
			});

			const computedCredentialsData = {
				testNestedData: {
					access_token: 'abc123',
					secretData: {
						apiKey: 'se',
					},
				},
			};
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue(computedCredentialsData);

			const rawCredentialsData = {
				...computedCredentialsData,
				testNestedData: {
					...computedCredentialsData.testNestedData,
					apiKey: '{{ $secrets.apiKey }}',
				},
			};
			const redactedMessage = await credentialsTester.testCredentials(
				'user-id',
				'testCredentials',
				{
					id: 'credential-id',
					name: 'credential-name',
					type: 'oAuth2Api',
					data: rawCredentialsData,
				},
			);

			expect(redactedMessage.status).toBe('Error');
			expect(redactedMessage.message).toBe('Test failed for apiKey se');
		});
	});
});

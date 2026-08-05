import { OutboundHttp } from '@n8n/backend-network';
import type { HttpRequestClient, SsrfBridge } from '@n8n/backend-network';
import { Container } from '@n8n/di';
import type {
	ICredentialTestFunctions,
	ICredentialType,
	INodeType,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

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
		vi.clearAllMocks();
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

		if (typeof testFn !== 'function') expect.fail();

		expect(testFn.name).toBe('oauth2CredTest');
	});

	describe('testCredentials', () => {
		let mockTestFunction: Mock;

		beforeEach(() => {
			mockTestFunction = vi.fn();
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
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				{} as IWorkflowExecuteAdditionalData,
			);
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

		it('should redact secrets for bracket-notation external secret expressions', async () => {
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
						apiKey: "={{ $secrets['vault']['apiKey'] }}",
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

		// A node-defined credential test function may issue an outbound request to
		// a credential-supplied host. `testCredentials` must hand it a context
		// carrying the execution's egress policy, so that when SSRF protection is
		// enabled the test honours the same restrictions as node execution. The
		// legacy `this.helpers.request` helper routes through
		// `OutboundHttp.requests({ ssrf })`; asserting that argument proves the
		// bridge reaches the test function.
		it('forwards the SSRF bridge from getBase to a function-based credential test', async () => {
			const requestLegacy = vi.fn().mockResolvedValue('ok');
			const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ requestLegacy }));
			Container.set(OutboundHttp, mock<OutboundHttp>({ requests }));

			const ssrfBridge = mock<SsrfBridge>();
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				mock<IWorkflowExecuteAdditionalData>({ ssrfBridge }),
			);

			mockTestFunction.mockImplementation(async function (this: ICredentialTestFunctions) {
				await this.helpers.request({ uri: 'http://internal-service.local/api' });
				return { status: 'OK', message: 'ok' };
			});
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue({ baseUrl: 'http://host' });

			await credentialsTester.testCredentials('user-id', 'testCredentials', {
				id: 'credential-id',
				name: 'credential-name',
				type: 'oAuth2Api',
				data: { baseUrl: 'http://host' },
			});

			expect(mockTestFunction).toHaveBeenCalled();
			expect(requests).toHaveBeenCalledWith({ ssrf: ssrfBridge });
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

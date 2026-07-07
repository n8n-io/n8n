import { RoutingNode } from 'n8n-core';
import type { ICredentialType, INodeType, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialsHelper } from '@/credentials-helper';
import type { NodeTypes } from '@/node-types';
import { CredentialsTester } from '@/services/credentials-tester.service';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

vi.mock('n8n-core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('n8n-core')>();
	return { ...actual, RoutingNode: vi.fn() };
});

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

		it('should keep function-based tests working with the real routing engine untouched', async () => {
			mockTestFunction.mockResolvedValue({ status: 'OK', message: 'fine' });
			credentialsHelper.applyDefaultsAndOverwrites.mockResolvedValue({});

			const result = await credentialsTester.testCredentials('user-id', 'testCredentials', {
				id: 'credential-id',
				name: 'credential-name',
				type: 'testCredentials',
				data: {},
			});

			expect(result).toEqual({ status: 'OK', message: 'fine' });
			expect(RoutingNode).not.toHaveBeenCalled();
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

	describe('probeCredentialAuth', () => {
		const targetUrl = 'https://fal.run/fal-ai/flux/schnell';
		const credentials = () => ({
			id: 'credential-id',
			name: 'fal.ai API Key',
			type: 'httpHeaderAuth',
			data: { name: 'Authorization', value: 'Key abc' },
		});

		function mockRoutingNodeResult(outcome: { reject?: unknown; resolve?: unknown }) {
			// Regular function — RoutingNode is instantiated with `new`.
			(RoutingNode as unknown as Mock).mockImplementation(function () {
				return {
					runNode: outcome.reject
						? vi.fn().mockRejectedValue(outcome.reject)
						: vi.fn().mockResolvedValue(outcome.resolve ?? [[{ json: {} }]]),
				};
			});
		}

		function httpError(status: number) {
			const error = new Error(`Request failed with status code ${status}`);
			(error as Error & { cause: unknown }).cause = {
				response: { status, statusText: `HTTP ${status}` },
			};
			return error;
		}

		beforeEach(() => {
			vi.spyOn(WorkflowExecuteAdditionalData, 'getBase').mockResolvedValue(
				{} as IWorkflowExecuteAdditionalData,
			);
			credentialsHelper.applyDefaultsAndOverwrites.mockImplementation(async (_base, data) => data);
			nodeTypes.getByNameAndVersion.mockReturnValue(
				mock<INodeType>({
					description: { name: 'n8n-nodes-base.noOp', version: 1, properties: [] },
				}),
			);
		});

		it('probes the target URL with the credential applied via the routing engine', async () => {
			mockRoutingNodeResult({ resolve: [[{ json: {} }]] });

			const result = await credentialsTester.probeCredentialAuth(
				'user-id',
				'httpHeaderAuth',
				credentials(),
				targetUrl,
			);

			expect(result.status).toBe('OK');
			const nodeTypeArg = (RoutingNode as unknown as Mock).mock.calls[0][1] as INodeType;
			expect(nodeTypeArg.description.properties[0].routing?.request).toEqual({
				url: targetUrl,
				method: 'GET',
			});
		});

		it('fails only on an explicit auth rejection', async () => {
			mockRoutingNodeResult({ reject: httpError(401) });

			const result = await credentialsTester.probeCredentialAuth(
				'user-id',
				'httpHeaderAuth',
				credentials(),
				targetUrl,
			);

			expect(result.status).toBe('Error');
			expect(result.message).toContain('401');
		});

		it('treats a non-auth error response as the credential being accepted', async () => {
			mockRoutingNodeResult({ reject: httpError(405) });

			const result = await credentialsTester.probeCredentialAuth(
				'user-id',
				'httpHeaderAuth',
				credentials(),
				targetUrl,
			);

			expect(result.status).toBe('OK');
		});

		it('accepts a declared service-specific status code instead of rejecting on it', async () => {
			mockRoutingNodeResult({ reject: httpError(401) });

			const result = await credentialsTester.probeCredentialAuth(
				'user-id',
				'httpHeaderAuth',
				credentials(),
				targetUrl,
				{ acceptedStatusCodes: [401] },
			);

			expect(result.status).toBe('OK');
		});

		it('treats an unreachable service as inconclusive rather than a failure', async () => {
			const error = new Error('connect ECONNREFUSED');
			(error as Error & { cause: unknown }).cause = { code: 'ECONNREFUSED' };
			mockRoutingNodeResult({ reject: error });

			const result = await credentialsTester.probeCredentialAuth(
				'user-id',
				'httpHeaderAuth',
				credentials(),
				targetUrl,
			);

			expect(result.status).toBe('OK');
			expect(result.message).toContain('Could not reach');
		});
	});
});

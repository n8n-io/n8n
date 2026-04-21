import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { ChatBedrockConverse } from '@langchain/aws';
import {
	makeN8nLlmFailedAttemptHandler,
	N8nLlmTracing,
	getNodeProxyAgent,
} from '@n8n/ai-utilities';
import { createMockExecuteFunction } from 'n8n-nodes-base/test/nodes/Helpers';
import { assumeRole } from 'n8n-nodes-base/dist/credentials/common/aws/utils';
import type { INode, ISupplyDataFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { LmChatAwsBedrock } from '../LmChatAwsBedrock.node';

jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@langchain/aws');
jest.mock('@n8n/ai-utilities', () => ({
	getConnectionHintNoticeField: jest
		.fn()
		.mockReturnValue({ displayName: '', name: 'notice', type: 'notice', default: '' }),
	makeN8nLlmFailedAttemptHandler: jest.fn(),
	N8nLlmTracing: jest.fn(),
	getNodeProxyAgent: jest.fn(),
}));
jest.mock('n8n-nodes-base/dist/credentials/common/aws/utils', () => ({
	assumeRole: jest.fn(),
}));

const MockedBedrockRuntimeClient = jest.mocked(BedrockRuntimeClient);
const MockedChatBedrockConverse = jest.mocked(ChatBedrockConverse);
const MockedN8nLlmTracing = jest.mocked(N8nLlmTracing);
const mockedMakeN8nLlmFailedAttemptHandler = jest.mocked(makeN8nLlmFailedAttemptHandler);
const mockedGetNodeProxyAgent = jest.mocked(getNodeProxyAgent);
const mockedAssumeRole = jest.mocked(assumeRole);

describe('LmChatAwsBedrock', () => {
	let node: LmChatAwsBedrock;
	let mockContext: jest.Mocked<ISupplyDataFunctions>;

	const mockNode: INode = {
		id: '1',
		name: 'AWS Bedrock Chat Model',
		typeVersion: 1.1,
		type: 'n8n-nodes-langchain.lmChatAwsBedrock',
		position: [0, 0],
		parameters: {},
	};

	const defaultCredentials = {
		region: 'us-east-1',
		secretAccessKey: 'test-secret',
		accessKeyId: 'test-key',
		sessionToken: '',
	};

	const setupMockContext = (overrides: { credentials?: Record<string, unknown> } = {}) => {
		mockContext = createMockExecuteFunction<ISupplyDataFunctions>(
			{},
			mockNode,
		) as jest.Mocked<ISupplyDataFunctions>;

		mockContext.getCredentials = jest
			.fn()
			.mockResolvedValue(overrides.credentials ?? defaultCredentials);
		mockContext.getNode = jest.fn().mockReturnValue(mockNode);
		mockContext.getNodeParameter = jest.fn();

		MockedN8nLlmTracing.mockImplementation(() => ({}) as N8nLlmTracing);
		mockedMakeN8nLlmFailedAttemptHandler.mockReturnValue(jest.fn());
		mockedGetNodeProxyAgent.mockReturnValue(undefined);
		MockedBedrockRuntimeClient.mockImplementation(() => ({}) as BedrockRuntimeClient);
		MockedChatBedrockConverse.mockImplementation(() => ({}) as unknown as ChatBedrockConverse);

		return mockContext;
	};

	beforeEach(() => {
		node = new LmChatAwsBedrock();
		jest.clearAllMocks();
	});

	describe('supplyData', () => {
		describe('accessKeys authentication', () => {
			it('should use credential region for standard model IDs', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'us-east-1' }),
				);
				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'us-east-1' }),
				);
			});

			it('should use credential region for inference profile IDs (not ARNs)', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'eu.amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'us-east-1' }),
				);
				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'us-east-1' }),
				);
			});

			it('should pass access key credentials to BedrockRuntimeClient', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({
						credentials: expect.objectContaining({
							accessKeyId: 'test-key',
							secretAccessKey: 'test-secret',
						}),
					}),
				);
				expect(mockedAssumeRole).not.toHaveBeenCalled();
			});

			it('should pass model name and options to ChatBedrockConverse', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return { temperature: 0.5, maxTokensToSample: 1000 };
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({
						model: 'amazon.nova-pro-v1:0',
						temperature: 0.5,
						maxTokens: 1000,
					}),
				);
			});

			it('should work with v1.2 authentication param set to accessKeys', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'accessKeys';
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(ctx.getCredentials).toHaveBeenCalledWith('aws');
				expect(mockedAssumeRole).not.toHaveBeenCalled();
			});
		});

		describe('assumeRole authentication', () => {
			const assumeRoleCredentials = {
				region: 'eu-west-1',
				roleArn: 'arn:aws:iam::123456789012:role/MyRole',
				externalId: 'my-external-id',
				roleSessionName: 'n8n-session',
				useSystemCredentialsForRole: false,
				stsAccessKeyId: 'sts-key',
				stsSecretAccessKey: 'sts-secret',
			};

			const resolvedStsCredentials = {
				accessKeyId: 'assumed-key',
				secretAccessKey: 'assumed-secret',
				sessionToken: 'assumed-token',
			};

			it('should call assumeRole() eagerly and use resolved credentials', async () => {
				const ctx = setupMockContext({ credentials: assumeRoleCredentials });
				mockedAssumeRole.mockResolvedValue(resolvedStsCredentials);

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'assumeRole';
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(ctx.getCredentials).toHaveBeenCalledWith('awsAssumeRole');
				expect(mockedAssumeRole).toHaveBeenCalledWith(assumeRoleCredentials, 'eu-west-1');
				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({
						region: 'eu-west-1',
						credentials: expect.objectContaining({
							accessKeyId: 'assumed-key',
							secretAccessKey: 'assumed-secret',
							sessionToken: 'assumed-token',
						}),
					}),
				);
			});

			it('should throw NodeOperationError when assumeRole() fails', async () => {
				const ctx = setupMockContext({ credentials: assumeRoleCredentials });
				mockedAssumeRole.mockRejectedValue(new Error('STS AssumeRole failed: 403 Forbidden'));

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'assumeRole';
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(NodeOperationError);
				await expect(node.supplyData.call(ctx, 0)).rejects.toThrow(
					'Failed to assume role: STS AssumeRole failed: 403 Forbidden',
				);
			});

			it('should strip AWS XML error body from error message to avoid leaking ARNs', async () => {
				const ctx = setupMockContext({ credentials: assumeRoleCredentials });
				// Simulate what utils.ts throws when STS returns an error response:
				// "STS AssumeRole failed: 403 Forbidden - <ErrorResponse><Error><Code>AccessDenied</Code><Message>User: arn:aws:iam::123456789012:user/n8n is not authorized</Message></Error></ErrorResponse>"
				mockedAssumeRole.mockRejectedValue(
					new Error(
						'STS AssumeRole failed: 403 Forbidden - <ErrorResponse><Error><Code>AccessDenied</Code><Message>User: arn:aws:iam::123456789012:user/n8n is not authorized to assume arn:aws:iam::999999999999:role/MyRole</Message></Error></ErrorResponse>',
					),
				);

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'assumeRole';
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				let caughtError: NodeOperationError | undefined;
				try {
					await node.supplyData.call(ctx, 0);
				} catch (e) {
					caughtError = e as NodeOperationError;
				}

				expect(caughtError).toBeInstanceOf(NodeOperationError);
				// Must NOT contain ARNs or account IDs
				expect(caughtError?.message).not.toMatch(/arn:aws:/);
				expect(caughtError?.message).not.toMatch(/\d{12}/);
				// Must contain the HTTP status line (useful for diagnosis)
				expect(caughtError?.message).toContain('STS AssumeRole failed: 403 Forbidden');
			});

			it('should use region from awsAssumeRole credential', async () => {
				const ctx = setupMockContext({ credentials: assumeRoleCredentials });
				mockedAssumeRole.mockResolvedValue(resolvedStsCredentials);

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'assumeRole';
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'eu-west-1' }),
				);
				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'eu-west-1' }),
				);
			});
		});

		describe('ARN region extraction', () => {
			it('should extract region from inference profile ARN and use it', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model')
						return 'arn:aws:bedrock:eu-west-3:851725222089:inference-profile/eu.amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'eu-west-3' }),
				);
				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'eu-west-3' }),
				);
			});

			it('should extract region from foundation model ARN', async () => {
				const ctx = setupMockContext();
				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model')
						return 'arn:aws:bedrock:ap-southeast-1::foundation-model/anthropic.claude-v2';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'ap-southeast-1' }),
				);
				expect(MockedChatBedrockConverse).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'ap-southeast-1' }),
				);
			});

			it('should override assumeRole credential region when model is an ARN', async () => {
				const assumeRoleCredentials = {
					region: 'eu-west-1',
					roleArn: 'arn:aws:iam::123456789012:role/MyRole',
					externalId: 'my-external-id',
					roleSessionName: 'n8n-session',
					useSystemCredentialsForRole: false,
					stsAccessKeyId: 'sts-key',
					stsSecretAccessKey: 'sts-secret',
				};
				const ctx = setupMockContext({ credentials: assumeRoleCredentials });
				mockedAssumeRole.mockResolvedValue({
					accessKeyId: 'assumed-key',
					secretAccessKey: 'assumed-secret',
					sessionToken: 'assumed-token',
				});

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'authentication') return 'assumeRole';
					if (paramName === 'model')
						return 'arn:aws:bedrock:us-west-2:123456789012:inference-profile/us.anthropic.claude-3-5-sonnet-20241022-v2:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				// ARN region (us-west-2) should override credential region (eu-west-1)
				expect(MockedBedrockRuntimeClient).toHaveBeenCalledWith(
					expect.objectContaining({ region: 'us-west-2' }),
				);
			});
		});

		describe('proxy agent', () => {
			it('should not set requestHandler when no proxy agent is configured', async () => {
				const ctx = setupMockContext();
				mockedGetNodeProxyAgent.mockReturnValue(undefined);

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				const clientConfig = MockedBedrockRuntimeClient.mock.calls[0][0];
				expect(clientConfig).not.toHaveProperty('requestHandler');
			});

			it('should set NodeHttpHandler when proxy agent is configured', async () => {
				const ctx = setupMockContext();
				const fakeAgent = {} as ReturnType<typeof getNodeProxyAgent>;
				mockedGetNodeProxyAgent.mockReturnValue(fakeAgent);

				ctx.getNodeParameter = jest.fn().mockImplementation((paramName: string) => {
					if (paramName === 'model') return 'amazon.nova-pro-v1:0';
					if (paramName === 'options') return {};
					return undefined;
				});

				await node.supplyData.call(ctx, 0);

				const clientConfig = MockedBedrockRuntimeClient.mock.calls[0][0];
				expect(clientConfig).toHaveProperty('requestHandler');
			});
		});

		describe('node description', () => {
			it('should include version 1.2 in the version array', () => {
				expect(node.description.version).toContain(1.2);
			});

			it('should have accessKeys as the default authentication mode', () => {
				const authParam = node.description.properties.find((p) => p.name === 'authentication');
				expect(authParam?.default).toBe('accessKeys');
			});

			it('should declare both aws and awsAssumeRole credentials', () => {
				const credentialNames = node.description.credentials?.map((c) => c.name);
				expect(credentialNames).toContain('aws');
				expect(credentialNames).toContain('awsAssumeRole');
			});
		});
	});
});

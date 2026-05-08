import type { Logger } from '@n8n/backend-common';
import type { IContextEstablishmentHook } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	IExecutionContext,
	INode,
	INodeExecutionData,
	ISecureArtifacts,
	PlaintextExecutionContext,
	Workflow,
} from 'n8n-workflow';

import type { Cipher } from '@/encryption';

import type { ExecutionContextHookRegistry } from '../execution-context-hook-registry.service';
import { ExecutionContextService } from '../execution-context.service';

// Mock the helper functions from n8n-workflow
jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	toCredentialContext: jest.fn((data: string) => JSON.parse(data)),
	toSecureArtifacts: jest.fn((data: string) => JSON.parse(data)),
	toExecutionContextEstablishmentHookParameter: jest.fn(),
}));

const { toCredentialContext, toSecureArtifacts, toExecutionContextEstablishmentHookParameter } =
	jest.requireMock('n8n-workflow');

const sampleArtifacts: ISecureArtifacts = {
	version: 1,
	artifacts: {
		Webhook: [
			{
				'headers.authorization': 'Bearer A',
				'body.count': 42,
				'body.flag': true,
				'body.maybe': null,
			},
			{
				'headers.authorization': 'Bearer B',
				'body.nested': { id: 'x', tags: ['a', 'b'] },
			},
		],
		OtherTrigger: [{ 'a.b': ['v1', 'v2'] }],
	},
	metadata: { source: 'stripper' },
};

describe('ExecutionContextService', () => {
	let service: ExecutionContextService;
	let mockLogger: jest.Mocked<Logger>;
	let mockRegistry: jest.Mocked<ExecutionContextHookRegistry>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockWorkflow: Workflow;

	beforeEach(() => {
		jest.clearAllMocks();

		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockRegistry = {
			getHookByName: jest.fn(),
		} as unknown as jest.Mocked<ExecutionContextHookRegistry>;

		mockCipher = {
			decryptV2: jest.fn(),
			encryptV2: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		mockWorkflow = mock<Workflow>();

		service = new ExecutionContextService(mockLogger, mockRegistry, mockCipher);
	});

	describe('decryptExecutionContext()', () => {
		it('should return context as-is when no credentials present', async () => {
			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = await service.decryptExecutionContext(context);

			expect(result).toEqual({
				...context,
				credentials: undefined,
			});
			expect(mockCipher.decryptV2).not.toHaveBeenCalled();
		});

		it('should decrypt credentials when present', async () => {
			const encryptedCreds = 'encrypted_data';
			const decryptedCreds = '{"version":1,"identity":"token123"}';
			const parsedCreds = { version: 1, identity: 'token123' };

			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: encryptedCreds,
			};

			mockCipher.decryptV2.mockResolvedValue(decryptedCreds);
			toCredentialContext.mockReturnValue(parsedCreds);

			const result = await service.decryptExecutionContext(context);

			expect(mockCipher.decryptV2).toHaveBeenCalledWith(encryptedCreds);
			expect(toCredentialContext).toHaveBeenCalledWith(decryptedCreds);
			expect(result).toEqual({
				...context,
				credentials: parsedCreds,
			});
		});

		it('should leave secureArtifacts undefined when not present', async () => {
			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = await service.decryptExecutionContext(context);

			expect(result.secureArtifacts).toBeUndefined();
			expect(mockCipher.decryptV2).not.toHaveBeenCalled();
			expect(toSecureArtifacts).not.toHaveBeenCalled();
		});

		it('should decrypt secureArtifacts when present', async () => {
			const encryptedArtifacts = 'encrypted_artifacts';
			const decryptedArtifacts = JSON.stringify(sampleArtifacts);

			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				secureArtifacts: encryptedArtifacts,
			};

			mockCipher.decryptV2.mockResolvedValue(decryptedArtifacts);
			toSecureArtifacts.mockReturnValue(sampleArtifacts);

			const result = await service.decryptExecutionContext(context);

			expect(mockCipher.decryptV2).toHaveBeenCalledWith(encryptedArtifacts);
			expect(toSecureArtifacts).toHaveBeenCalledWith(decryptedArtifacts);
			expect(result).toEqual({
				...context,
				credentials: undefined,
				secureArtifacts: sampleArtifacts,
			});
		});

		it('should decrypt both credentials and secureArtifacts when both present', async () => {
			const encryptedCreds = 'encrypted_creds';
			const encryptedArtifacts = 'encrypted_artifacts';
			const decryptedCreds = '{"version":1,"identity":"token"}';
			const parsedCreds = { version: 1, identity: 'token' };
			const decryptedArtifacts = JSON.stringify(sampleArtifacts);

			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: encryptedCreds,
				secureArtifacts: encryptedArtifacts,
			};

			mockCipher.decryptV2.mockImplementation(async (data: string) => {
				if (data === encryptedCreds) return decryptedCreds;
				if (data === encryptedArtifacts) return decryptedArtifacts;
				throw new Error(`Unexpected ciphertext: ${data}`);
			});
			toCredentialContext.mockReturnValue(parsedCreds);
			toSecureArtifacts.mockReturnValue(sampleArtifacts);

			const result = await service.decryptExecutionContext(context);

			expect(mockCipher.decryptV2).toHaveBeenCalledWith(encryptedCreds);
			expect(mockCipher.decryptV2).toHaveBeenCalledWith(encryptedArtifacts);
			expect(result).toEqual({
				...context,
				credentials: parsedCreds,
				secureArtifacts: sampleArtifacts,
			});
		});
	});

	describe('encryptExecutionContext()', () => {
		it('should return context as-is when no credentials present', async () => {
			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = await service.encryptExecutionContext(context);

			expect(result).toEqual({
				...context,
				credentials: undefined,
			});
			expect(mockCipher.encryptV2).not.toHaveBeenCalled();
		});

		it('should encrypt credentials when present', async () => {
			const plaintextCreds = { version: 1 as const, identity: 'token123' };
			const encryptedCreds = 'encrypted_data';

			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: plaintextCreds,
			};

			mockCipher.encryptV2.mockResolvedValue(encryptedCreds);

			const result = await service.encryptExecutionContext(context);

			expect(mockCipher.encryptV2).toHaveBeenCalledWith(plaintextCreds);
			expect(result).toEqual({
				...context,
				credentials: encryptedCreds,
			});
		});

		it('should leave secureArtifacts undefined when not present', async () => {
			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = await service.encryptExecutionContext(context);

			expect(result.secureArtifacts).toBeUndefined();
			expect(mockCipher.encryptV2).not.toHaveBeenCalled();
		});

		it('should encrypt secureArtifacts when present', async () => {
			const encryptedArtifacts = 'encrypted_artifacts';

			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				secureArtifacts: sampleArtifacts,
			};

			mockCipher.encryptV2.mockResolvedValue(encryptedArtifacts);

			const result = await service.encryptExecutionContext(context);

			expect(mockCipher.encryptV2).toHaveBeenCalledWith(sampleArtifacts);
			expect(result).toEqual({
				...context,
				credentials: undefined,
				secureArtifacts: encryptedArtifacts,
			});
		});

		it('should encrypt both credentials and secureArtifacts when both present', async () => {
			const plaintextCreds = { version: 1 as const, identity: 'token' };
			const encryptedCreds = 'encrypted_creds';
			const encryptedArtifacts = 'encrypted_artifacts';

			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: plaintextCreds,
				secureArtifacts: sampleArtifacts,
			};

			mockCipher.encryptV2.mockImplementation(async (data: unknown) => {
				if (data === plaintextCreds) return encryptedCreds;
				if (data === sampleArtifacts) return encryptedArtifacts;
				throw new Error('Unexpected encryption input');
			});

			const result = await service.encryptExecutionContext(context);

			expect(result).toEqual({
				...context,
				credentials: encryptedCreds,
				secureArtifacts: encryptedArtifacts,
			});
		});
	});

	describe('encrypt → decrypt round-trip', () => {
		it('should preserve secureArtifacts through a full round-trip', async () => {
			// JSON-stringify on encrypt, identity on decrypt — simulates a symmetric cipher
			// on the JSON serialization that Cipher.encryptV2/decryptV2 perform around the payload.
			mockCipher.encryptV2.mockImplementation(async (data: unknown) => JSON.stringify(data));
			mockCipher.decryptV2.mockImplementation(async (data: string) => data);

			// Use the real toSecureArtifacts so the round-trip exercises actual schema parsing.
			const realToSecureArtifacts = jest.requireActual('n8n-workflow').toSecureArtifacts;
			toSecureArtifacts.mockImplementation(realToSecureArtifacts);

			const plaintext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 12345,
				source: 'webhook',
				secureArtifacts: sampleArtifacts,
			};

			const encrypted = await service.encryptExecutionContext(plaintext);
			expect(typeof encrypted.secureArtifacts).toBe('string');

			const decrypted = await service.decryptExecutionContext(encrypted);
			expect(decrypted.secureArtifacts).toEqual(sampleArtifacts);
		});
	});

	describe('mergeExecutionContexts()', () => {
		it('should merge simple properties from contextToMerge into baseContext', () => {
			const baseContext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 100,
				source: 'manual',
			};

			const contextToMerge: Partial<PlaintextExecutionContext> = {
				establishedAt: 200,
				source: 'webhook',
			};

			const result = service.mergeExecutionContexts(baseContext, contextToMerge);

			expect(result).toEqual({
				version: 1,
				establishedAt: 200,
				source: 'webhook',
			});
		});

		it('should merge credentials deeply', () => {
			const baseContext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 100,
				source: 'manual',
				credentials: {
					version: 1 as const,
					identity: 'base_token',
				},
			};

			const contextToMerge: Partial<PlaintextExecutionContext> = {
				credentials: {
					version: 1 as const,
					identity: 'base_token',
					metadata: { source: 'bearer-token' },
				},
			};

			const result = service.mergeExecutionContexts(baseContext, contextToMerge);

			expect(result).toEqual({
				version: 1,
				establishedAt: 100,
				source: 'manual',
				credentials: {
					version: 1,
					identity: 'base_token',
					metadata: { source: 'bearer-token' },
				},
			});
		});

		it('should preserve baseContext properties not in contextToMerge', () => {
			const baseContext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 100,
				source: 'manual',
				credentials: { version: 1 as const, identity: 'token' },
			};

			const contextToMerge: Partial<PlaintextExecutionContext> = {
				source: 'webhook',
			};

			const result = service.mergeExecutionContexts(baseContext, contextToMerge);

			expect(result).toEqual({
				version: 1,
				establishedAt: 100,
				source: 'webhook',
				credentials: { version: 1, identity: 'token' },
			});
		});

		it('should handle empty contextToMerge', () => {
			const baseContext: PlaintextExecutionContext = {
				version: 1,
				establishedAt: 100,
				source: 'manual',
			};

			const result = service.mergeExecutionContexts(baseContext, {});

			expect(result).toEqual(baseContext);
		});
	});

	describe('augmentExecutionContextWithHooks()', () => {
		const createMockStartItem = (
			contextEstablishmentHooks?: unknown,
			triggerItems: INodeExecutionData[] = [{ json: {} }],
		): IExecuteData => ({
			node: {
				parameters: contextEstablishmentHooks ? { contextEstablishmentHooks } : {},
			} as INode,
			data: { main: [triggerItems] },
			source: { main: [{ previousNode: 'test' }] },
		});

		it('should return original context when no hooks configured', async () => {
			const startItem = createMockStartItem();
			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = await service.augmentExecutionContextWithHooks(
				mockWorkflow,
				startItem,
				context,
			);

			expect(result).toEqual({
				context,
				triggerItems: startItem.data.main[0],
			});
			expect(mockRegistry.getHookByName).not.toHaveBeenCalled();
		});

		it('should handle node with contextEstablishmentHooks but undefined hooks array', async () => {
			// Temporarily use real parsing function
			const realModule = jest.requireActual('n8n-workflow');
			toExecutionContextEstablishmentHookParameter.mockImplementationOnce(
				realModule.toExecutionContextEstablishmentHookParameter,
			);

			// Node parameters with executionsHooksVersion but no hooks array
			const startItem: IExecuteData = {
				node: {
					name: 'Webhook',
					parameters: {
						executionsHooksVersion: 1,
						contextEstablishmentHooks: {
							// hooks array is undefined - should default to []
						},
					},
				} as unknown as INode,
				data: { main: [[{ json: {} }]] },
				source: { main: [{ previousNode: 'test' }] },
			};

			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			// Mock workflow.getNode to return null (service handles this gracefully)
			mockWorkflow.getNode = jest.fn().mockReturnValue(null);

			const result = await service.augmentExecutionContextWithHooks(
				mockWorkflow,
				startItem,
				context,
			);

			// Should return original context unchanged
			expect(result).toEqual({
				context,
				triggerItems: startItem.data.main[0],
			});

			// No hooks should be called since array defaults to empty
			expect(mockRegistry.getHookByName).not.toHaveBeenCalled();

			// No warning should be logged (valid schema with optional hooks)
			expect(mockLogger.warn).not.toHaveBeenCalled();
		});

		it('should execute hooks sequentially and merge context updates', async () => {
			const triggerItems: INodeExecutionData[] = [{ json: { data: 'value' } }];
			const hookConfig = {
				hooks: [
					{ hookName: 'hook1', isAllowedToFail: false, opt1: 'val1' },
					{ hookName: 'hook2', isAllowedToFail: false, opt2: 'val2' },
				],
			};
			const startItem = createMockStartItem(hookConfig, triggerItems);
			const initialContext: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
			};

			const mockHook1 = mock<IContextEstablishmentHook>();
			const mockHook2 = mock<IContextEstablishmentHook>();

			mockHook1.execute.mockResolvedValue({
				contextUpdate: {
					credentials: { version: 1 as const, identity: 'hook1_token' },
				},
			});

			mockHook2.execute.mockResolvedValue({
				contextUpdate: {
					credentials: {
						version: 1 as const,
						identity: 'hook1_token',
						metadata: { source: 'hook2' },
					},
				},
			});

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockImplementation((data: string) => JSON.parse(data));
			mockCipher.encryptV2.mockImplementation(async (data: unknown) => JSON.stringify(data));

			const result = await service.augmentExecutionContextWithHooks(
				mockWorkflow,
				startItem,
				initialContext,
			);

			// Verify hooks were called in order with correct options
			expect(mockHook1.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerNode: startItem.node,
					workflow: mockWorkflow,
					triggerItems,
					options: { hookName: 'hook1', isAllowedToFail: false, opt1: 'val1' },
				}),
			);

			expect(mockHook2.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerNode: startItem.node,
					workflow: mockWorkflow,
					triggerItems,
					options: { hookName: 'hook2', isAllowedToFail: false, opt2: 'val2' },
					context: expect.objectContaining({
						credentials: { version: 1 as const, identity: 'hook1_token' },
					}),
				}),
			);

			// Verify context was merged correctly
			expect(result.context).toBeDefined();
		});

		it('should update trigger items when hook modifies them', async () => {
			const originalItems: INodeExecutionData[] = [
				{ json: { headers: { authorization: 'Bearer secret' } } },
			];
			const modifiedItems: INodeExecutionData[] = [
				{ json: { headers: { authorization: undefined } } },
			];
			const hookConfig = {
				hooks: [{ hookName: 'hook', isAllowedToFail: false }],
			};
			const startItem = createMockStartItem(hookConfig, originalItems);

			const mockHook = mock<IContextEstablishmentHook>();
			mockHook.execute.mockResolvedValue({
				triggerItems: modifiedItems,
				contextUpdate: { credentials: { version: 1 as const, identity: 'secret' } },
			});

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encryptV2.mockImplementation(async (data: unknown) => JSON.stringify(data));

			const result = await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
			});

			expect(result.triggerItems).toEqual(modifiedItems);
		});

		it('should pass modified trigger items to subsequent hooks', async () => {
			const item1: INodeExecutionData[] = [{ json: { step: 1 } }];
			const item2: INodeExecutionData[] = [{ json: { step: 2 } }];
			const item3: INodeExecutionData[] = [{ json: { step: 3 } }];
			const hookConfig = {
				hooks: [
					{ hookName: 'hook1', isAllowedToFail: false },
					{ hookName: 'hook2', isAllowedToFail: false },
				],
			};
			const startItem = createMockStartItem(hookConfig, item1);

			const mockHook1 = mock<IContextEstablishmentHook>();
			const mockHook2 = mock<IContextEstablishmentHook>();

			mockHook1.execute.mockResolvedValue({ triggerItems: item2 });
			mockHook2.execute.mockResolvedValue({ triggerItems: item3 });

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encryptV2.mockResolvedValue('encrypted');

			await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
			});

			// Hook 2 should receive items modified by hook 1
			expect(mockHook2.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					triggerItems: item2,
				}),
			);
		});

		it('should skip hooks not found in registry and log warning', async () => {
			const hookConfig = {
				hooks: [{ hookName: 'nonexistent', isAllowedToFail: false }],
			};
			const startItem = createMockStartItem(hookConfig);

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});
			mockRegistry.getHookByName.mockReturnValue(undefined);
			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encryptV2.mockResolvedValue('encrypted');

			const result = await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
			});

			expect(result).toBeDefined();
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Execution context establishment hook nonexistent not found, skipping this hook',
			);
		});

		it('should handle hook errors when isAllowedToFail is true', async () => {
			const hookConfig = {
				hooks: [
					{ hookName: 'hook1', isAllowedToFail: true },
					{ hookName: 'hook2', isAllowedToFail: false },
				],
			};
			const startItem = createMockStartItem(hookConfig);
			const hookError = new Error('Hook execution failed');

			const mockHook1 = mock<IContextEstablishmentHook>();
			const mockHook2 = mock<IContextEstablishmentHook>();

			mockHook1.execute.mockRejectedValue(hookError);
			mockHook2.execute.mockResolvedValue({
				contextUpdate: { credentials: { version: 1 as const, identity: 'token' } },
			});

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encryptV2.mockImplementation(async (data: unknown) => JSON.stringify(data));

			const result = await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
			});

			// Should log warning but continue
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to execute context establishment hook hook1',
				{ error: hookError },
			);

			// Should still execute hook2
			expect(mockHook2.execute).toHaveBeenCalled();
			expect(result).toBeDefined();
		});

		it('should throw hook errors when isAllowedToFail is false', async () => {
			const hookConfig = {
				hooks: [{ hookName: 'hook', isAllowedToFail: false }],
			};
			const startItem = createMockStartItem(hookConfig);
			const hookError = new Error('Critical hook failure');

			const mockHook = mock<IContextEstablishmentHook>();
			mockHook.execute.mockRejectedValue(hookError);

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decryptV2.mockResolvedValue('{}');
			toCredentialContext.mockReturnValue({});

			await expect(
				service.augmentExecutionContextWithHooks(mockWorkflow, startItem, {
					version: 1,
					establishedAt: Date.now(),
					source: 'webhook',
				}),
			).rejects.toThrow(hookError);

			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to execute context establishment hook hook',
				{ error: hookError },
			);
		});

		it('should decrypt context before hooks and encrypt after', async () => {
			const hookConfig = {
				hooks: [{ hookName: 'hook', isAllowedToFail: false }],
			};
			const startItem = createMockStartItem(hookConfig);
			const encryptedContext: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: 'encrypted_data',
			};

			const mockHook = mock<IContextEstablishmentHook>();
			mockHook.execute.mockResolvedValue({});

			toExecutionContextEstablishmentHookParameter.mockReturnValue({
				data: { contextEstablishmentHooks: hookConfig },
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decryptV2.mockResolvedValue('{"version":1,"identity":"decrypted"}');
			toCredentialContext.mockReturnValue({ version: 1, identity: 'decrypted' });
			mockCipher.encryptV2.mockResolvedValue('re_encrypted_data');

			await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, encryptedContext);

			// Verify decryptV2 was called
			expect(mockCipher.decryptV2).toHaveBeenCalledWith('encrypted_data');

			// Verify hook received plaintext credentials
			expect(mockHook.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					context: expect.objectContaining({
						credentials: { version: 1 as const, identity: 'decrypted' },
					}),
				}),
			);

			// Verify encryptV2 was called for return
			expect(mockCipher.encryptV2).toHaveBeenCalled();
		});
	});
});

import type { Logger } from '@n8n/backend-common';
import type { IContextEstablishmentHook } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';
import type {
	IExecuteData,
	IExecutionContext,
	INode,
	INodeExecutionData,
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
	toExecutionContextEstablishmentHookParameter: jest.fn(),
}));

const { toCredentialContext, toExecutionContextEstablishmentHookParameter } =
	jest.requireMock('n8n-workflow');

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
			decrypt: jest.fn(),
			encrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;

		mockWorkflow = mock<Workflow>();

		service = new ExecutionContextService(mockLogger, mockRegistry, mockCipher);
	});

	describe('decryptExecutionContext()', () => {
		it('should return context as-is when no credentials present', () => {
			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = service.decryptExecutionContext(context);

			expect(result).toEqual({
				...context,
				credentials: undefined,
			});
			expect(mockCipher.decrypt).not.toHaveBeenCalled();
		});

		it('should decrypt credentials when present', () => {
			const encryptedCreds = 'encrypted_data';
			const decryptedCreds = '{"version":1,"identity":"token123"}';
			const parsedCreds = { version: 1, identity: 'token123' };

			const context: IExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: encryptedCreds,
			};

			mockCipher.decrypt.mockReturnValue(decryptedCreds);
			toCredentialContext.mockReturnValue(parsedCreds);

			const result = service.decryptExecutionContext(context);

			expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedCreds);
			expect(toCredentialContext).toHaveBeenCalledWith(decryptedCreds);
			expect(result).toEqual({
				...context,
				credentials: parsedCreds,
			});
		});
	});

	describe('encryptExecutionContext()', () => {
		it('should return context as-is when no credentials present', () => {
			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'manual',
			};

			const result = service.encryptExecutionContext(context);

			expect(result).toEqual({
				...context,
				credentials: undefined,
			});
			expect(mockCipher.encrypt).not.toHaveBeenCalled();
		});

		it('should encrypt credentials when present', () => {
			const plaintextCreds = { version: 1 as const, identity: 'token123' };
			const encryptedCreds = 'encrypted_data';

			const context: PlaintextExecutionContext = {
				version: 1,
				establishedAt: Date.now(),
				source: 'webhook',
				credentials: plaintextCreds,
			};

			mockCipher.encrypt.mockReturnValue(encryptedCreds);

			const result = service.encryptExecutionContext(context);

			expect(mockCipher.encrypt).toHaveBeenCalledWith(plaintextCreds);
			expect(result).toEqual({
				...context,
				credentials: encryptedCreds,
			});
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
				success: true,
				data: hookConfig,
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decrypt.mockReturnValue('{}');
			toCredentialContext.mockImplementation((data: string) => JSON.parse(data));
			mockCipher.encrypt.mockImplementation((data: unknown) => JSON.stringify(data));

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
				success: true,
				data: hookConfig,
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decrypt.mockReturnValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encrypt.mockImplementation((data: unknown) => JSON.stringify(data));

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
				success: true,
				data: hookConfig,
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decrypt.mockReturnValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encrypt.mockReturnValue('encrypted');

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
				success: true,
				data: hookConfig,
			});
			mockRegistry.getHookByName.mockReturnValue(undefined);
			mockCipher.decrypt.mockReturnValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encrypt.mockReturnValue('encrypted');

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
				success: true,
				data: hookConfig,
			});

			mockRegistry.getHookByName.mockImplementation((name: string) => {
				if (name === 'hook1') return mockHook1;
				if (name === 'hook2') return mockHook2;
				return undefined;
			});

			mockCipher.decrypt.mockReturnValue('{}');
			toCredentialContext.mockReturnValue({});
			mockCipher.encrypt.mockImplementation((data: unknown) => JSON.stringify(data));

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
				success: true,
				data: hookConfig,
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decrypt.mockReturnValue('{}');
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
				success: true,
				data: hookConfig,
			});
			mockRegistry.getHookByName.mockReturnValue(mockHook);
			mockCipher.decrypt.mockReturnValue('{"version":1,"identity":"decrypted"}');
			toCredentialContext.mockReturnValue({ version: 1, identity: 'decrypted' });
			mockCipher.encrypt.mockReturnValue('re_encrypted_data');

			await service.augmentExecutionContextWithHooks(mockWorkflow, startItem, encryptedContext);

			// Verify decrypt was called
			expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted_data');

			// Verify hook received plaintext credentials
			expect(mockHook.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					context: expect.objectContaining({
						credentials: { version: 1 as const, identity: 'decrypted' },
					}),
				}),
			);

			// Verify encrypt was called for return
			expect(mockCipher.encrypt).toHaveBeenCalled();
		});
	});
});

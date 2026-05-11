import { Logger } from '@n8n/backend-common';
import {
	ContextEstablishmentHook,
	ContextEstablishmentHookMetadata,
	type ContextEstablishmentOptions,
	type ContextEstablishmentResult,
	type IContextEstablishmentHook,
} from '@n8n/decorators';
import { Container } from '@n8n/di';

import { ExecutionContextHookRegistry } from '../execution-context-hook-registry.service';

describe('ExecutionContextHookRegistry', () => {
	let registry: ExecutionContextHookRegistry;
	let hookMetadata: ContextEstablishmentHookMetadata;
	let mockLogger: Logger;

	beforeAll(() => {
		// Set up Container dependencies once for all tests
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as Logger;

		hookMetadata = Container.get(ContextEstablishmentHookMetadata);
		Container.set(Logger, mockLogger);
	});

	beforeEach(() => {
		jest.clearAllMocks();

		// Manually clear the metadata's internal Set to remove hooks from previous tests
		// This prevents hooks from accumulating across tests
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(hookMetadata as any).contextEstablishmentHooks.clear();

		// Create fresh registry instance for each test
		registry = new ExecutionContextHookRegistry(hookMetadata, mockLogger);
	});

	describe('init()', () => {
		it('should register hooks from metadata', async () => {
			@ContextEstablishmentHook()
			class TestHook implements IContextEstablishmentHook {
				hookDescription = { name: 'test.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			const hook = registry.getHookByName('test.hook');
			expect(hook).toBeDefined();
			expect(hook).toBeInstanceOf(TestHook);
		});

		it('should register multiple hooks', async () => {
			@ContextEstablishmentHook()
			class FirstHook implements IContextEstablishmentHook {
				hookDescription = { name: 'first.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			@ContextEstablishmentHook()
			class SecondHook implements IContextEstablishmentHook {
				hookDescription = { name: 'second.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			const allHooks = registry.getAllHooks();
			expect(allHooks).toHaveLength(2);
			expect(registry.getHookByName('first.hook')).toBeInstanceOf(FirstHook);
			expect(registry.getHookByName('second.hook')).toBeInstanceOf(SecondHook);
		});

		it('should call optional init() method on hooks', async () => {
			const initSpy = jest.fn().mockResolvedValue(undefined);

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class HookWithInit implements IContextEstablishmentHook {
				hookDescription = { name: 'hook.with.init' };
				init = initSpy;
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			expect(initSpy).toHaveBeenCalledTimes(1);
		});

		it('should not fail if hook does not have init() method', async () => {
			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class HookWithoutInit implements IContextEstablishmentHook {
				hookDescription = { name: 'hook.without.init' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await expect(registry.init()).resolves.not.toThrow();
			expect(registry.getHookByName('hook.without.init')).toBeDefined();
		});

		it('should skip hook registration if init() throws an error', async () => {
			const initError = new Error('Hook initialization failed');

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class FailingHook implements IContextEstablishmentHook {
				hookDescription = { name: 'failing.hook' };
				init = jest.fn().mockRejectedValue(initError);
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class SuccessfulHook implements IContextEstablishmentHook {
				hookDescription = { name: 'successful.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			// Failing hook should NOT be registered
			expect(registry.getHookByName('failing.hook')).toBeUndefined();

			// Successful hook should be registered
			expect(registry.getHookByName('successful.hook')).toBeDefined();

			// Error should be logged
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to initialize execution context hook "failing.hook"'),
				expect.objectContaining({ error: initError }),
			);

			// Only successful hook in registry
			expect(registry.getAllHooks()).toHaveLength(1);
		});

		it('should clear previous hooks when re-initialized', async () => {
			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class TestHook implements IContextEstablishmentHook {
				hookDescription = { name: 'test.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();
			expect(registry.getAllHooks()).toHaveLength(1);

			// Re-initialize
			await registry.init();
			expect(registry.getAllHooks()).toHaveLength(1);
		});

		it('should handle duplicate hook names by keeping first registered and warning', async () => {
			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class FirstHook implements IContextEstablishmentHook {
				hookDescription = { name: 'duplicate.hook' };
				value = 'first';
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class SecondHook implements IContextEstablishmentHook {
				hookDescription = { name: 'duplicate.hook' };
				value = 'second';
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			// First hook should win
			const hook = registry.getHookByName('duplicate.hook');
			expect(hook).toBeDefined();

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			expect((hook as any).value).toBe('first');

			// Should have logged a warning about the duplicate
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining(
					'Execution context hook with name "duplicate.hook" is already registered',
				),
			);

			// Only one hook should be registered despite duplicate names
			const allHooks = registry.getAllHooks();
			expect(allHooks).toHaveLength(1);
		});
	});

	describe('getHookByName()', () => {
		it('should return hook by name', async () => {
			@ContextEstablishmentHook()
			class TestHook implements IContextEstablishmentHook {
				hookDescription = { name: 'credentials.bearerToken' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			const hook = registry.getHookByName('credentials.bearerToken');
			expect(hook).toBeInstanceOf(TestHook);
			expect(hook?.hookDescription.name).toBe('credentials.bearerToken');
		});

		it('should return undefined for non-existent hook', async () => {
			await registry.init();

			const hook = registry.getHookByName('non.existent.hook');
			expect(hook).toBeUndefined();
		});

		it('should return undefined before initialization', () => {
			const hook = registry.getHookByName('any.hook');
			expect(hook).toBeUndefined();
		});
	});

	describe('getAllHooks()', () => {
		it('should return empty array when no hooks registered', async () => {
			await registry.init();

			const hooks = registry.getAllHooks();
			expect(hooks).toEqual([]);
		});

		it('should return all registered hooks', async () => {
			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class FirstHook implements IContextEstablishmentHook {
				hookDescription = { name: 'first.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class SecondHook implements IContextEstablishmentHook {
				hookDescription = { name: 'second.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class ThirdHook implements IContextEstablishmentHook {
				hookDescription = { name: 'third.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();

			const hooks = registry.getAllHooks();
			expect(hooks).toHaveLength(3);
			expect(hooks.some((h) => h.hookDescription.name === 'first.hook')).toBe(true);
			expect(hooks.some((h) => h.hookDescription.name === 'second.hook')).toBe(true);
			expect(hooks.some((h) => h.hookDescription.name === 'third.hook')).toBe(true);
		});
	});

	describe('getHookForTriggerType()', () => {
		beforeEach(async () => {
			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class WebhookHook implements IContextEstablishmentHook {
				hookDescription = { name: 'webhook.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(nodeType: string): boolean {
					return nodeType === 'n8n-nodes-base.webhook';
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class FormHook implements IContextEstablishmentHook {
				hookDescription = { name: 'form.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(nodeType: string): boolean {
					return nodeType === 'n8n-nodes-base.formTrigger';
				}
			}

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class UniversalHook implements IContextEstablishmentHook {
				hookDescription = { name: 'universal.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(_nodeType: string): boolean {
					return true;
				}
			}

			await registry.init();
		});

		it('should return hooks applicable to trigger type', () => {
			const webhookHooks = registry.getHookForTriggerType('n8n-nodes-base.webhook');
			expect(webhookHooks).toHaveLength(2);
			expect(webhookHooks.some((h) => h.hookDescription.name === 'webhook.hook')).toBe(true);
			expect(webhookHooks.some((h) => h.hookDescription.name === 'universal.hook')).toBe(true);
		});

		it('should return different hooks for different trigger types', () => {
			const formHooks = registry.getHookForTriggerType('n8n-nodes-base.formTrigger');
			expect(formHooks).toHaveLength(2);
			expect(formHooks.some((h) => h.hookDescription.name === 'form.hook')).toBe(true);
			expect(formHooks.some((h) => h.hookDescription.name === 'universal.hook')).toBe(true);
		});

		it('should return only universal hooks for unknown trigger type', () => {
			const unknownHooks = registry.getHookForTriggerType('n8n-nodes-base.unknown');
			expect(unknownHooks).toHaveLength(1);
			expect(unknownHooks[0].hookDescription.name).toBe('universal.hook');
		});

		it('should return empty array when no hooks match trigger type', async () => {
			// Clear existing hooks and create registry with only specific hook
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(hookMetadata as any).contextEstablishmentHooks.clear();

			@ContextEstablishmentHook()
			// @ts-expect-error - Class is used via decorator side-effect
			class SpecificHook implements IContextEstablishmentHook {
				hookDescription = { name: 'specific.hook' };
				async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
					return {};
				}
				isApplicableToTriggerNode(nodeType: string): boolean {
					return nodeType === 'n8n-nodes-base.webhook';
				}
			}

			const newRegistry = new ExecutionContextHookRegistry(hookMetadata, mockLogger);
			await newRegistry.init();

			const hooks = newRegistry.getHookForTriggerType('n8n-nodes-base.formTrigger');
			expect(hooks).toEqual([]);
		});
	});
});

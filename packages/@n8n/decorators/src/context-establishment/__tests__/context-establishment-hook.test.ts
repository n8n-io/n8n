import { Container } from '@n8n/di';

import type {
	ContextEstablishmentOptions,
	ContextEstablishmentResult,
	IContextEstablishmentHook,
} from '../context-establishment-hook';
import {
	ContextEstablishmentHookMetadata,
	ContextEstablishmentHook,
} from '../context-establishment-hook-metadata';

describe('@ContextEstablishmentHook decorator', () => {
	let hookMetadata: ContextEstablishmentHookMetadata;

	beforeEach(() => {
		jest.resetAllMocks();

		hookMetadata = new ContextEstablishmentHookMetadata();
		Container.set(ContextEstablishmentHookMetadata, hookMetadata);
	});

	it('should register hook in ContextEstablishmentHookMetadata', () => {
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

		const registeredHooks = hookMetadata.getClasses();

		expect(registeredHooks).toContain(TestHook);
		expect(registeredHooks).toHaveLength(1);
	});

	it('should register multiple hooks', () => {
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

		@ContextEstablishmentHook()
		class ThirdHook implements IContextEstablishmentHook {
			hookDescription = { name: 'third.hook' };
			async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
				return {};
			}
			isApplicableToTriggerNode(_nodeType: string): boolean {
				return true;
			}
		}

		const registeredHooks = hookMetadata.getClasses();

		expect(registeredHooks).toContain(FirstHook);
		expect(registeredHooks).toContain(SecondHook);
		expect(registeredHooks).toContain(ThirdHook);
		expect(registeredHooks).toHaveLength(3);
	});

	it('should apply Service decorator', () => {
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

		expect(Container.has(TestHook)).toBe(true);
	});

	it('should allow instantiation of registered hooks with accessible hookDescription', () => {
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

		const hookInstance = Container.get(TestHook);

		expect(hookInstance).toBeInstanceOf(TestHook);
		expect(hookInstance.hookDescription).toEqual({ name: 'credentials.bearerToken' });
		expect(hookInstance.hookDescription.name).toBe('credentials.bearerToken');
	});

	it('should register hooks with different description names', () => {
		@ContextEstablishmentHook()
		class BearerTokenHook implements IContextEstablishmentHook {
			hookDescription = { name: 'credentials.bearerToken' };
			async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
				return {};
			}
			isApplicableToTriggerNode(_nodeType: string): boolean {
				return true;
			}
		}

		@ContextEstablishmentHook()
		class ApiKeyHook implements IContextEstablishmentHook {
			hookDescription = { name: 'credentials.apiKey' };
			async execute(_options: ContextEstablishmentOptions): Promise<ContextEstablishmentResult> {
				return {};
			}
			isApplicableToTriggerNode(_nodeType: string): boolean {
				return true;
			}
		}

		const registeredHooks = hookMetadata.getClasses();
		const bearerTokenHook = Container.get(BearerTokenHook);
		const apiKeyHook = Container.get(ApiKeyHook);

		expect(registeredHooks).toHaveLength(2);
		expect(bearerTokenHook.hookDescription.name).toBe('credentials.bearerToken');
		expect(apiKeyHook.hookDescription.name).toBe('credentials.apiKey');
	});
});

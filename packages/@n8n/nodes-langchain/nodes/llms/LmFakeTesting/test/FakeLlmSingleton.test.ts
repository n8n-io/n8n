import { FakeChatModel, FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { FakeLlmSingleton } from '../FakeLlmSingleton';
import { FakeLlmConfig } from '../types';
import { SequentialFakeStreamingChatModel } from '../SequentialFakeStreamingChatModel';

describe('FakeLlmSingleton', () => {
	let singleton: FakeLlmSingleton;

	beforeEach(() => {
		singleton = FakeLlmSingleton.getInstance();
		singleton.reset(); // Reset to default state before each test
	});

	afterEach(() => {
		singleton.reset(); // Clean up after each test
	});

	describe('singleton pattern', () => {
		it('should return the same instance', () => {
			const instance1 = FakeLlmSingleton.getInstance();
			const instance2 = FakeLlmSingleton.getInstance();
			expect(instance1).toBe(instance2);
		});
	});

	describe('configure', () => {
		it('should configure with fixed response type', () => {
			const config: Partial<FakeLlmConfig> = {
				responseType: 'fixed',
				responses: ['Test fixed response'],
			};

			singleton.configure(config);
			const currentConfig = singleton.getCurrentConfig();

			expect(currentConfig.responseType).toBe('fixed');
			expect(currentConfig.responses).toEqual(['Test fixed response']);
		});

		it('should configure with sequence response type', () => {
			const config: Partial<FakeLlmConfig> = {
				responseType: 'sequence',
				responses: ['Response 1', 'Response 2', 'Response 3'],
			};

			singleton.configure(config);
			const currentConfig = singleton.getCurrentConfig();

			expect(currentConfig.responseType).toBe('sequence');
			expect(currentConfig.responses).toEqual(['Response 1', 'Response 2', 'Response 3']);
		});

		it('should configure with error response type', () => {
			const config: Partial<FakeLlmConfig> = {
				responseType: 'error',
				shouldThrowError: true,
				errorMessage: 'Test error message',
			};

			singleton.configure(config);
			const currentConfig = singleton.getCurrentConfig();

			expect(currentConfig.responseType).toBe('error');
			expect(currentConfig.shouldThrowError).toBe(true);
			expect(currentConfig.errorMessage).toBe('Test error message');
		});

		it('should merge partial configuration with existing config', () => {
			// Set initial config
			singleton.configure({
				responseType: 'fixed',
				responses: ['Initial response'],
				toolStyle: 'function_calling',
			});

			// Update only part of the config
			singleton.configure({
				responses: ['Updated response'],
			});

			const currentConfig = singleton.getCurrentConfig();

			expect(currentConfig.responseType).toBe('fixed');
			expect(currentConfig.responses).toEqual(['Updated response']);
			expect(currentConfig.toolStyle).toBe('function_calling');
		});
	});

	describe('getFakeLlm', () => {
		it('should return FakeStreamingChatModel for fixed response type', () => {
			singleton.configure({
				responseType: 'fixed',
				responses: ['Test response'],
			});

			const fakeLlm = singleton.getFakeLlm();
			expect(fakeLlm).toBeInstanceOf(FakeStreamingChatModel);
		});

		it('should return SequentialFakeStreamingChatModel for sequence response type', () => {
			singleton.configure({
				responseType: 'sequence',
				responses: ['Response 1', 'Response 2'],
			});

			const fakeLlm = singleton.getFakeLlm();
			expect(fakeLlm).toBeInstanceOf(SequentialFakeStreamingChatModel);
		});

		it('should return error-throwing FakeChatModel for error response type', async () => {
			singleton.configure({
				responseType: 'error',
				shouldThrowError: true,
				errorMessage: 'Test error',
			});

			const fakeLlm = singleton.getFakeLlm();
			expect(fakeLlm).toBeInstanceOf(FakeChatModel);

			// Test that it throws an error when invoked
			if (fakeLlm) {
				await expect(fakeLlm.invoke('test message')).rejects.toThrow('Test error');
			}
		});

		it('should create new instance when configuration changes', () => {
			singleton.configure({ responseType: 'fixed' });
			const firstLlm = singleton.getFakeLlm();

			singleton.configure({ responseType: 'sequence' });
			const secondLlm = singleton.getFakeLlm();

			// Should be different instances due to different types
			expect(firstLlm).not.toBe(secondLlm);
			expect(firstLlm).toBeInstanceOf(FakeStreamingChatModel);
			expect(secondLlm).toBeInstanceOf(SequentialFakeStreamingChatModel);
		});
	});

	describe('reset', () => {
		it('should reset configuration to defaults', () => {
			// Modify configuration
			singleton.configure({
				responseType: 'sequence',
				responses: ['Custom response'],
				toolStyle: 'structured',
				shouldThrowError: true,
			});

			// Reset
			singleton.reset();

			const config = singleton.getCurrentConfig();
			expect(config.responseType).toBe('fixed');
			expect(config.responses).toEqual(['This is a fake response']);
			expect(config.shouldThrowError).toBe(false);
			expect(config.toolStyle).toBe('none');
		});

		it('should recreate LLM instance after reset', () => {
			singleton.configure({ responseType: 'sequence' });
			const beforeReset = singleton.getFakeLlm();

			singleton.reset();
			const afterReset = singleton.getFakeLlm();

			expect(beforeReset).not.toBe(afterReset);
			expect(afterReset).toBeInstanceOf(FakeStreamingChatModel); // Should be FakeStreamingChatModel after reset to 'fixed'
		});
	});

	describe('getCurrentConfig', () => {
		it('should return current configuration', () => {
			const config: Partial<FakeLlmConfig> = {
				responseType: 'sequence',
				responses: ['Test 1', 'Test 2'],
				toolStyle: 'function_calling',
			};

			singleton.configure(config);
			const currentConfig = singleton.getCurrentConfig();

			expect(currentConfig.responseType).toBe('sequence');
			expect(currentConfig.responses).toEqual(['Test 1', 'Test 2']);
			expect(currentConfig.toolStyle).toBe('function_calling');
		});

		it('should return a copy of the configuration', () => {
			singleton.configure({ responses: ['Original'] });
			const config = singleton.getCurrentConfig();

			// Modify the returned config
			config.responses = ['Modified'];

			// Original config should remain unchanged
			const originalConfig = singleton.getCurrentConfig();
			expect(originalConfig.responses).toEqual(['Original']);
		});
	});

	describe('error handling', () => {
		it('should handle missing responses gracefully', () => {
			singleton.configure({
				responseType: 'fixed',
				responses: undefined,
			});

			const fakeLlm = singleton.getFakeLlm();
			expect(fakeLlm).toBeInstanceOf(FakeStreamingChatModel);
		});

		it('should handle empty responses array', () => {
			singleton.configure({
				responseType: 'sequence',
				responses: [],
			});

			const fakeLlm = singleton.getFakeLlm();
			expect(fakeLlm).toBeInstanceOf(SequentialFakeStreamingChatModel);
		});

		it('should use default error message when not provided', async () => {
			singleton.configure({
				responseType: 'error',
				shouldThrowError: true,
				errorMessage: undefined,
			});

			const fakeLlm = singleton.getFakeLlm();
			if (fakeLlm) {
				await expect(fakeLlm.invoke('test')).rejects.toThrow('Fake LLM error for testing');
			}
		});
	});

	describe('resetResponseIndex', () => {
		it('should reset response index for SequentialFakeStreamingChatModel', () => {
			singleton.configure({
				responseType: 'sequence',
				responses: ['Response 1', 'Response 2'],
			});

			const fakeLlm = singleton.getFakeLlm() as SequentialFakeStreamingChatModel;
			expect(fakeLlm).toBeDefined();

			// Reset should complete without error
			singleton.resetResponseIndex();
			expect(fakeLlm).toBeDefined();
		});

		it('should handle resetResponseIndex when not using SequentialFakeStreamingChatModel', () => {
			singleton.configure({
				responseType: 'fixed',
				responses: ['Fixed response'],
			});

			// Should not throw error
			expect(() => singleton.resetResponseIndex()).not.toThrow();
		});
	});
});

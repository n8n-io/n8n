import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ModalDefinition } from '@/moduleInitializer/module.types';
import type { Component } from 'vue';
import * as modalRegistry from '@/moduleInitializer/modalRegistry';

describe('modalRegistry', () => {
	const mockComponent1 = { name: 'TestModal1' } as Component;
	const mockComponent2 = { name: 'TestModal2' } as Component;
	const mockAsyncComponent = (): Component => {
		return { name: 'AsyncTestModal3' } as Component;
	};

	const mockModal1: ModalDefinition = {
		key: 'test-modal-1',
		component: mockComponent1,
		initialState: { open: false },
	};

	const mockModal2: ModalDefinition = {
		key: 'test-modal-2',
		component: mockComponent2,
	};

	const mockModal3: ModalDefinition = {
		key: 'test-modal-3',
		component: mockAsyncComponent,
	};

	beforeEach(() => {
		// Clear all modals before each test
		const keys = modalRegistry.getKeys();
		keys.forEach((key) => modalRegistry.unregister(key));
	});

	describe('register', () => {
		it('should register a new modal', () => {
			modalRegistry.register(mockModal1);

			expect(modalRegistry.has('test-modal-1')).toBe(true);
			expect(modalRegistry.get('test-modal-1')).toEqual(mockModal1);
		});

		it('should register multiple modals', () => {
			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal2);

			expect(modalRegistry.has('test-modal-1')).toBe(true);
			expect(modalRegistry.has('test-modal-2')).toBe(true);
			expect(modalRegistry.getKeys()).toHaveLength(2);
		});

		it('should warn and skip registration if modal key already exists', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal1);

			expect(consoleSpy).toHaveBeenCalledWith(
				'Modal with key "test-modal-1" is already registered. Skipping.',
			);
			expect(modalRegistry.getKeys()).toHaveLength(1);

			consoleSpy.mockRestore();
		});

		it('should notify listeners when a modal is registered', () => {
			const listener = vi.fn();
			modalRegistry.subscribe(listener);

			modalRegistry.register(mockModal1);

			expect(listener).toHaveBeenCalledWith(expect.any(Map));
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should register modal with async component', () => {
			modalRegistry.register(mockModal3);

			expect(modalRegistry.has('test-modal-3')).toBe(true);
			expect(modalRegistry.get('test-modal-3')).toEqual(mockModal3);
		});
	});

	describe('unregister', () => {
		it('should unregister an existing modal', () => {
			modalRegistry.register(mockModal1);
			expect(modalRegistry.has('test-modal-1')).toBe(true);

			modalRegistry.unregister('test-modal-1');

			expect(modalRegistry.has('test-modal-1')).toBe(false);
			expect(modalRegistry.get('test-modal-1')).toBeUndefined();
		});

		it('should not notify listeners if modal does not exist', () => {
			const listener = vi.fn();
			modalRegistry.subscribe(listener);

			modalRegistry.unregister('non-existent-modal');

			expect(listener).not.toHaveBeenCalled();
		});

		it('should notify listeners when a modal is unregistered', () => {
			modalRegistry.register(mockModal1);
			const listener = vi.fn();
			modalRegistry.subscribe(listener);

			modalRegistry.unregister('test-modal-1');

			expect(listener).toHaveBeenCalledWith(expect.any(Map));
			expect(listener).toHaveBeenCalledTimes(1);
		});
	});

	describe('get', () => {
		it('should return modal definition for existing key', () => {
			modalRegistry.register(mockModal1);

			const result = modalRegistry.get('test-modal-1');

			expect(result).toEqual(mockModal1);
		});

		it('should return undefined for non-existent key', () => {
			const result = modalRegistry.get('non-existent-modal');

			expect(result).toBeUndefined();
		});
	});

	describe('getAll', () => {
		it('should return empty map when no modals are registered', () => {
			const result = modalRegistry.getAll();

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(0);
		});

		it('should return all registered modals', () => {
			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal2);

			const result = modalRegistry.getAll();

			expect(result).toBeInstanceOf(Map);
			expect(result.size).toBe(2);
			expect(result.get('test-modal-1')).toEqual(mockModal1);
			expect(result.get('test-modal-2')).toEqual(mockModal2);
		});

		it('should return a copy of the internal map', () => {
			modalRegistry.register(mockModal1);

			const result1 = modalRegistry.getAll();
			const result2 = modalRegistry.getAll();

			expect(result1).not.toBe(result2);
			expect(result1).toEqual(result2);
		});
	});

	describe('getKeys', () => {
		it('should return empty array when no modals are registered', () => {
			const result = modalRegistry.getKeys();

			expect(result).toEqual([]);
		});

		it('should return array of all modal keys', () => {
			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal2);

			const result = modalRegistry.getKeys();

			expect(result).toEqual(['test-modal-1', 'test-modal-2']);
		});
	});

	describe('has', () => {
		it('should return true for existing modal key', () => {
			modalRegistry.register(mockModal1);

			expect(modalRegistry.has('test-modal-1')).toBe(true);
		});

		it('should return false for non-existent modal key', () => {
			expect(modalRegistry.has('non-existent-modal')).toBe(false);
		});
	});

	describe('subscribe', () => {
		it('should call listener when modals are updated', () => {
			const listener = vi.fn();
			modalRegistry.subscribe(listener);

			modalRegistry.register(mockModal1);

			expect(listener).toHaveBeenCalledWith(expect.any(Map));
			expect(listener).toHaveBeenCalledTimes(1);

			const calledMap = listener.mock.calls[0]?.[0] as Map<string, ModalDefinition>;
			expect(calledMap?.get('test-modal-1')).toEqual(mockModal1);
		});

		it('should return unsubscribe function', () => {
			const listener = vi.fn();
			const unsubscribe = modalRegistry.subscribe(listener);

			expect(typeof unsubscribe).toBe('function');

			modalRegistry.register(mockModal1);
			expect(listener).toHaveBeenCalledTimes(1);

			unsubscribe();
			modalRegistry.register(mockModal2);
			expect(listener).toHaveBeenCalledTimes(1);
		});

		it('should support multiple listeners', () => {
			const listener1 = vi.fn();
			const listener2 = vi.fn();

			modalRegistry.subscribe(listener1);
			modalRegistry.subscribe(listener2);

			modalRegistry.register(mockModal1);

			expect(listener1).toHaveBeenCalledTimes(1);
			expect(listener2).toHaveBeenCalledTimes(1);
		});

		it('should call listeners with current state of modals', () => {
			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal2);

			const listener = vi.fn();
			modalRegistry.subscribe(listener);

			modalRegistry.register(mockModal3);

			const calledMap = listener.mock.calls[0]?.[0] as Map<string, ModalDefinition>;
			expect(calledMap?.size).toBe(3);
			expect(calledMap?.has('test-modal-1')).toBe(true);
			expect(calledMap?.has('test-modal-2')).toBe(true);
			expect(calledMap?.has('test-modal-3')).toBe(true);
		});
	});

	describe('edge cases', () => {
		it('should handle empty string key', () => {
			const emptyKeyModal: ModalDefinition = {
				key: '',
				component: { name: 'EmptyKeyModal' } as Component,
			};

			modalRegistry.register(emptyKeyModal);

			expect(modalRegistry.has('')).toBe(true);
			expect(modalRegistry.get('')).toEqual(emptyKeyModal);
		});

		it('should handle special characters in key', () => {
			const specialKeyModal: ModalDefinition = {
				key: 'modal-with-$special_ch@rs!',
				component: { name: 'SpecialModal' } as Component,
			};

			modalRegistry.register(specialKeyModal);

			expect(modalRegistry.has('modal-with-$special_ch@rs!')).toBe(true);
			expect(modalRegistry.get('modal-with-$special_ch@rs!')).toEqual(specialKeyModal);
		});

		it('should handle modal without initialState', () => {
			const modalWithoutState: ModalDefinition = {
				key: 'no-state-modal',
				component: { name: 'NoStateModal' } as Component,
			};

			modalRegistry.register(modalWithoutState);

			const retrieved = modalRegistry.get('no-state-modal');
			expect(retrieved).toEqual(modalWithoutState);
			expect(retrieved?.initialState).toBeUndefined();
		});

		it('should maintain registration order in getKeys', () => {
			modalRegistry.register(mockModal2);
			modalRegistry.register(mockModal1);
			modalRegistry.register(mockModal3);

			const keys = modalRegistry.getKeys();

			expect(keys).toEqual(['test-modal-2', 'test-modal-1', 'test-modal-3']);
		});
	});
});

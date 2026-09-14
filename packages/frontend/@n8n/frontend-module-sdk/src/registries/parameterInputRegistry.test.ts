import { describe, it, expect, beforeEach, vi } from 'vitest';
import { computed } from 'vue';
import type { Component } from 'vue';

import * as parameterInputRegistry from './parameterInputRegistry';
import type { ParameterInputContribution, ParameterInputType } from '../types/parameterInput';

describe('parameterInputRegistry', () => {
	const resourceLocatorComponent = { name: 'TestResourceLocator' } as Component;
	const workflowSelectorComponent = { name: 'TestWorkflowSelector' } as Component;
	const asyncComponent = async (): Promise<Component> =>
		await Promise.resolve({ name: 'AsyncTestInput' } as Component);

	const resourceLocator: ParameterInputContribution = {
		type: 'resourceLocator',
		component: resourceLocatorComponent,
		capabilities: { ownsExpressionRendering: true, ownsFromAiOverride: true, disableDrop: true },
	};

	const workflowSelector: ParameterInputContribution = {
		type: 'workflowSelector',
		component: workflowSelectorComponent,
	};

	const lazyInput: ParameterInputContribution = {
		type: 'filter',
		component: asyncComponent,
	};

	beforeEach(() => {
		parameterInputRegistry.clear();
	});

	describe('register', () => {
		it('should register a contribution under its parameter type', () => {
			parameterInputRegistry.register(resourceLocator);

			expect(parameterInputRegistry.has('resourceLocator')).toBe(true);
			expect(parameterInputRegistry.get('resourceLocator')).toEqual(resourceLocator);
		});

		it('should register multiple contributions', () => {
			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.register(workflowSelector);

			expect(parameterInputRegistry.getAll().size).toBe(2);
		});

		it('should accept a lazy component factory', () => {
			parameterInputRegistry.register(lazyInput);

			expect(parameterInputRegistry.get('filter')?.component).toBe(asyncComponent);
		});

		it('should warn and skip when a different contribution claims a taken type', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.register({
				type: 'resourceLocator',
				component: workflowSelectorComponent,
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				'Parameter input for type "resourceLocator" is already registered. Skipping.',
			);
			expect(parameterInputRegistry.get('resourceLocator')?.component).toBe(
				resourceLocatorComponent,
			);

			consoleSpy.mockRestore();
		});

		it('should treat a replay of the same contribution as a no-op', () => {
			const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.register(resourceLocator);

			expect(consoleSpy).not.toHaveBeenCalled();
			expect(parameterInputRegistry.getAll().size).toBe(1);

			consoleSpy.mockRestore();
		});
	});

	describe('get', () => {
		it('should return undefined for an unregistered type', () => {
			parameterInputRegistry.register(resourceLocator);

			expect(parameterInputRegistry.get('string')).toBeUndefined();
			expect(parameterInputRegistry.has('string')).toBe(false);
		});

		it('should return undefined once every contribution is cleared', () => {
			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.clear();

			expect(parameterInputRegistry.get('resourceLocator')).toBeUndefined();
		});
	});

	describe('unregister', () => {
		it('should remove a registered type', () => {
			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.unregister('resourceLocator');

			expect(parameterInputRegistry.has('resourceLocator')).toBe(false);
		});

		it('should let the type be claimed again after removal', () => {
			parameterInputRegistry.register(resourceLocator);
			parameterInputRegistry.unregister('resourceLocator');
			parameterInputRegistry.register({
				type: 'resourceLocator',
				component: workflowSelectorComponent,
			});

			expect(parameterInputRegistry.get('resourceLocator')?.component).toBe(
				workflowSelectorComponent,
			);
		});
	});

	describe('getAll', () => {
		it('should return a copy, so a caller cannot mutate the registry', () => {
			parameterInputRegistry.register(resourceLocator);

			parameterInputRegistry.getAll().delete('resourceLocator');

			expect(parameterInputRegistry.has('resourceLocator')).toBe(true);
		});
	});

	describe('reactivity', () => {
		it('should re-evaluate a computed when a contribution is registered', () => {
			const resolved = computed(() => parameterInputRegistry.get('resourceLocator'));

			expect(resolved.value).toBeUndefined();

			parameterInputRegistry.register(resourceLocator);

			expect(resolved.value).toEqual(resourceLocator);
		});

		it('should not wrap the component in a reactive proxy', () => {
			parameterInputRegistry.register(resourceLocator);

			// Shallow registry: a reactive component logs "Vue received a Component
			// that was made a reactive object" and breaks `<component :is>`.
			expect(parameterInputRegistry.get('resourceLocator')?.component).toBe(
				resourceLocatorComponent,
			);
		});
	});

	describe('subscribe', () => {
		it('should notify listeners on register and unregister', () => {
			const listener =
				vi.fn<(entries: Map<ParameterInputType, ParameterInputContribution>) => void>();
			const unsubscribe = parameterInputRegistry.subscribe(listener);

			parameterInputRegistry.register(resourceLocator);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(listener.mock.calls[0]?.[0].get('resourceLocator')).toEqual(resourceLocator);

			parameterInputRegistry.unregister('resourceLocator');
			expect(listener).toHaveBeenCalledTimes(2);

			unsubscribe();
			parameterInputRegistry.register(workflowSelector);
			expect(listener).toHaveBeenCalledTimes(2);
		});

		it('should not notify when unregistering a type that was never claimed', () => {
			const listener = vi.fn();
			const unsubscribe = parameterInputRegistry.subscribe(listener);

			parameterInputRegistry.unregister('string');

			expect(listener).not.toHaveBeenCalled();

			unsubscribe();
		});
	});
});

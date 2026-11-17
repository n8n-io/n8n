import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { defineComponent, ref } from 'vue';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import {
	runDataDisplayModeRegistry,
	type RunDataDisplayModeContribution,
} from '@n8n/frontend-module-sdk';

import { resolveDisplayMode, useRunDataDisplayModes } from './useRunDataDisplayModes';

const node: INode = {
	id: '1',
	name: 'Map Node',
	type: 'n8n-nodes-base.set',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const contribution = (
	overrides: Partial<RunDataDisplayModeContribution>,
): RunDataDisplayModeContribution => ({
	id: 'map',
	label: () => 'Map',
	icon: 'globe',
	component: defineComponent({ render: () => null }),
	canRender: () => true,
	...overrides,
});

describe('useRunDataDisplayModes', () => {
	let warnSpy: MockInstance<typeof console.warn>;

	beforeEach(() => {
		runDataDisplayModeRegistry.clear();
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	const setup = (data: INodeExecutionData[] = [{ json: { lat: 1 } }]) =>
		useRunDataDisplayModes({ node, pane: 'output', data });

	describe('available', () => {
		it('lists the registered modes whose canRender is true, in registration order', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(contribution({ id: 'chart', canRender: () => false }));
			runDataDisplayModeRegistry.register(contribution({ id: 'geo-map' }));

			expect(setup().available.value.map((mode) => mode.id)).toEqual(['map', 'geo-map']);
		});

		it('passes the node, the pane and the data to canRender', () => {
			const canRender = vi.fn(() => true);
			const data = [{ json: { lat: 1 } }];
			runDataDisplayModeRegistry.register(contribution({ canRender }));

			void setup(data).available.value;

			expect(canRender).toHaveBeenCalledWith({ node, pane: 'output', data });
		});

		it('is empty when there is no node', () => {
			runDataDisplayModeRegistry.register(contribution({}));

			const { available } = useRunDataDisplayModes({ node: null, pane: 'output', data: [] });

			expect(available.value).toEqual([]);
		});

		it('updates when a mode is registered later or the data changes', () => {
			const data = ref<INodeExecutionData[]>([]);
			const { available } = useRunDataDisplayModes({ node, pane: 'output', data });
			expect(available.value).toEqual([]);

			runDataDisplayModeRegistry.register(
				contribution({ canRender: ({ data: items }) => items.length > 0 }),
			);
			expect(available.value).toEqual([]);

			data.value = [{ json: {} }];
			expect(available.value.map((mode) => mode.id)).toEqual(['map']);
		});

		it('hides a mode whose canRender throws, and warns once', () => {
			const broken = contribution({
				id: 'broken',
				canRender: () => {
					throw new Error('boom');
				},
			});
			runDataDisplayModeRegistry.register(broken);
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));

			const data = ref<INodeExecutionData[]>([]);
			const { available } = useRunDataDisplayModes({ node, pane: 'output', data });

			expect(available.value.map((mode) => mode.id)).toEqual(['map']);
			data.value = [{ json: {} }];
			expect(available.value.map((mode) => mode.id)).toEqual(['map']);
			expect(warnSpy).toHaveBeenCalledOnce();
			expect(warnSpy).toHaveBeenCalledWith(
				'Display mode "broken" threw in canRender. Hiding it.',
				expect.any(Error),
			);
		});
	});

	describe('getRenderer', () => {
		it('returns an available mode, and nothing for a mode that cannot render', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(contribution({ id: 'chart', canRender: () => false }));

			const { getRenderer } = setup();

			expect(getRenderer('map')?.id).toBe('map');
			expect(getRenderer('chart')).toBeUndefined();
			expect(getRenderer('table')).toBeUndefined();
		});
	});

	describe('autoSelectCandidate', () => {
		it('returns the first available mode that sets autoSelect', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(
				contribution({ id: 'chart', autoSelect: true, canRender: () => false }),
			);
			runDataDisplayModeRegistry.register(contribution({ id: 'geo-map', autoSelect: true }));

			expect(setup().autoSelectCandidate.value?.id).toBe('geo-map');
		});

		it('is undefined when no available mode sets autoSelect', () => {
			runDataDisplayModeRegistry.register(contribution({}));

			expect(setup().autoSelectCandidate.value).toBeUndefined();
		});
	});

	describe('componentFor', () => {
		it('returns the same component for a lazy loader on every call', () => {
			const lazy = contribution({
				component: async () => await Promise.resolve(defineComponent({ render: () => null })),
			});

			const { componentFor } = setup();

			expect(componentFor(lazy)).toBe(componentFor(lazy));
			expect(componentFor(lazy)).not.toBe(lazy.component);
		});
	});
});

describe('resolveDisplayMode', () => {
	beforeEach(() => {
		runDataDisplayModeRegistry.clear();
	});

	it('returns a built-in mode', () => {
		expect(resolveDisplayMode('json', 'input')).toBe('json');
	});

	it('returns a registered mode, even if it cannot render the current data', () => {
		runDataDisplayModeRegistry.register(contribution({ canRender: () => false }));

		expect(resolveDisplayMode('map', 'output')).toBe('map');
	});

	it('returns the pane default for an unknown mode', () => {
		expect(resolveDisplayMode('map', 'input')).toBe('schema');
		expect(resolveDisplayMode('map', 'output')).toBe('table');
	});
});

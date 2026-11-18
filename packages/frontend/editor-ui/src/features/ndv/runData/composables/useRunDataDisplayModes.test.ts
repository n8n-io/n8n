import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { defineComponent, ref } from 'vue';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import {
	runDataDisplayModeRegistry,
	type RunDataDisplayModeContribution,
} from '@n8n/frontend-module-sdk';

import { useRunDataDisplayModes } from './useRunDataDisplayModes';

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

	describe('availableDisplayModes', () => {
		it('lists the registered modes whose canRender is true, in registration order', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(contribution({ id: 'chart', canRender: () => false }));
			runDataDisplayModeRegistry.register(contribution({ id: 'geo-map' }));

			expect(setup().availableDisplayModes.value.map((mode) => mode.id)).toEqual([
				'map',
				'geo-map',
			]);
		});

		it('passes the node, the pane and the data to canRender', () => {
			const canRender = vi.fn(() => true);
			const data = [{ json: { lat: 1 } }];
			runDataDisplayModeRegistry.register(contribution({ canRender }));

			void setup(data).availableDisplayModes.value;

			expect(canRender).toHaveBeenCalledWith({ node, pane: 'output', data });
		});

		it('is empty when there is no node', () => {
			runDataDisplayModeRegistry.register(contribution({}));

			const { availableDisplayModes } = useRunDataDisplayModes({
				node: null,
				pane: 'output',
				data: [],
			});

			expect(availableDisplayModes.value).toEqual([]);
		});

		it('updates when a mode is registered later', () => {
			const { availableDisplayModes } = setup();
			expect(availableDisplayModes.value).toEqual([]);

			runDataDisplayModeRegistry.register(contribution({}));

			expect(availableDisplayModes.value.map((mode) => mode.id)).toEqual(['map']);
		});

		it('updates when the data changes', () => {
			runDataDisplayModeRegistry.register(
				contribution({ canRender: ({ data: items }) => items.length > 0 }),
			);
			const data = ref<INodeExecutionData[]>([]);
			const { availableDisplayModes } = useRunDataDisplayModes({ node, pane: 'output', data });
			expect(availableDisplayModes.value).toEqual([]);

			data.value = [{ json: {} }];

			expect(availableDisplayModes.value.map((mode) => mode.id)).toEqual(['map']);
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
			const { availableDisplayModes } = useRunDataDisplayModes({ node, pane: 'output', data });

			expect(availableDisplayModes.value.map((mode) => mode.id)).toEqual(['map']);
			data.value = [{ json: {} }];
			expect(availableDisplayModes.value.map((mode) => mode.id)).toEqual(['map']);
			expect(warnSpy).toHaveBeenCalledOnce();
			expect(warnSpy).toHaveBeenCalledWith(
				'Display mode "broken" threw in canRender. Hiding it.',
				expect.any(Error),
			);
		});
	});

	describe('getAvailableDisplayMode', () => {
		it('returns an available mode, and nothing for a mode that cannot render', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(contribution({ id: 'chart', canRender: () => false }));

			const { getAvailableDisplayMode } = setup();

			expect(getAvailableDisplayMode('map')?.id).toBe('map');
			expect(getAvailableDisplayMode('chart')).toBeUndefined();
			expect(getAvailableDisplayMode('table')).toBeUndefined();
		});
	});

	describe('displayModeToAutoSelect', () => {
		it('returns the first available mode that sets autoSelect', () => {
			runDataDisplayModeRegistry.register(contribution({ id: 'map' }));
			runDataDisplayModeRegistry.register(
				contribution({ id: 'chart', autoSelect: true, canRender: () => false }),
			);
			runDataDisplayModeRegistry.register(contribution({ id: 'geo-map', autoSelect: true }));

			expect(setup().displayModeToAutoSelect.value?.id).toBe('geo-map');
		});

		it('is undefined when no available mode sets autoSelect', () => {
			runDataDisplayModeRegistry.register(contribution({}));

			expect(setup().displayModeToAutoSelect.value).toBeUndefined();
		});

		it('is undefined in the input pane', () => {
			runDataDisplayModeRegistry.register(contribution({ autoSelect: true }));

			const { availableDisplayModes, displayModeToAutoSelect } = useRunDataDisplayModes({
				node,
				pane: 'input',
				data: [{ json: {} }],
			});

			expect(availableDisplayModes.value.map((mode) => mode.id)).toEqual(['map']);
			expect(displayModeToAutoSelect.value).toBeUndefined();
		});
	});
});

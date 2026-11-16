import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest';
import { computed } from 'vue';
import type { Component } from 'vue';

import * as runDataDisplayModeRegistry from './runDataDisplayModeRegistry';
import type { RunDataDisplayModeContribution } from '../types/runDataDisplayMode';

describe('runDataDisplayModeRegistry', () => {
	const chartComponent = { name: 'TestChartView' } as Component;
	const mapComponent = { name: 'TestMapView' } as Component;
	const asyncComponent = async (): Promise<Component> =>
		await Promise.resolve({ name: 'AsyncTestView' } as Component);

	const chart: RunDataDisplayModeContribution = {
		id: 'chart',
		label: () => 'Chart',
		icon: 'chart-column-decreasing',
		component: chartComponent,
		canRender: () => true,
	};

	const map: RunDataDisplayModeContribution = {
		id: 'map',
		label: () => 'Map',
		icon: 'globe',
		component: mapComponent,
		canRender: ({ pane }) => pane === 'output',
	};

	const lazyView: RunDataDisplayModeContribution = {
		id: 'lazy',
		label: () => 'Lazy',
		icon: 'table',
		component: asyncComponent,
		canRender: () => true,
	};

	let warnSpy: MockInstance<typeof console.warn>;

	beforeEach(() => {
		runDataDisplayModeRegistry.clear();
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	describe('register', () => {
		it('should register a contribution under its id', () => {
			runDataDisplayModeRegistry.register(chart);

			expect(runDataDisplayModeRegistry.has('chart')).toBe(true);
			expect(runDataDisplayModeRegistry.get('chart')).toEqual(chart);
		});

		it('should accept a lazy component factory', () => {
			runDataDisplayModeRegistry.register(lazyView);

			expect(runDataDisplayModeRegistry.get('lazy')?.component).toBe(asyncComponent);
		});

		it.each(['chart', 'geo-map', 'chart2', 'a-b-c'])('should accept the id "%s"', (id) => {
			runDataDisplayModeRegistry.register({ ...chart, id });

			expect(runDataDisplayModeRegistry.has(id)).toBe(true);
			expect(warnSpy).not.toHaveBeenCalled();
		});

		it.each(['', ' json', 'Table', 'geo_map', 'geo--map', '-chart', 'chart-', '2chart'])(
			'should warn and skip the id "%s", which is not lowercase kebab-case',
			(id) => {
				runDataDisplayModeRegistry.register({ ...chart, id });

				expect(warnSpy).toHaveBeenCalledWith(
					`Display mode id "${id}" is not lowercase kebab-case. Skipping.`,
				);
				expect(runDataDisplayModeRegistry.getAll()).toHaveLength(0);
			},
		);

		it.each(['table', 'json', 'binary', 'schema', 'html', 'ai'])(
			'should warn and skip the built-in id "%s"',
			(id) => {
				runDataDisplayModeRegistry.register({ ...chart, id });

				expect(warnSpy).toHaveBeenCalledWith(
					`Display mode "${id}" is a built-in display mode and cannot be registered. Skipping.`,
				);
				expect(runDataDisplayModeRegistry.has(id)).toBe(false);
			},
		);

		it('should warn and skip when a different contribution claims a taken id', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.register({ ...map, id: 'chart' });

			expect(warnSpy).toHaveBeenCalledWith('Display mode "chart" is already registered. Skipping.');
			expect(runDataDisplayModeRegistry.get('chart')?.component).toBe(chartComponent);
		});

		it('should treat a replay of the same contribution as a no-op', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.register(chart);

			expect(warnSpy).not.toHaveBeenCalled();
			expect(runDataDisplayModeRegistry.getAll()).toHaveLength(1);
		});
	});

	describe('get', () => {
		it('should return undefined for an unregistered id', () => {
			runDataDisplayModeRegistry.register(chart);

			expect(runDataDisplayModeRegistry.get('map')).toBeUndefined();
			expect(runDataDisplayModeRegistry.has('map')).toBe(false);
		});

		it('should return undefined once every contribution is cleared', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.clear();

			expect(runDataDisplayModeRegistry.get('chart')).toBeUndefined();
		});
	});

	describe('unregister', () => {
		it('should remove a registered id', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.unregister('chart');

			expect(runDataDisplayModeRegistry.has('chart')).toBe(false);
		});

		it('should let the id be claimed again after removal', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.unregister('chart');
			runDataDisplayModeRegistry.register({ ...map, id: 'chart' });

			expect(runDataDisplayModeRegistry.get('chart')?.component).toBe(mapComponent);
		});
	});

	describe('getAll', () => {
		it('should return the contributions in registration order', () => {
			runDataDisplayModeRegistry.register(map);
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.register(lazyView);

			expect(runDataDisplayModeRegistry.getAll().map((mode) => mode.id)).toEqual([
				'map',
				'chart',
				'lazy',
			]);
		});

		it('should return a copy, so a caller cannot mutate the registry', () => {
			runDataDisplayModeRegistry.register(chart);

			runDataDisplayModeRegistry.getAll().pop();

			expect(runDataDisplayModeRegistry.has('chart')).toBe(true);
		});
	});

	describe('reactivity', () => {
		const ids = computed(() => runDataDisplayModeRegistry.getAll().map((mode) => mode.id));

		it('should re-evaluate a computed when a contribution is registered', () => {
			expect(ids.value).toEqual([]);

			runDataDisplayModeRegistry.register(chart);

			expect(ids.value).toEqual(['chart']);
		});

		it('should re-evaluate a computed when a contribution is unregistered', () => {
			runDataDisplayModeRegistry.register(chart);
			runDataDisplayModeRegistry.register(map);
			expect(ids.value).toEqual(['chart', 'map']);

			runDataDisplayModeRegistry.unregister('chart');

			expect(ids.value).toEqual(['map']);
		});

		it('should re-evaluate a computed when the registry is cleared', () => {
			runDataDisplayModeRegistry.register(chart);
			expect(ids.value).toEqual(['chart']);

			runDataDisplayModeRegistry.clear();

			expect(ids.value).toEqual([]);
		});

		it('should not wrap the component in a reactive proxy', () => {
			runDataDisplayModeRegistry.register(chart);

			// Shallow registry: a reactive component logs "Vue received a Component
			// that was made a reactive object" and breaks `<component :is>`.
			expect(runDataDisplayModeRegistry.get('chart')?.component).toBe(chartComponent);
		});
	});
});

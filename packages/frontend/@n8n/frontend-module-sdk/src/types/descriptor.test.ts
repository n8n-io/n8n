import { describe, it, expect } from 'vitest';

import type { FrontendModuleDescription } from './descriptor';

describe('FrontendModuleDescription', () => {
	it('accepts a v1-shaped descriptor (no v2 fields)', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'legacy',
			name: 'Legacy',
			description: 'A descriptor using only the original fields',
			icon: 'box',
			routes: [],
			resources: [{ key: 'legacy', displayName: 'Legacy' }],
			modals: [],
			settingsPages: [],
		};

		expect(descriptor.id).toBe('legacy');
	});

	it('accepts a v2 descriptor exercising the new optional fields', () => {
		const cleanups: Array<() => void> = [];
		const noop = () => {};
		const descriptor: FrontendModuleDescription = {
			id: 'v2',
			name: 'V2',
			description: 'A descriptor using the v2 fields',
			icon: 'box',
			locales: { en: { greeting: 'hi' } },
			pushHandlers: {
				workflowActivated: async () => {},
			},
			commands: [{ id: 'v2.open', title: 'Open V2' }],
			shortcuts: [{ keys: 'ctrl+shift+v', run: () => {} }],
			banners: [{ name: 'v2-banner', priority: 10, component: { name: 'Banner' } }],
			setup: (ctx) => {
				ctx.registerCleanup(() => {
					cleanups.push(noop);
				});
			},
		};

		expect(descriptor.commands?.[0]?.id).toBe('v2.open');
		expect(descriptor.pushHandlers?.workflowActivated).toBeTypeOf('function');
	});

	it('accepts a parameter-input contribution with a lazy component', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'inputs',
			name: 'Inputs',
			description: 'A descriptor contributing a parameter input',
			icon: 'box',
			parameterInputs: [
				{
					type: 'resourceLocator',
					component: async () => await Promise.resolve({ name: 'ResourceLocator' }),
					capabilities: { ownsExpressionRendering: true, disableDrop: true },
				},
			],
		};

		expect(descriptor.parameterInputs?.[0]?.type).toBe('resourceLocator');
		expect(descriptor.parameterInputs?.[0]?.capabilities?.ownsFromAiOverride).toBeUndefined();
	});

	it('accepts a run data display mode contribution with a lazy component', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'display-modes',
			name: 'Display modes',
			description: 'A descriptor contributing a run data display mode',
			icon: 'box',
			runDataDisplayModes: [
				{
					id: 'chart',
					label: () => 'Chart',
					icon: 'chart-column-decreasing',
					component: async () => await Promise.resolve({ name: 'ChartView' }),
					canRender: ({ data, pane }) => pane === 'output' && data.length > 0,
					autoSelect: true,
					supports: { search: true },
				},
			],
		};

		const [mode] = descriptor.runDataDisplayModes ?? [];
		expect(mode?.id).toBe('chart');
		expect(mode?.canRender({ data: [], node: {} as never, pane: 'output' })).toBe(false);
	});

	it('type-checks a run data display mode contribution', () => {
		const base = {
			id: 'chart',
			label: () => 'Chart',
			icon: 'chart-column-decreasing',
			component: { name: 'ChartView' },
		} as const;

		const modes: FrontendModuleDescription['runDataDisplayModes'] = [
			// @ts-expect-error `canRender` takes one context object, not positional arguments.
			{ ...base, canRender: (data: unknown[], node: unknown) => data.length > 0 && !!node },
			// @ts-expect-error `icon` must be a design-system icon name.
			{ ...base, icon: 'not-an-icon', canRender: () => true },
		];

		expect(modes).toHaveLength(2);
	});
});

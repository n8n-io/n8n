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

	it('accepts a settings page and a project tab that declare a label key and scopes', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'declarative',
			name: 'Declarative',
			description: 'A descriptor that resolves neither its label nor its scopes',
			icon: 'box',
			settingsPages: [
				{
					id: 'settings-declarative',
					labelKey: 'settings.declarative',
					requiredScopes: ['otel:manage', 'chatHub:manage'],
					route: { to: { name: 'SettingsDeclarative' } },
				},
			],
			projectTabs: {
				overview: [{ value: 'declarative', labelKey: 'settings.declarative' }],
			},
		};

		expect(descriptor.settingsPages?.[0]?.labelKey).toBe('settings.declarative');
		expect(descriptor.projectTabs?.overview?.[0]?.labelKey).toBe('settings.declarative');
	});

	it('keeps a resolved label and a resolved available valid, so a page can move one field at a time', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'half-moved',
			name: 'Half moved',
			description: 'A descriptor still resolving its own label',
			icon: 'box',
			settingsPages: [
				{
					id: 'settings-half-moved',
					label: 'Half moved',
					available: false,
					requiredScopes: 'otel:manage',
					route: { to: { name: 'SettingsHalfMoved' } },
				},
			],
		};

		expect(descriptor.settingsPages?.[0]?.label).toBe('Half moved');
	});

	it('rejects a settings page that declares neither a label nor a label key', () => {
		const descriptor: FrontendModuleDescription = {
			id: 'unlabelled',
			name: 'Unlabelled',
			description: 'A descriptor whose page would render a blank row',
			icon: 'box',
			settingsPages: [
				// @ts-expect-error one of `label` / `labelKey` is required
				{ id: 'settings-unlabelled', route: { to: { name: 'SettingsUnlabelled' } } },
			],
		};

		expect(descriptor.settingsPages).toHaveLength(1);
	});
});

import type { IMenuItem, TabOptions } from '@n8n/design-system';
import { describe, it, expect } from 'vitest';

import type { ModuleSettingsPage } from './settingsPage';
import type { ModuleTabOptions } from './tabs';

/**
 * `ModuleSettingsPage` and `ModuleTabOptions` are deliberate self-contained
 * subsets of the design-system types they are handed to, so this package can be
 * published without `@n8n/design-system` in its type surface.
 *
 * The value of this file is in the type annotations below, which `vue-tsc`
 * checks — not in the runtime assertion. If design-system adds a required
 * field, narrows one we send, or renames one we declare, compilation fails here
 * instead of at an external consumer's build. Do not delete this as a
 * no-op test.
 */

/** Fails to compile if we declare a key the design-system type does not have. */
type NoOrphanKeys<Ours, Theirs> = Exclude<keyof Ours, keyof Theirs> extends never ? true : never;

const settingsPage: ModuleSettingsPage = {
	id: 'settings-example',
	label: 'Example',
	icon: 'robot',
	position: 'top',
	available: true,
	disabled: false,
	notification: false,
	preview: true,
	route: { to: { name: 'ExampleView' } },
	activateOnRouteNames: ['ExampleView'],
	activateOnRoutePaths: ['/example'],
};

const tab: ModuleTabOptions<string> = {
	value: 'example',
	label: 'Example',
	icon: 'robot',
	iconPosition: 'left',
	variant: 'default',
	href: 'https://example.invalid',
	disabled: false,
	tooltip: 'Example',
	align: 'left',
	to: { name: 'ExampleView' },
	notification: false,
	tag: 'new',
	preview: true,
};

// The shell hands these straight to `registerSettingsPages(IMenuItem[])` and
// `registerCustomTabs(TabOptions<string>[])`, so forward assignability is the
// direction that must hold. The reverse must NOT hold — we omit fields on purpose.
const asMenuItem: IMenuItem = settingsPage;
const asTabOptions: TabOptions<string> = tab;

const settingsPageKeysExist: NoOrphanKeys<ModuleSettingsPage, IMenuItem> = true;
const tabKeysExist: NoOrphanKeys<ModuleTabOptions<string>, TabOptions<string>> = true;

describe('design-system compatibility', () => {
	it('keeps the severed contract types assignable to their design-system counterparts', () => {
		// Compilation is the assertion; these keep the bindings observably used.
		expect(asMenuItem.id).toBe('settings-example');
		expect(asTabOptions.value).toBe('example');
		expect(settingsPageKeysExist).toBe(true);
		expect(tabKeysExist).toBe(true);
	});
});

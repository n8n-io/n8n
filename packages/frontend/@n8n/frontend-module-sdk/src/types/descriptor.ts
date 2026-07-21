import type { IMenuItem } from '@n8n/design-system';
import type { RouteRecordRaw } from 'vue-router';

import type { ModuleBanner } from './banner';
import type { CommandBarEntry } from './command';
import type { ModuleLocaleMessages } from './locale';
import type { ModalDefinition } from './modal';
import type { ModulePushHandlers } from './push';
import type { ResourceMetadata } from './resource';
import type { ModuleSetupContext } from './setup';
import type { ModuleShortcut } from './shortcut';
import type { DynamicTabOptions } from './tabs';

/**
 * The declarative contract a frontend module exposes to the editor-ui shell.
 *
 * Descriptor v2 adds `locales`, `pushHandlers`, `commands`, `shortcuts`,
 * `banners`, and a post-login `setup(ctx)` hook. Every v2 field is optional and
 * additive, so existing descriptors satisfy the type unchanged.
 */
export type FrontendModuleDescription = {
	id: string;
	name: string;
	description: string;
	icon: string;
	routes?: RouteRecordRaw[];
	projectTabs?: {
		overview?: DynamicTabOptions[];
		project?: DynamicTabOptions[];
		shared?: DynamicTabOptions[];
	};
	resources?: ResourceMetadata[];
	modals?: ModalDefinition[];
	settingsPages?: IMenuItem[];

	// --- descriptor v2 (all optional, additive) ---

	/** Per-module i18n messages, merged into the active locale by the shell. */
	locales?: ModuleLocaleMessages;
	/** Push-message handlers, keyed by message type. */
	pushHandlers?: ModulePushHandlers;
	/** Command-bar contributions. */
	commands?: CommandBarEntry[];
	/** Global keyboard shortcuts. */
	shortcuts?: ModuleShortcut[];
	/** Banners the module can contribute to the banner stack. */
	banners?: ModuleBanner[];
	/** Runs post-login, after the module is confirmed active. */
	setup?: (ctx: ModuleSetupContext) => void | Promise<void>;
};

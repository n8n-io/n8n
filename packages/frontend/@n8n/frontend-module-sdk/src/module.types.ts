import type { IMenuItem, TabOptions } from '@n8n/design-system';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import type { ModuleBanner } from './banner';
import type { CommandBarContribution } from './command';
import type { ModuleLocaleMessages } from './locale';
import type { ModulePushHandlers } from './push';
import type { ModuleSetupContext } from './setup';
import type { ModuleShortcut } from './shortcut';

export type ModalState = {
	open: boolean;
	mode?: string | null;
	data?: Record<string, unknown>;
	activeId?: string | null;
	curlCommand?: string;
	httpNodeParameters?: string;
};

export type DynamicTabOptions = TabOptions<string> & {
	dynamicRoute?: {
		name: string;
		includeProjectId?: boolean;
	};
	/**
	 * Insert this tab immediately after the tab whose `value` matches.
	 * If unset (or no match is found at render time), the tab is appended at the end.
	 */
	insertAfter?: string;
};

export type ModalDefinition = {
	key: string;
	component: Component | (() => Promise<Component>);
	initialState?: ModalState;
};

export type ResourceMetadata = {
	key: string;
	displayName: string;
	i18nKeys?: Record<string, string>;
};

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
	commands?: CommandBarContribution[];
	/** Global keyboard shortcuts. */
	shortcuts?: ModuleShortcut[];
	/** Banners the module can contribute to the banner stack. */
	banners?: ModuleBanner[];
	/** Runs post-login, after the module is confirmed active. */
	setup?: (ctx: ModuleSetupContext) => void | Promise<void>;
};

import type { FrontendSettings } from '@n8n/api-types';
import type { IMenuItem } from '@n8n/design-system';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

import type { ModuleBanner } from './banner';
import type { CommandBarEntry } from './command';
import type { ModuleLocaleMessages } from './locale';
import type { ModalDefinition } from './modal';
import type { ParameterInputContribution } from './parameterInput';
import type { ModulePushHandlers } from './push';
import type { ResourceMetadata } from './resource';
import type { RunDataDisplayModeContribution } from './runDataDisplayMode';
import type { ModuleSetupContext } from './setup';
import type { ModuleShortcut } from './shortcut';
import type { DynamicTabOptions } from './tabs';

/** A key of `settings.enterprise`, e.g. `'logStreaming'`. */
export type ModuleLicenseFlag = keyof Omit<FrontendSettings['enterprise'], 'projects'>;

/** A page, e.g. a paywall, shown instead of the module's routes when it isn't licensed. */
export type ModulePlaceholderPage = {
	/** Show the page only when this feature is off. */
	licenseFlag: ModuleLicenseFlag;
	component: () => Promise<Component>;
};

/**
 * A heading in the settings sidebar. The shell lists them in this order:
 * Personal, People & access, AI, Integrations, Security, Operations, Billing.
 */
export type SettingsSectionId =
	| 'personal'
	| 'people'
	| 'ai'
	| 'integrations'
	| 'security'
	| 'operations'
	| 'billing';

/** A link in the settings sidebar. Shell and modules both use it. */
export type IMenuSettingItem = IMenuItem & {
	/**
	 * @description Sort position inside the section, low to high. Shell links use 10, 20, 30, ...
	 * in each section, so pick a number between two of them to land between them. No `order`
	 * means last in the section. Equal values keep registration order.
	 */
	order?: number;
	/**
	 * @description Heading the link is listed under. No `section` means the link is listed before
	 * the first heading.
	 */
	section?: SettingsSectionId;
	/**
	 * @description Settings on the page that the command bar can find. Selecting one opens the
	 * page and scrolls to the element with the matching `data-settings-anchor` attribute. Add an
	 * entry for each setting that a user can look for by name.
	 */
	searchEntries?: SettingsSearchEntry[];
	/** @description Other words that a user can type to find the page, e.g. "invite" for Users. */
	searchKeywords?: string[];
};

/** A setting on a settings page that the command bar can find and scroll to. */
export type SettingsSearchEntry = {
	/** Value of the `data-settings-anchor` attribute on the setting. Unique on its page. */
	anchor: string;
	/** Name of the setting, usually the title of its row. */
	label: string;
	/** Heading of the group that contains the setting. Shown in the result breadcrumb. */
	group?: string;
	/** Other words that a user can type to find the setting, e.g. "dark mode" for Theme. */
	keywords?: string[];
	/** Set to `false` when the setting is not shown, e.g. because of the license. */
	available?: boolean;
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
	/**
	 * Prefixes for modal keys minted at runtime instead of registered. Declared
	 * here so they arrive on the same path as `modals`, not by import side effect.
	 */
	adHocModalKeyPrefixes?: string[];
	settingsPages?: IMenuSettingItem[];
	/**
	 * Shown when the module is inactive and not licensed. Its settings links stay visible.
	 * A licensed module that is inactive (e.g. disabled) stays hidden.
	 */
	placeholderPage?: ModulePlaceholderPage;

	// --- descriptor v2 (all optional, additive) ---

	/** Per-module i18n messages, merged into the active locale by the shell. */
	locales?: ModuleLocaleMessages;
	/** Push-message handlers, keyed by message type. See `ModulePushHandlers`. */
	pushHandlers?: ModulePushHandlers;
	/** Command-bar contributions. */
	commands?: CommandBarEntry[];
	/** Global keyboard shortcuts. */
	shortcuts?: ModuleShortcut[];
	/**
	 * Custom parameter input components, resolved by `parameter.type` in the NDV
	 * parameter render path. One owner per type; an unclaimed type keeps the
	 * shell's built-in branch.
	 */
	parameterInputs?: ParameterInputContribution[];
	/**
	 * Display modes for run data in the NDV input and output panes and the Logs
	 * panel. Each one appears in the display mode select when its `canRender` is true.
	 */
	runDataDisplayModes?: RunDataDisplayModeContribution[];
	/** Banners the module can contribute to the banner stack. */
	banners?: ModuleBanner[];
	/** Runs post-login, after the module is confirmed active. */
	setup?: (ctx: ModuleSetupContext) => void | Promise<void>;
};

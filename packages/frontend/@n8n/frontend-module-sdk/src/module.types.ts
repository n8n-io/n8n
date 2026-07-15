import type { IMenuItem, TabOptions } from '@n8n/design-system';
import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

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
};

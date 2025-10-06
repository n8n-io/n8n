import type { ModalState } from '@/Interface';
import type { DynamicTabOptions } from '@/utils/modules/tabUtils';
import type { RouteRecordRaw } from 'vue-router';
import type { Component } from 'vue/dist/vue.js';
import type { IMenuItem } from '@n8n/design-system';

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

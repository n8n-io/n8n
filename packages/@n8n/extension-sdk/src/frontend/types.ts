import type { RouteRecordRaw } from 'vue-router';
import type { App, Component } from 'vue';

export type FrontendExtensionContext = {
	app: App;
	defineRoutes: (routes: RouteRecordRaw[]) => void;
	registerComponent: (name: string, component: Component) => void;
};

export type FrontendExtensionSetupFn = (context: FrontendExtensionContext) => void;

export type FrontendExtension = {
	setup: FrontendExtensionSetupFn;
};

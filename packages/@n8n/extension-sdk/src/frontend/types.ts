import type { RouteRecordRaw } from 'vue-router';
import type { App } from 'vue';

export type FrontendExtensionContext = {
	app: App;
	defineRoutes: (routes: RouteRecordRaw[]) => void;
};

export type FrontendExtensionSetupFn = (context: FrontendExtensionContext) => void;

export type FrontendExtension = {
	setup: FrontendExtensionSetupFn;
};

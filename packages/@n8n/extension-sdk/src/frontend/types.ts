import type { RouteRecordRaw } from 'vue-router';
import type { App } from 'vue';

export type FrontendModuleContext = {
	app: App;
	defineRoutes: (routes: RouteRecordRaw[]) => void;
};

export type FrontendModuleSetupFn = (context: FrontendModuleContext) => void;

export type FrontendModule = {
	setup: FrontendModuleSetupFn;
};

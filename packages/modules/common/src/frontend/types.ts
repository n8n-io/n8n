import type { RouteRecordRaw } from 'vue-router';
import type { App } from 'vue';

export type FrontEndModuleContext = {
	app: App;
	defineRoutes: (routes: RouteRecordRaw[]) => void;
};

export type FrontEndModuleSetupFn = (context: FrontEndModuleContext) => void;

export type FrontEndModule = {
	name: string;
	setup: FrontEndModuleSetupFn;
};

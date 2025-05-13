import type { Component } from 'vue';

export type FrontendModuleRegisterComponentFn = (name: string, component: Component) => void;

export type FrontendModuleContext = {
	registerComponent?: FrontendModuleRegisterComponentFn;
};

export type FrontendModuleSetupFn = (context: FrontendModuleContext) => void;

export type FrontendModule = {
	setup: FrontendModuleSetupFn;
};

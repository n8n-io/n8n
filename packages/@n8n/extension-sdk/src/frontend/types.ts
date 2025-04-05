import type { Component } from 'vue';

export type FrontendExtensionContext = {
	registerComponent: (name: string, component: Component) => void;
};

export type FrontendExtensionSetupFn = (context: FrontendExtensionContext) => void;

export type FrontendExtension = {
	setup: FrontendExtensionSetupFn;
};

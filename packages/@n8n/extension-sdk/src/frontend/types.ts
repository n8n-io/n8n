import type { Component } from 'vue';

export type FrontendExtensionRegisterComponentFn = (name: string, component: Component) => void;

export type FrontendExtensionContext = {
	registerComponent?: FrontendExtensionRegisterComponentFn;
};

export type FrontendExtensionSetupFn = (context: FrontendExtensionContext) => void;

export type FrontendExtension = {
	setup: FrontendExtensionSetupFn;
};

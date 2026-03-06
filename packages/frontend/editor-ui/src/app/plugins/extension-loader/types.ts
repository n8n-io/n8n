import type { Component } from 'vue';

export interface ExtensionEntry {
	extensionName: string;
	component?: Component;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/no-restricted-types
	handler?: Function;
	priority?: number;
	metadata?: Record<string, unknown>;
}

import type { Component } from 'vue';

export interface Extension {
	pluginName: string;
	component?: Component;
	handler?: Function;
	priority?: number;
	metadata?: Record<string, unknown>;
}

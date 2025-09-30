// Type declarations for plugin modules loaded via dynamic import
// This tells TypeScript that @n8n/plugin-* packages can be imported

import type { Component } from 'vue';
import type { LoadContext } from '@/plugins/registry.generated';

declare module '@n8n/plugin-*/frontend/index.js' {
	/**
	 * Optional function exported by plugin to control when it should load
	 * @param context - Provides access to stores for checking conditions
	 * @returns Promise<boolean> - true if plugin should load, false otherwise
	 */
	export function shouldLoad(context: LoadContext): Promise<boolean>;

	/**
	 * Default export - the plugin definition
	 */
	interface PluginExport {
		/** Plugin name (matches manifest name) */
		name: string;

		/** Single component export (legacy, prefer components object) */
		component?: Component;

		/** Named components exported by this plugin */
		components?: Record<string, Component>;

		/** Priority for ordering when multiple plugins extend same point */
		priority?: number;
	}

	const plugin: PluginExport;
	export default plugin;
}

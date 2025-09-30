import type { FrontendExtension } from './types.ts';

export function defineFrontendExtension(extension: FrontendExtension): FrontendExtension {
	return extension;
}

/**
 * Define a frontend plugin with type safety
 *
 * @example
 * ```typescript
 * export default definePlugin({
 *   shouldLoad: async () => {
 *     return posthog.isFeatureEnabled('my-feature');
 *   },
 *   onActivate: async () => {
 *     console.log('Plugin activated!');
 *   },
 *   routes: [{ path: '/my-plugin', component: MyPage }],
 *   modals: [{ key: 'settings', component: SettingsModal }],
 *   components: { MyComponent: markRaw(MyComponent) }
 * });
 * ```
 */
export function definePlugin(plugin: FrontendPlugin): FrontendPlugin {
	return plugin;
}

import type { DevtoolsPluginApi } from './api/index.js';
import type { ExtractSettingsTypes, PluginDescriptor, PluginSettingsItem } from './plugin.js';
export * from './api/index.js';
export * from './plugin.js';
export * from './time.js';
export { PluginQueueItem } from './env.js';
type Cast<A, B> = A extends B ? A : B;
type Narrowable = string | number | bigint | boolean;
type Narrow<A> = Cast<A, [] | (A extends Narrowable ? A : never) | ({
    [K in keyof A]: Narrow<A[K]>;
})>;
type Exact<C, T> = {
    [K in keyof C]: K extends keyof T ? T[K] : never;
};
export type SetupFunction<TSettings = any> = (api: DevtoolsPluginApi<TSettings>) => void;
export declare function setupDevtoolsPlugin<TDescriptor extends Exact<TDescriptor, PluginDescriptor>, TSettings = ExtractSettingsTypes<TDescriptor extends {
    settings: infer S;
} ? S extends Record<string, PluginSettingsItem> ? S : Record<string, PluginSettingsItem> : Record<string, PluginSettingsItem>>>(pluginDescriptor: Narrow<TDescriptor>, setupFn: SetupFunction<TSettings>): void;

import { Config } from './config';
import type { Api, DeprecatedInRawConfig, ImportedPlugin, FlatRawConfig, RawConfig, RawResolveConfig, ResolveConfig, ResolvedStyleguideConfig, RulesFields, Plugin, PluginCreator } from './types';
export declare function parsePresetName(presetName: string): {
    pluginId: string;
    configName: string;
};
export declare function transformApiDefinitionsToApis(apiDefinitions?: DeprecatedInRawConfig['apiDefinitions']): Record<string, Api> | undefined;
export declare function prefixRules<T extends Record<string, any>>(rules: T, prefix: string): any;
export declare function mergeExtends(rulesConfList: ResolvedStyleguideConfig[]): Omit<ResolvedStyleguideConfig, RulesFields> & Required<Pick<ResolvedStyleguideConfig, RulesFields>>;
export declare function getMergedConfig(config: Config, apiName?: string): Config;
export declare function checkForDeprecatedFields(deprecatedField: keyof (DeprecatedInRawConfig & RawConfig), updatedField: keyof FlatRawConfig | undefined, rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig, updatedObject: keyof FlatRawConfig | undefined, link?: string | undefined): void;
export declare function transformConfig(rawConfig: DeprecatedInRawConfig & RawConfig & FlatRawConfig): RawConfig;
export declare function getResolveConfig(resolve?: RawResolveConfig): ResolveConfig;
export declare function getUniquePlugins(plugins: Plugin[]): Plugin[];
export declare class ConfigValidationError extends Error {
}
export declare function deepCloneMapWithJSON<K, V>(originalMap: Map<K, V>): Map<K, V>;
export declare function isDeprecatedPluginFormat(plugin: ImportedPlugin | undefined): plugin is Plugin;
export declare function isCommonJsPlugin(plugin: ImportedPlugin | undefined): plugin is PluginCreator;

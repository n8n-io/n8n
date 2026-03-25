import { BaseResolver } from '../resolve';
import { Config } from './config';
import type { StyleguideRawConfig, Plugin, RawConfig, ResolvedApi, ResolvedStyleguideConfig } from './types';
import type { BundleOptions } from '../bundle';
import type { Document, ResolvedRefMap } from '../resolve';
export declare function resolveConfigFileAndRefs({ configPath, externalRefResolver, base, }: Omit<BundleOptions, 'config'> & {
    configPath?: string;
}): Promise<{
    document: Document;
    resolvedRefMap: ResolvedRefMap;
}>;
export declare function resolveConfig({ rawConfig, configPath, externalRefResolver, }: {
    rawConfig: RawConfig;
    configPath?: string;
    externalRefResolver?: BaseResolver;
}): Promise<Config>;
export declare function resolvePlugins(plugins: (string | Plugin)[] | null, configDir?: string): Promise<Plugin[]>;
export declare function resolveApis({ rawConfig, configPath, resolver, }: {
    rawConfig: RawConfig;
    configPath?: string;
    resolver?: BaseResolver;
}): Promise<Record<string, ResolvedApi>>;
export declare function resolveStyleguideConfig(opts: {
    styleguideConfig?: StyleguideRawConfig;
    configPath?: string;
    resolver?: BaseResolver;
    parentConfigPaths?: string[];
    extendPaths?: string[];
}): Promise<ResolvedStyleguideConfig>;
export declare function resolvePreset(presetName: string, plugins: Plugin[]): ResolvedStyleguideConfig;

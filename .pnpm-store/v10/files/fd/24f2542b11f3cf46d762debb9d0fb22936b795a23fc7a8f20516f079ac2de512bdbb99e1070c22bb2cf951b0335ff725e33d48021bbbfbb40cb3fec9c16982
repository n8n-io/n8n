import { BaseResolver } from '../resolve';
import type { Config } from './config';
import type { Document, ResolvedRefMap } from '../resolve';
import type { RegionalTokenWithValidity } from '../redocly/redocly-client-types';
import type { RawConfig, RawUniversalConfig, Region } from './types';
export type RawConfigProcessor = (params: {
    document: Document;
    resolvedRefMap: ResolvedRefMap;
    config: Config;
    parsed: Document['parsed'];
}) => void | Promise<void>;
export declare function loadConfig(options?: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: RawConfigProcessor;
    externalRefResolver?: BaseResolver;
    files?: string[];
    region?: Region;
}): Promise<Config>;
export declare const CONFIG_FILE_NAMES: string[];
export declare function findConfig(dir?: string): string | undefined;
export declare function getConfig(options?: {
    configPath?: string;
    externalRefResolver?: BaseResolver;
}): Promise<{
    rawConfig: RawConfig;
    document?: Document;
    parsed?: Document['parsed'];
    resolvedRefMap?: ResolvedRefMap;
}>;
type CreateConfigOptions = {
    extends?: string[];
    tokens?: RegionalTokenWithValidity[];
    configPath?: string;
    externalRefResolver?: BaseResolver;
};
export declare function createConfig(config: string | RawUniversalConfig, options?: CreateConfigOptions): Promise<Config>;
export {};

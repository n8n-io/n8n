import type { NormalizedCacheSettings, PluginSettings } from '../types.js';
export interface CacheObject {
    result: unknown;
    lastSeen: ReturnType<typeof process.hrtime>;
}
export declare class ModuleCache {
    map: Map<string, CacheObject>;
    constructor(map?: Map<string, CacheObject>);
    set(cacheKey: string, result: unknown): unknown;
    get<T>(cacheKey: string, settings: NormalizedCacheSettings): T | undefined;
    static getSettings(settings: PluginSettings): NormalizedCacheSettings;
}

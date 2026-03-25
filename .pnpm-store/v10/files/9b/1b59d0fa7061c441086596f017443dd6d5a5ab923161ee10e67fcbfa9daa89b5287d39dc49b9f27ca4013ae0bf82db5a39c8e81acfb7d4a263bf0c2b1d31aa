import type { ImportSettings, PluginSettings } from '../types.js';
export type CacheKey = unknown;
export interface CacheObject {
    result: unknown;
    lastSeen: ReturnType<typeof process.hrtime>;
}
export declare class ModuleCache {
    map: Map<CacheKey, CacheObject>;
    constructor(map?: Map<CacheKey, CacheObject>);
    set(cacheKey: CacheKey, result: unknown): unknown;
    get<T>(cacheKey: CacheKey, settings: ImportSettings['cache']): T | undefined;
    static getSettings(settings: PluginSettings): ImportSettings["cache"] & {
        lifetime: number;
    };
}

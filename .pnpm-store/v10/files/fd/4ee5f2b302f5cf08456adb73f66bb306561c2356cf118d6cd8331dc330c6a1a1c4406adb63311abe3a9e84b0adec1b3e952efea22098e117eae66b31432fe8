import { Config } from './config/config';
import { OclifConfiguration, Plugin } from './interfaces';
type OclifCoreInfo = {
    name: string;
    version: string;
};
type CacheContents = {
    rootPlugin: Plugin;
    config: Config;
    exitCodes: OclifConfiguration['exitCodes'];
    '@oclif/core': OclifCoreInfo;
};
type ValueOf<T> = T[keyof T];
/**
 * A simple cache for storing values that need to be accessed globally.
 */
export default class Cache extends Map<keyof CacheContents, ValueOf<CacheContents>> {
    static instance: Cache;
    constructor();
    static getInstance(): Cache;
    get(key: 'config'): Config | undefined;
    get(key: '@oclif/core'): OclifCoreInfo;
    get(key: 'rootPlugin'): Plugin | undefined;
    get(key: 'exitCodes'): OclifConfiguration['exitCodes'] | undefined;
    private getOclifCoreMeta;
}
export {};

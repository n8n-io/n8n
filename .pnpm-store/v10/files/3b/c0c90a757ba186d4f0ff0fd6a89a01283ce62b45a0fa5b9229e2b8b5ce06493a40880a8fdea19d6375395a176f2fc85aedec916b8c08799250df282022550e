import { Config } from './config/config';
import { OclifConfiguration, Plugin } from './interfaces';
type CacheContents = {
    rootPlugin: Plugin;
    config: Config;
    exitCodes: OclifConfiguration['exitCodes'];
    '@oclif/core': OclifCoreInfo;
};
type OclifCoreInfo = {
    name: string;
    version: string;
};
type ValueOf<T> = T[keyof T];
/**
 * A simple cache for storing values that need to be accessed globally.
 */
export default class Cache extends Map<keyof CacheContents, ValueOf<CacheContents>> {
    static instance: Cache;
    constructor();
    static getInstance(): Cache;
    get(_key: 'config'): Config | undefined;
    get(_key: '@oclif/core'): OclifCoreInfo;
    get(_key: 'rootPlugin'): Plugin | undefined;
    get(_key: 'exitCodes'): OclifConfiguration['exitCodes'] | undefined;
    private getOclifCoreMeta;
}
export {};

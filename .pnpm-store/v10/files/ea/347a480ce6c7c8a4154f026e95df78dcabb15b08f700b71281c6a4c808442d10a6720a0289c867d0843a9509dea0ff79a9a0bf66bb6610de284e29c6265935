import { Cache } from './caching';
export type MultiCache = Omit<Cache, 'store'> & Pick<Cache['store'], 'mset' | 'mget' | 'mdel'>;
/**
 * Module that lets you specify a hierarchy of caches.
 */
export declare function multiCaching<Caches extends Cache[]>(caches: Caches): MultiCache;

import { MemoryCache, MemoryConfig } from './stores';
export type Config = {
    ttl?: Milliseconds;
    isCacheable?: (val: unknown) => boolean;
};
export type Milliseconds = number;
/**
 * @deprecated will remove after 5.2.0. Use Milliseconds instead
 */
export type Ttl = Milliseconds;
export type Store = {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, data: T, ttl?: Milliseconds): Promise<void>;
    del(key: string): Promise<void>;
    reset(): Promise<void>;
    mset(args: [string, unknown][], ttl?: Milliseconds): Promise<void>;
    mget(...args: string[]): Promise<unknown[]>;
    mdel(...args: string[]): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    ttl(key: string): Promise<number>;
};
export type StoreConfig = Config;
export type FactoryConfig<T> = T & Config;
export type FactoryStore<S extends Store, T extends object = never> = (config?: FactoryConfig<T>) => S | Promise<S>;
export type Stores<S extends Store, T extends object> = 'memory' | Store | FactoryStore<S, T>;
export type CachingConfig<T> = MemoryConfig | StoreConfig | FactoryConfig<T>;
export type Cache<S extends Store = Store> = {
    set: (key: string, value: unknown, ttl?: Milliseconds) => Promise<void>;
    get: <T>(key: string) => Promise<T | undefined>;
    del: (key: string) => Promise<void>;
    reset: () => Promise<void>;
    wrap<T>(key: string, fn: () => Promise<T>, ttl?: Milliseconds): Promise<T>;
    store: S;
};
export declare function caching(name: 'memory', args?: MemoryConfig): Promise<MemoryCache>;
export declare function caching<S extends Store>(store: S): Promise<Cache<S>>;
export declare function caching<S extends Store, T extends object = never>(factory: FactoryStore<S, T>, args?: FactoryConfig<T>): Promise<Cache<S>>;

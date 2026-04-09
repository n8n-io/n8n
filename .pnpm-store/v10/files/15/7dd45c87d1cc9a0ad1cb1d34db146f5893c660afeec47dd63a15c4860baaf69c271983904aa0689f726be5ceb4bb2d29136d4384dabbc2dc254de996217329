import { type JSONValue } from './objects.js';
export declare abstract class FileMap<V> implements Map<string, V> {
    protected readonly path: string;
    get [Symbol.toStringTag](): string;
    constructor(path: string);
    protected abstract readonly _map: Map<string, V>;
    abstract clear(): void;
    abstract delete(key: string): boolean;
    abstract get(key: string): V;
    abstract has(key: string): boolean;
    abstract set(key: string, value: V): this;
    get size(): number;
    get [Symbol.iterator](): () => MapIterator<[string, V]>;
    get keys(): typeof this._map.keys;
    get values(): typeof this._map.values;
    get entries(): typeof this._map.entries;
    get forEach(): typeof this._map.forEach;
}
export interface JSONFileMapOptions {
    /**
     * Should an invalid JSON file be overwritten
     */
    overwrite_invalid: boolean;
}
/**
 * A Map overlaying a JSON file
 */
export declare class JSONFileMap<T extends JSONValue = JSONValue> extends FileMap<T> {
    readonly options: JSONFileMapOptions;
    get [Symbol.toStringTag](): 'JSONFileMap';
    constructor(path: string, options: JSONFileMapOptions);
    get _map(): Map<string, T>;
    _write(map: Map<string, T>): void;
    clear(): void;
    delete(key: string): boolean;
    get<U extends T>(key: string): U;
    has(key: string): boolean;
    set(key: string, value: T): this;
}
export interface FolderMapOptions {
    /**
     * Suffix to append to keys to resolve file names
     */
    suffix: string;
}
/**
 * A Map overlaying a folder
 */
export declare class FolderMap extends FileMap<string> {
    readonly options: Partial<FolderMapOptions>;
    get [Symbol.toStringTag](): 'FolderMap';
    constructor(path: string, options: Partial<FolderMapOptions>);
    protected get _names(): string[];
    protected _join(path: string): string;
    protected get _map(): Map<string, string>;
    clear(): void;
    delete(key: string): boolean;
    get(key: string): string;
    has(key: string): boolean;
    set(key: string, value: string): this;
}
export declare function gitCommitHash(repo?: string): string;

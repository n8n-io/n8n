import type { AnyObject } from '../types/basic.js';
import type { Merge } from '../types/utils.js';
export type ResolverObjectKey = string | boolean;
export interface ResolverCache<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T> {
    [Symbol.toStringTag]: 'Object';
    _cacheable: boolean;
    _scopes: T;
    _rootScopes: T | R;
    _fallback: ResolverObjectKey;
    _keys?: string[];
    _scriptable?: boolean;
    _indexable?: boolean;
    _allKeys?: boolean;
    _storage?: T[number];
    _getTarget(): T[number];
    override<S extends AnyObject>(scope: S): ResolverProxy<(T[number] | S)[], T | R>;
}
export type ResolverProxy<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T> = Merge<T[number]> & ResolverCache<T, R>;
export interface DescriptorDefaults {
    scriptable: boolean;
    indexable: boolean;
    allKeys?: boolean;
}
export interface Descriptor {
    allKeys: boolean;
    scriptable: boolean;
    indexable: boolean;
    isScriptable(key: string): boolean;
    isIndexable(key: string): boolean;
}
export interface ContextCache<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T> {
    _cacheable: boolean;
    _proxy: ResolverProxy<T, R>;
    _context: AnyObject;
    _subProxy: ResolverProxy<T, R>;
    _stack: Set<string>;
    _descriptors: Descriptor;
    setContext(ctx: AnyObject): ContextProxy<T, R>;
    override<S extends AnyObject>(scope: S): ContextProxy<(T[number] | S)[], T | R>;
}
export type ContextProxy<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T> = Merge<T[number]> & ContextCache<T, R>;

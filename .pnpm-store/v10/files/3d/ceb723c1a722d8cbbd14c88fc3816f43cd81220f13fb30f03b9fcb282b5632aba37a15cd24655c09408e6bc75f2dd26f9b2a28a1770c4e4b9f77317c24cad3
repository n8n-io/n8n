import type { AnyObject } from '../types/basic.js';
import type { ChartMeta } from '../types/index.js';
import type { ResolverObjectKey, ResolverCache, ResolverProxy, DescriptorDefaults, Descriptor, ContextProxy } from './helpers.config.types.js';
export * from './helpers.config.types.js';
/**
 * Creates a Proxy for resolving raw values for options.
 * @param scopes - The option scopes to look for values, in resolution order
 * @param prefixes - The prefixes for values, in resolution order.
 * @param rootScopes - The root option scopes
 * @param fallback - Parent scopes fallback
 * @param getTarget - callback for getting the target for changed values
 * @returns Proxy
 * @private
 */
export declare function _createResolver<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T>(scopes: T, prefixes?: string[], rootScopes?: R, fallback?: ResolverObjectKey, getTarget?: () => AnyObject): any;
/**
 * Returns an Proxy for resolving option values with context.
 * @param proxy - The Proxy returned by `_createResolver`
 * @param context - Context object for scriptable/indexable options
 * @param subProxy - The proxy provided for scriptable options
 * @param descriptorDefaults - Defaults for descriptors
 * @private
 */
export declare function _attachContext<T extends AnyObject[] = AnyObject[], R extends AnyObject[] = T>(proxy: ResolverProxy<T, R>, context: AnyObject, subProxy?: ResolverProxy<T, R>, descriptorDefaults?: DescriptorDefaults): ContextProxy<T, R>;
/**
 * @private
 */
export declare function _descriptors(proxy: ResolverCache, defaults?: DescriptorDefaults): Descriptor;
export declare function _parseObjectDataRadialScale(meta: ChartMeta<'line' | 'scatter'>, data: AnyObject[], start: number, count: number): {
    r: unknown;
}[];

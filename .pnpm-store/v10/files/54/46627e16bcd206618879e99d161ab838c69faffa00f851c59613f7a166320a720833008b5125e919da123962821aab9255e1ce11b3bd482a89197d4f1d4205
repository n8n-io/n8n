/* Utilities for `fetch` when using range requests. It also allows you to handle errors easier */
import * as cache from './cache.js';
/** @deprecated Use `cache.Resource` */
export const ResourceCache = cache.Resource;
/* eslint-disable @typescript-eslint/only-throw-error */
/**
 * @internal
 */
export const resourcesCache = new Map();
/**
 * Wraps `fetch`
 * @throws RequestError
 */
async function _fetch(input, init = {}, bodyOptional = false) {
    const response = await fetch(input, init).catch((error) => {
        throw { tag: 'fetch', message: error.message };
    });
    if (!response.ok)
        throw { tag: 'status', response };
    const raw = await response.arrayBuffer().catch((error) => {
        if (bodyOptional)
            return;
        throw { tag: 'buffer', response, message: error.message };
    });
    return { response, data: raw ? new Uint8Array(raw) : undefined };
}
/**
 * Make a GET request without worrying about ranges
 * @throws RequestError
 */
export async function get(url, options, init = {}) {
    const req = new Request(url, init);
    // Request no using ranges
    if (typeof options.start != 'number' || typeof options.end != 'number') {
        const { data } = await _fetch(url, init);
        new cache.Resource(url, data.byteLength, options, resourcesCache).add(data, 0);
        return data;
    }
    // Range requests
    if (typeof options.size != 'number') {
        options.warn?.(url + ': Size not provided, an additional HEAD request is being made');
        const { headers } = await fetch(req, { method: 'HEAD' });
        const size = parseInt(headers.get('Content-Length') ?? '');
        if (typeof size != 'number')
            throw {
                tag: 'size',
                message: 'Response is missing content-length header and no size was provided',
            };
        options.size = size;
    }
    const { size, start, end } = options;
    const resource = resourcesCache.get(url) ?? new cache.Resource(url, size, options, resourcesCache);
    req.headers.set('If-Range', new Date().toUTCString());
    for (const { start: from, end: to } of resource.missing(start, end)) {
        const { data, response } = await _fetch(req, { headers: { Range: `bytes=${from}-${to}` } });
        if (response.status == 206) {
            resource.add(data, from);
            continue;
        }
        // The first response doesn't have a "partial content" (206) status
        options.warn?.(url + ': Remote does not support range requests with bytes. Falling back to full data.');
        new cache.Resource(url, size, options, resourcesCache).add(data, 0);
        return data.subarray(start, end);
    }
    // This ensures we get a single buffer with the entire requested range
    resource.collect();
    const region = resource.regionAt(start);
    return region.data.subarray(start - region.offset, end - region.offset);
}
/**
 * @deprecated Use `get`
 */
export const GET = get;
/**
 * Synchronously gets a cached resource
 * Assumes you pass valid start and end when using ranges
 */
export function getCached(url, options) {
    const cache = resourcesCache.get(url);
    /**
     * @todo Make sure we have a size?
     */
    if (!cache) {
        if (options.size)
            return { data: new Uint8Array(0), missing: [{ start: 0, end: options.size ?? 0 }] };
        options.warn?.(url + ': Size not provided and cache is empty, can not determine missing range');
        return { data: undefined, missing: [] };
    }
    const { start = 0, end = cache.size } = options;
    const data = new Uint8Array(end - start);
    for (const region of cache.regions) {
        if (region.offset + region.data.byteLength <= start)
            continue;
        if (region.offset >= end)
            break;
        for (const range of region.ranges) {
            if (range.end <= start)
                continue;
            if (range.start >= end)
                break;
            const overlapStart = Math.max(range.start, start);
            const overlapEnd = Math.min(range.end, end);
            if (overlapStart >= overlapEnd)
                continue;
            data.set(region.data.subarray(overlapStart - region.offset, overlapEnd - region.offset), overlapStart - start);
        }
    }
    return { data, missing: cache.missing(start, end) };
}
/**
 * Make a POST request to set (or create) data on the server and update the cache.
 * @throws RequestError
 */
export async function set(url, data, options, init = {}) {
    if (!resourcesCache.has(url)) {
        new cache.Resource(url, options.size ?? data.byteLength, options, resourcesCache);
    }
    const resource = resourcesCache.get(url);
    const { offset = 0 } = options;
    if (!options.cacheOnly)
        await _fetch(new Request(url, init), { method: 'POST' }, true);
    resource.add(data, offset);
}
/**
 * Make a DELETE request to remove the resource from the server and clear it from the cache.
 * @throws RequestError
 */
export async function remove(url, options = {}, init = {}) {
    if (!options.cacheOnly)
        await _fetch(new Request(url, init), { method: 'DELETE' }, true);
    resourcesCache.delete(url);
}

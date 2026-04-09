/* Utilities for `fetch` when using range requests. It also allows you to handle errors easier */

import * as cache from './cache.js';

// Compatibility

/** @deprecated Use `cache.Options` */
export type ResourceCacheOptions = cache.Options;
/** @deprecated Use `cache.Resource` */
export const ResourceCache = cache.Resource;
/** @deprecated Use `cache.Resource` */
export type ResourceCache = cache.Resource<string>;
/** @deprecated Use `cache.Range` */
export type CacheRange = cache.Range;
/** @deprecated Use `cache.Options` */
export type CacheOptions = cache.Options;

/* eslint-disable @typescript-eslint/only-throw-error */

/**
 * @internal
 */
export const resourcesCache = new Map<string, cache.Resource<string> | undefined>();

export type Issue =
	| { tag: 'status'; response: Response }
	| { tag: 'buffer'; response: Response; message: string }
	| { tag: 'fetch' | 'size'; message: string }
	| Error;

/**
 * @deprecated Use `Issue`
 */
export type RequestError = Issue;

interface Fetched<TBodyOptional extends boolean> {
	response: Response;
	data: false extends TBodyOptional ? Uint8Array : Uint8Array | undefined;
}

/**
 * Wraps `fetch`
 * @throws RequestError
 */
async function _fetch<const TBodyOptional extends boolean>(
	input: RequestInfo,
	init: RequestInit = {},
	bodyOptional: TBodyOptional = false as TBodyOptional
): Promise<Fetched<TBodyOptional>> {
	const response = await fetch(input, init).catch((error: Error) => {
		throw { tag: 'fetch', message: error.message } satisfies Issue;
	});

	if (!response.ok) throw { tag: 'status', response } satisfies Issue;

	const raw = await response.arrayBuffer().catch((error: Error) => {
		if (bodyOptional) return;
		throw { tag: 'buffer', response, message: error.message } satisfies Issue;
	});

	return { response, data: raw ? new Uint8Array(raw) : undefined } as Fetched<TBodyOptional>;
}

export interface Options extends cache.Options {
	/** Optionally provide a function for logging warnings */
	warn?(message: string): unknown;
}

/**
 * @deprecated Use `Options`
 */
export type RequestOptions = Options;

export interface GetOptions extends Options {
	/**
	 * When using range requests,
	 * a HEAD request must normally be used to determine the full size of the resource.
	 * This allows that request to be skipped
	 */
	size?: number;

	/** The start of the range */
	start?: number;

	/** The end of the range */
	end?: number;
}

/**
 * Make a GET request without worrying about ranges
 * @throws RequestError
 */
export async function get(url: string, options: GetOptions, init: RequestInit = {}): Promise<Uint8Array> {
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
			} satisfies Issue;
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

	const region = resource.regionAt(start)!;
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
export function getCached(url: string, options: GetOptions): { data?: Uint8Array; missing: cache.Range[] } {
	const cache = resourcesCache.get(url);

	/**
	 * @todo Make sure we have a size?
	 */
	if (!cache) {
		if (options.size) return { data: new Uint8Array(0), missing: [{ start: 0, end: options.size ?? 0 }] };
		options.warn?.(url + ': Size not provided and cache is empty, can not determine missing range');
		return { data: undefined, missing: [] };
	}

	const { start = 0, end = cache.size } = options;

	const data = new Uint8Array(end - start);

	for (const region of cache.regions) {
		if (region.offset + region.data.byteLength <= start) continue;
		if (region.offset >= end) break;

		for (const range of region.ranges) {
			if (range.end <= start) continue;
			if (range.start >= end) break;

			const overlapStart = Math.max(range.start, start);
			const overlapEnd = Math.min(range.end, end);

			if (overlapStart >= overlapEnd) continue;

			data.set(
				region.data.subarray(overlapStart - region.offset, overlapEnd - region.offset),
				overlapStart - start
			);
		}
	}

	return { data, missing: cache.missing(start, end) };
}

interface SetOptions extends Options {
	/** The offset we are updating at */
	offset?: number;

	/** If a cache for the resource doesn't exist, this will be used as the full size */
	size?: number;
}

/**
 * Make a POST request to set (or create) data on the server and update the cache.
 * @throws RequestError
 */
export async function set(url: string, data: Uint8Array, options: SetOptions, init: RequestInit = {}): Promise<void> {
	if (!resourcesCache.has(url)) {
		new cache.Resource(url, options.size ?? data.byteLength, options, resourcesCache);
	}

	const resource = resourcesCache.get(url)!;

	const { offset = 0 } = options;

	if (!options.cacheOnly) await _fetch(new Request(url, init), { method: 'POST' }, true);

	resource.add(data, offset);
}

/**
 * Make a DELETE request to remove the resource from the server and clear it from the cache.
 * @throws RequestError
 */
export async function remove(url: string, options: Options = {}, init: RequestInit = {}): Promise<void> {
	if (!options.cacheOnly) await _fetch(new Request(url, init), { method: 'DELETE' }, true);
	resourcesCache.delete(url);
}

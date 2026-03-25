/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {import("./Resolver").ResolveContextYield} ResolveContextYield */
/** @typedef {{ [k: string]: undefined | ResolveRequest | ResolveRequest[] }} Cache */

/**
 * @param {string} type type of cache
 * @param {ResolveRequest} request request
 * @param {boolean} withContext cache with context?
 * @returns {string} cache id
 */
function getCacheId(type, request, withContext) {
	return JSON.stringify({
		type,
		context: withContext ? request.context : "",
		path: request.path,
		query: request.query,
		fragment: request.fragment,
		request: request.request,
	});
}

module.exports = class UnsafeCachePlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {(request: ResolveRequest) => boolean} filterPredicate filterPredicate
	 * @param {Cache} cache cache
	 * @param {boolean} withContext withContext
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, filterPredicate, cache, withContext, target) {
		this.source = source;
		this.filterPredicate = filterPredicate;
		this.withContext = withContext;
		this.cache = cache;
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		resolver
			.getHook(this.source)
			.tapAsync("UnsafeCachePlugin", (request, resolveContext, callback) => {
				if (!this.filterPredicate(request)) return callback();
				const isYield = typeof resolveContext.yield === "function";
				const cacheId = getCacheId(
					isYield ? "yield" : "default",
					request,
					this.withContext,
				);
				const cacheEntry = this.cache[cacheId];
				if (cacheEntry) {
					if (isYield) {
						const yield_ =
							/** @type {ResolveContextYield} */
							(resolveContext.yield);
						if (Array.isArray(cacheEntry)) {
							for (const result of cacheEntry) yield_(result);
						} else {
							yield_(cacheEntry);
						}
						return callback(null, null);
					}
					return callback(null, /** @type {ResolveRequest} */ (cacheEntry));
				}

				/** @type {ResolveContextYield | undefined} */
				let yieldFn;
				/** @type {ResolveContextYield | undefined} */
				let yield_;
				/** @type {ResolveRequest[]} */
				const yieldResult = [];
				if (isYield) {
					yieldFn = resolveContext.yield;
					yield_ = (result) => {
						yieldResult.push(result);
					};
				}

				resolver.doResolve(
					target,
					request,
					null,
					yield_ ? { ...resolveContext, yield: yield_ } : resolveContext,
					(err, result) => {
						if (err) return callback(err);
						if (isYield) {
							if (result) yieldResult.push(result);
							for (const result of yieldResult) {
								/** @type {ResolveContextYield} */
								(yieldFn)(result);
							}
							this.cache[cacheId] = yieldResult;
							return callback(null, null);
						}
						if (result) return callback(null, (this.cache[cacheId] = result));
						callback();
					},
				);
			});
	}
};

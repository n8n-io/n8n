/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBail = require("./forEachBail");
const { PathType, getType } = require("./util/path");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */
/** @typedef {string | Array<string> | false} Alias */
/** @typedef {{alias: Alias, name: string, onlyModule?: boolean}} AliasOption */

module.exports = class AliasPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {AliasOption | Array<AliasOption>} options options
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, options, target) {
		this.source = source;
		this.options = Array.isArray(options) ? options : [options];
		this.target = target;
	}

	/**
	 * @param {Resolver} resolver the resolver
	 * @returns {void}
	 */
	apply(resolver) {
		const target = resolver.ensureHook(this.target);
		/**
		 * @param {string} maybeAbsolutePath path
		 * @returns {null|string} absolute path with slash ending
		 */
		const getAbsolutePathWithSlashEnding = (maybeAbsolutePath) => {
			const type = getType(maybeAbsolutePath);
			if (type === PathType.AbsolutePosix || type === PathType.AbsoluteWin) {
				return resolver.join(maybeAbsolutePath, "_").slice(0, -1);
			}
			return null;
		};
		/**
		 * @param {string} path path
		 * @param {string} maybeSubPath sub path
		 * @returns {boolean} true, if path is sub path
		 */
		const isSubPath = (path, maybeSubPath) => {
			const absolutePath = getAbsolutePathWithSlashEnding(maybeSubPath);
			if (!absolutePath) return false;
			return path.startsWith(absolutePath);
		};
		resolver
			.getHook(this.source)
			.tapAsync("AliasPlugin", (request, resolveContext, callback) => {
				const innerRequest = request.request || request.path;
				if (!innerRequest) return callback();

				forEachBail(
					this.options,
					(item, callback) => {
						/** @type {boolean} */
						let shouldStop = false;

						const matchRequest =
							innerRequest === item.name ||
							(!item.onlyModule &&
								(request.request
									? innerRequest.startsWith(`${item.name}/`)
									: isSubPath(innerRequest, item.name)));

						const splitName = item.name.split("*");
						const matchWildcard = !item.onlyModule && splitName.length === 2;

						if (matchRequest || matchWildcard) {
							/**
							 * @param {Alias} alias alias
							 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback
							 * @returns {void}
							 */
							const resolveWithAlias = (alias, callback) => {
								if (alias === false) {
									/** @type {ResolveRequest} */
									const ignoreObj = {
										...request,
										path: false,
									};
									if (typeof resolveContext.yield === "function") {
										resolveContext.yield(ignoreObj);
										return callback(null, null);
									}
									return callback(null, ignoreObj);
								}

								let newRequestStr;

								const [prefix, suffix] = splitName;
								if (
									matchWildcard &&
									innerRequest.startsWith(prefix) &&
									innerRequest.endsWith(suffix)
								) {
									const match = innerRequest.slice(
										prefix.length,
										innerRequest.length - suffix.length,
									);
									newRequestStr = item.alias.toString().replace("*", match);
								}

								if (
									matchRequest &&
									innerRequest !== alias &&
									!innerRequest.startsWith(`${alias}/`)
								) {
									/** @type {string} */
									const remainingRequest = innerRequest.slice(item.name.length);
									newRequestStr = alias + remainingRequest;
								}

								if (newRequestStr !== undefined) {
									shouldStop = true;
									/** @type {ResolveRequest} */
									const obj = {
										...request,
										request: newRequestStr,
										fullySpecified: false,
									};
									return resolver.doResolve(
										target,
										obj,
										`aliased with mapping '${item.name}': '${alias}' to '${
											newRequestStr
										}'`,
										resolveContext,
										(err, result) => {
											if (err) return callback(err);
											if (result) return callback(null, result);
											return callback();
										},
									);
								}
								return callback();
							};

							/**
							 * @param {(null | Error)=} err error
							 * @param {(null | ResolveRequest)=} result result
							 * @returns {void}
							 */
							const stoppingCallback = (err, result) => {
								if (err) return callback(err);

								if (result) return callback(null, result);
								// Don't allow other aliasing or raw request
								if (shouldStop) return callback(null, null);
								return callback();
							};

							if (Array.isArray(item.alias)) {
								return forEachBail(
									item.alias,
									resolveWithAlias,
									stoppingCallback,
								);
							}
							return resolveWithAlias(item.alias, stoppingCallback);
						}

						return callback();
					},
					callback,
				);
			});
	}
};

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const forEachBail = require("./forEachBail");
const getPaths = require("./getPaths");

/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").ResolveStepHook} ResolveStepHook */

module.exports = class ModulesInHierarchicalDirectoriesPlugin {
	/**
	 * @param {string | ResolveStepHook} source source
	 * @param {string | Array<string>} directories directories
	 * @param {string | ResolveStepHook} target target
	 */
	constructor(source, directories, target) {
		this.source = source;
		this.directories = /** @type {Array<string>} */ [...directories];
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
			.tapAsync(
				"ModulesInHierarchicalDirectoriesPlugin",
				(request, resolveContext, callback) => {
					const fs = resolver.fileSystem;
					const addrs = getPaths(/** @type {string} */ (request.path))
						.paths.map((path) =>
							this.directories.map((directory) =>
								resolver.join(path, directory),
							),
						)
						.reduce((array, path) => {
							array.push(...path);
							return array;
						}, []);
					forEachBail(
						addrs,
						/**
						 * @param {string} addr addr
						 * @param {(err?: null|Error, result?: null|ResolveRequest) => void} callback callback
						 * @returns {void}
						 */
						(addr, callback) => {
							fs.stat(addr, (err, stat) => {
								if (!err && stat && stat.isDirectory()) {
									/** @type {ResolveRequest} */
									const obj = {
										...request,
										path: addr,
										request: `./${request.request}`,
										module: false,
									};
									const message = `looking for modules in ${addr}`;
									return resolver.doResolve(
										target,
										obj,
										message,
										resolveContext,
										callback,
									);
								}
								if (resolveContext.log) {
									resolveContext.log(
										`${addr} doesn't exist or is not a directory`,
									);
								}
								if (resolveContext.missingDependencies) {
									resolveContext.missingDependencies.add(addr);
								}
								return callback();
							});
						},
						callback,
					);
				},
			);
	}
};

/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const fs = require("graceful-fs");
const CachedInputFileSystem = require("./CachedInputFileSystem");
const ResolverFactory = require("./ResolverFactory");

/** @typedef {import("./CachedInputFileSystem").BaseFileSystem} BaseFileSystem */
/** @typedef {import("./PnpPlugin").PnpApiImpl} PnpApi */
/** @typedef {import("./Resolver")} Resolver */
/** @typedef {import("./Resolver").FileSystem} FileSystem */
/** @typedef {import("./Resolver").ResolveCallback} ResolveCallback */
/** @typedef {import("./Resolver").ResolveContext} ResolveContext */
/** @typedef {import("./Resolver").ResolveRequest} ResolveRequest */
/** @typedef {import("./Resolver").SyncFileSystem} SyncFileSystem */
/** @typedef {import("./ResolverFactory").Plugin} Plugin */
/** @typedef {import("./ResolverFactory").UserResolveOptions} ResolveOptions */

/**
 * @typedef {{
 * (context: object, path: string, request: string, resolveContext: ResolveContext, callback: ResolveCallback): void;
 * (context: object, path: string, request: string, callback: ResolveCallback): void;
 * (path: string, request: string, resolveContext: ResolveContext, callback: ResolveCallback): void;
 * (path: string, request: string, callback: ResolveCallback): void;
 * }} ResolveFunctionAsync
 */

/**
 * @typedef {{
 * (context: object, path: string, request: string): string | false;
 * (path: string, request: string): string | false;
 * }} ResolveFunction
 */

const nodeFileSystem = new CachedInputFileSystem(fs, 4000);

const nodeContext = {
	environments: ["node+es3+es5+process+native"],
};

const asyncResolver = ResolverFactory.createResolver({
	conditionNames: ["node"],
	extensions: [".js", ".json", ".node"],
	fileSystem: nodeFileSystem,
});

/**
 * @type {ResolveFunctionAsync}
 */
const resolve =
	/**
	 * @param {object | string} context context
	 * @param {string} path path
	 * @param {string | ResolveContext | ResolveCallback} request request
	 * @param {ResolveContext | ResolveCallback=} resolveContext resolve context
	 * @param {ResolveCallback=} callback callback
	 */
	(context, path, request, resolveContext, callback) => {
		if (typeof context === "string") {
			callback = /** @type {ResolveCallback} */ (resolveContext);
			resolveContext = /** @type {ResolveContext} */ (request);
			request = path;
			path = context;
			context = nodeContext;
		}
		if (typeof callback !== "function") {
			callback = /** @type {ResolveCallback} */ (resolveContext);
		}
		asyncResolver.resolve(
			context,
			path,
			/** @type {string} */ (request),
			/** @type {ResolveContext} */ (resolveContext),
			/** @type {ResolveCallback} */ (callback),
		);
	};

const syncResolver = ResolverFactory.createResolver({
	conditionNames: ["node"],
	extensions: [".js", ".json", ".node"],
	useSyncFileSystemCalls: true,
	fileSystem: nodeFileSystem,
});

/**
 * @type {ResolveFunction}
 */
const resolveSync =
	/**
	 * @param {object|string} context context
	 * @param {string} path path
	 * @param {string=} request request
	 * @returns {string | false} result
	 */
	(context, path, request) => {
		if (typeof context === "string") {
			request = path;
			path = context;
			context = nodeContext;
		}
		return syncResolver.resolveSync(
			context,
			path,
			/** @type {string} */ (request),
		);
	};

/** @typedef {Omit<ResolveOptions, "fileSystem"> & Partial<Pick<ResolveOptions, "fileSystem">>} ResolveOptionsOptionalFS */

/**
 * @param {ResolveOptionsOptionalFS} options Resolver options
 * @returns {ResolveFunctionAsync} Resolver function
 */
function create(options) {
	const resolver = ResolverFactory.createResolver({
		fileSystem: nodeFileSystem,
		...options,
	});
	/**
	 * @param {object|string} context Custom context
	 * @param {string} path Base path
	 * @param {string|ResolveContext|ResolveCallback} request String to resolve
	 * @param {ResolveContext|ResolveCallback=} resolveContext Resolve context
	 * @param {ResolveCallback=} callback Result callback
	 */
	return function create(context, path, request, resolveContext, callback) {
		if (typeof context === "string") {
			callback = /** @type {ResolveCallback} */ (resolveContext);
			resolveContext = /** @type {ResolveContext} */ (request);
			request = path;
			path = context;
			context = nodeContext;
		}
		if (typeof callback !== "function") {
			callback = /** @type {ResolveCallback} */ (resolveContext);
		}
		resolver.resolve(
			context,
			path,
			/** @type {string} */ (request),
			/** @type {ResolveContext} */ (resolveContext),
			callback,
		);
	};
}

/**
 * @param {ResolveOptionsOptionalFS} options Resolver options
 * @returns {ResolveFunction} Resolver function
 */
function createSync(options) {
	const resolver = ResolverFactory.createResolver({
		useSyncFileSystemCalls: true,
		fileSystem: nodeFileSystem,
		...options,
	});
	/**
	 * @param {object | string} context custom context
	 * @param {string} path base path
	 * @param {string=} request request to resolve
	 * @returns {string | false} Resolved path or false
	 */
	return function createSync(context, path, request) {
		if (typeof context === "string") {
			request = path;
			path = context;
			context = nodeContext;
		}
		return resolver.resolveSync(context, path, /** @type {string} */ (request));
	};
}

/**
 * @template A
 * @template B
 * @param {A} obj input a
 * @param {B} exports input b
 * @returns {A & B} merged
 */
const mergeExports = (obj, exports) => {
	const descriptors = Object.getOwnPropertyDescriptors(exports);
	Object.defineProperties(obj, descriptors);
	return /** @type {A & B} */ (Object.freeze(obj));
};

module.exports = mergeExports(resolve, {
	get sync() {
		return resolveSync;
	},
	create: mergeExports(create, {
		get sync() {
			return createSync;
		},
	}),
	ResolverFactory,
	CachedInputFileSystem,
	get CloneBasenamePlugin() {
		return require("./CloneBasenamePlugin");
	},
	get LogInfoPlugin() {
		return require("./LogInfoPlugin");
	},
	get forEachBail() {
		return require("./forEachBail");
	},
});

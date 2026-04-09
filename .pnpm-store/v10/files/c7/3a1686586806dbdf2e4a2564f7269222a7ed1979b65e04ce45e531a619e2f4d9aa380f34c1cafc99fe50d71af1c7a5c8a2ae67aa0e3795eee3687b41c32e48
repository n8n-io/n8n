/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
import { $ as isBrowser, C as computeScrollPosition, D as scrollToPosition, E as saveScrollPosition, F as isSameRouteLocation, G as encodePath, H as decode, J as assign, K as warn$1, N as NEW_stringifyURL, P as START_LOCATION_NORMALIZED, Q as noop, R as parseURL, T as getScrollKey, W as encodeParam, X as isArray, Y as identityFn, _ as ErrorTypes, b as isNavigationFailure, c as useCallbacks, d as routerKey, f as routerViewLocationKey, g as stringifyQuery, h as parseQuery, i as guardToPromiseFn, k as NavigationType, m as normalizeQuery, n as extractChangingRecords, r as extractComponentsGuards, t as addDevtools, u as routeLocationKey, w as getSavedScrollPosition, y as createRouterError, z as resolveRelativePath } from "../devtools-EWN81iOl.mjs";
import { nextTick, shallowReactive, shallowRef, toValue, unref, warn } from "vue";

//#region src/experimental/router.ts
function normalizeRouteRecord(record) {
	const normalizedRecord = {
		meta: {},
		props: {},
		...record,
		instances: {},
		leaveGuards: /* @__PURE__ */ new Set(),
		updateGuards: /* @__PURE__ */ new Set()
	};
	Object.defineProperty(normalizedRecord, "mods", { value: {} });
	return normalizedRecord;
}
/**
* Merges route record objects for the experimental resolver format.
* This function is specifically designed to work with objects that will be passed to normalizeRouteRecord().
*
* @internal
*
* @param main - main route record object
* @param routeRecords - route records to merge (from definePage imports)
* @returns merged route record object
*/
function mergeRouteRecord(main, ...routeRecords) {
	for (const record of routeRecords) {
		main.meta = {
			...main.meta,
			...record.meta
		};
		main.props = {
			...main.props,
			...record.props
		};
	}
	return main;
}
/**
* Creates an experimental Router that allows passing a resolver instead of a
* routes array. This router does not have `addRoute()` and `removeRoute()`
* methods and is meant to be used with unplugin-vue-router by generating the
* resolver from the `pages/` folder
*
* @param options - Options to initialize the router
*/
function experimental_createRouter(options) {
	let { resolver, stringifyQuery: stringifyQuery$1 = stringifyQuery, history: routerHistory } = options;
	const beforeGuards = useCallbacks();
	const beforeResolveGuards = useCallbacks();
	const afterGuards = useCallbacks();
	const currentRoute = shallowRef(START_LOCATION_NORMALIZED);
	let pendingLocation = START_LOCATION_NORMALIZED;
	if (isBrowser && options.scrollBehavior) history.scrollRestoration = "manual";
	function resolve(...[to, currentLocation]) {
		const matchedRoute = resolver.resolve(to, currentLocation ?? (typeof to === "string" ? currentRoute.value : void 0));
		const href = routerHistory.createHref(matchedRoute.fullPath);
		if (process.env.NODE_ENV !== "production") {
			if (href.startsWith("//")) warn(`Location ${JSON.stringify(to)} resolved to "${href}". A resolved location cannot start with multiple slashes.`);
			if (!matchedRoute.matched.length) warn(`No match found for location with path "${to}"`);
		}
		return assign(matchedRoute, {
			redirectedFrom: void 0,
			href,
			meta: mergeMetaFields(matchedRoute.matched)
		});
	}
	function checkCanceledNavigation(to, from) {
		if (pendingLocation !== to) return createRouterError(ErrorTypes.NAVIGATION_CANCELLED, {
			from,
			to
		});
	}
	const push = (...args) => pushWithRedirect(resolve(...args));
	const replace = (...args) => pushWithRedirect(resolve(...args), true);
	function handleRedirectRecord(to, from) {
		const redirect = to.matched.at(-1)?.redirect;
		if (redirect) return resolver.resolve(typeof redirect === "function" ? redirect(to, from) : redirect, from);
	}
	function pushWithRedirect(to, replace$1, redirectedFrom) {
		replace$1 = to.replace ?? replace$1;
		pendingLocation = to;
		const from = currentRoute.value;
		const data = to.state;
		const force = to.force;
		const shouldRedirect = handleRedirectRecord(to, from);
		if (shouldRedirect) return pushWithRedirect({
			...resolve(shouldRedirect, currentRoute.value),
			state: typeof shouldRedirect === "object" ? assign({}, data, shouldRedirect.state) : data,
			force
		}, replace$1, redirectedFrom || to);
		const toLocation = to;
		toLocation.redirectedFrom = redirectedFrom;
		let failure;
		if (!force && isSameRouteLocation(stringifyQuery$1, from, to)) {
			failure = createRouterError(ErrorTypes.NAVIGATION_DUPLICATED, {
				to: toLocation,
				from
			});
			handleScroll(from, from, true, false);
		}
		return (failure ? Promise.resolve(failure) : navigate(toLocation, from)).catch((error) => isNavigationFailure(error) ? isNavigationFailure(error, ErrorTypes.NAVIGATION_GUARD_REDIRECT) ? error : markAsReady(error) : triggerError(error, toLocation, from)).then((failure$1) => {
			if (failure$1) {
				if (isNavigationFailure(failure$1, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
					if (process.env.NODE_ENV !== "production" && isSameRouteLocation(stringifyQuery$1, resolve(failure$1.to), toLocation) && redirectedFrom && (redirectedFrom._count = redirectedFrom._count ? redirectedFrom._count + 1 : 1) > 30) {
						warn(`Detected a possibly infinite redirection in a navigation guard when going from "${from.fullPath}" to "${toLocation.fullPath}". Aborting to avoid a Stack Overflow.\n Are you always returning a new location within a navigation guard? That would lead to this error. Only return when redirecting or aborting, that should fix this. This might break in production if not fixed.`);
						return Promise.reject(/* @__PURE__ */ new Error("Infinite redirect in navigation guard"));
					}
					return pushWithRedirect({
						...resolve(failure$1.to, currentRoute.value),
						state: typeof failure$1.to === "object" ? assign({}, data, failure$1.to.state) : data,
						force
					}, replace$1, redirectedFrom || toLocation);
				}
			} else failure$1 = finalizeNavigation(toLocation, from, true, replace$1, data);
			triggerAfterEach(toLocation, from, failure$1);
			return failure$1;
		});
	}
	/**
	* Helper to reject and skip all navigation guards if a new navigation happened
	* @param to
	* @param from
	*/
	function checkCanceledNavigationAndReject(to, from) {
		const error = checkCanceledNavigation(to, from);
		return error ? Promise.reject(error) : Promise.resolve();
	}
	function runWithContext(fn) {
		const app = installedApps.values().next().value;
		return app?.runWithContext ? app.runWithContext(fn) : fn();
	}
	function navigate(to, from) {
		let guards;
		const [leavingRecords, updatingRecords, enteringRecords] = extractChangingRecords(to, from);
		guards = extractComponentsGuards(leavingRecords.reverse(), "beforeRouteLeave", to, from);
		for (const record of leavingRecords) record.leaveGuards.forEach((guard) => {
			guards.push(guardToPromiseFn(guard, to, from));
		});
		const canceledNavigationCheck = checkCanceledNavigationAndReject.bind(null, to, from);
		guards.push(canceledNavigationCheck);
		return runGuardQueue(guards).then(() => {
			guards = [];
			for (const guard of beforeGuards.list()) guards.push(guardToPromiseFn(guard, to, from));
			guards.push(canceledNavigationCheck);
			return runGuardQueue(guards);
		}).then(() => {
			guards = extractComponentsGuards(updatingRecords, "beforeRouteUpdate", to, from);
			for (const record of updatingRecords) record.updateGuards.forEach((guard) => {
				guards.push(guardToPromiseFn(guard, to, from));
			});
			guards.push(canceledNavigationCheck);
			return runGuardQueue(guards);
		}).then(() => {
			guards = [];
			for (const record of enteringRecords) if (record.beforeEnter) if (isArray(record.beforeEnter)) for (const beforeEnter of record.beforeEnter) guards.push(guardToPromiseFn(beforeEnter, to, from));
			else guards.push(guardToPromiseFn(record.beforeEnter, to, from));
			guards.push(canceledNavigationCheck);
			return runGuardQueue(guards);
		}).then(() => {
			to.matched.forEach((record) => record.enterCallbacks = {});
			guards = extractComponentsGuards(enteringRecords, "beforeRouteEnter", to, from, runWithContext);
			guards.push(canceledNavigationCheck);
			return runGuardQueue(guards);
		}).then(() => {
			guards = [];
			for (const guard of beforeResolveGuards.list()) guards.push(guardToPromiseFn(guard, to, from));
			guards.push(canceledNavigationCheck);
			return runGuardQueue(guards);
		}).catch((err) => isNavigationFailure(err, ErrorTypes.NAVIGATION_CANCELLED) ? err : Promise.reject(err));
	}
	function triggerAfterEach(to, from, failure) {
		afterGuards.list().forEach((guard) => runWithContext(() => guard(to, from, failure)));
	}
	/**
	* - Cleans up any navigation guards
	* - Changes the url if necessary
	* - Calls the scrollBehavior
	*/
	function finalizeNavigation(toLocation, from, isPush, replace$1, data) {
		const error = checkCanceledNavigation(toLocation, from);
		if (error) return error;
		const isFirstNavigation = from === START_LOCATION_NORMALIZED;
		const state = !isBrowser ? {} : history.state;
		if (isPush) if (replace$1 || isFirstNavigation) routerHistory.replace(toLocation.fullPath, assign({ scroll: isFirstNavigation && state && state.scroll }, data));
		else routerHistory.push(toLocation.fullPath, data);
		currentRoute.value = toLocation;
		handleScroll(toLocation, from, isPush, isFirstNavigation);
		markAsReady();
	}
	let removeHistoryListener;
	function setupListeners() {
		if (removeHistoryListener) return;
		removeHistoryListener = routerHistory.listen((to, _from, info) => {
			if (!router.listening) return;
			const toLocation = resolve(to);
			const shouldRedirect = handleRedirectRecord(toLocation, router.currentRoute.value);
			if (shouldRedirect) {
				pushWithRedirect(assign(resolve(shouldRedirect), { force: true }), true, toLocation).catch(noop);
				return;
			}
			pendingLocation = toLocation;
			const from = currentRoute.value;
			if (isBrowser) saveScrollPosition(getScrollKey(from.fullPath, info.delta), computeScrollPosition());
			navigate(toLocation, from).catch((error) => {
				if (isNavigationFailure(error, ErrorTypes.NAVIGATION_ABORTED | ErrorTypes.NAVIGATION_CANCELLED)) return error;
				if (isNavigationFailure(error, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
					pushWithRedirect(assign(resolve(error.to), { force: true }), void 0, toLocation).then((failure) => {
						if (isNavigationFailure(failure, ErrorTypes.NAVIGATION_ABORTED | ErrorTypes.NAVIGATION_DUPLICATED) && !info.delta && info.type === NavigationType.pop) routerHistory.go(-1, false);
					}).catch(noop);
					return Promise.reject();
				}
				if (info.delta) routerHistory.go(-info.delta, false);
				return triggerError(error, toLocation, from);
			}).then((failure) => {
				failure = failure || finalizeNavigation(toLocation, from, false);
				if (failure) {
					if (info.delta && !isNavigationFailure(failure, ErrorTypes.NAVIGATION_CANCELLED)) routerHistory.go(-info.delta, false);
					else if (info.type === NavigationType.pop && isNavigationFailure(failure, ErrorTypes.NAVIGATION_ABORTED | ErrorTypes.NAVIGATION_DUPLICATED)) routerHistory.go(-1, false);
				}
				triggerAfterEach(toLocation, from, failure);
			}).catch(noop);
		});
	}
	let readyHandlers = useCallbacks();
	let errorListeners = useCallbacks();
	let ready;
	/**
	* Trigger errorListeners added via onError and throws the error as well
	*
	* @param error - error to throw
	* @param to - location we were navigating to when the error happened
	* @param from - location we were navigating from when the error happened
	* @returns the error as a rejected promise
	*/
	function triggerError(error, to, from) {
		markAsReady(error);
		const list = errorListeners.list();
		if (list.length) list.forEach((handler) => handler(error, to, from));
		else {
			if (process.env.NODE_ENV !== "production") warn("uncaught error during route navigation:");
			console.error(error);
		}
		return Promise.reject(error);
	}
	function isReady() {
		if (ready && currentRoute.value !== START_LOCATION_NORMALIZED) return Promise.resolve();
		return new Promise((resolve$1, reject) => {
			readyHandlers.add([resolve$1, reject]);
		});
	}
	function markAsReady(err) {
		if (!ready) {
			ready = !err;
			setupListeners();
			readyHandlers.list().forEach(([resolve$1, reject]) => err ? reject(err) : resolve$1());
			readyHandlers.reset();
		}
		return err;
	}
	function handleScroll(to, from, isPush, isFirstNavigation) {
		const { scrollBehavior } = options;
		if (!isBrowser || !scrollBehavior) return Promise.resolve();
		const scrollPosition = !isPush && getSavedScrollPosition(getScrollKey(to.fullPath, 0)) || (isFirstNavigation || !isPush) && history.state && history.state.scroll || null;
		return nextTick().then(() => scrollBehavior(to, from, scrollPosition)).then((position) => position && scrollToPosition(position)).catch((err) => triggerError(err, to, from));
	}
	const go = (delta) => routerHistory.go(delta);
	let started;
	const installedApps = /* @__PURE__ */ new Set();
	const router = {
		currentRoute,
		listening: true,
		hasRoute: (name) => !!resolver.getRoute(name),
		getRoutes: () => resolver.getRoutes(),
		resolve,
		options,
		push,
		replace,
		go,
		back: () => go(-1),
		forward: () => go(1),
		beforeEach: beforeGuards.add,
		beforeResolve: beforeResolveGuards.add,
		afterEach: afterGuards.add,
		onError: errorListeners.add,
		isReady,
		install(app) {
			app.config.globalProperties.$router = router;
			Object.defineProperty(app.config.globalProperties, "$route", {
				enumerable: true,
				get: () => unref(currentRoute)
			});
			if (isBrowser && !started && currentRoute.value === START_LOCATION_NORMALIZED) {
				started = true;
				push(routerHistory.location).catch((err) => {
					if (process.env.NODE_ENV !== "production") warn("Unexpected error on initial navigation:", err);
				});
			}
			const reactiveRoute = {};
			for (const key in START_LOCATION_NORMALIZED) Object.defineProperty(reactiveRoute, key, {
				get: () => currentRoute.value[key],
				enumerable: true
			});
			app.provide(routerKey, router);
			app.provide(routeLocationKey, shallowReactive(reactiveRoute));
			app.provide(routerViewLocationKey, currentRoute);
			installedApps.add(app);
			app.onUnmount(() => {
				installedApps.delete(app);
				if (installedApps.size < 1) {
					pendingLocation = START_LOCATION_NORMALIZED;
					removeHistoryListener && removeHistoryListener();
					removeHistoryListener = null;
					currentRoute.value = START_LOCATION_NORMALIZED;
					started = false;
					ready = false;
				}
			});
			if ((process.env.NODE_ENV !== "production" || __VUE_PROD_DEVTOOLS__) && isBrowser) addDevtools(app, router, resolver);
		}
	};
	function runGuardQueue(guards) {
		return guards.reduce((promise, guard) => promise.then(() => runWithContext(guard)), Promise.resolve());
	}
	if (process.env.NODE_ENV !== "production") router._hmrReplaceResolver = (newResolver) => {
		resolver = newResolver;
	};
	return router;
}
/**
* Merge meta fields of an array of records
*
* @param matched - array of matched records
*/
function mergeMetaFields(matched) {
	return assign({}, ...matched.map((r) => r.meta));
}

//#endregion
//#region src/experimental/route-resolver/resolver-abstract.ts
/**
* Common properties for a location that couldn't be matched. This ensures
* having the same name while having a `path`, `query` and `hash` that change.
*/
const NO_MATCH_LOCATION = {
	name: process.env.NODE_ENV !== "production" ? Symbol("no-match") : Symbol(),
	params: {},
	matched: []
};

//#endregion
//#region src/experimental/route-resolver/resolver-fixed.ts
/**
* Build the `matched` array of a record that includes all parent records from the root to the current one.
*/
function buildMatched(record) {
	const matched = [];
	let node = record;
	while (node) {
		matched.unshift(node);
		node = node.parent;
	}
	return matched;
}
/**
* Creates a fixed resolver that must have all records defined at creation
* time.
*
* @template TRecord - extended type of the records
* @param {TRecord[]} records - Ordered array of records that will be used to resolve routes
* @returns a resolver that can be passed to the router
*/
function createFixedResolver(records) {
	const recordMap = /* @__PURE__ */ new Map();
	for (const record of records) recordMap.set(record.name, record);
	function validateMatch(record, url) {
		const pathParams = record.path.match(url.path);
		const hashParams = record.hash?.match(url.hash);
		const matched = buildMatched(record);
		const queryParams = Object.assign({}, ...matched.flatMap((record$1) => record$1.query?.map((query) => query.match(url.query))));
		return [matched, {
			...pathParams,
			...queryParams,
			...hashParams
		}];
	}
	function resolve(...[to, currentLocation]) {
		if (typeof to === "object" && (to.name || to.path == null)) {
			if (process.env.NODE_ENV !== "production" && to.name == null && currentLocation == null) {
				warn$1(`Cannot resolve relative location "${JSON.stringify(to)}"without a "name" or a current location. This will crash in production.`, to);
				const query$1 = normalizeQuery(to.query);
				const hash$1 = to.hash ?? "";
				const path$1 = to.path ?? "/";
				return {
					...to,
					...NO_MATCH_LOCATION,
					fullPath: NEW_stringifyURL(stringifyQuery, path$1, query$1, hash$1),
					path: path$1,
					query: query$1,
					hash: hash$1
				};
			}
			const name = to.name ?? currentLocation.name;
			const record = recordMap.get(name);
			if (process.env.NODE_ENV !== "production") {
				if (!record || !name) throw new Error(`Record "${String(name)}" not found`);
				if (typeof to === "object" && to.hash && !to.hash.startsWith("#")) warn$1(`A "hash" should always start with the character "#". Replace "${to.hash}" with "#${to.hash}".`);
			}
			let params = {
				...currentLocation?.params,
				...to.params
			};
			const path = record.path.build(params);
			const hash = record.hash?.build(params) ?? to.hash ?? currentLocation?.hash ?? "";
			let matched = buildMatched(record);
			const query = Object.assign({
				...currentLocation?.query,
				...normalizeQuery(to.query)
			}, ...matched.flatMap((record$1) => record$1.query?.map((query$1) => query$1.build(params))));
			const url = {
				...to,
				fullPath: NEW_stringifyURL(stringifyQuery, path, query, hash),
				path,
				hash,
				query
			};
			[matched, params] = validateMatch(record, url);
			return {
				...url,
				name,
				matched,
				params
			};
		} else {
			let url;
			if (typeof to === "string") url = parseURL(parseQuery, to, currentLocation?.path);
			else {
				const query = normalizeQuery(to.query);
				const path = resolveRelativePath(to.path, currentLocation?.path || "/");
				url = {
					...to,
					fullPath: NEW_stringifyURL(stringifyQuery, path, query, to.hash),
					path,
					query,
					hash: to.hash || ""
				};
			}
			let record;
			let matched;
			let parsedParams;
			for (record of records) try {
				[matched, parsedParams] = validateMatch(record, url);
				break;
			} catch (e) {}
			if (!parsedParams || !matched) return {
				...url,
				...NO_MATCH_LOCATION
			};
			return {
				...url,
				name: record.name,
				params: parsedParams,
				matched
			};
		}
	}
	return {
		resolve,
		getRoutes: () => records,
		getRoute: (name) => recordMap.get(name)
	};
}

//#endregion
//#region src/experimental/route-resolver/matchers/errors.ts
/**
* Error throw when a matcher matches by regex but validation fails.
*/
var MatchMiss = class extends Error {
	name = "MatchMiss";
};
/**
* Helper to create a {@link MatchMiss} error.
* @param args - Arguments to pass to the `MatchMiss` constructor.
*
* @example
* ```ts
* throw miss()
* // in a number param matcher
* throw miss('Number must be finite')
* ```
*/
const miss = (...args) => new MatchMiss(...args);

//#endregion
//#region src/experimental/route-resolver/matchers/matcher-pattern.ts
/**
* Allows matching a static path.
*
* @example
* ```ts
* const matcher = new MatcherPatternPathStatic('/team')
* matcher.match('/team') // {}
* matcher.match('/team/123') // throws MatchMiss
* matcher.build() // '/team'
* ```
*/
var MatcherPatternPathStatic = class {
	/**
	* lowercase version of the path to match against.
	* This is used to make the matching case insensitive.
	*/
	pathi;
	constructor(path) {
		this.path = path;
		this.pathi = path.toLowerCase();
	}
	match(path) {
		if (path.toLowerCase() !== this.pathi) throw miss();
		return {};
	}
	build() {
		return this.path;
	}
};
/**
* Regex to remove trailing slashes from a path.
*
* @internal
*/
const TRAILING_SLASHES_RE = /\/*$/;
/**
* Handles the `path` part of a URL with dynamic parameters.
*/
var MatcherPatternPathDynamic = class {
	/**
	* Cached keys of the {@link params} object.
	*/
	paramsKeys;
	/**
	* Creates a new dynamic path matcher.
	*
	* @param re - regex to match the path against
	* @param params - object of param parsers as {@link MatcherPatternPathDynamic_ParamOptions}
	* @param pathParts - array of path parts, where strings are static parts, 1 are regular params, and 0 are splat params (not encode slash)
	* @param trailingSlash - whether the path should end with a trailing slash, null means "do not care" (for trailing splat params)
	*/
	constructor(re, params, pathParts, trailingSlash = false) {
		this.re = re;
		this.params = params;
		this.pathParts = pathParts;
		this.trailingSlash = trailingSlash;
		this.paramsKeys = Object.keys(this.params);
	}
	match(path) {
		if (this.trailingSlash != null && this.trailingSlash === !path.endsWith("/")) throw miss();
		const match = path.match(this.re);
		if (!match) throw miss();
		const params = {};
		for (var i = 0; i < this.paramsKeys.length; i++) {
			var paramName = this.paramsKeys[i];
			var [parser, repeatable] = this.params[paramName];
			var currentMatch = match[i + 1] ?? null;
			var value = repeatable ? (currentMatch?.split("/") || []).map(decode) : decode(currentMatch);
			params[paramName] = (parser?.get || identityFn)(value);
		}
		if (process.env.NODE_ENV !== "production" && Object.keys(params).length !== Object.keys(this.params).length) warn$1(`Regexp matched ${match.length} params, but ${i} params are defined. Found when matching "${path}" against ${String(this.re)}`);
		return params;
	}
	build(params) {
		let paramIndex = 0;
		let paramName;
		let parser;
		let repeatable;
		let optional;
		let value;
		const path = "/" + this.pathParts.map((part) => {
			if (typeof part === "string") return part;
			else if (typeof part === "number") {
				paramName = this.paramsKeys[paramIndex++];
				[parser, repeatable, optional] = this.params[paramName];
				value = (parser?.set || identityFn)(params[paramName]);
				if (Array.isArray(value) && !value.length && !optional) throw miss();
				return Array.isArray(value) ? value.map(encodeParam).join("/") : (part ? encodeParam : encodePath)(value);
			} else return part.map((subPart) => {
				if (typeof subPart === "string") return subPart;
				paramName = this.paramsKeys[paramIndex++];
				[parser, repeatable, optional] = this.params[paramName];
				value = (parser?.set || identityFn)(params[paramName]);
				if (process.env.NODE_ENV !== "production" && repeatable) {
					warn$1(`Param "${String(paramName)}" is repeatable, but used in a sub segment of the path: "${this.pathParts.join("")}". Repeated params can only be used as a full path segment: "/file/[ids]+/something-else". This will break in production.`);
					return Array.isArray(value) ? value.map(encodeParam).join("/") : encodeParam(value);
				}
				return encodeParam(value);
			}).join("");
		}).filter(identityFn).join("/");
		/**
		* If the last part of the path is a splat param and its value is empty, it gets
		* filteretd out, resulting in a path that doesn't end with a `/` and doesn't even match
		* with the original splat path: e.g. /teams/[...pathMatch] does not match /teams, so it makes
		* no sense to build a path it cannot match.
		*/
		return this.trailingSlash == null ? path + (!value && path.at(-1) !== "/" ? "/" : "") : path.replace(TRAILING_SLASHES_RE, this.trailingSlash ? "/" : "");
	}
};

//#endregion
//#region src/experimental/route-resolver/matchers/param-parsers/booleans.ts
const PARAM_BOOLEAN_SINGLE = {
	get: (value) => {
		if (value === void 0) return void 0;
		if (value == null) return true;
		const lowercaseValue = value.toLowerCase();
		if (lowercaseValue === "true") return true;
		if (lowercaseValue === "false") return false;
		throw miss();
	},
	set: (value) => value == null ? value : String(value)
};
const PARAM_BOOLEAN_REPEATABLE = {
	get: (value) => value.map((v) => {
		const result = PARAM_BOOLEAN_SINGLE.get(v);
		return result === void 0 ? false : result;
	}),
	set: (value) => value.map((v) => PARAM_BOOLEAN_SINGLE.set(v))
};
/**
* Native Param parser for booleans.
*
* @internal
*/
const PARAM_PARSER_BOOL = {
	get: (value) => Array.isArray(value) ? PARAM_BOOLEAN_REPEATABLE.get(value) : PARAM_BOOLEAN_SINGLE.get(value),
	set: (value) => Array.isArray(value) ? PARAM_BOOLEAN_REPEATABLE.set(value) : PARAM_BOOLEAN_SINGLE.set(value)
};

//#endregion
//#region src/experimental/route-resolver/matchers/param-parsers/integers.ts
const PARAM_INTEGER_SINGLE = {
	get: (value) => {
		const num = Number(value);
		if (value && Number.isSafeInteger(num)) return num;
		throw miss();
	},
	set: (value) => String(value)
};
const PARAM_INTEGER_REPEATABLE = {
	get: (value) => value.filter((v) => v != null).map(PARAM_INTEGER_SINGLE.get),
	set: (value) => value.map(PARAM_INTEGER_SINGLE.set)
};
/**
* Native Param parser for integers.
*
* @internal
*/
const PARAM_PARSER_INT = {
	get: (value) => Array.isArray(value) ? PARAM_INTEGER_REPEATABLE.get(value) : value != null ? PARAM_INTEGER_SINGLE.get(value) : null,
	set: (value) => Array.isArray(value) ? PARAM_INTEGER_REPEATABLE.set(value) : value != null ? PARAM_INTEGER_SINGLE.set(value) : null
};

//#endregion
//#region src/experimental/route-resolver/matchers/param-parsers/index.ts
/**
* Default parser for params that will keep values as is, and will use `String()`
*/
const PARAM_PARSER_DEFAULTS = {
	get: (value) => value ?? null,
	set: (value) => value == null ? null : Array.isArray(value) ? value.map((v) => v == null ? null : String(v)) : String(value)
};
/**
* Defines a path param parser.
*
* @param parser - the parser to define. Will be returned as is.
*
* @see {@link defineQueryParamParser}
* @see {@link defineParamParser}
*/
/*! #__NO_SIDE_EFFECTS__ */
function definePathParamParser(parser) {
	return parser;
}
/**
* Defines a query param parser. Note that query params can also be used as
* path param parsers.
*
* @param parser - the parser to define. Will be returned as is.
*
* @see {@link definePathParamParser}
* @see {@link defineParamParser}
*/
/*! #__NO_SIDE_EFFECTS__ */
function defineQueryParamParser(parser) {
	return parser;
}
/**
* Alias for {@link defineQueryParamParser}. Implementing a param parser like this
* works for path, query, and hash params.
*
* @see {@link defineQueryParamParser}
* @see {@link definePathParamParser}
*/
const defineParamParser = defineQueryParamParser;

//#endregion
//#region src/experimental/route-resolver/matchers/matcher-pattern-query.ts
/**
* Matcher for a specific query parameter. It will read and write the parameter
*/
var MatcherPatternQueryParam = class {
	constructor(paramName, queryKey, format, parser = {}, defaultValue) {
		this.paramName = paramName;
		this.queryKey = queryKey;
		this.format = format;
		this.parser = parser;
		this.defaultValue = defaultValue;
	}
	match(query) {
		const queryValue = query[this.queryKey];
		let valueBeforeParse = this.format === "value" ? Array.isArray(queryValue) ? queryValue.at(-1) : queryValue : Array.isArray(queryValue) ? queryValue : queryValue == null ? [] : [queryValue];
		let value;
		if (Array.isArray(valueBeforeParse)) if (queryValue === void 0 && this.defaultValue !== void 0) value = toValue(this.defaultValue);
		else try {
			value = (this.parser.get ?? PARAM_PARSER_DEFAULTS.get)(valueBeforeParse);
		} catch (error) {
			if (this.defaultValue === void 0) throw error;
			value = void 0;
		}
		else try {
			value = valueBeforeParse === void 0 ? valueBeforeParse : (this.parser.get ?? PARAM_PARSER_DEFAULTS.get)(valueBeforeParse);
		} catch (error) {
			if (this.defaultValue === void 0) throw error;
		}
		if (value === void 0) {
			if (this.defaultValue === void 0) throw miss();
			value = toValue(this.defaultValue);
		}
		return { [this.paramName]: value };
	}
	build(params) {
		const paramValue = params[this.paramName];
		if (paramValue === void 0) return {};
		return { [this.queryKey]: (this.parser.set ?? PARAM_PARSER_DEFAULTS.set)(paramValue) };
	}
};

//#endregion
export { MatchMiss, MatcherPatternPathDynamic, MatcherPatternPathStatic, MatcherPatternQueryParam, PARAM_PARSER_BOOL, PARAM_PARSER_INT, mergeRouteRecord as _mergeRouteRecord, createFixedResolver, defineParamParser, definePathParamParser, defineQueryParamParser, experimental_createRouter, miss, normalizeRouteRecord };
import { AllowedComponentProps } from 'vue';
import { App } from 'vue';
import type { Component } from 'vue';
import { ComponentCustomProps } from 'vue';
import { ComponentPublicInstance } from 'vue';
import { ComputedRef } from 'vue';
import type { DefineComponent } from 'vue';
import type { InjectionKey } from 'vue';
import { MaybeRef } from 'vue';
import { Ref } from 'vue';
import { UnwrapRef } from 'vue';
import { VNode } from 'vue';
import { VNodeProps } from 'vue';

declare type Awaitable<T> = T | Promise<T>;

/**
 * Maybe a promise maybe not
 * @internal
 */
export declare type _Awaitable<T> = T | PromiseLike<T>;

/**
 * Creates an in-memory based history. The main purpose of this history is to handle SSR. It starts in a special location that is nowhere.
 * It's up to the user to replace that location with the starter location by either calling `router.push` or `router.replace`.
 *
 * @param base - Base applied to all urls, defaults to '/'
 * @returns a history object that can be passed to the router constructor
 */
export declare function createMemoryHistory(base?: string): RouterHistory;

/**
 * Creates a Router instance that can be used by a Vue app.
 *
 * @param options - {@link RouterOptions}
 */
export declare function createRouter(options: RouterOptions): Router;

/**
 * Creates a Router Matcher.
 *
 * @internal
 * @param routes - array of initial routes
 * @param globalOptions - global route options
 */
export declare function createRouterMatcher(routes: Readonly<RouteRecordRaw[]>, globalOptions: PathParserOptions): RouterMatcher;

/**
 * Creates a hash history. Useful for web applications with no host (e.g. `file://`) or when configuring a server to
 * handle any URL is not possible.
 *
 * @param base - optional base to provide. Defaults to `location.pathname + location.search` If there is a `<base>` tag
 * in the `head`, its value will be ignored in favor of this parameter **but note it affects all the history.pushState()
 * calls**, meaning that if you use a `<base>` tag, it's `href` value **has to match this parameter** (ignoring anything
 * after the `#`).
 *
 * @example
 * ```js
 * // at https://example.com/folder
 * createWebHashHistory() // gives a url of `https://example.com/folder#`
 * createWebHashHistory('/folder/') // gives a url of `https://example.com/folder/#`
 * // if the `#` is provided in the base, it won't be added by `createWebHashHistory`
 * createWebHashHistory('/folder/#/app/') // gives a url of `https://example.com/folder/#/app/`
 * // you should avoid doing this because it changes the original url and breaks copying urls
 * createWebHashHistory('/other-folder/') // gives a url of `https://example.com/other-folder/#`
 *
 * // at file:///usr/etc/folder/index.html
 * // for locations with no `host`, the base is ignored
 * createWebHashHistory('/iAmIgnored') // gives a url of `file:///usr/etc/folder/index.html#`
 * ```
 */
export declare function createWebHashHistory(base?: string): RouterHistory;

/**
 * Creates an HTML5 history. Most common history for single page applications.
 *
 * @param base -
 */
export declare function createWebHistory(base?: string): RouterHistory;

/**
 * Internal type to define an ErrorHandler
 *
 * @param error - error thrown
 * @param to - location we were navigating to when the error happened
 * @param from - location we were navigating from when the error happened
 * @internal
 */
declare interface _ErrorListener {
    (error: any, to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded): any;
}

/**
 * Flags so we can combine them when checking for multiple errors. This is the internal version of
 * {@link NavigationFailureType}.
 *
 * @internal
 */
export declare const enum ErrorTypes {
    MATCHER_NOT_FOUND = 1,
    NAVIGATION_GUARD_REDIRECT = 2,
    NAVIGATION_ABORTED = 4,
    NAVIGATION_CANCELLED = 8,
    NAVIGATION_DUPLICATED = 16
}

declare type HistoryLocation = string;

/**
 * Allowed HTML history.state
 */
export declare interface HistoryState {
    [x: number]: HistoryStateValue;
    [x: string]: HistoryStateValue;
}

/**
 * Allowed arrays for history.state.
 *
 * @internal
 */
declare interface HistoryStateArray extends Array<HistoryStateValue> {
}

/**
 * Allowed variables in HTML5 history state. Note that pushState clones the state
 * passed and does not accept everything: e.g.: it doesn't accept symbols, nor
 * functions as values. It also ignores Symbols as keys.
 *
 * @internal
 */
declare type HistoryStateValue = string | number | boolean | null | undefined | HistoryState | HistoryStateArray;

/**
 * Check if an object is a {@link NavigationFailure}.
 *
 * @param error - possible {@link NavigationFailure}
 * @param type - optional types to check for
 *
 * @example
 * ```js
 * import { isNavigationFailure, NavigationFailureType } from 'vue-router'
 *
 * router.afterEach((to, from, failure) => {
 *   // Any kind of navigation failure
 *   if (isNavigationFailure(failure)) {
 *     // ...
 *   }
 *   // Only duplicated navigations
 *   if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
 *     // ...
 *   }
 *   // Aborted or canceled navigations
 *   if (isNavigationFailure(failure, NavigationFailureType.aborted | NavigationFailureType.canceled)) {
 *     // ...
 *   }
 * })
 * ```
 */
export declare function isNavigationFailure(error: any, type?: ErrorTypes.NAVIGATION_GUARD_REDIRECT): error is NavigationRedirectError;

export declare function isNavigationFailure(error: any, type?: ErrorTypes | NavigationFailureType): error is NavigationFailure;

declare type Lazy<T> = () => Promise<T>;

/**
 * Creates a union type that still allows autocompletion for strings.
 * @internal
 */
declare type _LiteralUnion<LiteralType, BaseType extends string = string> = LiteralType | (BaseType & Record<never, never>);

/**
 * Ensures a route is loaded, so it can be passed as o prop to `<RouterView>`.
 *
 * @param route - resolved route to load
 */
export declare function loadRouteLocation(route: RouteLocation | RouteLocationNormalized): Promise<RouteLocationNormalizedLoaded>;

/**
 * @internal
 */
export declare interface LocationAsRelativeRaw {
    name?: RouteRecordNameGeneric;
    /**
     * Ignored path property since we are dealing with a relative location. Only `undefined` is allowed.
     */
    path?: undefined;
    params?: RouteParamsRawGeneric;
}

/**
 * Normalized query object that appears in {@link RouteLocationNormalized}
 *
 * @public
 */
export declare type LocationQuery = Record<string, LocationQueryValue | LocationQueryValue[]>;

/**
 * Loose {@link LocationQuery} object that can be passed to functions like
 * {@link Router.push} and {@link Router.replace} or anywhere when creating a
 * {@link RouteLocationRaw}
 *
 * @public
 */
export declare type LocationQueryRaw = Record<string | number, LocationQueryValueRaw | LocationQueryValueRaw[]>;

/**
 * Possible values in normalized {@link LocationQuery}. `null` renders the query
 * param but without an `=`.
 *
 * @example
 * ```
 * ?isNull&isEmpty=&other=other
 * gives
 * `{ isNull: null, isEmpty: '', other: 'other' }`.
 * ```
 *
 * @internal
 */
export declare type LocationQueryValue = string | null;

/**
 * Possible values when defining a query.
 *
 * @internal
 */
export declare type LocationQueryValueRaw = LocationQueryValue | number | undefined;

/**
 * RouteRecord being rendered by the closest ancestor Router View. Used for
 * `onBeforeRouteUpdate` and `onBeforeRouteLeave`. rvlm stands for Router View
 * Location Matched
 *
 * @internal
 */
export declare const matchedRouteKey: InjectionKey<ComputedRef<RouteRecordNormalized | undefined>>;

/**
 * Normalized/resolved Route location that returned by the matcher.
 */
export declare interface MatcherLocation {
    /**
     * Name of the matched record
     */
    name: RouteRecordNameGeneric | null | undefined;
    /**
     * Percentage encoded pathname section of the URL.
     */
    path: string;
    /**
     * Object of decoded params extracted from the `path`.
     */
    params: RouteParamsGeneric;
    /**
     * Merged `meta` properties from all the matched route records.
     */
    meta: RouteMeta;
    /**
     * Array of {@link RouteRecord} containing components as they were
     * passed when adding records. It can also contain redirect records. This
     * can't be used directly
     */
    matched: RouteRecord[];
}

/**
 * @internal
 */
declare interface MatcherLocationAsName {
    name: RouteRecordNameGeneric;
    /**
     * Ignored path property since we are dealing with a relative location. Only `undefined` is allowed.
     */
    path?: undefined;
    params?: RouteParamsGeneric;
}

/**
 * @internal
 */
export declare interface MatcherLocationAsPath {
    path: string;
}

/**
 * @internal
 */
declare interface MatcherLocationAsRelative {
    /**
     * Ignored path property since we are dealing with a relative location. Only `undefined` is allowed.
     */
    path?: undefined;
    params?: RouteParamsGeneric;
}

/**
 * Route location that can be passed to the matcher.
 */
declare type MatcherLocationRaw = MatcherLocationAsPath | MatcherLocationAsName | MatcherLocationAsRelative;

declare interface NavigationCallback {
    (to: HistoryLocation, from: HistoryLocation, information: NavigationInformation): void;
}

declare enum NavigationDirection {
    back = "back",
    forward = "forward",
    unknown = ""
}

/**
 * Extended Error that contains extra information regarding a failed navigation.
 */
export declare interface NavigationFailure extends Error {
    /**
     * Type of the navigation. One of {@link NavigationFailureType}
     */
    type: ErrorTypes.NAVIGATION_CANCELLED | ErrorTypes.NAVIGATION_ABORTED | ErrorTypes.NAVIGATION_DUPLICATED;
    /**
     * Route location we were navigating from
     */
    from: RouteLocationNormalized;
    /**
     * Route location we were navigating to
     */
    to: RouteLocationNormalized;
}

/**
 * Enumeration with all possible types for navigation failures. Can be passed to
 * {@link isNavigationFailure} to check for specific failures.
 */
export declare enum NavigationFailureType {
    /**
     * An aborted navigation is a navigation that failed because a navigation
     * guard returned `false` or called `next(false)`
     */
    aborted = 4,
    /**
     * A cancelled navigation is a navigation that failed because a more recent
     * navigation finished started (not necessarily finished).
     */
    cancelled = 8,
    /**
     * A duplicated navigation is a navigation that failed because it was
     * initiated while already being at the exact same location.
     */
    duplicated = 16
}

/**
 * Navigation Guard.
 */
export declare interface NavigationGuard {
    (to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded, next: NavigationGuardNext): _Awaitable<NavigationGuardReturn>;
}

/**
 * `next()` callback passed to navigation guards.
 */
export declare interface NavigationGuardNext {
    (): void;
    (error: Error): void;
    (location: RouteLocationRaw): void;
    (valid: boolean | undefined): void;
    (cb: NavigationGuardNextCallback): void;
}

/**
 * Callback that can be passed to `next()` in `beforeRouteEnter()` guards.
 */
export declare type NavigationGuardNextCallback = (vm: ComponentPublicInstance) => unknown;

/**
 * Return types for a Navigation Guard. Based on `TypesConfig`
 *
 * @see {@link TypesConfig}
 */
export declare type NavigationGuardReturn = void | Error | boolean | RouteLocationRaw;

/**
 * Navigation Guard with a type parameter for `this`.
 * @see {@link TypesConfig}
 */
export declare interface NavigationGuardWithThis<T> {
    (this: T, to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded, next: NavigationGuardNext): _Awaitable<NavigationGuardReturn>;
}

/**
 * Navigation hook triggered after a navigation is settled.
 */
export declare interface NavigationHookAfter {
    (to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded, failure?: NavigationFailure | void): unknown;
}

declare interface NavigationInformation {
    type: NavigationType;
    direction: NavigationDirection;
    delta: number;
}

/**
 * Internal error used to detect a redirection.
 *
 * @internal
 */
export declare interface NavigationRedirectError extends Omit<NavigationFailure, 'to' | 'type'> {
    type: ErrorTypes.NAVIGATION_GUARD_REDIRECT;
    to: RouteLocationRaw;
}

declare enum NavigationType {
    pop = "pop",
    push = "push"
}

/**
 * Add a navigation guard that triggers whenever the component for the current
 * location is about to be left. Similar to {@link beforeRouteLeave} but can be
 * used in any component. The guard is removed when the component is unmounted.
 *
 * @param leaveGuard - {@link NavigationGuard}
 */
export declare function onBeforeRouteLeave(leaveGuard: NavigationGuard): void;

/**
 * Add a navigation guard that triggers whenever the current location is about
 * to be updated. Similar to {@link beforeRouteUpdate} but can be used in any
 * component. The guard is removed when the component is unmounted.
 *
 * @param updateGuard - {@link NavigationGuard}
 */
export declare function onBeforeRouteUpdate(updateGuard: NavigationGuard): void;

/**
 * Utility type for raw and non raw params like :id
 *
 */
export declare type ParamValue<isRaw extends boolean> = true extends isRaw ? string | number : string;

/**
 * Utility type for raw and non raw params like :id+
 *
 */
export declare type ParamValueOneOrMore<isRaw extends boolean> = [
ParamValue<isRaw>,
...ParamValue<isRaw>[]
];

/**
 * Utility type for raw and non raw params like :id*
 *
 */
export declare type ParamValueZeroOrMore<isRaw extends boolean> = true extends isRaw ? ParamValue<isRaw>[] | undefined | null : ParamValue<isRaw>[] | undefined;

/**
 * Utility type for raw and non raw params like :id?
 *
 */
export declare type ParamValueZeroOrOne<isRaw extends boolean> = true extends isRaw ? string | number | null | undefined : string;

/**
 * Transforms a queryString into a {@link LocationQuery} object. Accept both, a
 * version with the leading `?` and without Should work as URLSearchParams

 * @internal
 *
 * @param search - search string to parse
 * @returns a query object
 */
export declare function parseQuery(search: string): LocationQuery;

declare type PathParams = Record<string, string | string[]>;

declare interface PathParser {
    /**
     * The regexp used to match a url
     */
    re: RegExp;
    /**
     * The score of the parser
     */
    score: Array<number[]>;
    /**
     * Keys that appeared in the path
     */
    keys: PathParserParamKey[];
    /**
     * Parses a url and returns the matched params or null if it doesn't match. An
     * optional param that isn't preset will be an empty string. A repeatable
     * param will be an array if there is at least one value.
     *
     * @param path - url to parse
     * @returns a Params object, empty if there are no params. `null` if there is
     * no match
     */
    parse(path: string): PathParams | null;
    /**
     * Creates a string version of the url
     *
     * @param params - object of params
     * @returns a url
     */
    stringify(params: PathParams): string;
}

export declare type PathParserOptions = Pick<_PathParserOptions, 'end' | 'sensitive' | 'strict'>;

/**
 * @internal
 */
export declare interface _PathParserOptions {
    /**
     * Makes the RegExp case-sensitive.
     *
     * @defaultValue `false`
     */
    sensitive?: boolean;
    /**
     * Whether to disallow a trailing slash or not.
     *
     * @defaultValue `false`
     */
    strict?: boolean;
    /**
     * Should the RegExp match from the beginning by prepending a `^` to it.
     * @internal
     *
     * @defaultValue `true`
     */
    start?: boolean;
    /**
     * Should the RegExp match until the end by appending a `$` to it.
     *
     * @defaultValue `true`
     */
    end?: boolean;
}

/**
 * A param in a url like `/users/:id`
 */
declare interface PathParserParamKey {
    name: string;
    repeatable: boolean;
    optional: boolean;
}

/**
 * Allowed Component definitions in route records provided by the user
 */
declare type RawRouteComponent = RouteComponent | Lazy<RouteComponent>;

/**
 * Allowed Component in {@link RouteLocationMatched}
 */
export declare type RouteComponent = Component | DefineComponent;

/**
 * Type safe versions of types that are exposed by vue-router. We have to use a generic check to allow for names to be `undefined` when no `RouteMap` is provided.
 */
/**
 * {@link RouteLocationRaw} resolved using the matcher
 */
export declare type RouteLocation<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationGeneric : RouteLocationTypedList<RouteMap>[Name];

/**
 * Route location as an object with a `path` property.
 */
export declare type RouteLocationAsPath<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationAsPathGeneric : RouteLocationAsPathTypedList<RouteMap>[Name];

/**
 * Generic version of {@link RouteLocationAsPath}. It is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationAsPathGeneric extends RouteQueryAndHash, RouteLocationOptions {
    /**
     * Percentage encoded pathname section of the URL.
     */
    path: string;
}

/**
 * Helper to generate a type safe version of the {@link RouteLocationAsPath} type.
 */
export declare interface RouteLocationAsPathTyped<RouteMap extends RouteMapGeneric = RouteMapGeneric, Name extends keyof RouteMap = keyof RouteMap> extends RouteLocationAsPathGeneric {
    path: _LiteralUnion<RouteMap[Name]['path']>;
}

/**
 * List of all possible {@link RouteLocationAsPath} indexed by the route name.
 * @internal
 */
export declare type RouteLocationAsPathTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationAsPathTyped<RouteMap, N>;
};

/**
 * Route location relative to the current location. It accepts other properties than `path` like `params`, `query` and
 * `hash` to conveniently change them.
 */
export declare type RouteLocationAsRelative<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationAsRelativeGeneric : RouteLocationAsRelativeTypedList<RouteMap>[Name];

/**
 * Generic version of {@link RouteLocationAsRelative}. It is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationAsRelativeGeneric extends RouteQueryAndHash, RouteLocationOptions {
    name?: RouteRecordNameGeneric;
    params?: RouteParamsRawGeneric;
    /**
     * A relative path to the current location. This property should be removed
     */
    path?: undefined;
}

/**
 * Helper to generate a type safe version of the {@link RouteLocationAsRelative} type.
 */
export declare interface RouteLocationAsRelativeTyped<RouteMap extends RouteMapGeneric = RouteMapGeneric, Name extends keyof RouteMap = keyof RouteMap> extends RouteLocationAsRelativeGeneric {
    name?: Extract<Name, string | symbol>;
    params?: RouteMap[Name]['paramsRaw'];
}

/**
 * List of all possible {@link RouteLocationAsRelative} indexed by the route name.
 * @internal
 */
export declare type RouteLocationAsRelativeTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationAsRelativeTyped<RouteMap, N>;
};

/**
 * Same as {@link RouteLocationAsPath} but as a string literal.
 */
export declare type RouteLocationAsString<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? string : _LiteralUnion<RouteLocationAsStringTypedList<RouteMap>[Name], string>;

/**
 * Helper to generate a type safe version of the {@link RouteLocationAsString} type.
 */
export declare type RouteLocationAsStringTyped<RouteMap extends RouteMapGeneric = RouteMapGeneric, Name extends keyof RouteMap = keyof RouteMap> = RouteMap[Name]['path'];

/**
 * List of all possible {@link RouteLocationAsString} indexed by the route name.
 * @internal
 */
export declare type RouteLocationAsStringTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationAsStringTyped<RouteMap, N>;
};

/**
 * Base properties for a normalized route location.
 *
 * @internal
 */
export declare interface _RouteLocationBase extends Pick<MatcherLocation, 'name' | 'path' | 'params' | 'meta'> {
    /**
     * The whole location including the `search` and `hash`. This string is
     * percentage encoded.
     */
    fullPath: string;
    /**
     * Object representation of the `search` property of the current location.
     */
    query: LocationQuery;
    /**
     * Hash of the current location. If present, starts with a `#`.
     */
    hash: string;
    /**
     * Contains the location we were initially trying to access before ending up
     * on the current location.
     */
    redirectedFrom: RouteLocation | undefined;
}

/**
 * Generic version of {@link RouteLocation}. It is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationGeneric extends _RouteLocationBase {
    /**
     * Array of {@link RouteRecord} containing components as they were
     * passed when adding records. It can also contain redirect records. This
     * can't be used directly. **This property is non-enumerable**.
     */
    matched: RouteRecord[];
}

/**
 * Allows overriding the current route returned by `useRoute` in tests. rl
 * stands for route location
 *
 * @internal
 */
export declare const routeLocationKey: InjectionKey<RouteLocationNormalizedLoaded>;

export declare interface RouteLocationMatched extends RouteRecordNormalized {
    components: Record<string, RouteComponent> | null | undefined;
}

/**
 * Route Location that can infer the necessary params based on the name.
 *
 * @internal
 */
export declare interface RouteLocationNamedRaw extends RouteQueryAndHash, LocationAsRelativeRaw, RouteLocationOptions {
}

/**
 * Similar to {@link RouteLocation} but its
 * {@link RouteLocationNormalizedTyped.matched | `matched` property} cannot contain redirect records
 */
export declare type RouteLocationNormalized<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationNormalizedGeneric : RouteLocationNormalizedTypedList<RouteMap>[Name];

/**
 * Generic version of {@link RouteLocationNormalized} that is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationNormalizedGeneric extends _RouteLocationBase {
    name: RouteRecordNameGeneric;
    params: RouteParamsGeneric;
    /**
     * Array of {@link RouteRecordNormalized}
     */
    matched: RouteRecordNormalized[];
}

/**
 * Similar to {@link RouteLocationNormalized} but its `components` do not contain any function to lazy load components.
 * In other words, it's ready to be rendered by `<RouterView>`.
 */
export declare type RouteLocationNormalizedLoaded<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationNormalizedLoadedGeneric : RouteLocationNormalizedLoadedTypedList<RouteMap>[Name];

/**
 * Generic version of {@link RouteLocationNormalizedLoaded} that is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationNormalizedLoadedGeneric extends RouteLocationNormalizedGeneric {
    /**
     * Array of {@link RouteLocationMatched} containing only plain components (any
     * lazy-loaded components have been loaded and were replaced inside the
     * `components` object) so it can be directly used to display routes. It
     * cannot contain redirect records either. **This property is non-enumerable**.
     */
    matched: RouteLocationMatched[];
}

/**
 * Helper to generate a type safe version of the {@link RouteLocationNormalizedLoaded} type.
 */
export declare interface RouteLocationNormalizedLoadedTyped<RouteMap extends RouteMapGeneric = RouteMapGeneric, Name extends keyof RouteMap = keyof RouteMap> extends RouteLocationNormalizedLoadedGeneric {
    name: Extract<Name, string | symbol>;
    params: RouteMap[Name]['params'];
}

/**
 * List of all possible {@link RouteLocationNormalizedLoaded} indexed by the route name.
 * @internal
 */
export declare type RouteLocationNormalizedLoadedTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationNormalizedLoadedTyped<RouteMap, N>;
};

/**
 * Helper to generate a type safe version of the {@link RouteLocationNormalized} type.
 */
export declare interface RouteLocationNormalizedTyped<RouteMap extends RouteMapGeneric = RouteMapGeneric, Name extends keyof RouteMap = keyof RouteMap> extends RouteLocationNormalizedGeneric {
    name: Extract<Name, string | symbol>;
    params: RouteMap[Name]['params'];
    /**
     * Array of {@link RouteRecordNormalized}
     */
    matched: RouteRecordNormalized[];
}

/**
 * List of all possible {@link RouteLocationNormalized} indexed by the route name.
 * @internal
 */
export declare type RouteLocationNormalizedTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationNormalizedTyped<RouteMap, N>;
};

/**
 * Common options for all navigation methods.
 */
export declare interface RouteLocationOptions {
    /**
     * Replace the entry in the history instead of pushing a new entry
     */
    replace?: boolean;
    /**
     * Triggers the navigation even if the location is the same as the current one.
     * Note this will also add a new entry to the history unless `replace: true`
     * is passed.
     */
    force?: boolean;
    /**
     * State to save using the History API. This cannot contain any reactive
     * values and some primitives like Symbols are forbidden. More info at
     * https://developer.mozilla.org/en-US/docs/Web/API/History/state
     */
    state?: HistoryState;
}

/**
 * Route Location that can infer the possible paths.
 *
 * @internal
 */
export declare interface RouteLocationPathRaw extends RouteQueryAndHash, MatcherLocationAsPath, RouteLocationOptions {
}

/**
 * Route location that can be passed to `router.push()` and other user-facing APIs.
 */
export declare type RouteLocationRaw<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationAsString | RouteLocationAsRelativeGeneric | RouteLocationAsPathGeneric : _LiteralUnion<RouteLocationAsStringTypedList<RouteMap>[Name], string> | RouteLocationAsRelativeTypedList<RouteMap>[Name] | RouteLocationAsPathTypedList<RouteMap>[Name];

/**
 * Route location resolved with {@link Router | `router.resolve()`}.
 */
export declare type RouteLocationResolved<Name extends keyof RouteMap = keyof RouteMap> = RouteMapGeneric extends RouteMap ? RouteLocationResolvedGeneric : RouteLocationResolvedTypedList<RouteMap>[Name];

/**
 * Generic version of {@link RouteLocationResolved}. It is used when no {@link RouteMap} is provided.
 */
export declare interface RouteLocationResolvedGeneric extends RouteLocationGeneric {
    /**
     * Resolved `href` for the route location that will be set on the `<a href="...">`.
     */
    href: string;
}

/**
 * Helper to generate a type safe version of the {@link RouteLocationResolved} type.
 */
export declare interface RouteLocationResolvedTyped<RouteMap extends RouteMapGeneric, Name extends keyof RouteMap> extends RouteLocationTyped<RouteMap, Name> {
    /**
     * Resolved `href` for the route location that will be set on the `<a href="...">`.
     */
    href: string;
}

/**
 * List of all possible {@link RouteLocationResolved} indexed by the route name.
 * @internal
 */
export declare type RouteLocationResolvedTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationResolvedTyped<RouteMap, N>;
};

/**
 * Helper to generate a type safe version of the {@link RouteLocation} type.
 */
export declare interface RouteLocationTyped<RouteMap extends RouteMapGeneric, Name extends keyof RouteMap> extends RouteLocationGeneric {
    name: Extract<Name, string | symbol>;
    params: RouteMap[Name]['params'];
}

/**
 * List of all possible {@link RouteLocation} indexed by the route name.
 * @internal
 */
export declare type RouteLocationTypedList<RouteMap extends RouteMapGeneric = RouteMapGeneric> = {
    [N in keyof RouteMap]: RouteLocationTyped<RouteMap, N>;
};

/**
 * Convenience type to get the typed RouteMap or a generic one if not provided. It is extracted from the {@link TypesConfig} if it exists, it becomes {@link RouteMapGeneric} otherwise.
 */
export declare type RouteMap = TypesConfig extends Record<'RouteNamedMap', infer RouteNamedMap> ? RouteNamedMap : RouteMapGeneric;

/**
 * Generic version of the `RouteMap`.
 */
export declare type RouteMapGeneric = Record<string | symbol, RouteRecordInfo>;

/**
 * Interface to type `meta` fields in route records.
 *
 * @example
 *
 * ```ts
 * // typings.d.ts or router.ts
 * import 'vue-router';
 *
 * declare module 'vue-router' {
 *   interface RouteMeta {
 *     requiresAuth?: boolean
 *   }
 * }
 * ```
 */
export declare interface RouteMeta extends Record<string | number | symbol, unknown> {
}

/**
 * Generate a type safe params for a route location. Requires the name of the route to be passed as a generic.
 * @see {@link RouteParamsGeneric}
 */
export declare type RouteParams<Name extends keyof RouteMap = keyof RouteMap> = RouteMap[Name]['params'];

export declare type RouteParamsGeneric = Record<string, RouteParamValue | RouteParamValue[]>;

/**
 * Generate a type safe raw params for a route location. Requires the name of the route to be passed as a generic.
 * @see {@link RouteParamsRaw}
 */
export declare type RouteParamsRaw<Name extends keyof RouteMap = keyof RouteMap> = RouteMap[Name]['paramsRaw'];

export declare type RouteParamsRawGeneric = Record<string, RouteParamValueRaw | Exclude<RouteParamValueRaw, null | undefined>[]>;

/**
 * @internal
 */
export declare type RouteParamValue = string;

/**
 * @internal
 */
export declare type RouteParamValueRaw = RouteParamValue | number | null | undefined;

/**
 * @internal
 */
export declare interface RouteQueryAndHash {
    query?: LocationQueryRaw;
    hash?: string;
}

/**
 * Router instance.
 */
export declare interface Router {
    /**
     * @internal
     */
    /**
     * Current {@link RouteLocationNormalized}
     */
    readonly currentRoute: Ref<RouteLocationNormalizedLoaded>;
    /**
     * Original options object passed to create the Router
     */
    readonly options: RouterOptions;
    /**
     * Allows turning off the listening of history events. This is a low level api for micro-frontend.
     */
    listening: boolean;
    /**
     * Add a new {@link RouteRecordRaw | route record} as the child of an existing route.
     *
     * @param parentName - Parent Route Record where `route` should be appended at
     * @param route - Route Record to add
     */
    addRoute(parentName: NonNullable<RouteRecordNameGeneric>, route: RouteRecordRaw): () => void;
    /**
     * Add a new {@link RouteRecordRaw | route record} to the router.
     *
     * @param route - Route Record to add
     */
    addRoute(route: RouteRecordRaw): () => void;
    /**
     * Remove an existing route by its name.
     *
     * @param name - Name of the route to remove
     */
    removeRoute(name: NonNullable<RouteRecordNameGeneric>): void;
    /**
     * Checks if a route with a given name exists
     *
     * @param name - Name of the route to check
     */
    hasRoute(name: NonNullable<RouteRecordNameGeneric>): boolean;
    /**
     * Get a full list of all the {@link RouteRecord | route records}.
     */
    getRoutes(): RouteRecord[];
    /**
     * Delete all routes from the router matcher.
     */
    clearRoutes(): void;
    /**
     * Returns the {@link RouteLocation | normalized version} of a
     * {@link RouteLocationRaw | route location}. Also includes an `href` property
     * that includes any existing `base`. By default, the `currentLocation` used is
     * `router.currentRoute` and should only be overridden in advanced use cases.
     *
     * @param to - Raw route location to resolve
     * @param currentLocation - Optional current location to resolve against
     */
    resolve<Name extends keyof RouteMap = keyof RouteMap>(to: RouteLocationAsRelativeTyped<RouteMap, Name>, currentLocation?: RouteLocationNormalizedLoaded): RouteLocationResolved<Name>;
    resolve(to: RouteLocationAsString | RouteLocationAsRelative | RouteLocationAsPath, currentLocation?: RouteLocationNormalizedLoaded): RouteLocationResolved;
    /**
     * Programmatically navigate to a new URL by pushing an entry in the history
     * stack.
     *
     * @param to - Route location to navigate to
     */
    push(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined>;
    /**
     * Programmatically navigate to a new URL by replacing the current entry in
     * the history stack.
     *
     * @param to - Route location to navigate to
     */
    replace(to: RouteLocationRaw): Promise<NavigationFailure | void | undefined>;
    /**
     * Go back in history if possible by calling `history.back()`. Equivalent to
     * `router.go(-1)`.
     */
    back(): ReturnType<Router['go']>;
    /**
     * Go forward in history if possible by calling `history.forward()`.
     * Equivalent to `router.go(1)`.
     */
    forward(): ReturnType<Router['go']>;
    /**
     * Allows you to move forward or backward through the history. Calls
     * `history.go()`.
     *
     * @param delta - The position in the history to which you want to move,
     * relative to the current page
     */
    go(delta: number): void;
    /**
     * Add a navigation guard that executes before any navigation. Returns a
     * function that removes the registered guard.
     *
     * @param guard - navigation guard to add
     */
    beforeEach(guard: NavigationGuardWithThis<undefined>): () => void;
    /**
     * Add a navigation guard that executes before navigation is about to be
     * resolved. At this state all component have been fetched and other
     * navigation guards have been successful. Returns a function that removes the
     * registered guard.
     *
     * @param guard - navigation guard to add
     * @returns a function that removes the registered guard
     *
     * @example
     * ```js
     * router.beforeResolve(to => {
     *   if (to.meta.requiresAuth && !isAuthenticated) return false
     * })
     * ```
     *
     */
    beforeResolve(guard: NavigationGuardWithThis<undefined>): () => void;
    /**
     * Add a navigation hook that is executed after every navigation. Returns a
     * function that removes the registered hook.
     *
     * @param guard - navigation hook to add
     * @returns a function that removes the registered hook
     *
     * @example
     * ```js
     * router.afterEach((to, from, failure) => {
     *   if (isNavigationFailure(failure)) {
     *     console.log('failed navigation', failure)
     *   }
     * })
     * ```
     */
    afterEach(guard: NavigationHookAfter): () => void;
    /**
     * Adds an error handler that is called every time a non caught error happens
     * during navigation. This includes errors thrown synchronously and
     * asynchronously, errors returned or passed to `next` in any navigation
     * guard, and errors occurred when trying to resolve an async component that
     * is required to render a route.
     *
     * @param handler - error handler to register
     */
    onError(handler: _ErrorListener): () => void;
    /**
     * Returns a Promise that resolves when the router has completed the initial
     * navigation, which means it has resolved all async enter hooks and async
     * components that are associated with the initial route. If the initial
     * navigation already happened, the promise resolves immediately.
     *
     * This is useful in server-side rendering to ensure consistent output on both
     * the server and the client. Note that on server side, you need to manually
     * push the initial location while on client side, the router automatically
     * picks it up from the URL.
     */
    isReady(): Promise<void>;
    /**
     * Called automatically by `app.use(router)`. Should not be called manually by
     * the user. This will trigger the initial navigation when on client side.
     *
     * @internal
     * @param app - Application that uses the router
     */
    install(app: App): void;
}

/**
 * {@inheritDoc RouteRecordNormalized}
 */
export declare type RouteRecord = RouteRecordNormalized;

/**
 * Internal type for common properties among all kind of {@link RouteRecordRaw}.
 */
export declare interface _RouteRecordBase extends PathParserOptions {
    /**
     * Path of the record. Should start with `/` unless the record is the child of
     * another record.
     *
     * @example `/users/:id` matches `/users/1` as well as `/users/posva`.
     */
    path: string;
    /**
     * Where to redirect if the route is directly matched. The redirection happens
     * before any navigation guard and triggers a new navigation with the new
     * target location.
     */
    redirect?: RouteRecordRedirectOption;
    /**
     * Aliases for the record. Allows defining extra paths that will behave like a
     * copy of the record. Allows having paths shorthands like `/users/:id` and
     * `/u/:id`. All `alias` and `path` values must share the same params.
     */
    alias?: string | string[];
    /**
     * Name for the route record. Must be unique.
     */
    name?: RouteRecordNameGeneric;
    /**
     * Before Enter guard specific to this record. Note `beforeEnter` has no
     * effect if the record has a `redirect` property.
     */
    beforeEnter?: NavigationGuardWithThis<undefined> | NavigationGuardWithThis<undefined>[];
    /**
     * Arbitrary data attached to the record.
     */
    meta?: RouteMeta;
    /**
     * Array of nested routes.
     */
    children?: RouteRecordRaw[];
    /**
     * Allow passing down params as props to the component rendered by `router-view`.
     */
    props?: _RouteRecordProps | Record<string, _RouteRecordProps>;
}

/**
 * Helper type to define a Typed `RouteRecord`
 * @see {@link RouteRecord}
 */
export declare interface RouteRecordInfo<Name extends string | symbol = string, Path extends string = string, ParamsRaw extends RouteParamsRawGeneric = RouteParamsRawGeneric, Params extends RouteParamsGeneric = RouteParamsGeneric, Meta extends RouteMeta = RouteMeta> {
    name: Name;
    path: Path;
    paramsRaw: ParamsRaw;
    params: Params;
    meta: Meta;
}

declare interface RouteRecordMatcher extends PathParser {
    record: RouteRecord;
    parent: RouteRecordMatcher | undefined;
    children: RouteRecordMatcher[];
    alias: RouteRecordMatcher[];
}

/**
 * Route Record defining multiple named components with the `components` option.
 */
export declare interface RouteRecordMultipleViews extends _RouteRecordBase {
    /**
     * Components to display when the URL matches this route. Allow using named views.
     */
    components: Record<string, RawRouteComponent>;
    component?: never;
    children?: never;
    redirect?: never;
    /**
     * Allow passing down params as props to the component rendered by
     * `router-view`. Should be an object with the same keys as `components` or a
     * boolean to be applied to every component.
     */
    props?: Record<string, _RouteRecordProps> | boolean;
}

/**
 * Route Record defining multiple named components with the `components` option and children.
 */
export declare interface RouteRecordMultipleViewsWithChildren extends _RouteRecordBase {
    /**
     * Components to display when the URL matches this route. Allow using named views.
     */
    components?: Record<string, RawRouteComponent> | null | undefined;
    component?: never;
    children: RouteRecordRaw[];
    /**
     * Allow passing down params as props to the component rendered by
     * `router-view`. Should be an object with the same keys as `components` or a
     * boolean to be applied to every component.
     */
    props?: Record<string, _RouteRecordProps> | boolean;
}

/**
 * Possible values for a route record **after normalization**
 *
 * NOTE: since `RouteRecordName` is a type, it evaluates too early and it's often the generic version {@link RouteRecordNameGeneric}. If you need a typed version of all of the names of routes, use {@link RouteMap | `keyof RouteMap`}
 */
export declare type RouteRecordName = RouteMapGeneric extends RouteMap ? RouteRecordNameGeneric : keyof RouteMap;

/**
 * Generic version of {@link RouteRecordName}.
 */
export declare type RouteRecordNameGeneric = string | symbol | undefined;

/**
 * Normalized version of a {@link RouteRecord | route record}.
 */
export declare interface RouteRecordNormalized {
    /**
     * {@inheritDoc _RouteRecordBase.path}
     */
    path: _RouteRecordBase['path'];
    /**
     * {@inheritDoc _RouteRecordBase.redirect}
     */
    redirect: _RouteRecordBase['redirect'] | undefined;
    /**
     * {@inheritDoc _RouteRecordBase.name}
     */
    name: _RouteRecordBase['name'];
    /**
     * {@inheritDoc RouteRecordMultipleViews.components}
     */
    components: RouteRecordMultipleViews['components'] | null | undefined;
    /**
     * Contains the original modules for lazy loaded components.
     * @internal
     */
    mods: Record<string, unknown>;
    /**
     * Nested route records.
     */
    children: RouteRecordRaw[];
    /**
     * {@inheritDoc _RouteRecordBase.meta}
     */
    meta: Exclude<_RouteRecordBase['meta'], void>;
    /**
     * {@inheritDoc RouteRecordMultipleViews.props}
     */
    props: Record<string, _RouteRecordProps>;
    /**
     * Registered beforeEnter guards
     */
    beforeEnter: _RouteRecordBase['beforeEnter'];
    /**
     * Registered leave guards
     *
     * @internal
     */
    leaveGuards: Set<NavigationGuard>;
    /**
     * Registered update guards
     *
     * @internal
     */
    updateGuards: Set<NavigationGuard>;
    /**
     * Registered beforeRouteEnter callbacks passed to `next` or returned in guards
     *
     * @internal
     */
    enterCallbacks: Record<string, NavigationGuardNextCallback[]>;
    /**
     * Mounted route component instances
     * Having the instances on the record mean beforeRouteUpdate and
     * beforeRouteLeave guards can only be invoked with the latest mounted app
     * instance if there are multiple application instances rendering the same
     * view, basically duplicating the content on the page, which shouldn't happen
     * in practice. It will work if multiple apps are rendering different named
     * views.
     */
    instances: Record<string, ComponentPublicInstance | undefined | null>;
    /**
     * Defines if this record is the alias of another one. This property is
     * `undefined` if the record is the original one.
     */
    aliasOf: RouteRecordNormalized | undefined;
}

/**
 * @internal
 */
export declare type _RouteRecordProps<Name extends keyof RouteMap = keyof RouteMap> = boolean | Record<string, any> | ((to: RouteLocationNormalized<Name>) => Record<string, any>);

export declare type RouteRecordRaw = RouteRecordSingleView | RouteRecordSingleViewWithChildren | RouteRecordMultipleViews | RouteRecordMultipleViewsWithChildren | RouteRecordRedirect;

/**
 * Route Record that defines a redirect. Cannot have `component` or `components`
 * as it is never rendered.
 */
export declare interface RouteRecordRedirect extends _RouteRecordBase {
    redirect: RouteRecordRedirectOption;
    component?: never;
    components?: never;
    props?: never;
}

/**
 * @internal
 */
export declare type RouteRecordRedirectOption = RouteLocationRaw | ((to: RouteLocation) => RouteLocationRaw);

/**
 * Route Record defining one single component with the `component` option.
 */
export declare interface RouteRecordSingleView extends _RouteRecordBase {
    /**
     * Component to display when the URL matches this route.
     */
    component: RawRouteComponent;
    components?: never;
    children?: never;
    redirect?: never;
    /**
     * Allow passing down params as props to the component rendered by `router-view`.
     */
    props?: _RouteRecordProps;
}

/**
 * Route Record defining one single component with a nested view.
 */
export declare interface RouteRecordSingleViewWithChildren extends _RouteRecordBase {
    /**
     * Component to display when the URL matches this route.
     */
    component?: RawRouteComponent | null | undefined;
    components?: never;
    children: RouteRecordRaw[];
    /**
     * Allow passing down params as props to the component rendered by `router-view`.
     */
    props?: _RouteRecordProps;
}

/**
 * Interface implemented by History implementations that can be passed to the
 * router as {@link Router.history}
 *
 * @alpha
 */
export declare interface RouterHistory {
    /**
     * Base path that is prepended to every url. This allows hosting an SPA at a
     * sub-folder of a domain like `example.com/sub-folder` by having a `base` of
     * `/sub-folder`
     */
    readonly base: string;
    /**
     * Current History location
     */
    readonly location: HistoryLocation;
    /**
     * Current History state
     */
    readonly state: HistoryState;
    /**
     * Navigates to a location. In the case of an HTML5 History implementation,
     * this will call `history.pushState` to effectively change the URL.
     *
     * @param to - location to push
     * @param data - optional {@link HistoryState} to be associated with the
     * navigation entry
     */
    push(to: HistoryLocation, data?: HistoryState): void;
    /**
     * Same as {@link RouterHistory.push} but performs a `history.replaceState`
     * instead of `history.pushState`
     *
     * @param to - location to set
     * @param data - optional {@link HistoryState} to be associated with the
     * navigation entry
     */
    replace(to: HistoryLocation, data?: HistoryState): void;
    /**
     * Traverses history in a given direction.
     *
     * @example
     * ```js
     * myHistory.go(-1) // equivalent to window.history.back()
     * myHistory.go(1) // equivalent to window.history.forward()
     * ```
     *
     * @param delta - distance to travel. If delta is \< 0, it will go back,
     * if it's \> 0, it will go forward by that amount of entries.
     * @param triggerListeners - whether this should trigger listeners attached to
     * the history
     */
    go(delta: number, triggerListeners?: boolean): void;
    /**
     * Attach a listener to the History implementation that is triggered when the
     * navigation is triggered from outside (like the Browser back and forward
     * buttons) or when passing `true` to {@link RouterHistory.back} and
     * {@link RouterHistory.forward}
     *
     * @param callback - listener to attach
     * @returns a callback to remove the listener
     */
    listen(callback: NavigationCallback): () => void;
    /**
     * Generates the corresponding href to be used in an anchor tag.
     *
     * @param location - history location that should create an href
     */
    createHref(location: HistoryLocation): string;
    /**
     * Clears any event listener attached by the history implementation.
     */
    destroy(): void;
}

/**
 * Allows overriding the router instance returned by `useRouter` in tests. r
 * stands for router
 *
 * @internal
 */
export declare const routerKey: InjectionKey<Router>;

/**
 * Component to render a link that triggers a navigation on click.
 */
export declare const RouterLink: _RouterLinkI;

/**
 * Typed version of the `RouterLink` component. Its generic defaults to the typed router, so it can be inferred
 * automatically for JSX.
 *
 * @internal
 */
export declare interface _RouterLinkI {
    new (): {
        $props: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps;
        $slots: {
            default?: ({ route, href, isActive, isExactActive, navigate, }: UnwrapRef<UseLinkReturn>) => VNode[];
        };
    };
    /**
     * Access to `useLink()` without depending on using vue-router
     *
     * @internal
     */
    useLink: typeof useLink;
}

declare interface RouterLinkOptions {
    /**
     * Route Location the link should navigate to when clicked on.
     */
    to: RouteLocationRaw;
    /**
     * Calls `router.replace` instead of `router.push`.
     */
    replace?: boolean;
}

export declare interface RouterLinkProps extends RouterLinkOptions {
    /**
     * Whether RouterLink should not wrap its content in an `a` tag. Useful when
     * using `v-slot` to create a custom RouterLink
     */
    custom?: boolean;
    /**
     * Class to apply when the link is active
     */
    activeClass?: string;
    /**
     * Class to apply when the link is exact active
     */
    exactActiveClass?: string;
    /**
     * Value passed to the attribute `aria-current` when the link is exact active.
     *
     * @defaultValue `'page'`
     */
    ariaCurrentValue?: 'page' | 'step' | 'location' | 'date' | 'time' | 'true' | 'false';
    /**
     * Pass the returned promise of `router.push()` to `document.startViewTransition()` if supported.
     */
    viewTransition?: boolean;
}

/**
 * Internal RouterMatcher
 *
 * @internal
 */
export declare interface RouterMatcher {
    addRoute: (record: RouteRecordRaw, parent?: RouteRecordMatcher) => () => void;
    removeRoute(matcher: RouteRecordMatcher): void;
    removeRoute(name: NonNullable<RouteRecordNameGeneric>): void;
    clearRoutes: () => void;
    getRoutes: () => RouteRecordMatcher[];
    getRecordMatcher: (name: NonNullable<RouteRecordNameGeneric>) => RouteRecordMatcher | undefined;
    /**
     * Resolves a location. Gives access to the route record that corresponds to the actual path as well as filling the corresponding params objects
     *
     * @param location - MatcherLocationRaw to resolve to a url
     * @param currentLocation - MatcherLocation of the current location
     */
    resolve: (location: MatcherLocationRaw, currentLocation: MatcherLocation) => MatcherLocation;
}

/**
 * Options to initialize a {@link Router} instance.
 */
export declare interface RouterOptions extends PathParserOptions {
    /**
     * History implementation used by the router. Most web applications should use
     * `createWebHistory` but it requires the server to be properly configured.
     * You can also use a _hash_ based history with `createWebHashHistory` that
     * does not require any configuration on the server but isn't handled at all
     * by search engines and does poorly on SEO.
     *
     * @example
     * ```js
     * createRouter({
     *   history: createWebHistory(),
     *   // other options...
     * })
     * ```
     */
    history: RouterHistory;
    /**
     * Initial list of routes that should be added to the router.
     */
    routes: Readonly<RouteRecordRaw[]>;
    /**
     * Function to control scrolling when navigating between pages. Can return a
     * Promise to delay scrolling. Check {@link ScrollBehavior}.
     *
     * @example
     * ```js
     * function scrollBehavior(to, from, savedPosition) {
     *   // `to` and `from` are both route locations
     *   // `savedPosition` can be null if there isn't one
     * }
     * ```
     */
    scrollBehavior?: RouterScrollBehavior;
    /**
     * Custom implementation to parse a query. See its counterpart,
     * {@link RouterOptions.stringifyQuery}.
     *
     * @example
     * Let's say you want to use the [qs package](https://github.com/ljharb/qs)
     * to parse queries, you can provide both `parseQuery` and `stringifyQuery`:
     * ```js
     * import qs from 'qs'
     *
     * createRouter({
     *   // other options...
     *   parseQuery: qs.parse,
     *   stringifyQuery: qs.stringify,
     * })
     * ```
     */
    parseQuery?: typeof parseQuery;
    /**
     * Custom implementation to stringify a query object. Should not prepend a leading `?`.
     * {@link RouterOptions.parseQuery | parseQuery} counterpart to handle query parsing.
     */
    stringifyQuery?: typeof stringifyQuery;
    /**
     * Default class applied to active {@link RouterLink}. If none is provided,
     * `router-link-active` will be applied.
     */
    linkActiveClass?: string;
    /**
     * Default class applied to exact active {@link RouterLink}. If none is provided,
     * `router-link-exact-active` will be applied.
     */
    linkExactActiveClass?: string;
}

/**
 * Type of the `scrollBehavior` option that can be passed to `createRouter`.
 */
export declare interface RouterScrollBehavior {
    /**
     * @param to - Route location where we are navigating to
     * @param from - Route location where we are navigating from
     * @param savedPosition - saved position if it exists, `null` otherwise
     */
    (to: RouteLocationNormalized, from: RouteLocationNormalizedLoaded, savedPosition: _ScrollPositionNormalized | null): Awaitable<ScrollPosition | false | void>;
}

/**
 * Component to display the current route the user is at.
 */
export declare const RouterView: {
    new (): {
        $props: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterViewProps;
        $slots: {
            default?: ({ Component, route, }: {
                Component: VNode;
                route: RouteLocationNormalizedLoaded;
            }) => VNode[];
        };
    };
};

/**
 * Allows overriding the current route used by router-view. Internally this is
 * used when the `route` prop is passed.
 *
 * @internal
 */
export declare const routerViewLocationKey: InjectionKey<Ref<RouteLocationNormalizedLoaded>>;

export declare interface RouterViewProps {
    name?: string;
    route?: RouteLocationNormalized;
}

declare type ScrollPosition = ScrollPositionCoordinates | ScrollPositionElement;

/**
 * Scroll position similar to
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/ScrollToOptions | `ScrollToOptions`}.
 * Note that not all browsers support `behavior`.
 */
declare type ScrollPositionCoordinates = {
    behavior?: ScrollOptions['behavior'];
    left?: number;
    top?: number;
};

declare interface ScrollPositionElement extends ScrollToOptions {
    /**
     * A valid CSS selector. Note some characters must be escaped in id selectors (https://mathiasbynens.be/notes/css-escapes).
     * @example
     * Here are a few examples:
     *
     * - `.title`
     * - `.content:first-child`
     * - `#marker`
     * - `#marker\~with\~symbols`
     * - `#marker.with.dot`: selects `class="with dot" id="marker"`, not `id="marker.with.dot"`
     *
     */
    el: string | Element;
}

/**
 * Internal normalized version of {@link ScrollPositionCoordinates} that always
 * has `left` and `top` coordinates. Must be a type to be assignable to HistoryStateValue.
 *
 * @internal
 */
declare type _ScrollPositionNormalized = {
    behavior?: ScrollOptions['behavior'];
    left: number;
    top: number;
};

/**
 * Initial route location where the router is. Can be used in navigation guards
 * to differentiate the initial navigation.
 *
 * @example
 * ```js
 * import { START_LOCATION } from 'vue-router'
 *
 * router.beforeEach((to, from) => {
 *   if (from === START_LOCATION) {
 *     // initial navigation
 *   }
 * })
 * ```
 */
export declare const START_LOCATION: RouteLocationNormalizedLoaded;

/**
 * Stringifies a {@link LocationQueryRaw} object. Like `URLSearchParams`, it
 * doesn't prepend a `?`
 *
 * @internal
 *
 * @param query - query object to stringify
 * @returns string version of the query without the leading `?`
 */
export declare function stringifyQuery(query: LocationQueryRaw): string;

/**
 * Allows customizing existing types of the router that are used globally like `$router`, `<RouterLink>`, etc. **ONLY FOR INTERNAL USAGE**.
 *
 * - `$router` - the router instance
 * - `$route` - the current route location
 * - `beforeRouteEnter` - Page component option
 * - `beforeRouteUpdate` - Page component option
 * - `beforeRouteLeave` - Page component option
 * - `RouterLink` - RouterLink Component
 * - `RouterView` - RouterView Component
 *
 * @internal
 */
export declare interface TypesConfig {
}

/**
 * Returns the internal behavior of a {@link RouterLink} without the rendering part.
 *
 * @param props - a `to` location and an optional `replace` flag
 */
export declare function useLink<Name extends keyof RouteMap = keyof RouteMap>(props: UseLinkOptions<Name>): UseLinkReturn<Name>;

/**
 * Options passed to {@link useLink}.
 */
export declare interface UseLinkOptions<Name extends keyof RouteMap = keyof RouteMap> {
    to: MaybeRef<RouteLocationAsString | RouteLocationAsRelativeTyped<RouteMap, Name> | RouteLocationAsPath | RouteLocationRaw>;
    replace?: MaybeRef<boolean | undefined>;
    /**
     * Pass the returned promise of `router.push()` to `document.startViewTransition()` if supported.
     */
    viewTransition?: boolean;
}

/**
 * Return type of {@link useLink}.
 * @internal
 */
export declare interface UseLinkReturn<Name extends keyof RouteMap = keyof RouteMap> {
    route: ComputedRef<RouteLocationResolved<Name>>;
    href: ComputedRef<string>;
    isActive: ComputedRef<boolean>;
    isExactActive: ComputedRef<boolean>;
    navigate(e?: MouseEvent): Promise<void | NavigationFailure>;
}

/**
 * Returns the current route location. Equivalent to using `$route` inside
 * templates.
 */
export declare function useRoute<Name extends keyof RouteMap = keyof RouteMap>(_name?: Name): RouteLocationNormalizedLoaded<Name>;

/**
 * Returns the router instance. Equivalent to using `$router` inside
 * templates.
 */
export declare function useRouter(): Router;

/**
 * Allows overriding the router view depth to control which component in
 * `matched` is rendered. rvd stands for Router View Depth
 *
 * @internal
 */
export declare const viewDepthKey: InjectionKey<Ref<number> | number>;

export { }

/**
 * NOTE: this used to be `@vue/runtime-core` but it should have been `vue` for a long time. Using both declaration at
 * the same time breaks so using only one everywhere is the preferred way.
 */
declare module 'vue' {
  export interface ComponentCustomOptions {
    /**
     * Guard called when the router is navigating to the route that is rendering
     * this component from a different route. Differently from `beforeRouteUpdate`
     * and `beforeRouteLeave`, `beforeRouteEnter` does not have access to the
     * component instance through `this` because it triggers before the component
     * is even mounted.
     *
     * @param to - RouteLocationRaw we are navigating to
     * @param from - RouteLocationRaw we are navigating from
     * @param next - function to validate, cancel or modify (by redirecting) the
     * navigation
     */
    beforeRouteEnter?: TypesConfig extends Record<'beforeRouteEnter', infer T>
      ? T
      : NavigationGuardWithThis<undefined>

    /**
     * Guard called whenever the route that renders this component has changed, but
     * it is reused for the new route. This allows you to guard for changes in
     * params, the query or the hash.
     *
     * @param to - RouteLocationRaw we are navigating to
     * @param from - RouteLocationRaw we are navigating from
     * @param next - function to validate, cancel or modify (by redirecting) the
     * navigation
     */
    beforeRouteUpdate?: TypesConfig extends Record<'beforeRouteUpdate', infer T>
      ? T
      : NavigationGuard

    /**
     * Guard called when the router is navigating away from the current route that
     * is rendering this component.
     *
     * @param to - RouteLocationRaw we are navigating to
     * @param from - RouteLocationRaw we are navigating from
     * @param next - function to validate, cancel or modify (by redirecting) the
     * navigation
     */
    beforeRouteLeave?: TypesConfig extends Record<'beforeRouteLeave', infer T>
      ? T
      : NavigationGuard
  }

  export interface ComponentCustomProperties {
    /**
     * Normalized current location. See {@link RouteLocationNormalizedLoaded}.
     */
    $route: TypesConfig extends Record<'$route', infer T>
      ? T
      : RouteLocationNormalizedLoaded
    /**
     * {@link Router} instance used by the application.
     */
    $router: TypesConfig extends Record<'$router', infer T> ? T : Router
  }

  export interface GlobalComponents {
    RouterView: TypesConfig extends Record<'RouterView', infer T>
      ? T
      : typeof RouterView
    RouterLink: TypesConfig extends Record<'RouterLink', infer T>
      ? T
      : typeof RouterLink
  }
}

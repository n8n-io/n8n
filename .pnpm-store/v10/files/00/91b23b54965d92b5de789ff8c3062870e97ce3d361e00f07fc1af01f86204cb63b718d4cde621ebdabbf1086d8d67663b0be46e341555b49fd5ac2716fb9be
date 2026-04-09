/*!
 * vue-router v4.6.4
 * (c) 2025 Eduardo San Martin Morote
 * @license MIT
 */
import { $ as RouteParamsRawGeneric, $t as RouteRecordRedirectOption, At as RouteLocationAsRelativeTyped, B as isNavigationFailure, Bt as RouteLocationNormalizedLoadedTyped, C as START_LOCATION_NORMALIZED, Ct as RouteLocation, Dt as RouteLocationAsPathTypedList, Et as RouteLocationAsPathTyped, F as RouterScrollBehavior, Ft as RouteLocationGeneric, G as RouteLocationMatched, Gt as RouteLocationResolved, H as MatcherLocation, Ht as RouteLocationNormalizedTyped, I as ErrorTypes, It as RouteLocationNormalized, J as RouteLocationPathRaw, Jt as RouteLocationResolvedTypedList, K as RouteLocationNamedRaw, Kt as RouteLocationResolvedGeneric, L as NavigationFailure, Lt as RouteLocationNormalizedGeneric, Mt as RouteLocationAsString, Nt as RouteLocationAsStringTyped, Ot as RouteLocationAsRelative, Pt as RouteLocationAsStringTypedList, Q as RouteParamsGeneric, Qt as RouteRecordNameGeneric, R as NavigationFailureType, Rt as RouteLocationNormalizedLoaded, St as NavigationHookAfter, Tt as RouteLocationAsPathGeneric, U as MatcherLocationAsPath, Ut as RouteLocationNormalizedTypedList, V as LocationAsRelativeRaw, Vt as RouteLocationNormalizedLoadedTypedList, W as RouteComponent, Wt as RouteLocationRaw, X as RouteParamValue, Xt as RouteLocationTypedList, Y as RouteMeta, Yt as RouteLocationTyped, Z as RouteParamValueRaw, Zt as RouteRecordName, _n as parseQuery, _t as NavigationGuard, an as ParamValueZeroOrOne, at as RouteRecordSingleView, bt as NavigationGuardReturn, cn as RouteMap, ct as _RouteRecordBase, d as EXPERIMENTAL_Router_Base, dn as RouteRecordInfoGeneric, dt as RouterMatcher, en as _RouteRecordProps, et as RouteQueryAndHash, fn as TypesConfig, ft as createRouterMatcher, gn as LocationQueryValueRaw, gt as RouteRecordNormalized, hn as LocationQueryValue, ht as RouteRecord, in as ParamValueZeroOrMore, it as RouteRecordRedirect, jt as RouteLocationAsRelativeTypedList, kt as RouteLocationAsRelativeGeneric, ln as RouteMapGeneric, lt as HistoryState, mn as LocationQueryRaw, mt as _PathParserOptions, nn as ParamValue, nt as RouteRecordMultipleViewsWithChildren, on as RouteParams, ot as RouteRecordSingleViewWithChildren, pn as LocationQuery, pt as PathParserOptions, q as RouteLocationOptions, qt as RouteLocationResolvedTyped, rn as ParamValueOneOrMore, rt as RouteRecordRaw, sn as RouteParamsRaw, st as _RouteLocationBase, tn as _Awaitable, tt as RouteRecordMultipleViews, u as EXPERIMENTAL_RouterOptions_Base, un as RouteRecordInfo, ut as RouterHistory, vn as stringifyQuery, vt as NavigationGuardNext, wt as RouteLocationAsPath, xt as NavigationGuardWithThis, yt as NavigationGuardNextCallback, z as NavigationRedirectError, zt as RouteLocationNormalizedLoadedGeneric } from "./router-CWoNjPRp.mjs";
import { AllowedComponentProps, AnchorHTMLAttributes, ComponentCustomProps, ComputedRef, DefineComponent, InjectionKey, MaybeRef, Ref, UnwrapRef, VNode, VNodeProps } from "vue";

//#region src/history/html5.d.ts
/**
 * Creates an HTML5 history. Most common history for single page applications.
 *
 * @param base -
 */
declare function createWebHistory(base?: string): RouterHistory;
//#endregion
//#region src/history/memory.d.ts
/**
 * Creates an in-memory based history. The main purpose of this history is to handle SSR. It starts in a special location that is nowhere.
 * It's up to the user to replace that location with the starter location by either calling `router.push` or `router.replace`.
 *
 * @param base - Base applied to all urls, defaults to '/'
 * @returns a history object that can be passed to the router constructor
 */
declare function createMemoryHistory(base?: string): RouterHistory;
//#endregion
//#region src/history/hash.d.ts
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
declare function createWebHashHistory(base?: string): RouterHistory;
//#endregion
//#region src/router.d.ts
/**
 * Options to initialize a {@link Router} instance.
 */
interface RouterOptions extends EXPERIMENTAL_RouterOptions_Base {
  /**
   * Initial list of routes that should be added to the router.
   */
  routes: Readonly<RouteRecordRaw[]>;
}
/**
 * Router instance.
 */
interface Router extends EXPERIMENTAL_Router_Base<RouteRecordNormalized> {
  /**
   * Original options object passed to create the Router
   */
  readonly options: RouterOptions;
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
   * Delete all routes from the router.
   */
  clearRoutes(): void;
}
/**
 * Creates a Router instance that can be used by a Vue app.
 *
 * @param options - {@link RouterOptions}
 */
declare function createRouter(options: RouterOptions): Router;
//#endregion
//#region src/injectionSymbols.d.ts
/**
 * RouteRecord being rendered by the closest ancestor Router View. Used for
 * `onBeforeRouteUpdate` and `onBeforeRouteLeave`. rvlm stands for Router View
 * Location Matched
 *
 * @internal
 */
declare const matchedRouteKey: InjectionKey<ComputedRef<RouteRecordNormalized | undefined>>;
/**
 * Allows overriding the router view depth to control which component in
 * `matched` is rendered. rvd stands for Router View Depth
 *
 * @internal
 */
declare const viewDepthKey: InjectionKey<Ref<number> | number>;
/**
 * Allows overriding the router instance returned by `useRouter` in tests. r
 * stands for router
 *
 * @internal
 */
declare const routerKey: InjectionKey<Router>;
/**
 * Allows overriding the current route returned by `useRoute` in tests. rl
 * stands for route location
 *
 * @internal
 */
declare const routeLocationKey: InjectionKey<RouteLocationNormalizedLoaded>;
/**
 * Allows overriding the current route used by router-view. Internally this is
 * used when the `route` prop is passed.
 *
 * @internal
 */
declare const routerViewLocationKey: InjectionKey<Ref<RouteLocationNormalizedLoaded>>;
//#endregion
//#region src/navigationGuards.d.ts
/**
 * Add a navigation guard that triggers whenever the component for the current
 * location is about to be left. Similar to {@link beforeRouteLeave} but can be
 * used in any component. The guard is removed when the component is unmounted.
 *
 * @param leaveGuard - {@link NavigationGuard}
 */
declare function onBeforeRouteLeave(leaveGuard: NavigationGuard): void;
/**
 * Add a navigation guard that triggers whenever the current location is about
 * to be updated. Similar to {@link beforeRouteUpdate} but can be used in any
 * component. The guard is removed when the component is unmounted.
 *
 * @param updateGuard - {@link NavigationGuard}
 */
declare function onBeforeRouteUpdate(updateGuard: NavigationGuard): void;
/**
 * Ensures a route is loaded, so it can be passed as o prop to `<RouterView>`.
 *
 * @param route - resolved route to load
 */
declare function loadRouteLocation(route: RouteLocation | RouteLocationNormalized): Promise<RouteLocationNormalizedLoaded>;
//#endregion
//#region src/RouterLink.d.ts
interface RouterLinkOptions {
  /**
   * Route Location the link should navigate to when clicked on.
   */
  to: RouteLocationRaw;
  /**
   * Calls `router.replace` instead of `router.push`.
   */
  replace?: boolean;
}
interface RouterLinkProps extends RouterLinkOptions {
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
 * Options passed to {@link useLink}.
 */
interface UseLinkOptions<Name extends keyof RouteMap = keyof RouteMap> {
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
interface UseLinkReturn<Name extends keyof RouteMap = keyof RouteMap> {
  route: ComputedRef<RouteLocationResolved<Name>>;
  href: ComputedRef<string>;
  isActive: ComputedRef<boolean>;
  isExactActive: ComputedRef<boolean>;
  navigate(e?: MouseEvent): Promise<void | NavigationFailure>;
}
/**
 * Returns the internal behavior of a {@link RouterLink} without the rendering part.
 *
 * @param props - a `to` location and an optional `replace` flag
 */
declare function useLink<Name extends keyof RouteMap = keyof RouteMap>(props: UseLinkOptions<Name>): UseLinkReturn<Name>;
/**
 * Component to render a link that triggers a navigation on click.
 */
declare const RouterLink: _RouterLinkI;
/**
 * @internal
 */
type _RouterLinkPropsTypedBase = AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterLinkProps;
/**
 * @internal
 */
type RouterLinkPropsTyped<Custom extends boolean | undefined> = Custom extends true ? _RouterLinkPropsTypedBase & {
  custom: true;
} : _RouterLinkPropsTypedBase & {
  custom?: false | undefined;
} & Omit<AnchorHTMLAttributes, 'href'>;
/**
 * Typed version of the `RouterLink` component. Its generic defaults to the typed router, so it can be inferred
 * automatically for JSX.
 *
 * @internal
 */
interface _RouterLinkI {
  new <Custom extends boolean | undefined = boolean | undefined>(): {
    $props: RouterLinkPropsTyped<Custom>;
    $slots: {
      default?: ({
        route,
        href,
        isActive,
        isExactActive,
        navigate
      }: UnwrapRef<UseLinkReturn>) => VNode[];
    };
  };
  /**
   * Access to `useLink()` without depending on using vue-router
   *
   * @internal
   */
  useLink: typeof useLink;
}
//#endregion
//#region src/RouterView.d.ts
interface RouterViewProps {
  name?: string;
  route?: RouteLocationNormalized;
}
/**
 * Component to display the current route the user is at.
 */
declare const RouterView: {
  new (): {
    $props: AllowedComponentProps & ComponentCustomProps & VNodeProps & RouterViewProps;
    $slots: {
      default?: ({
        Component,
        route
      }: {
        Component: VNode;
        route: RouteLocationNormalizedLoaded;
      }) => VNode[];
    };
  };
};
//#endregion
//#region src/useApi.d.ts
/**
 * Returns the router instance. Equivalent to using `$router` inside
 * templates.
 */
declare function useRouter(): Router;
/**
 * Returns the current route location. Equivalent to using `$route` inside
 * templates.
 */
declare function useRoute<Name extends keyof RouteMap = keyof RouteMap>(_name?: Name): RouteLocationNormalizedLoaded<Name | RouteMap[Name]["childrenNames"]>;
//#endregion
//#region src/index.d.ts
declare module 'vue' {
  interface ComponentCustomOptions {
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
    beforeRouteEnter?: TypesConfig extends Record<'beforeRouteEnter', infer T> ? T : NavigationGuardWithThis<undefined>;
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
    beforeRouteUpdate?: TypesConfig extends Record<'beforeRouteUpdate', infer T> ? T : NavigationGuard;
    /**
     * Guard called when the router is navigating away from the current route that
     * is rendering this component.
     *
     * @param to - RouteLocationRaw we are navigating to
     * @param from - RouteLocationRaw we are navigating from
     * @param next - function to validate, cancel or modify (by redirecting) the
     * navigation
     */
    beforeRouteLeave?: TypesConfig extends Record<'beforeRouteLeave', infer T> ? T : NavigationGuard;
  }
  interface ComponentCustomProperties {
    /**
     * Normalized current location. See {@link RouteLocationNormalizedLoaded}.
     */
    $route: TypesConfig extends Record<'$route', infer T> ? T : RouteLocationNormalizedLoaded;
    /**
     * {@link Router} instance used by the application.
     */
    $router: TypesConfig extends Record<'$router', infer T> ? T : Router;
  }
  interface GlobalComponents {
    RouterView: TypesConfig extends Record<'RouterView', infer T> ? T : typeof RouterView;
    RouterLink: TypesConfig extends Record<'RouterLink', infer T> ? T : typeof RouterLink;
  }
}
//#endregion
export { type ErrorTypes, type HistoryState, type LocationAsRelativeRaw, type LocationQuery, type LocationQueryRaw, type LocationQueryValue, type LocationQueryValueRaw, type MatcherLocation, type MatcherLocationAsPath, type NavigationFailure, NavigationFailureType, type NavigationGuard, type NavigationGuardNext, type NavigationGuardNextCallback, type NavigationGuardReturn, type NavigationGuardWithThis, type NavigationHookAfter, type NavigationRedirectError, type ParamValue, type ParamValueOneOrMore, type ParamValueZeroOrMore, type ParamValueZeroOrOne, type PathParserOptions, type RouteComponent, type RouteLocation, type RouteLocationAsPath, type RouteLocationAsPathGeneric, type RouteLocationAsPathTyped, type RouteLocationAsPathTypedList, type RouteLocationAsRelative, type RouteLocationAsRelativeGeneric, type RouteLocationAsRelativeTyped, type RouteLocationAsRelativeTypedList, type RouteLocationAsString, type RouteLocationAsStringTyped, type RouteLocationAsStringTypedList, type RouteLocationGeneric, type RouteLocationMatched, type RouteLocationNamedRaw, type RouteLocationNormalized, type RouteLocationNormalizedGeneric, type RouteLocationNormalizedLoaded, type RouteLocationNormalizedLoadedGeneric, type RouteLocationNormalizedLoadedTyped, type RouteLocationNormalizedLoadedTypedList, type RouteLocationNormalizedTyped, type RouteLocationNormalizedTypedList, type RouteLocationOptions, type RouteLocationPathRaw, type RouteLocationRaw, type RouteLocationResolved, type RouteLocationResolvedGeneric, type RouteLocationResolvedTyped, type RouteLocationResolvedTypedList, type RouteLocationTyped, type RouteLocationTypedList, type RouteMap, type RouteMapGeneric, type RouteMeta, type RouteParamValue, type RouteParamValueRaw, type RouteParams, type RouteParamsGeneric, type RouteParamsRaw, type RouteParamsRawGeneric, type RouteQueryAndHash, type RouteRecord, type RouteRecordInfo, type RouteRecordInfoGeneric, type RouteRecordMultipleViews, type RouteRecordMultipleViewsWithChildren, type RouteRecordName, type RouteRecordNameGeneric, type RouteRecordNormalized, type RouteRecordRaw, type RouteRecordRedirect, type RouteRecordRedirectOption, type RouteRecordSingleView, type RouteRecordSingleViewWithChildren, type Router, type RouterHistory, RouterLink, type RouterLinkProps, type RouterMatcher, type RouterOptions, type RouterScrollBehavior, RouterView, type RouterViewProps, START_LOCATION_NORMALIZED as START_LOCATION, type TypesConfig, type UseLinkOptions, type UseLinkReturn, type _Awaitable, type _PathParserOptions, type _RouteLocationBase, type _RouteRecordBase, type _RouteRecordProps, type _RouterLinkI, createMemoryHistory, createRouter, createRouterMatcher, createWebHashHistory, createWebHistory, isNavigationFailure, loadRouteLocation, matchedRouteKey, onBeforeRouteLeave, onBeforeRouteUpdate, parseQuery, routeLocationKey, routerKey, routerViewLocationKey, stringifyQuery, useLink, useRoute, useRouter, viewDepthKey };
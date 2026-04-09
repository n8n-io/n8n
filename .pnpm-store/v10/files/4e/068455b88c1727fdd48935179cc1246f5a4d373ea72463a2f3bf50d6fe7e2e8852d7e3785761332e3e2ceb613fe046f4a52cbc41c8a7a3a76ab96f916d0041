import * as React from 'react';
import React__default, { ReactNode, ReactElement } from 'react';

interface StoryData {
    viewMode?: string;
    storyId?: string;
    refId?: string;
}
declare const parsePath: (path: string | undefined) => StoryData;
interface Args {
    [key: string]: any;
}
declare const DEEPLY_EQUAL: unique symbol;
declare const deepDiff: (value: any, update: any) => any;
declare const buildArgsParam: (initialArgs: Args | undefined, args: Args) => string;
interface Query {
    [key: string]: any;
}
declare const queryFromLocation: (location: Partial<Location>) => Query;
declare const stringifyQuery: (query: Query) => string;
type Match$1 = {
    path: string;
};
declare const getMatch: (current: string, target: string | RegExp, startsWith?: any) => Match$1 | null;

/**
 * Actions represent the type of change to a location value.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#action
 */
declare enum Action {
    /**
     * A POP indicates a change to an arbitrary index in the history stack, such
     * as a back or forward navigation. It does not describe the direction of the
     * navigation, only that the current index changed.
     *
     * Note: This is the default action for newly created history objects.
     */
    Pop = "POP",
    /**
     * A PUSH indicates a new entry being added to the history stack, such as when
     * a link is clicked and a new page loads. When this happens, all subsequent
     * entries in the stack are lost.
     */
    Push = "PUSH",
    /**
     * A REPLACE indicates the entry at the current index in the history stack
     * being replaced by a new one.
     */
    Replace = "REPLACE"
}
/**
 * A URL pathname, beginning with a /.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.pathname
 */
declare type Pathname = string;
/**
 * A URL search string, beginning with a ?.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.search
 */
declare type Search = string;
/**
 * A URL fragment identifier, beginning with a #.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.hash
 */
declare type Hash = string;
/**
 * A unique string associated with a location. May be used to safely store
 * and retrieve data in some other storage API, like `localStorage`.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.key
 */
declare type Key = string;
/**
 * The pathname, search, and hash values of a URL.
 */
interface Path {
    /**
     * A URL pathname, beginning with a /.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.pathname
     */
    pathname: Pathname;
    /**
     * A URL search string, beginning with a ?.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.search
     */
    search: Search;
    /**
     * A URL fragment identifier, beginning with a #.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.hash
     */
    hash: Hash;
}
/**
 * An entry in a history stack. A location contains information about the
 * URL path, as well as possibly some arbitrary state and a key.
 *
 * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location
 */
interface Location$2 extends Path {
    /**
     * A value of arbitrary data associated with this location.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.state
     */
    state: unknown;
    /**
     * A unique string associated with this location. May be used to safely store
     * and retrieve data in some other storage API, like `localStorage`.
     *
     * Note: This value is always "default" on the initial location.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#location.key
     */
    key: Key;
}
/**
 * A change to the current location.
 */
interface Update {
    /**
     * The action that triggered the change.
     */
    action: Action;
    /**
     * The new location.
     */
    location: Location$2;
}
/**
 * A function that receives notifications about location changes.
 */
interface Listener {
    (update: Update): void;
}
/**
 * A change to the current location that was blocked. May be retried
 * after obtaining user confirmation.
 */
interface Transition extends Update {
    /**
     * Retries the update to the current location.
     */
    retry(): void;
}
/**
 * A function that receives transitions when navigation is blocked.
 */
interface Blocker {
    (tx: Transition): void;
}
/**
 * Describes a location that is the destination of some navigation, either via
 * `history.push` or `history.replace`. May be either a URL or the pieces of a
 * URL path.
 */
declare type To = string | Partial<Path>;
/**
 * A history is an interface to the navigation stack. The history serves as the
 * source of truth for the current location, as well as provides a set of
 * methods that may be used to change it.
 *
 * It is similar to the DOM's `window.history` object, but with a smaller, more
 * focused API.
 */
interface History {
    /**
     * The last action that modified the current location. This will always be
     * Action.Pop when a history instance is first created. This value is mutable.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.action
     */
    readonly action: Action;
    /**
     * The current location. This value is mutable.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.location
     */
    readonly location: Location$2;
    /**
     * Returns a valid href for the given `to` value that may be used as
     * the value of an <a href> attribute.
     *
     * @param to - The destination URL
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.createHref
     */
    createHref(to: To): string;
    /**
     * Pushes a new location onto the history stack, increasing its length by one.
     * If there were any entries in the stack after the current one, they are
     * lost.
     *
     * @param to - The new URL
     * @param state - Data to associate with the new location
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.push
     */
    push(to: To, state?: any): void;
    /**
     * Replaces the current location in the history stack with a new one.  The
     * location that was replaced will no longer be available.
     *
     * @param to - The new URL
     * @param state - Data to associate with the new location
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.replace
     */
    replace(to: To, state?: any): void;
    /**
     * Navigates `n` entries backward/forward in the history stack relative to the
     * current index. For example, a "back" navigation would use go(-1).
     *
     * @param delta - The delta in the stack index
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.go
     */
    go(delta: number): void;
    /**
     * Navigates to the previous entry in the stack. Identical to go(-1).
     *
     * Warning: if the current location is the first location in the stack, this
     * will unload the current document.
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.back
     */
    back(): void;
    /**
     * Navigates to the next entry in the stack. Identical to go(1).
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.forward
     */
    forward(): void;
    /**
     * Sets up a listener that will be called whenever the current location
     * changes.
     *
     * @param listener - A function that will be called when the location changes
     * @returns unlisten - A function that may be used to stop listening
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.listen
     */
    listen(listener: Listener): () => void;
    /**
     * Prevents the current location from changing and sets up a listener that
     * will be called instead.
     *
     * @param blocker - A function that will be called when a transition is blocked
     * @returns unblock - A function that may be used to stop blocking
     *
     * @see https://github.com/remix-run/history/tree/main/docs/api-reference.md#history.block
     */
    block(blocker: Blocker): () => void;
}

/**
 * A Navigator is a "location changer"; it's how you get to different locations.
 *
 * Every history instance conforms to the Navigator interface, but the
 * distinction is useful primarily when it comes to the low-level <Router> API
 * where both the location and a navigator must be provided separately in order
 * to avoid "tearing" that may occur in a suspense-enabled app if the action
 * and/or location were to be read directly from the history instance.
 */
declare type Navigator = Omit<History, "action" | "location" | "back" | "forward" | "listen" | "block">;
interface RouterProps {
    basename?: string;
    children?: React.ReactNode;
    location: Partial<Location$2> | string;
    navigationType?: Action;
    navigator: Navigator;
    static?: boolean;
}
/**
 * Provides location context for the rest of the app.
 *
 * Note: You usually won't render a <Router> directly. Instead, you'll render a
 * router that is more specific to your environment such as a <BrowserRouter>
 * in web browsers or a <StaticRouter> for server rendering.
 *
 * @see https://reactrouter.com/docs/en/v6/api#router
 */
declare function Router({ basename: basenameProp, children, location: locationProp, navigationType, navigator, static: staticProp }: RouterProps): React.ReactElement | null;
interface NavigateOptions$1 {
    replace?: boolean;
    state?: any;
}

interface BrowserRouterProps {
    basename?: string;
    children?: React.ReactNode;
    window?: Window;
}
/**
 * A <Router> for use in web browsers. Provides the cleanest URLs.
 */
declare function BrowserRouter({ basename, children, window }: BrowserRouterProps): JSX.Element;

interface Other extends StoryData {
    path: string;
    singleStory?: boolean;
}
type NavigateOptions = NavigateOptions$1 & {
    plain?: boolean;
};
type NavigateFunction = (to: To | number, options?: NavigateOptions) => void;
type RouterData = {
    location: Partial<Location$2>;
    navigate: NavigateFunction;
} & Other;
type RenderData = Pick<RouterData, 'location'> & Other;
interface LinkProps {
    to: string;
    children: ReactNode;
}

interface MatchingData {
    match: null | {
        path: string;
    };
}
interface LocationProps {
    children: (renderData: RenderData) => any;
}
interface MatchPropsStartsWith {
    path: string;
    startsWith: boolean;
    children: (matchingData: MatchingData) => ReactNode;
}
interface MatchPropsDefault {
    path: RegExp;
    startsWith: false;
    children: (matchingData: MatchingData) => ReactNode;
}
interface RoutePropsStartsWith {
    path: string;
    startsWith?: boolean;
    children: ReactNode;
}
interface RoutePropsDefault {
    path: RegExp;
    startsWith?: false;
    children: ReactNode;
}
declare const useNavigate: () => (to: To | number, { plain, ...options }?: NavigateOptions) => void;
/** A component that will navigate to a new location/path when clicked */
declare const Link: {
    ({ to, children, ...rest }: LinkProps): React__default.JSX.Element;
    displayName: string;
};
/**
 * A render-prop component where children is called with a location and will be called whenever it
 * changes
 */
declare const Location$1: {
    ({ children }: LocationProps): React__default.JSX.Element;
    displayName: string;
};
/**
 * A render-prop component for rendering when a certain path is hit. It's immensely similar to
 * `Location` but it receives an addition data property: `match`. match has a truthy value when the
 * path is hit.
 */
declare function Match(props: MatchPropsStartsWith): ReactElement;
declare function Match(props: MatchPropsDefault): ReactElement;
declare namespace Match {
    var displayName: string;
}
/** A component to conditionally render children based on matching a target path */
declare function Route(props: RoutePropsDefault): ReactElement;
declare function Route(props: RoutePropsStartsWith): ReactElement;
declare namespace Route {
    var displayName: string;
}

declare const LocationProvider: typeof BrowserRouter;
declare const BaseLocationProvider: typeof Router;

export { BaseLocationProvider, DEEPLY_EQUAL, Link, type LinkProps, Location$1 as Location, LocationProvider, Match, type NavigateFunction, type NavigateOptions, type Other, type RenderData, Route, type RouterData, type StoryData, buildArgsParam, deepDiff, getMatch, parsePath, queryFromLocation, stringifyQuery, useNavigate };

import { StoryId as StoryId$1, StoryName, ComponentTitle, Tag as Tag$1, Parameters, Args, ArgTypes, ComponentId, StoryKind, Globals as Globals$1, GlobalTypes as GlobalTypes$1, InputType, Renderer, StoryContext, PartialStoryFn, LegacyStoryFn, ArgsStoryFn, StoryFn, DecoratorFunction, LoaderFunction as LoaderFunction$1, ViewMode as ViewMode$1, StoryIdentifier, ProjectAnnotations as ProjectAnnotations$1, StrictArgTypes, StrictGlobalTypes, StepRunner, BeforeAll, ComponentAnnotations, StoryAnnotations, StoryContextForEnhancers, CleanupCallback, Canvas, StoryAnnotationsOrFn, AnnotatedStoryFn } from 'storybook/internal/csf';
export { AfterEach, AnnotatedStoryFn, ArgTypes, ArgTypesEnhancer, Args, ArgsEnhancer, ArgsFromMeta, ArgsStoryFn, BaseAnnotations, ProjectAnnotations as BaseProjectAnnotations, BeforeAll, BeforeEach, Canvas, CleanupCallback, ComponentAnnotations, ComponentId, ComponentTitle, Conditional, DecoratorApplicator, DecoratorFunction, GlobalTypes, Globals, IncludeExcludeOptions, InputType, LegacyAnnotatedStoryFn, LegacyStoryAnnotationsOrFn, LegacyStoryFn, LoaderFunction, Parameters, PartialStoryFn, PlayFunction, PlayFunctionContext, Renderer, SBArrayType, SBEnumType, SBIntersectionType, SBObjectType, SBOtherType, SBScalarType, SBType, SBUnionType, SeparatorOptions, StepFunction, StepLabel, StepRunner, StoryAnnotations, StoryAnnotationsOrFn, StoryContext, StoryContextForEnhancers, StoryContextForLoaders, StoryContextUpdate, StoryFn, StoryId, StoryIdentifier, StoryKind, StoryName, StrictArgTypes, StrictArgs, StrictGlobalTypes, StrictInputType, Tag, TestFunction } from 'storybook/internal/csf';
import { ReactElement, FC, ReactNode, PropsWithChildren } from 'react';
import { RouterData as RouterData$1 } from 'storybook/internal/router';
import { Globals, GlobalTypes, API_Layout as API_Layout$1, API_LayoutCustomisations as API_LayoutCustomisations$1, API_UI as API_UI$1, API_Notification as API_Notification$1, API_Refs as API_Refs$1, API_Settings as API_Settings$1, API_LoadedRefData as API_LoadedRefData$1, StoryId, API_PreparedStoryIndex as API_PreparedStoryIndex$1, API_ViewMode as API_ViewMode$1, API_FilterFunction as API_FilterFunction$1, API_Versions as API_Versions$2, API_UnknownEntries as API_UnknownEntries$1, API_OptionsData as API_OptionsData$1, NormalizedProjectAnnotations as NormalizedProjectAnnotations$1, ProjectAnnotations as ProjectAnnotations$2, ComposedStoryFn as ComposedStoryFn$1 } from 'storybook/internal/types';
import { ThemeVars as ThemeVars$1 } from 'storybook/theming';
import { WhatsNewData } from 'storybook/internal/core-events';
import { FileSystemCache } from 'storybook/internal/common';
import { StoryIndexGenerator } from 'storybook/internal/core-server';
import { CsfFile } from 'storybook/internal/csf-tools';
import { LogLevel } from 'storybook/internal/node-logger';
import { Server, IncomingMessage, ServerResponse } from 'http';
import { Server as Server$1 } from 'net';
import { Channel as Channel$1 } from 'storybook/internal/channels';

/**
 * Actions represent the type of change to a location value.
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
 * The pathname, search, and hash values of a URL.
 */
interface Path$1 {
    /**
     * A URL pathname, beginning with a /.
     */
    pathname: string;
    /**
     * A URL search string, beginning with a ?.
     */
    search: string;
    /**
     * A URL fragment identifier, beginning with a #.
     */
    hash: string;
}
/**
 * An entry in a history stack. A location contains information about the
 * URL path, as well as possibly some arbitrary state and a key.
 */
interface Location extends Path$1 {
    /**
     * A value of arbitrary data associated with this location.
     */
    state: any;
    /**
     * A unique string associated with this location. May be used to safely store
     * and retrieve data in some other storage API, like `localStorage`.
     *
     * Note: This value is always "default" on the initial location.
     */
    key: string;
}
/**
 * Describes a location that is the destination of some navigation, either via
 * `history.push` or `history.replace`. May be either a URL or the pieces of a
 * URL path.
 */
type To = string | Partial<Path$1>;

/**
 * Map of routeId -> data returned from a loader/action/error
 */
interface RouteData {
    [routeId: string]: any;
}
declare enum ResultType {
    data = "data",
    deferred = "deferred",
    redirect = "redirect",
    error = "error"
}
/**
 * Successful result from a loader or action
 */
interface SuccessResult {
    type: ResultType.data;
    data: any;
    statusCode?: number;
    headers?: Headers;
}
/**
 * Successful defer() result from a loader or action
 */
interface DeferredResult {
    type: ResultType.deferred;
    deferredData: DeferredData;
    statusCode?: number;
    headers?: Headers;
}
/**
 * Redirect result from a loader or action
 */
interface RedirectResult {
    type: ResultType.redirect;
    status: number;
    location: string;
    revalidate: boolean;
    reloadDocument?: boolean;
}
/**
 * Unsuccessful result from a loader or action
 */
interface ErrorResult {
    type: ResultType.error;
    error: any;
    headers?: Headers;
}
/**
 * Result from a loader or action - potentially successful or unsuccessful
 */
type DataResult = SuccessResult | DeferredResult | RedirectResult | ErrorResult;
type LowerCaseFormMethod = "get" | "post" | "put" | "patch" | "delete";
type UpperCaseFormMethod = Uppercase<LowerCaseFormMethod>;
/**
 * Active navigation/fetcher form methods are exposed in lowercase on the
 * RouterState
 */
type FormMethod = LowerCaseFormMethod;
/**
 * In v7, active navigation/fetcher form methods are exposed in uppercase on the
 * RouterState.  This is to align with the normalization done via fetch().
 */
type V7_FormMethod = UpperCaseFormMethod;
type FormEncType = "application/x-www-form-urlencoded" | "multipart/form-data" | "application/json" | "text/plain";
type JsonObject = {
    [Key in string]: JsonValue;
} & {
    [Key in string]?: JsonValue | undefined;
};
type JsonArray = JsonValue[] | readonly JsonValue[];
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
/**
 * @private
 * Internal interface to pass around for action submissions, not intended for
 * external consumption
 */
type Submission = {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: FormData;
    json: undefined;
    text: undefined;
} | {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: JsonValue;
    text: undefined;
} | {
    formMethod: FormMethod | V7_FormMethod;
    formAction: string;
    formEncType: FormEncType;
    formData: undefined;
    json: undefined;
    text: string;
};
/**
 * @private
 * Arguments passed to route loader/action functions.  Same for now but we keep
 * this as a private implementation detail in case they diverge in the future.
 */
interface DataFunctionArgs {
    request: Request;
    params: Params;
    context?: any;
}
/**
 * Arguments passed to loader functions
 */
interface LoaderFunctionArgs extends DataFunctionArgs {
}
/**
 * Arguments passed to action functions
 */
interface ActionFunctionArgs extends DataFunctionArgs {
}
/**
 * Loaders and actions can return anything except `undefined` (`null` is a
 * valid return value if there is no data to return).  Responses are preferred
 * and will ease any future migration to Remix
 */
type DataFunctionValue = Response | NonNullable<unknown> | null;
/**
 * Route loader function signature
 */
interface LoaderFunction {
    (args: LoaderFunctionArgs): Promise<DataFunctionValue> | DataFunctionValue;
}
/**
 * Route action function signature
 */
interface ActionFunction {
    (args: ActionFunctionArgs): Promise<DataFunctionValue> | DataFunctionValue;
}
/**
 * Route shouldRevalidate function signature.  This runs after any submission
 * (navigation or fetcher), so we flatten the navigation/fetcher submission
 * onto the arguments.  It shouldn't matter whether it came from a navigation
 * or a fetcher, what really matters is the URLs and the formData since loaders
 * have to re-run based on the data models that were potentially mutated.
 */
interface ShouldRevalidateFunction {
    (args: {
        currentUrl: URL;
        currentParams: AgnosticDataRouteMatch["params"];
        nextUrl: URL;
        nextParams: AgnosticDataRouteMatch["params"];
        formMethod?: Submission["formMethod"];
        formAction?: Submission["formAction"];
        formEncType?: Submission["formEncType"];
        text?: Submission["text"];
        formData?: Submission["formData"];
        json?: Submission["json"];
        actionResult?: DataResult;
        defaultShouldRevalidate: boolean;
    }): boolean;
}
/**
 * Keys we cannot change from within a lazy() function. We spread all other keys
 * onto the route. Either they're meaningful to the router, or they'll get
 * ignored.
 */
type ImmutableRouteKey = "lazy" | "caseSensitive" | "path" | "id" | "index" | "children";
type RequireOne<T, Key = keyof T> = Exclude<{
    [K in keyof T]: K extends Key ? Omit<T, K> & Required<Pick<T, K>> : never;
}[keyof T], undefined>;
/**
 * lazy() function to load a route definition, which can add non-matching
 * related properties to a route
 */
interface LazyRouteFunction<R extends AgnosticRouteObject> {
    (): Promise<RequireOne<Omit<R, ImmutableRouteKey>>>;
}
/**
 * Base RouteObject with common props shared by all types of routes
 */
type AgnosticBaseRouteObject = {
    caseSensitive?: boolean;
    path?: string;
    id?: string;
    loader?: LoaderFunction;
    action?: ActionFunction;
    hasErrorBoundary?: boolean;
    shouldRevalidate?: ShouldRevalidateFunction;
    handle?: any;
    lazy?: LazyRouteFunction<AgnosticBaseRouteObject>;
};
/**
 * Index routes must not have children
 */
type AgnosticIndexRouteObject = AgnosticBaseRouteObject & {
    children?: undefined;
    index: true;
};
/**
 * Non-index routes may have children, but cannot have index
 */
type AgnosticNonIndexRouteObject = AgnosticBaseRouteObject & {
    children?: AgnosticRouteObject[];
    index?: false;
};
/**
 * A route object represents a logical route, with (optionally) its child
 * routes organized in a tree-like structure.
 */
type AgnosticRouteObject = AgnosticIndexRouteObject | AgnosticNonIndexRouteObject;
type AgnosticDataIndexRouteObject = AgnosticIndexRouteObject & {
    id: string;
};
type AgnosticDataNonIndexRouteObject = AgnosticNonIndexRouteObject & {
    children?: AgnosticDataRouteObject[];
    id: string;
};
/**
 * A data route object, which is just a RouteObject with a required unique ID
 */
type AgnosticDataRouteObject = AgnosticDataIndexRouteObject | AgnosticDataNonIndexRouteObject;
/**
 * The parameters that were parsed from the URL path.
 */
type Params<Key extends string = string> = {
    readonly [key in Key]: string | undefined;
};
/**
 * A RouteMatch contains info about how a route matched a URL.
 */
interface AgnosticRouteMatch<ParamKey extends string = string, RouteObjectType extends AgnosticRouteObject = AgnosticRouteObject> {
    /**
     * The names and values of dynamic parameters in the URL.
     */
    params: Params<ParamKey>;
    /**
     * The portion of the URL pathname that was matched.
     */
    pathname: string;
    /**
     * The portion of the URL pathname that was matched before child routes.
     */
    pathnameBase: string;
    /**
     * The route object that was used to match.
     */
    route: RouteObjectType;
}
interface AgnosticDataRouteMatch extends AgnosticRouteMatch<string, AgnosticDataRouteObject> {
}
declare class DeferredData {
    private pendingKeysSet;
    private controller;
    private abortPromise;
    private unlistenAbortSignal;
    private subscribers;
    data: Record<string, unknown>;
    init?: ResponseInit;
    deferredKeys: string[];
    constructor(data: Record<string, unknown>, responseInit?: ResponseInit);
    private trackPromise;
    private onSettle;
    private emit;
    subscribe(fn: (aborted: boolean, settledKey?: string) => void): () => boolean;
    cancel(): void;
    resolveData(signal: AbortSignal): Promise<boolean>;
    get done(): boolean;
    get unwrappedData(): {};
    get pendingKeys(): string[];
}

/**
 * State maintained internally by the router.  During a navigation, all states
 * reflect the the "old" location unless otherwise noted.
 */
interface RouterState {
    /**
     * The action of the most recent navigation
     */
    historyAction: Action;
    /**
     * The current location reflected by the router
     */
    location: Location;
    /**
     * The current set of route matches
     */
    matches: AgnosticDataRouteMatch[];
    /**
     * Tracks whether we've completed our initial data load
     */
    initialized: boolean;
    /**
     * Current scroll position we should start at for a new view
     *  - number -> scroll position to restore to
     *  - false -> do not restore scroll at all (used during submissions)
     *  - null -> don't have a saved position, scroll to hash or top of page
     */
    restoreScrollPosition: number | false | null;
    /**
     * Indicate whether this navigation should skip resetting the scroll position
     * if we are unable to restore the scroll position
     */
    preventScrollReset: boolean;
    /**
     * Tracks the state of the current navigation
     */
    navigation: Navigation;
    /**
     * Tracks any in-progress revalidations
     */
    revalidation: RevalidationState;
    /**
     * Data from the loaders for the current matches
     */
    loaderData: RouteData;
    /**
     * Data from the action for the current matches
     */
    actionData: RouteData | null;
    /**
     * Errors caught from loaders for the current matches
     */
    errors: RouteData | null;
    /**
     * Map of current fetchers
     */
    fetchers: Map<string, Fetcher>;
    /**
     * Map of current blockers
     */
    blockers: Map<string, Blocker>;
}
/**
 * Data that can be passed into hydrate a Router from SSR
 */
type HydrationState = Partial<Pick<RouterState, "loaderData" | "actionData" | "errors">>;
type RelativeRoutingType = "route" | "path";
/**
 * Potential states for state.navigation
 */
type NavigationStates = {
    Idle: {
        state: "idle";
        location: undefined;
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        formData: undefined;
        json: undefined;
        text: undefined;
    };
    Loading: {
        state: "loading";
        location: Location;
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        text: Submission["text"] | undefined;
    };
    Submitting: {
        state: "submitting";
        location: Location;
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        formData: Submission["formData"];
        json: Submission["json"];
        text: Submission["text"];
    };
};
type Navigation = NavigationStates[keyof NavigationStates];
type RevalidationState = "idle" | "loading";
/**
 * Potential states for fetchers
 */
type FetcherStates<TData = any> = {
    Idle: {
        state: "idle";
        formMethod: undefined;
        formAction: undefined;
        formEncType: undefined;
        text: undefined;
        formData: undefined;
        json: undefined;
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
    Loading: {
        state: "loading";
        formMethod: Submission["formMethod"] | undefined;
        formAction: Submission["formAction"] | undefined;
        formEncType: Submission["formEncType"] | undefined;
        text: Submission["text"] | undefined;
        formData: Submission["formData"] | undefined;
        json: Submission["json"] | undefined;
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
    Submitting: {
        state: "submitting";
        formMethod: Submission["formMethod"];
        formAction: Submission["formAction"];
        formEncType: Submission["formEncType"];
        text: Submission["text"];
        formData: Submission["formData"];
        json: Submission["json"];
        data: TData | undefined;
        " _hasFetcherDoneAnything "?: boolean;
    };
};
type Fetcher<TData = any> = FetcherStates<TData>[keyof FetcherStates<TData>];
interface BlockerBlocked {
    state: "blocked";
    reset(): void;
    proceed(): void;
    location: Location;
}
interface BlockerUnblocked {
    state: "unblocked";
    reset: undefined;
    proceed: undefined;
    location: undefined;
}
interface BlockerProceeding {
    state: "proceeding";
    reset: undefined;
    proceed: undefined;
    location: Location;
}
type Blocker = BlockerUnblocked | BlockerBlocked | BlockerProceeding;

interface NavigateOptions$1 {
    replace?: boolean;
    state?: any;
    preventScrollReset?: boolean;
    relative?: RelativeRoutingType;
}

/**
 * NOTE: If you refactor this to split up the modules into separate files,
 * you'll need to update the rollup config for react-router-dom-v5-compat.
 */

declare global {
    var __staticRouterHydrationData: HydrationState | undefined;
}

interface StoryData {
    viewMode?: string;
    storyId?: string;
    refId?: string;
}

interface Other$1 extends StoryData {
    path: string;
    singleStory?: boolean;
}
type NavigateOptions = NavigateOptions$1 & {
    plain?: boolean;
};
type NavigateFunction = (to: To | number, options?: NavigateOptions) => void;
type RouterData = {
    location: Partial<Location>;
    navigate: NavigateFunction;
} & Other$1;
type RenderData = Pick<RouterData, 'location'> & Other$1;

interface ThemeVars extends ThemeVarsBase, ThemeVarsColors {
}
interface ThemeVarsBase {
    base: 'light' | 'dark';
}
interface ThemeVarsColors {
    colorPrimary: string;
    colorSecondary: string;
    appBg: string;
    appContentBg: string;
    appHoverBg: string;
    appPreviewBg: string;
    appBorderColor: string;
    appBorderRadius: number;
    fontBase: string;
    fontCode: string;
    textColor: string;
    textInverseColor: string;
    textMutedColor: string;
    barTextColor: string;
    barHoverColor: string;
    barSelectedColor: string;
    barBg: string;
    buttonBg: string;
    buttonBorder: string;
    booleanBg: string;
    booleanSelectedBg: string;
    inputBg: string;
    inputBorder: string;
    inputTextColor: string;
    inputBorderRadius: number;
    brandTitle?: string;
    brandUrl?: string;
    brandImage?: string;
    brandTarget?: string;
    gridCellSize?: number;
}

type ChannelHandler = (event: ChannelEvent) => void;
interface ChannelTransport {
    send(event: ChannelEvent, options?: any): void;
    setHandler(handler: ChannelHandler): void;
}
interface ChannelEvent {
    type: string;
    from: string;
    args: any[];
}
interface Listener$1 {
    (...args: any[]): void;
}
interface ChannelArgsSingle {
    transport?: ChannelTransport;
    async?: boolean;
}
interface ChannelArgsMulti {
    transports: ChannelTransport[];
    async?: boolean;
}

declare class Channel {
    readonly isAsync: boolean;
    private sender;
    private events;
    private data;
    private readonly transports;
    constructor(input: ChannelArgsMulti);
    constructor(input: ChannelArgsSingle);
    get hasTransport(): boolean;
    addListener(eventName: string, listener: Listener$1): void;
    emit(eventName: string, ...args: any): void;
    last(eventName: string): any;
    eventNames(): string[];
    listenerCount(eventName: string): number;
    listeners(eventName: string): Listener$1[] | undefined;
    once(eventName: string, listener: Listener$1): void;
    removeAllListeners(eventName?: string): void;
    removeListener(eventName: string, listener: Listener$1): void;
    on(eventName: string, listener: Listener$1): void;
    off(eventName: string, listener: Listener$1): void;
    private handleEvent;
    private onceListener;
}

interface SubState$9 {
    globals?: Globals;
    userGlobals?: Globals;
    storyGlobals?: Globals;
    globalTypes?: GlobalTypes;
}

interface SubState$8 {
    layout: API_Layout$1;
    layoutCustomisations: API_LayoutCustomisations$1;
    ui: API_UI$1;
    selectedPanel: string | undefined;
    theme: ThemeVars$1;
}

interface SubState$7 {
    notifications: API_Notification$1[];
}

interface SubState$6 {
    refs: API_Refs$1;
}

interface SubState$5 {
    settings: API_Settings$1;
}

interface SubState$4 {
    shortcuts: API_Shortcuts;
}
type API_KeyCollection = string[];
interface API_Shortcuts {
    fullScreen: API_KeyCollection;
    togglePanel: API_KeyCollection;
    panelPosition: API_KeyCollection;
    toggleNav: API_KeyCollection;
    toolbar: API_KeyCollection;
    search: API_KeyCollection;
    focusNav: API_KeyCollection;
    focusIframe: API_KeyCollection;
    focusPanel: API_KeyCollection;
    prevComponent: API_KeyCollection;
    nextComponent: API_KeyCollection;
    prevStory: API_KeyCollection;
    nextStory: API_KeyCollection;
    shortcutsPage: API_KeyCollection;
    aboutPage: API_KeyCollection;
    escape: API_KeyCollection;
    collapseAll: API_KeyCollection;
    expandAll: API_KeyCollection;
    remount: API_KeyCollection;
    openInEditor: API_KeyCollection;
    copyStoryLink: API_KeyCollection;
}

interface SubState$3 extends API_LoadedRefData$1 {
    storyId: StoryId;
    internal_index?: API_PreparedStoryIndex$1;
    viewMode: API_ViewMode$1;
    filters: Record<string, API_FilterFunction$1>;
}

interface SubState$2 {
    customQueryParams: QueryParams;
}
interface QueryParams {
    [key: string]: string | undefined;
}

interface SubState$1 {
    versions: API_Versions$2 & API_UnknownEntries$1;
    lastVersionCheck: number;
    dismissedVersionNotification: undefined | string;
}

type SubState = {
    whatsNewData?: WhatsNewData;
};

type State = SubState$8 & SubState$3 & SubState$6 & SubState$7 & SubState$1 & SubState$2 & SubState$4 & SubState$5 & SubState$9 & SubState & RouterData$1 & API_OptionsData$1 & Other;
interface Other {
    [key: string]: any;
}

type EnvironmentType = (typeof UniversalStore.Environment)[keyof typeof UniversalStore.Environment];
type StatusType = (typeof UniversalStore.Status)[keyof typeof UniversalStore.Status];
type StateUpdater<TState> = (prevState: TState) => TState;
type Actor = {
    id: string;
    type: (typeof UniversalStore.ActorType)[keyof typeof UniversalStore.ActorType];
    environment: EnvironmentType;
};
type EventInfo = {
    actor: Actor;
    forwardingActor?: Actor;
};
type Listener<TEvent> = (event: TEvent, eventInfo: EventInfo) => void;
type BaseEvent = {
    type: string;
    payload?: any;
};
interface SetStateEvent<TState> extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.SET_STATE;
    payload: {
        state: TState;
        previousState: TState;
    };
}
interface ExistingStateRequestEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.EXISTING_STATE_REQUEST;
    payload: never;
}
interface ExistingStateResponseEvent<TState> extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.EXISTING_STATE_RESPONSE;
    payload: TState;
}
interface LeaderCreatedEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.LEADER_CREATED;
    payload: never;
}
interface FollowerCreatedEvent extends BaseEvent {
    type: typeof UniversalStore.InternalEventType.FOLLOWER_CREATED;
    payload: never;
}
type InternalEvent<TState> = SetStateEvent<TState> | ExistingStateRequestEvent | ExistingStateResponseEvent<TState> | FollowerCreatedEvent | LeaderCreatedEvent;
type Event<TState, TEvent extends BaseEvent> = TEvent | InternalEvent<TState>;
type ChannelLike = Pick<Channel$1, 'on' | 'off' | 'emit'>;
type StoreOptions<TState> = {
    id: string;
    leader?: boolean;
    initialState?: TState;
    debug?: boolean;
};
type EnvironmentOverrides = {
    channel: ChannelLike;
    environment: EnvironmentType;
};

/**
 * A universal store implementation that synchronizes state across different environments using a
 * channel-based communication.
 *
 * The store follows a leader-follower pattern where:
 *
 * - Leader: The main store instance that owns and manages the state
 * - Follower: Store instances that mirror the leader's state
 *
 * Features:
 *
 * - State synchronization across environments
 * - Event-based communication
 * - Type-safe state and custom events
 * - Subscription system for state changes and custom events
 *
 * @remarks
 * - The store must be created using the static `create()` method, not the constructor
 * - Follower stores will automatically sync with their leader's state. If they have initial state, it
 *   will be replaced immediately when it has synced with the leader.
 *
 * @example
 *
 * ```typescript
 * interface MyState {
 *   count: number;
 * }
 * interface MyCustomEvent {
 *   type: 'INCREMENT';
 *   payload: number;
 * }
 *
 * // Create a leader store
 * const leaderStore = UniversalStore.create<MyState, MyCustomEvent>({
 *   id: 'my-store',
 *   leader: true,
 *   initialState: { count: 0 },
 * });
 *
 * // Create a follower store
 * const followerStore = UniversalStore.create<MyState, MyCustomEvent>({
 *   id: 'my-store',
 *   leader: false,
 * });
 * ```
 *
 * @template State - The type of state managed by the store
 * @template CustomEvent - Custom events that can be sent through the store. Must have a `type`
 *   string and optional `payload`
 * @throws {Error} If constructed directly instead of using `create()`
 * @throws {Error} If created without setting a channel first
 * @throws {Error} If a follower is created with initial state
 * @throws {Error} If a follower cannot find its leader within 1 second
 */
declare class UniversalStore<State, CustomEvent extends {
    type: string;
    payload?: any;
} = {
    type: string;
    payload?: any;
}> {
    /**
     * Defines the possible actor types in the store system
     *
     * @readonly
     */
    static readonly ActorType: {
        readonly LEADER: "LEADER";
        readonly FOLLOWER: "FOLLOWER";
    };
    /**
     * Defines the possible environments the store can run in
     *
     * @readonly
     */
    static readonly Environment: {
        readonly SERVER: "SERVER";
        readonly MANAGER: "MANAGER";
        readonly PREVIEW: "PREVIEW";
        readonly UNKNOWN: "UNKNOWN";
        readonly MOCK: "MOCK";
    };
    /**
     * Internal event types used for store synchronization
     *
     * @readonly
     */
    static readonly InternalEventType: {
        readonly EXISTING_STATE_REQUEST: "__EXISTING_STATE_REQUEST";
        readonly EXISTING_STATE_RESPONSE: "__EXISTING_STATE_RESPONSE";
        readonly SET_STATE: "__SET_STATE";
        readonly LEADER_CREATED: "__LEADER_CREATED";
        readonly FOLLOWER_CREATED: "__FOLLOWER_CREATED";
    };
    static readonly Status: {
        readonly UNPREPARED: "UNPREPARED";
        readonly SYNCING: "SYNCING";
        readonly READY: "READY";
        readonly ERROR: "ERROR";
    };
    protected static isInternalConstructing: boolean;
    /**
     * The preparation construct is used to keep track of all store's preparation state the promise is
     * resolved when the store is prepared with the static __prepare() method which will also change
     * the state from PENDING to RESOLVED
     */
    private static preparation;
    private static setupPreparationPromise;
    /** Enable debug logs for this store */
    debugging: boolean;
    /** The actor object representing the store instance with a unique ID and a type */
    get actor(): Actor;
    /**
     * The current state of the store, that signals both if the store is prepared by Storybook and
     * also - in the case of a follower - if the state has been synced with the leader's state.
     */
    get status(): StatusType;
    /**
     * A promise that resolves when the store is fully ready. A leader will be ready when the store
     * has been prepared by Storybook, which is almost instantly.
     *
     * A follower will be ready when the state has been synced with the leader's state, within a few
     * hundred milliseconds.
     */
    untilReady(): Promise<[{
        channel: ChannelLike;
        environment: EnvironmentType;
    }, void | undefined]>;
    /**
     * The syncing construct is used to keep track of if the instance's state has been synced with the
     * other instances. A leader will immediately have the promise resolved. A follower will initially
     * be in a PENDING state, and resolve the the leader has sent the existing state, or reject if no
     * leader has responded before the timeout.
     */
    private syncing?;
    private channelEventName;
    private state;
    private channel?;
    private environment?;
    private listeners;
    private id;
    private actorId;
    private actorType;
    protected constructor(options: StoreOptions<State>, environmentOverrides?: EnvironmentOverrides);
    /** Creates a new instance of UniversalStore */
    static create<State = any, CustomEvent extends {
        type: string;
        payload?: any;
    } = {
        type: string;
        payload?: any;
    }>(options: StoreOptions<State>): UniversalStore<State, CustomEvent>;
    /** Gets the current state */
    getState: () => State;
    /**
     * Updates the store's state
     *
     * Either a new state or a state updater function can be passed to the method.
     */
    setState(updater: State | StateUpdater<State>): void;
    /**
     * Subscribes to store events
     *
     * @returns A function to unsubscribe
     */
    subscribe: {
        (listener: Listener<Event<State, CustomEvent>>): () => void;
        <EventType extends Event<State, CustomEvent>['type']>(eventType: EventType, listener: Listener<Extract<Event<State, CustomEvent>, {
            type: EventType;
        }>>): () => void;
    };
    /**
     * Subscribes to state changes
     *
     * @returns Unsubscribe function
     */
    onStateChange(listener: (state: State, previousState: State, eventInfo: EventInfo) => void): () => void;
    /** Sends a custom event to the other stores */
    send: (event: CustomEvent) => void;
    private emitToChannel;
    private prepareThis;
    private emitToListeners;
    private handleChannelEvents;
    private debug;
}

/**
 * A mock universal store that can be used when testing code that relies on a universal store. It
 * functions exactly like a normal universal store, with a few exceptions:
 *
 * - It is fully isolated, meaning that it doesn't interact with any channel, and it is always a
 *   leader.
 *
 * If the second testUtils argument is provided, all the public methods are spied on, so they can be
 * asserted.
 *
 * When a mock store is re-used across tests (eg. in stories), you manually need to reset the state
 * after each test.
 *
 * @example
 *
 * ```ts
 * import * as testUtils from 'storybook/test'; // in stories
 * import { vi as testUtils } from 'vitest'; // ... or in Vitest tests
 *
 * const initialState = { ... };
 * const store = new MockUniversalStore({ initialState }, testUtils);
 *
 * export default {
 *   title: 'My story',
 *   beforeEach: () => {
 *     return () => {
 *       store.setState(initialState);
 *     };
 *   }
 * }
 * ```
 */
declare class MockUniversalStore<State, CustomEvent extends {
    type: string;
    payload?: any;
} = {
    type: string;
    payload?: any;
}> extends UniversalStore<State, CustomEvent> {
    private testUtils;
    constructor(options: StoreOptions<State>, testUtils?: any);
    /** Create a mock universal store. This is just an alias for the constructor */
    static create<State = any, CustomEvent extends {
        type: string;
        payload?: any;
    } = {
        type: string;
        payload?: any;
    }>(options: StoreOptions<State>, testUtils?: any): MockUniversalStore<State, CustomEvent>;
    unsubscribeAll(): void;
}

type StatusValue = 'status-value:pending' | 'status-value:success' | 'status-value:error' | 'status-value:warning' | 'status-value:unknown';
type StatusTypeId = string;
type StatusByTypeId = Record<StatusTypeId, Status>;
type StatusesByStoryIdAndTypeId = Record<StoryId$1, StatusByTypeId>;
interface Status {
    value: StatusValue;
    typeId: StatusTypeId;
    storyId: StoryId$1;
    title: string;
    description: string;
    data?: any;
    sidebarContextMenu?: boolean;
}
type StatusStore = {
    getAll: () => StatusesByStoryIdAndTypeId;
    set: (statuses: Status[]) => void;
    onAllStatusChange: (listener: (statuses: StatusesByStoryIdAndTypeId, previousStatuses: StatusesByStoryIdAndTypeId) => void) => () => void;
    onSelect: (listener: (selectedStatuses: Status[]) => void) => () => void;
    unset: (storyIds?: StoryId$1[]) => void;
};
type StatusStoreByTypeId = StatusStore & {
    typeId: StatusTypeId;
};
type UseStatusStore = <T = StatusesByStoryIdAndTypeId>(selector?: (statuses: StatusesByStoryIdAndTypeId) => T) => T;

type TestProviderState = 'test-provider-state:pending' | 'test-provider-state:running' | 'test-provider-state:succeeded' | 'test-provider-state:crashed';
type TestProviderId = string;
type TestProviderStateByProviderId = Record<TestProviderId, TestProviderState>;
type BaseTestProviderStore = {
    /**
     * Notifies all listeners that settings have changed for test providers. The Storybook UI will
     * highlight the test providers to tell the user that settings has changed.
     */
    settingsChanged: () => void;
    /**
     * Subscribe to clicks on the "Run All" button, that is supposed to trigger all test providers to
     * run. Your test provider should do the "main thing" when this happens, similar to when the user
     * triggers your test provider specifically.
     *
     * @example
     *
     * ```typescript
     * // Subscribe to run-all events
     * const unsubscribe = myTestProviderStore.onRunAll(() => {
     *   await runAllMyTests();
     * });
     * ```
     */
    onRunAll: (listener: () => void) => () => void;
    /**
     * Subscribe to clicks on the "Clear All" button, that is supposed to clear all state from test
     * providers. Storybook already clears all statuses, but if your test provider has more
     * non-status-based state, you can use this to clear that here.
     *
     * @remarks
     * The purpose of this is _not_ to clear your test provider's settings, only the test results.
     * @example
     *
     * ```typescript
     * // Subscribe to clear-all events
     * const unsubscribe = myTestProviderStore.onClearAll(() => {
     *   clearMyTestResults();
     * });
     *
     * // Later, when no longer needed
     * unsubscribe();
     * ```
     */
    onClearAll: (listener: () => void) => () => void;
};
/**
 * Represents a store for a specific test provider, identified by its unique ID. This store provides
 * methods to manage the state of an individual test provider, including getting and setting its
 * state, running operations with automatic state management, and accessing its unique identifier.
 *
 * Each test provider has its own instance of this store, allowing for independent state management
 * across different test providers in the application.
 *
 * @example
 *
 * ```typescript
 * // Get a store for a specific test provider
 * const grammarStore = getTestProviderStoreById('addon-grammar');
 *
 * // Check the current state
 * if (grammarStore.getState() === 'test-provider-state:pending') {
 *   console.log('Grammar tests are ready to run');
 * }
 *
 * // Run tests with automatic state management
 * grammarStore.runWithState(async () => {
 *   await runGrammarTests();
 * });
 * ```
 *
 * @see {@link TestProviderState} for possible state values
 * @see {@link BaseTestProviderStore} for methods inherited from the base store
 */
type TestProviderStoreById = BaseTestProviderStore & {
    /**
     * Gets the current state of this specific test provider
     *
     * The state represents the current execution status of the test provider, which can be one of the
     * following:
     *
     * - 'test-provider-state:pending': Tests have not been run yet
     * - 'test-provider-state:running': Tests are currently running
     * - 'test-provider-state:succeeded': Tests completed successfully
     * - 'test-provider-state:crashed': Running tests failed or encountered an error
     *
     * Storybook UI will use this state to determine what to show in the UI.
     *
     * @remarks
     * The 'test-provider-state:crashed' is meant to signify that the test run as a whole failed to
     * execute for some reason. It should _not_ be set just because a number of tests failed, use
     * statuses and the status store for that. See {@link TestStatusStore} for managing individual test
     * statuses.
     * @example
     *
     * ```typescript
     * // Get the current state of a specific test provider
     * const state = testProviderStore.getState();
     *
     * // Conditionally render UI based on the state
     * const TestStatus = () => {
     *   const state = testProviderStore.getState();
     *
     *   if (state === 'test-provider-state:running') {
     *     return <Spinner />;
     *   } else if (state === 'test-provider-state:succeeded') {
     *     return <SuccessIcon />;
     *   } else if (state === 'test-provider-state:crashed') {
     *     return <ErrorIcon />;
     *   }
     *
     *   return <PendingIcon />;
     * };
     * ```
     */
    getState: () => TestProviderState;
    /**
     * Sets the state of this specific test provider
     *
     * This method allows you to manually update the execution state of the test provider. It's
     * typically used when you need to reflect the current status of test execution in the UI or when
     * you want to programmatically control the test provider's state.
     *
     * Common use cases include:
     *
     * - Setting to 'running' when tests start
     * - Setting to 'succeeded' when tests complete successfully
     * - Setting to 'crashed' when tests fail or encounter errors
     * - Setting to 'pending' to reset the state
     *
     * The state represents the current execution status of the test provider, which can be one of the
     * following:
     *
     * - 'test-provider-state:pending': Tests have not been run yet
     * - 'test-provider-state:running': Tests are currently running
     * - 'test-provider-state:succeeded': Tests completed successfully
     * - 'test-provider-state:crashed': Running tests failed or encountered an error
     *
     * Storybook UI will use this state to determine what to show in the UI.
     *
     * @remarks
     * The 'test-provider-state:crashed' is meant to signify that the test run as a whole failed to
     * execute for some reason. It should _not_ be set just because a number of tests failed, use
     * statuses and the status store for that. See {@link TestStatusStore} for managing individual test
     * statuses.
     *
     * For most use cases, consider using {@link runWithState} instead, which provides automatic state
     * management and error handling during test execution.
     * @example
     *
     * ```typescript
     * // Update the state when tests start running
     * const startTests = async () => {
     *   testProviderStore.setState('test-provider-state:running');
     *   ... run tests ...
     * };
     * ```
     */
    setState: (state: TestProviderState) => void;
    /**
     * Runs a callback and automatically updates the test provider's state with running, succeeded or
     * crashed, depending on the end result.
     *
     * - Immediately changes the state to 'running'
     * - If the callback returns/resolves, change the state to 'succeeded'.
     * - If the callback throws an error/rejects, change the state to 'crashed'.
     *
     * This approach helps prevent state inconsistencies that might occur if exceptions are thrown
     * during test execution.
     *
     * @example
     *
     * ```typescript
     * // Run tests with automatic state management
     * const runTests = () => {
     *   testProviderStore.runWithState(async () => {
     *     // The state is automatically set to 'running' before this callback
     *
     *     // Run tests here...
     *     const results = await executeTests();
     *   });
     * };
     * ```
     */
    runWithState: (callback: () => void | Promise<void>) => Promise<void>;
    /** The unique identifier for this test provider */
    testProviderId: TestProviderId;
};
/**
 * React OR preview hook for accessing the state of _all_ test providers. This hook will only
 * trigger a re-render when the state changes. It is recommended to pass the optional selector, to
 * get more fine-grained control of re-renders.
 *
 * @example
 *
 * ```typescript
 * const TestStatus = () => {
 *   const state = useTestProviderStore((state) => state['my-test-provider']);
 * };
 * ```
 */
type UseTestProviderStore = <T = TestProviderStateByProviderId>(
/**
 * Optional selector function to extract or transform specific parts of the state
 *
 * @example
 *
 * ```typescript
 * // Use the entire state
 * const allProviderStates = useTestProviderStore();
 *
 * // Get state for a specific provider
 * const myProviderState = useTestProviderStore((state) => state['my-test-provider']);
 *
 * // Get a count of providers in each state
 * const statusCounts = useTestProviderStore((state) => {
 *   const counts = {
 *     pending: 0,
 *     running: 0,
 *     succeeded: 0,
 *     crashed: 0,
 *   };
 *
 *   Object.values(state).forEach((status) => {
 *     if (status === 'test-provider-state:pending') counts.pending++;
 *     else if (status === 'test-provider-state:running') counts.running++;
 *     else if (status === 'test-provider-state:succeeded') counts.succeeded++;
 *     else if (status === 'test-provider-state:crashed') counts.crashed++;
 *   });
 *
 *   return counts;
 * });
 *
 * // Check if all tests have completed
 * const allTestsCompleted = useTestProviderStore((state) => {
 *   return Object.values(state).every(
 *     (status) =>
 *       status === 'test-provider-state:succeeded' ||
 *       status === 'test-provider-state:crashed'
 *   );
 * });
 * ```
 */
selector?: (state: TestProviderStateByProviderId) => T) => T;

interface Options$1 {
    allowRegExp: boolean;
    allowSymbol: boolean;
    allowDate: boolean;
    allowUndefined: boolean;
    allowError: boolean;
    maxDepth: number;
    space: number | undefined;
}

/**
Matches any [primitive value](https://developer.mozilla.org/en-US/docs/Glossary/Primitive).

@category Type
*/
type Primitive =
	| null
	| undefined
	| string
	| number
	| boolean
	| symbol
	| bigint;

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

/**
Allows creating a union type by combining primitive types and literal types without sacrificing auto-completion in IDEs for the literal type part of the union.

Currently, when a union type of a primitive type is combined with literal types, TypeScript loses all information about the combined literals. Thus, when such type is used in an IDE with autocompletion, no suggestions are made for the declared literals.

This type is a workaround for [Microsoft/TypeScript#29729](https://github.com/Microsoft/TypeScript/issues/29729). It will be removed as soon as it's not needed anymore.

@example
```
import type {LiteralUnion} from 'type-fest';

// Before

type Pet = 'dog' | 'cat' | string;

const pet: Pet = '';
// Start typing in your TypeScript-enabled IDE.
// You **will not** get auto-completion for `dog` and `cat` literals.

// After

type Pet2 = LiteralUnion<'dog' | 'cat', string>;

const pet: Pet2 = '';
// You **will** get auto-completion for `dog` and `cat` literals.
```

@category Type
*/
type LiteralUnion<
	LiteralType,
	BaseType extends Primitive,
> = LiteralType | (BaseType & Record<never, never>);

declare namespace PackageJson$1 {
	/**
	A person who has been involved in creating or maintaining the package.
	*/
	export type Person =
		| string
		| {
			name: string;
			url?: string;
			email?: string;
		};

	export type BugsLocation =
		| string
		| {
			/**
			The URL to the package's issue tracker.
			*/
			url?: string;

			/**
			The email address to which issues should be reported.
			*/
			email?: string;
		};

	export interface DirectoryLocations {
		[directoryType: string]: unknown;

		/**
		Location for executable scripts. Sugar to generate entries in the `bin` property by walking the folder.
		*/
		bin?: string;

		/**
		Location for Markdown files.
		*/
		doc?: string;

		/**
		Location for example scripts.
		*/
		example?: string;

		/**
		Location for the bulk of the library.
		*/
		lib?: string;

		/**
		Location for man pages. Sugar to generate a `man` array by walking the folder.
		*/
		man?: string;

		/**
		Location for test files.
		*/
		test?: string;
	}

	export type Scripts = {
		/**
		Run **before** the package is published (Also run on local `npm install` without any arguments).
		*/
		prepublish?: string;

		/**
		Run both **before** the package is packed and published, and on local `npm install` without any arguments. This is run **after** `prepublish`, but **before** `prepublishOnly`.
		*/
		prepare?: string;

		/**
		Run **before** the package is prepared and packed, **only** on `npm publish`.
		*/
		prepublishOnly?: string;

		/**
		Run **before** a tarball is packed (on `npm pack`, `npm publish`, and when installing git dependencies).
		*/
		prepack?: string;

		/**
		Run **after** the tarball has been generated and moved to its final destination.
		*/
		postpack?: string;

		/**
		Run **after** the package is published.
		*/
		publish?: string;

		/**
		Run **after** the package is published.
		*/
		postpublish?: string;

		/**
		Run **before** the package is installed.
		*/
		preinstall?: string;

		/**
		Run **after** the package is installed.
		*/
		install?: string;

		/**
		Run **after** the package is installed and after `install`.
		*/
		postinstall?: string;

		/**
		Run **before** the package is uninstalled and before `uninstall`.
		*/
		preuninstall?: string;

		/**
		Run **before** the package is uninstalled.
		*/
		uninstall?: string;

		/**
		Run **after** the package is uninstalled.
		*/
		postuninstall?: string;

		/**
		Run **before** bump the package version and before `version`.
		*/
		preversion?: string;

		/**
		Run **before** bump the package version.
		*/
		version?: string;

		/**
		Run **after** bump the package version.
		*/
		postversion?: string;

		/**
		Run with the `npm test` command, before `test`.
		*/
		pretest?: string;

		/**
		Run with the `npm test` command.
		*/
		test?: string;

		/**
		Run with the `npm test` command, after `test`.
		*/
		posttest?: string;

		/**
		Run with the `npm stop` command, before `stop`.
		*/
		prestop?: string;

		/**
		Run with the `npm stop` command.
		*/
		stop?: string;

		/**
		Run with the `npm stop` command, after `stop`.
		*/
		poststop?: string;

		/**
		Run with the `npm start` command, before `start`.
		*/
		prestart?: string;

		/**
		Run with the `npm start` command.
		*/
		start?: string;

		/**
		Run with the `npm start` command, after `start`.
		*/
		poststart?: string;

		/**
		Run with the `npm restart` command, before `restart`. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		prerestart?: string;

		/**
		Run with the `npm restart` command. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		restart?: string;

		/**
		Run with the `npm restart` command, after `restart`. Note: `npm restart` will run the `stop` and `start` scripts if no `restart` script is provided.
		*/
		postrestart?: string;
	} & Partial<Record<string, string>>;

	/**
	Dependencies of the package. The version range is a string which has one or more space-separated descriptors. Dependencies can also be identified with a tarball or Git URL.
	*/
	export type Dependency = Partial<Record<string, string>>;

	/**
	Conditions which provide a way to resolve a package entry point based on the environment.
	*/
	export type ExportCondition = LiteralUnion<
		| 'import'
		| 'require'
		| 'node'
		| 'node-addons'
		| 'deno'
		| 'browser'
		| 'electron'
		| 'react-native'
		| 'default',
		string
	>;

	type ExportConditions = {[condition in ExportCondition]: Exports};

	/**
	Entry points of a module, optionally with conditions and subpath exports.
	*/
	export type Exports =
	| null
	| string
	| Array<string | ExportConditions>
	| ExportConditions
	| {[path: string]: Exports}; // eslint-disable-line @typescript-eslint/consistent-indexed-object-style

	/**
	Import map entries of a module, optionally with conditions.
	*/
	export type Imports = { // eslint-disable-line @typescript-eslint/consistent-indexed-object-style
		[key: string]: string | {[key in ExportCondition]: Exports};
	};

	export interface NonStandardEntryPoints {
		/**
		An ECMAScript module ID that is the primary entry point to the program.
		*/
		module?: string;

		/**
		A module ID with untranspiled code that is the primary entry point to the program.
		*/
		esnext?:
		| string
		| {
			[moduleName: string]: string | undefined;
			main?: string;
			browser?: string;
		};

		/**
		A hint to JavaScript bundlers or component tools when packaging modules for client side use.
		*/
		browser?:
		| string
		| Partial<Record<string, string | false>>;

		/**
		Denote which files in your project are "pure" and therefore safe for Webpack to prune if unused.

		[Read more.](https://webpack.js.org/guides/tree-shaking/)
		*/
		sideEffects?: boolean | string[];
	}

	export interface TypeScriptConfiguration {
		/**
		Location of the bundled TypeScript declaration file.
		*/
		types?: string;

		/**
		Version selection map of TypeScript.
		*/
		typesVersions?: Partial<Record<string, Partial<Record<string, string[]>>>>;

		/**
		Location of the bundled TypeScript declaration file. Alias of `types`.
		*/
		typings?: string;
	}

	/**
	An alternative configuration for Yarn workspaces.
	*/
	export interface WorkspaceConfig {
		/**
		An array of workspace pattern strings which contain the workspace packages.
		*/
		packages?: WorkspacePattern[];

		/**
		Designed to solve the problem of packages which break when their `node_modules` are moved to the root workspace directory - a process known as hoisting. For these packages, both within your workspace, and also some that have been installed via `node_modules`, it is important to have a mechanism for preventing the default Yarn workspace behavior. By adding workspace pattern strings here, Yarn will resume non-workspace behavior for any package which matches the defined patterns.

		[Read more](https://classic.yarnpkg.com/blog/2018/02/15/nohoist/)
		*/
		nohoist?: WorkspacePattern[];
	}

	/**
	A workspace pattern points to a directory or group of directories which contain packages that should be included in the workspace installation process.

	The patterns are handled with [minimatch](https://github.com/isaacs/minimatch).

	@example
	`docs` → Include the docs directory and install its dependencies.
	`packages/*` → Include all nested directories within the packages directory, like `packages/cli` and `packages/core`.
	*/
	type WorkspacePattern = string;

	export interface YarnConfiguration {
		/**
		Used to configure [Yarn workspaces](https://classic.yarnpkg.com/docs/workspaces/).

		Workspaces allow you to manage multiple packages within the same repository in such a way that you only need to run `yarn install` once to install all of them in a single pass.

		Please note that the top-level `private` property of `package.json` **must** be set to `true` in order to use workspaces.
		*/
		workspaces?: WorkspacePattern[] | WorkspaceConfig;

		/**
		If your package only allows one version of a given dependency, and you’d like to enforce the same behavior as `yarn install --flat` on the command-line, set this to `true`.

		Note that if your `package.json` contains `"flat": true` and other packages depend on yours (e.g. you are building a library rather than an app), those other packages will also need `"flat": true` in their `package.json` or be installed with `yarn install --flat` on the command-line.
		*/
		flat?: boolean;

		/**
		Selective version resolutions. Allows the definition of custom package versions inside dependencies without manual edits in the `yarn.lock` file.
		*/
		resolutions?: Dependency;
	}

	export interface JSPMConfiguration {
		/**
		JSPM configuration.
		*/
		jspm?: PackageJson$1;
	}

	/**
	Type for [npm's `package.json` file](https://docs.npmjs.com/creating-a-package-json-file). Containing standard npm properties.
	*/
	export interface PackageJsonStandard {
		/**
		The name of the package.
		*/
		name?: string;

		/**
		Package version, parseable by [`node-semver`](https://github.com/npm/node-semver).
		*/
		version?: string;

		/**
		Package description, listed in `npm search`.
		*/
		description?: string;

		/**
		Keywords associated with package, listed in `npm search`.
		*/
		keywords?: string[];

		/**
		The URL to the package's homepage.
		*/
		homepage?: LiteralUnion<'.', string>;

		/**
		The URL to the package's issue tracker and/or the email address to which issues should be reported.
		*/
		bugs?: BugsLocation;

		/**
		The license for the package.
		*/
		license?: string;

		/**
		The licenses for the package.
		*/
		licenses?: Array<{
			type?: string;
			url?: string;
		}>;

		author?: Person;

		/**
		A list of people who contributed to the package.
		*/
		contributors?: Person[];

		/**
		A list of people who maintain the package.
		*/
		maintainers?: Person[];

		/**
		The files included in the package.
		*/
		files?: string[];

		/**
		Resolution algorithm for importing ".js" files from the package's scope.

		[Read more.](https://nodejs.org/api/esm.html#esm_package_json_type_field)
		*/
		type?: 'module' | 'commonjs';

		/**
		The module ID that is the primary entry point to the program.
		*/
		main?: string;

		/**
		Subpath exports to define entry points of the package.

		[Read more.](https://nodejs.org/api/packages.html#subpath-exports)
		*/
		exports?: Exports;

		/**
		Subpath imports to define internal package import maps that only apply to import specifiers from within the package itself.

		[Read more.](https://nodejs.org/api/packages.html#subpath-imports)
		*/
		imports?: Imports;

		/**
		The executable files that should be installed into the `PATH`.
		*/
		bin?:
		| string
		| Partial<Record<string, string>>;

		/**
		Filenames to put in place for the `man` program to find.
		*/
		man?: string | string[];

		/**
		Indicates the structure of the package.
		*/
		directories?: DirectoryLocations;

		/**
		Location for the code repository.
		*/
		repository?:
		| string
		| {
			type: string;
			url: string;

			/**
			Relative path to package.json if it is placed in non-root directory (for example if it is part of a monorepo).

			[Read more.](https://github.com/npm/rfcs/blob/latest/implemented/0010-monorepo-subdirectory-declaration.md)
			*/
			directory?: string;
		};

		/**
		Script commands that are run at various times in the lifecycle of the package. The key is the lifecycle event, and the value is the command to run at that point.
		*/
		scripts?: Scripts;

		/**
		Is used to set configuration parameters used in package scripts that persist across upgrades.
		*/
		config?: Record<string, unknown>;

		/**
		The dependencies of the package.
		*/
		dependencies?: Dependency;

		/**
		Additional tooling dependencies that are not required for the package to work. Usually test, build, or documentation tooling.
		*/
		devDependencies?: Dependency;

		/**
		Dependencies that are skipped if they fail to install.
		*/
		optionalDependencies?: Dependency;

		/**
		Dependencies that will usually be required by the package user directly or via another dependency.
		*/
		peerDependencies?: Dependency;

		/**
		Indicate peer dependencies that are optional.
		*/
		peerDependenciesMeta?: Partial<Record<string, {optional: true}>>;

		/**
		Package names that are bundled when the package is published.
		*/
		bundledDependencies?: string[];

		/**
		Alias of `bundledDependencies`.
		*/
		bundleDependencies?: string[];

		/**
		Engines that this package runs on.
		*/
		engines?: {
			[EngineName in 'npm' | 'node' | string]?: string;
		};

		/**
		@deprecated
		*/
		engineStrict?: boolean;

		/**
		Operating systems the module runs on.
		*/
		os?: Array<LiteralUnion<
		| 'aix'
		| 'darwin'
		| 'freebsd'
		| 'linux'
		| 'openbsd'
		| 'sunos'
		| 'win32'
		| '!aix'
		| '!darwin'
		| '!freebsd'
		| '!linux'
		| '!openbsd'
		| '!sunos'
		| '!win32',
		string
		>>;

		/**
		CPU architectures the module runs on.
		*/
		cpu?: Array<LiteralUnion<
		| 'arm'
		| 'arm64'
		| 'ia32'
		| 'mips'
		| 'mipsel'
		| 'ppc'
		| 'ppc64'
		| 's390'
		| 's390x'
		| 'x32'
		| 'x64'
		| '!arm'
		| '!arm64'
		| '!ia32'
		| '!mips'
		| '!mipsel'
		| '!ppc'
		| '!ppc64'
		| '!s390'
		| '!s390x'
		| '!x32'
		| '!x64',
		string
		>>;

		/**
		If set to `true`, a warning will be shown if package is installed locally. Useful if the package is primarily a command-line application that should be installed globally.

		@deprecated
		*/
		preferGlobal?: boolean;

		/**
		If set to `true`, then npm will refuse to publish it.
		*/
		private?: boolean;

		/**
		A set of config values that will be used at publish-time. It's especially handy to set the tag, registry or access, to ensure that a given package is not tagged with 'latest', published to the global public registry or that a scoped module is private by default.
		*/
		publishConfig?: PublishConfig;

		/**
		Describes and notifies consumers of a package's monetary support information.

		[Read more.](https://github.com/npm/rfcs/blob/latest/accepted/0017-add-funding-support.md)
		*/
		funding?: string | {
			/**
			The type of funding.
			*/
			type?: LiteralUnion<
			| 'github'
			| 'opencollective'
			| 'patreon'
			| 'individual'
			| 'foundation'
			| 'corporation',
			string
			>;

			/**
			The URL to the funding page.
			*/
			url: string;
		};
	}

	export interface PublishConfig {
		/**
		Additional, less common properties from the [npm docs on `publishConfig`](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#publishconfig).
		*/
		[additionalProperties: string]: unknown;

		/**
		When publishing scoped packages, the access level defaults to restricted. If you want your scoped package to be publicly viewable (and installable) set `--access=public`. The only valid values for access are public and restricted. Unscoped packages always have an access level of public.
		*/
		access?: 'public' | 'restricted';

		/**
		The base URL of the npm registry.

		Default: `'https://registry.npmjs.org/'`
		*/
		registry?: string;

		/**
		The tag to publish the package under.

		Default: `'latest'`
		*/
		tag?: string;
	}
}

/**
Type for [npm's `package.json` file](https://docs.npmjs.com/creating-a-package-json-file). Also includes types for fields used by other popular projects, like TypeScript and Yarn.

@category File
*/
type PackageJson$1 =
PackageJson$1.PackageJsonStandard &
PackageJson$1.NonStandardEntryPoints &
PackageJson$1.TypeScriptConfiguration &
PackageJson$1.YarnConfiguration &
PackageJson$1.JSPMConfiguration;

declare enum SupportedBuilder {
    WEBPACK5 = "webpack5",
    VITE = "vite",
    RSBUILD = "rsbuild"
}

declare enum SupportedFramework {
    ANGULAR = "angular",
    EMBER = "ember",
    HTML_VITE = "html-vite",
    NEXTJS = "nextjs",
    NEXTJS_VITE = "nextjs-vite",
    PREACT_VITE = "preact-vite",
    REACT_NATIVE_WEB_VITE = "react-native-web-vite",
    REACT_VITE = "react-vite",
    REACT_WEBPACK5 = "react-webpack5",
    SERVER_WEBPACK5 = "server-webpack5",
    SVELTE_VITE = "svelte-vite",
    SVELTEKIT = "sveltekit",
    VUE3_VITE = "vue3-vite",
    WEB_COMPONENTS_VITE = "web-components-vite",
    HTML_RSBUILD = "html-rsbuild",
    NUXT = "nuxt",
    QWIK = "qwik",
    REACT_RSBUILD = "react-rsbuild",
    SOLID = "solid",
    VUE3_RSBUILD = "vue3-rsbuild",
    WEB_COMPONENTS_RSBUILD = "web-components-rsbuild"
}

type ExportName = string;
type MetaId = string;
interface StoriesSpecifier {
    /** When auto-titling, what to prefix all generated titles with (default: '') */
    titlePrefix?: string;
    /** Where to start looking for story files */
    directory: string;
    /**
     * What does the filename of a story file look like? (a glob, relative to directory, no leading
     * `./`) If unset, we use `** / *.@(mdx|stories.@(mdx|js|jsx|mjs|ts|tsx))` (no spaces)
     */
    files?: string;
}
type StoriesEntry = string | StoriesSpecifier;
type NormalizedStoriesSpecifier = Required<StoriesSpecifier> & {
    importPathMatcher: RegExp;
};
interface IndexerOptions {
    makeTitle: (userTitle?: string) => string;
}
interface IndexedStory {
    id: string;
    name: string;
    tags?: Tag$1[];
    parameters?: Parameters;
}
interface IndexedCSFFile {
    meta: {
        id?: string;
        title?: string;
        tags?: Tag$1[];
    };
    stories: IndexedStory[];
}
/**
 * FIXME: This is a temporary type to allow us to deprecate the old indexer API. We should remove
 * this type and the deprecated indexer API in 8.0.
 */
type BaseIndexer = {
    /** A regular expression that should match all files to be handled by this indexer */
    test: RegExp;
};
/**
 * An indexer describes which filenames it handles, and how to index each individual file - turning
 * it into an entry in the index.
 */
type Indexer = BaseIndexer & {
    /**
     * Indexes a file containing stories or docs.
     *
     * @param fileName The name of the file to index.
     * @param options {@link IndexerOptions} for indexing the file.
     * @returns A promise that resolves to an array of {@link IndexInput} objects.
     */
    createIndex: (fileName: string, options: IndexerOptions) => Promise<IndexInput[]>;
};
interface BaseIndexEntry {
    id: StoryId$1;
    name: StoryName;
    title: ComponentTitle;
    tags?: Tag$1[];
    importPath: Path;
}
type StoryIndexEntry = BaseIndexEntry & {
    type: 'story';
    subtype: 'story' | 'test';
    componentPath?: string;
    exportName?: string;
    parent?: StoryId$1;
    parentName?: StoryName;
};
type DocsIndexEntry = BaseIndexEntry & {
    storiesImports: Path[];
    type: 'docs';
};
type IndexEntry = StoryIndexEntry | DocsIndexEntry;
interface IndexInputStats {
    loaders?: boolean;
    play?: boolean;
    tests?: boolean;
    render?: boolean;
    storyFn?: boolean;
    mount?: boolean;
    beforeEach?: boolean;
    moduleMock?: boolean;
    globals?: boolean;
    factory?: boolean;
    tags?: boolean;
}
/** The base input for indexing a story or docs entry. */
type BaseIndexInput = {
    /** The file to import from e.g. the story file. */
    importPath: Path;
    /** The raw path/package of the file that provides meta.component, if one exists */
    rawComponentPath?: Path;
    /** The name of the export to import. */
    exportName: ExportName;
    /** The name of the entry, auto-generated from {@link exportName} if unspecified. */
    name?: StoryName;
    /** The location in the sidebar, auto-generated from {@link importPath} if unspecified. */
    title?: ComponentTitle;
    /**
     * The custom id optionally set at `meta.id` if it needs to differ from the id generated via
     * {@link title}. If unspecified, the meta id will be auto-generated from {@link title}. If
     * specified, the meta in the CSF file _must_ have a matching id set at `meta.id`, to be correctly
     * matched.
     */
    metaId?: MetaId;
    /** Tags for filtering entries in Storybook and its tools. */
    tags?: Tag$1[];
    /**
     * The id of the entry, auto-generated from {@link title}/{@link metaId} and {@link exportName} if
     * unspecified. If specified, the story in the CSF file _must_ have a matching id set at
     * `parameters.__id`, to be correctly matched. Only use this if you need to override the
     * auto-generated id.
     */
    __id?: StoryId$1;
    /** Stats about language feature usage that the indexer can optionally report */
    __stats?: IndexInputStats;
};
/** The input for indexing a story entry. */
type StoryIndexInput = BaseIndexInput & {
    type: 'story';
    subtype?: 'story' | 'test';
    parent?: StoryId$1;
    parentName?: StoryName;
};
/** The input for indexing a docs entry. */
type DocsIndexInput = BaseIndexInput & {
    type: 'docs';
    /** Paths to story files that must be pre-loaded for this docs entry. */
    storiesImports?: Path[];
};
type IndexInput = StoryIndexInput | DocsIndexInput;
interface V3CompatIndexEntry extends Omit<StoryIndexEntry, 'type' | 'tags' | 'subtype'> {
    kind: ComponentTitle;
    story: StoryName;
    parameters: Parameters;
}
interface StoryIndexV2 {
    v: number;
    stories: Record<StoryId$1, Omit<V3CompatIndexEntry, 'title' | 'name' | 'importPath'> & {
        name?: StoryName;
    }>;
}
interface StoryIndexV3 {
    v: number;
    stories: Record<StoryId$1, V3CompatIndexEntry>;
}
interface StoryIndex {
    v: number;
    entries: Record<StoryId$1, IndexEntry>;
}

declare enum SupportedRenderer {
    REACT = "react",
    REACT_NATIVE = "react-native",
    VUE3 = "vue3",
    ANGULAR = "angular",
    EMBER = "ember",
    PREACT = "preact",
    SVELTE = "svelte",
    QWIK = "qwik",
    HTML = "html",
    WEB_COMPONENTS = "web-components",
    SERVER = "server",
    SOLID = "solid",
    NUXT = "nuxt"
}

/** ⚠️ This file contains internal WIP types they MUST NOT be exported outside this package for now! */
type BuilderName = 'webpack5' | '@storybook/builder-webpack5' | string;
type RendererName = string;
interface ServerChannel {
    emit(type: string, args?: any): void;
}
interface CoreConfig {
    builder?: BuilderName | {
        name: BuilderName;
        options?: Record<string, any>;
    };
    renderer?: RendererName;
    disableWebpackDefaults?: boolean;
    channelOptions?: Partial<Options$1>;
    /** Disables the generation of project.json, a file containing Storybook metadata */
    disableProjectJson?: boolean;
    /**
     * Disables Storybook telemetry
     *
     * @see https://storybook.js.org/telemetry
     */
    disableTelemetry?: boolean;
    /** Disables notifications for Storybook updates. */
    disableWhatsNewNotifications?: boolean;
    /**
     * Enable crash reports to be sent to Storybook telemetry
     *
     * @see https://storybook.js.org/telemetry
     */
    enableCrashReports?: boolean;
    /**
     * Enable CORS headings to run document in a "secure context" see:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements
     * This enables these headers in development-mode: Cross-Origin-Opener-Policy: same-origin
     *
     * ```text
     * Cross-Origin-Embedder-Policy: require-corp
     * ```
     */
    crossOriginIsolated?: boolean;
}
interface DirectoryMapping {
    from: string;
    to: string;
}
interface Presets {
    apply(extension: 'typescript', config: TypescriptOptions, args?: Options): Promise<TypescriptOptions>;
    apply(extension: 'framework', config?: {}, args?: any): Promise<Preset>;
    apply(extension: 'babel', config?: {}, args?: any): Promise<any>;
    apply(extension: 'swc', config?: {}, args?: any): Promise<any>;
    apply(extension: 'entries', config?: [], args?: any): Promise<unknown>;
    apply(extension: 'env', config?: {}, args?: any): Promise<any>;
    apply(extension: 'stories', config?: [], args?: any): Promise<StoriesEntry[]>;
    apply(extension: 'managerEntries', config: [], args?: any): Promise<string[]>;
    apply(extension: 'refs', config?: [], args?: any): Promise<StorybookConfigRaw['refs']>;
    apply(extension: 'core', config?: StorybookConfigRaw['core'], args?: any): Promise<NonNullable<StorybookConfigRaw['core']>>;
    apply(extension: 'docs', config?: StorybookConfigRaw['docs'], args?: any): Promise<NonNullable<StorybookConfigRaw['docs']>>;
    apply(extension: 'features', config?: StorybookConfigRaw['features'], args?: any): Promise<NonNullable<StorybookConfigRaw['features']>>;
    apply(extension: 'typescript', config?: StorybookConfigRaw['typescript'], args?: any): Promise<NonNullable<StorybookConfigRaw['typescript']>>;
    apply(extension: 'build', config?: StorybookConfigRaw['build'], args?: any): Promise<NonNullable<StorybookConfigRaw['build']>>;
    apply(extension: 'staticDirs', config?: StorybookConfigRaw['staticDirs'], args?: any): Promise<StorybookConfigRaw['staticDirs']>;
    /** The second and third parameter are not needed. And make type inference easier. */
    apply<T extends keyof StorybookConfigRaw>(extension: T): Promise<StorybookConfigRaw[T]>;
    apply<T>(extension: string, config?: T, args?: unknown): Promise<T>;
}
interface LoadedPreset {
    name: string;
    preset: any;
    options: any;
}
type PresetConfig = string | {
    name: string;
    options?: unknown;
};
interface Ref {
    id: string;
    url: string;
    title: string;
    version: string;
    type?: string;
    disable?: boolean;
}
interface VersionCheck {
    success: boolean;
    cached: boolean;
    data?: any;
    error?: any;
    time: number;
}
interface Stats {
    toJson: () => any;
}
interface BuilderResult {
    totalTime?: ReturnType<typeof process.hrtime>;
    stats?: Stats;
}
type PackageJson = PackageJson$1 & Record<string, any>;
interface LoadOptions {
    pnp?: boolean;
    packageJson?: PackageJson;
    outputDir?: string;
    configDir?: string;
    cacheKey?: string;
    ignorePreview?: boolean;
    extendServer?: (server: Server) => void;
}
interface CLIBaseOptions {
    disableTelemetry?: boolean;
    enableCrashReports?: boolean;
    configDir?: string;
    loglevel?: LogLevel;
    logfile?: string | boolean;
    quiet?: boolean;
}
interface CLIOptions extends CLIBaseOptions {
    port?: number;
    ignorePreview?: boolean;
    previewUrl?: string;
    forceBuildPreview?: boolean;
    host?: string;
    initialPath?: string;
    exactPort?: boolean;
    https?: boolean;
    sslCa?: string[];
    sslCert?: string;
    sslKey?: string;
    smokeTest?: boolean;
    managerCache?: boolean;
    open?: boolean;
    ci?: boolean;
    versionUpdates?: boolean;
    docs?: boolean;
    test?: boolean;
    debugWebpack?: boolean;
    webpackStatsJson?: string | boolean;
    statsJson?: string | boolean;
    outputDir?: string;
    previewOnly?: boolean;
}
interface BuilderOptions {
    configType?: 'DEVELOPMENT' | 'PRODUCTION';
    ignorePreview?: boolean;
    cache?: FileSystemCache;
    configDir: string;
    docsMode?: boolean;
    features?: StorybookConfigRaw['features'];
    versionCheck?: VersionCheck;
    disableWebpackDefaults?: boolean;
    serverChannelUrl?: string;
    networkAddress?: string;
}
interface StorybookConfigOptions {
    presets: Presets;
    presetsList?: LoadedPreset[];
}
type Options = LoadOptions & StorybookConfigOptions & CLIOptions & BuilderOptions & {
    build?: TestBuildConfig;
};
type Middleware<T extends IncomingMessage = IncomingMessage> = (req: T & IncomingMessage, res: ServerResponse, next: (err?: string | Error) => Promise<void> | void) => Promise<void> | void;
interface ServerApp<T extends IncomingMessage = IncomingMessage> {
    server: Server$1;
    use(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    use(...handlers: Middleware<T>[]): this;
    get(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    post(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    put(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    patch(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    delete(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    head(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    options(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    connect(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
    trace(pattern: RegExp | string, ...handlers: Middleware<T>[]): this;
}
interface Builder<Config, BuilderStats extends Stats = Stats> {
    getConfig: (options: Options) => Promise<Config>;
    start: (args: {
        options: Options;
        startTime: ReturnType<typeof process.hrtime>;
        router: ServerApp;
        server: Server;
        channel: ServerChannel;
    }) => Promise<void | {
        stats?: BuilderStats;
        totalTime: ReturnType<typeof process.hrtime>;
        bail: (e?: Error) => Promise<void>;
    }>;
    build: (arg: {
        options: Options;
        startTime: ReturnType<typeof process.hrtime>;
    }) => Promise<void | BuilderStats>;
    bail: (e?: Error) => Promise<void>;
    corePresets?: string[];
    overridePresets?: string[];
}
/** Options for TypeScript usage within Storybook. */
interface TypescriptOptions {
    /**
     * Enables type checking within Storybook.
     *
     * @default false
     */
    check: boolean;
    /**
     * Disable parsing TypeScript files through compiler.
     *
     * @default false
     */
    skipCompiler: boolean;
}
type Preset = string | {
    name: string;
    options?: any;
};
/** An additional script that gets injected into the preview or the manager, */
type Entry = string;
type CoreCommon_StorybookRefs = Record<string, {
    title: string;
    url: string;
} | {
    disable: boolean;
    expanded?: boolean;
}>;
type DocsOptions = {
    /** What should we call the generated docs entries? */
    defaultName?: string;
    /** Only show doc entries in the side bar (usually set with the `--docs` CLI flag) */
    docsMode?: boolean;
};
interface TestBuildFlags {
    /**
     * The package @storybook/blocks will be excluded from the bundle, even when imported in e.g. the
     * preview.
     */
    disableBlocks?: boolean;
    /** Disable specific addons */
    disabledAddons?: string[];
    /** Filter out .mdx stories entries */
    disableMDXEntries?: boolean;
    /** Override autodocs to be disabled */
    disableAutoDocs?: boolean;
    /** Override docgen to be disabled. */
    disableDocgen?: boolean;
    /** Override sourcemaps generation to be disabled. */
    disableSourcemaps?: boolean;
    /** Override tree-shaking (dead code elimination) to be disabled. */
    disableTreeShaking?: boolean;
    /** Minify with ESBuild when using webpack. */
    esbuildMinify?: boolean;
}
interface TestBuildConfig {
    test?: TestBuildFlags;
}
type Tag = string;
interface TagOptions {
    /** Visually include or exclude stories with this tag in the sidebar by default */
    defaultFilterSelection?: 'include' | 'exclude';
    excludeFromSidebar: boolean;
    excludeFromDocsStories: boolean;
}
type TagsOptions = Record<Tag, Partial<TagOptions>>;
interface ComponentManifest {
    id: string;
    path: string;
    name: string;
    description?: string;
    import?: string;
    summary?: string;
    stories: {
        name: string;
        snippet?: string;
        description?: string;
        summary?: string;
        error?: {
            name: string;
            message: string;
        };
    }[];
    jsDocTags: Record<string, string[]>;
    error?: {
        name: string;
        message: string;
    };
}
interface ComponentsManifest {
    v: number;
    components: Record<string, ComponentManifest>;
}
type ComponentManifestGenerator = (storyIndexGenerator: StoryIndexGenerator) => Promise<ComponentsManifest>;
type CsfEnricher = (csf: CsfFile, csfSource: CsfFile) => Promise<void>;
interface StorybookConfigRaw {
    /**
     * Sets the addons you want to use with Storybook.
     *
     * @example
     *
     * ```ts
     * addons = ['@storybook/addon-essentials'];
     * addons = [{ name: '@storybook/addon-essentials', options: { backgrounds: false } }];
     * ```
     */
    addons?: Preset[];
    core?: CoreConfig;
    experimental_componentManifestGenerator?: ComponentManifestGenerator;
    experimental_enrichCsf?: CsfEnricher;
    staticDirs?: (DirectoryMapping | string)[];
    logLevel?: string;
    features?: {
        /**
         * Enable the integrated viewport addon
         *
         * @default true
         */
        viewport?: boolean;
        /**
         * Enable the integrated highlight addon
         *
         * @default true
         */
        highlight?: boolean;
        /**
         * Enable the integrated backgrounds addon
         *
         * @default true
         */
        backgrounds?: boolean;
        /**
         * Enable the integrated measure addon
         *
         * @default true
         */
        measure?: boolean;
        /**
         * Enable the integrated outline addon
         *
         * @default true
         */
        outline?: boolean;
        /**
         * Enable the integrated controls addon
         *
         * @default true
         */
        controls?: boolean;
        /**
         * Enable the integrated interactions addon
         *
         * @default true
         */
        interactions?: boolean;
        /**
         * Enable the integrated actions addon
         *
         * @default true
         */
        actions?: boolean;
        /**
         * @temporary This feature flag is a migration assistant, and is scheduled to be removed.
         *
         * Filter args with a "target" on the type from the render function (EXPERIMENTAL)
         */
        argTypeTargetsV7?: boolean;
        /**
         * @temporary This feature flag is a migration assistant, and is scheduled to be removed.
         *
         * Apply decorators from preview.js before decorators from addons or frameworks
         */
        legacyDecoratorFileOrder?: boolean;
        /**
         * @temporary This feature flag is a migration assistant, and is scheduled to be removed.
         *
         * Disallow implicit actions during rendering. This will be the default in Storybook 8.
         *
         * This will make sure that your story renders the same no matter if docgen is enabled or not.
         */
        disallowImplicitActionsInRenderV8?: boolean;
        /**
         * @temporary This feature flag is a migration assistant, and is scheduled to be removed.
         *
         * Enable asynchronous component rendering in React renderer
         */
        experimentalRSC?: boolean;
        /**
         * @temporary This feature flag is a migration assistant, and is scheduled to be removed.
         *
         * Set NODE_ENV to development in built Storybooks for better testability and debuggability
         */
        developmentModeForBuild?: boolean;
        /** Only show input controls in Angular */
        angularFilterNonInputControls?: boolean;
        experimentalComponentsManifest?: boolean;
        /**
         * Enables the new code example generation for React components. You can see those examples when
         * clicking on the "Show code" button in the Storybook UI.
         *
         * We refactored the code examples by reading the actual source file. This should make the code
         * examples a lot faster, more readable and more accurate. They are not dynamic though, it won't
         * change if you change when using the control panel.
         *
         * @default false
         * @experimental This feature is in early development and may change significantly in future releases.
         */
        experimentalCodeExamples?: boolean;
    };
    build?: TestBuildConfig;
    stories: StoriesEntry[];
    framework?: Preset;
    typescript?: Partial<TypescriptOptions>;
    refs?: CoreCommon_StorybookRefs;
    babel?: any;
    swc?: any;
    env?: Record<string, string>;
    babelDefault?: any;
    previewAnnotations?: Entry[];
    experimental_indexers?: Indexer[];
    experimental_devServer?: ServerApp;
    docs?: DocsOptions;
    previewHead?: string;
    previewBody?: string;
    previewMainTemplate?: string;
    managerHead?: string;
    tags?: TagsOptions;
}
/**
 * The interface for Storybook configuration in `main.ts` files. This interface is public All values
 * should be wrapped with `PresetValue<>`, though there are a few exceptions: `addons`, `framework`
 */
interface StorybookConfig {
    /**
     * Sets the addons you want to use with Storybook.
     *
     * @example
     *
     * ```
     * addons = ['@storybook/addon-essentials'];
     * addons = [{ name: '@storybook/addon-essentials', options: { backgrounds: false } }];
     * ```
     */
    addons?: StorybookConfigRaw['addons'];
    core?: PresetValue<StorybookConfigRaw['core']>;
    /**
     * Sets a list of directories of static files to be loaded by Storybook server
     *
     * @example
     *
     * ```ts
     * staticDirs = ['./public'];
     * staticDirs = [{ from: './public', to: '/assets' }];
     * ```
     */
    staticDirs?: PresetValue<StorybookConfigRaw['staticDirs']>;
    logLevel?: PresetValue<StorybookConfigRaw['logLevel']>;
    features?: PresetValue<StorybookConfigRaw['features']>;
    build?: PresetValue<StorybookConfigRaw['build']>;
    /**
     * Tells Storybook where to find stories.
     *
     * @example
     *
     * ```ts
     * stories = ['./src/*.stories.@(j|t)sx?'];
     * stories = async () => [...(await myCustomStoriesEntryBuilderFunc())];
     * ```
     */
    stories: PresetValue<StorybookConfigRaw['stories']>;
    /** Framework, e.g. '@storybook/react-vite', required in v7 */
    framework?: StorybookConfigRaw['framework'];
    /** Controls how Storybook handles TypeScript files. */
    typescript?: PresetValue<StorybookConfigRaw['typescript']>;
    /** References external Storybooks */
    refs?: PresetValue<StorybookConfigRaw['refs']>;
    /** Modify or return babel config. */
    babel?: PresetValue<StorybookConfigRaw['babel']>;
    /** Modify or return swc config. */
    swc?: PresetValue<StorybookConfigRaw['swc']>;
    /** Modify or return env config. */
    env?: PresetValue<StorybookConfigRaw['env']>;
    /** Modify or return babel config. */
    babelDefault?: PresetValue<StorybookConfigRaw['babelDefault']>;
    /** Add additional scripts to run in the preview a la `.storybook/preview.js` */
    previewAnnotations?: PresetValue<StorybookConfigRaw['previewAnnotations']>;
    /** Process CSF files for the story index. */
    experimental_indexers?: PresetValue<StorybookConfigRaw['experimental_indexers']>;
    /** Docs related features in index generation */
    docs?: PresetValue<StorybookConfigRaw['docs']>;
    /**
     * Programmatically modify the preview head/body HTML. The previewHead and previewBody functions
     * accept a string, which is the existing head/body, and return a modified string.
     */
    previewHead?: PresetValue<StorybookConfigRaw['previewHead']>;
    previewBody?: PresetValue<StorybookConfigRaw['previewBody']>;
    /**
     * Programmatically override the preview's main page template. This should return a reference to a
     * file containing an `.ejs` template that will be interpolated with environment variables.
     *
     * @example
     *
     * ```ts
     * previewMainTemplate = '.storybook/index.ejs';
     * ```
     */
    previewMainTemplate?: PresetValue<StorybookConfigRaw['previewMainTemplate']>;
    /**
     * Programmatically modify the preview head/body HTML. The managerHead function accept a string,
     * which is the existing head content, and return a modified string.
     */
    managerHead?: PresetValue<StorybookConfigRaw['managerHead']>;
    /** Configure non-standard tag behaviors */
    tags?: PresetValue<StorybookConfigRaw['tags']>;
}
type PresetValue<T> = T | ((config: T, options: Options) => T | Promise<T>);
type PresetProperty<K, TStorybookConfig = StorybookConfigRaw> = TStorybookConfig[K extends keyof TStorybookConfig ? K : never] | PresetPropertyFn<K, TStorybookConfig>;
type PresetPropertyFn<K, TStorybookConfig = StorybookConfigRaw, TOptions = {}> = (config: TStorybookConfig[K extends keyof TStorybookConfig ? K : never], options: Options & TOptions) => TStorybookConfig[K extends keyof TStorybookConfig ? K : never] | Promise<TStorybookConfig[K extends keyof TStorybookConfig ? K : never]>;
interface CoreCommon_ResolvedAddonPreset {
    type: 'presets';
    name: string;
}
type PreviewAnnotation = string | {
    bare: string;
    absolute: string;
};
interface CoreCommon_ResolvedAddonVirtual {
    type: 'virtual';
    name: string;
    managerEntries?: string[];
    previewAnnotations?: PreviewAnnotation[];
    presets?: (string | {
        name: string;
        options?: any;
    })[];
}
type CoreCommon_OptionsEntry = {
    name: string;
};
type CoreCommon_AddonEntry = string | CoreCommon_OptionsEntry;
type CoreCommon_AddonInfo = {
    name: string;
    inEssentials: boolean;
};
interface CoreCommon_StorybookInfo {
    addons: string[];
    versionSpecifier?: string;
    framework?: SupportedFramework;
    renderer?: SupportedRenderer;
    builder?: SupportedBuilder;
    rendererPackage?: string;
    frameworkPackage?: string;
    builderPackage?: string;
    configDir?: string;
    mainConfig: StorybookConfigRaw;
    mainConfigPath?: string;
    previewConfigPath?: string;
    managerConfigPath?: string;
}
/**
 * Given a generic string type, returns that type but ensures that a string in general is compatible
 * with it. We use this construct to ensure that IDEs can provide better autocompletion for string
 * types. This is, for example, needed for main config fields, where we want to ensure that the user
 * can provide a custom string, but also a string that is compatible with the type.
 *
 * @example
 *
 * ```ts
 * type Framework = CompatibleString<'@storybook/nextjs'>;
 * const framework: Framework = '@storybook/nextjs'; // valid and will be autocompleted const framework: Framework =
 * path.dirname(require.resolve(path.join('@storybook/nextjs', 'package.json'))); // valid
 * ```
 */
type CompatibleString<T extends string> = T | (string & {});

interface API_BaseEntry {
    id: StoryId$1;
    depth: number;
    name: string;
    tags: Tag$1[];
    refId?: string;
    renderLabel?: (item: API_HashEntry, api: any) => any;
}
interface API_RootEntry extends API_BaseEntry {
    type: 'root';
    startCollapsed?: boolean;
    children: StoryId$1[];
}
interface API_GroupEntry extends API_BaseEntry {
    type: 'group';
    parent?: StoryId$1;
    children: StoryId$1[];
}
interface API_ComponentEntry extends API_BaseEntry {
    type: 'component';
    parent?: StoryId$1;
    children: StoryId$1[];
    importPath?: Path;
}
interface API_DocsEntry extends API_BaseEntry {
    type: 'docs';
    parent: StoryId$1;
    title: ComponentTitle;
    importPath: Path;
    prepared: boolean;
    parameters?: {
        [parameterName: string]: any;
    };
}
interface API_StoryEntry extends API_BaseEntry {
    type: 'story';
    subtype: 'story';
    parent: StoryId$1;
    title: ComponentTitle;
    importPath: Path;
    exportName: string;
    prepared: boolean;
    parameters?: {
        [parameterName: string]: any;
    };
    args?: Args;
    argTypes?: ArgTypes;
    initialArgs?: Args;
    children?: StoryId$1[];
}
interface API_TestEntry extends Omit<API_StoryEntry, 'subtype' | 'children'> {
    subtype: 'test';
}
type API_LeafEntry = API_DocsEntry | API_StoryEntry | API_TestEntry;
type API_HashEntry = API_RootEntry | API_GroupEntry | API_ComponentEntry | API_DocsEntry | API_StoryEntry | API_TestEntry;
/**
 * The `IndexHash` is our manager-side representation of the `StoryIndex`. We create entries in the
 * hash not only for each story or docs entry, but also for each "group" of the component (split on
 * '/'), as that's how things are manipulated in the manager (i.e. in the sidebar)
 */
interface API_IndexHash {
    [id: string]: API_HashEntry;
}
type API_PreparedIndexEntry = IndexEntry & {
    parameters?: Parameters;
    argTypes?: ArgTypes;
    args?: Args;
    initialArgs?: Args;
};
interface API_PreparedStoryIndex {
    v: number;
    entries: Record<StoryId$1, API_PreparedIndexEntry>;
}
type API_OptionsData = {
    docsOptions: DocsOptions;
};
interface API_ReleaseNotes {
    success?: boolean;
    currentVersion?: string;
    showOnFirstLaunch?: boolean;
}
interface API_Settings {
    lastTrackedStoryId: string;
}
interface API_Version {
    version: string;
    info?: {
        plain: string;
    };
    [key: string]: any;
}
interface API_UnknownEntries {
    [key: string]: {
        [key: string]: any;
    };
}
interface API_Versions$1 {
    latest?: API_Version;
    next?: API_Version;
    current?: API_Version;
}
type API_FilterFunction = (item: API_PreparedIndexEntry & {
    statuses: StatusByTypeId;
}) => boolean;

interface SetStoriesStory {
    id: StoryId$1;
    name: string;
    refId?: string;
    componentId?: ComponentId;
    kind: StoryKind;
    parameters: {
        fileName: string;
        options: {
            [optionName: string]: any;
        };
        docsOnly?: boolean;
        viewMode?: API_ViewMode;
        [parameterName: string]: any;
    };
    argTypes?: ArgTypes;
    args?: Args;
    initialArgs?: Args;
}
interface SetStoriesStoryData {
    [id: string]: SetStoriesStory;
}
type SetStoriesPayload = {
    v: 2;
    error?: Error;
    globals: Args;
    globalParameters: Parameters;
    stories: SetStoriesStoryData;
    kindParameters: {
        [kind: string]: Parameters;
    };
} | ({
    v?: number;
    stories: SetStoriesStoryData;
} & Record<string, never>);
interface SetGlobalsPayload {
    globals: Globals$1;
    globalTypes: GlobalTypes$1;
}
interface GlobalsUpdatedPayload {
    initialGlobals: Globals$1;
    userGlobals: Globals$1;
    storyGlobals: Globals$1;
    globals: Globals$1;
}
interface StoryPreparedPayload {
    id: StoryId$1;
    parameters: Parameters;
    argTypes: ArgTypes;
    initialArgs: Args;
    args: Args;
}
interface DocsPreparedPayload {
    id: StoryId$1;
    parameters: Parameters;
}

type OrString$1<T extends string> = T | (string & {});
type API_ViewMode = OrString$1<'story' | 'docs' | 'settings'> | undefined;
type API_RenderOptions = Addon_RenderOptions;
interface API_RouteOptions {
    storyId: string;
    viewMode: API_ViewMode;
    location: RenderData['location'];
    path: string;
}
interface API_MatchOptions {
    storyId: string;
    viewMode: API_ViewMode;
    location: RenderData['location'];
    path: string;
}
type API_StateMerger<S> = (input: S) => S;
interface API_ProviderData<API> {
    provider: API_Provider<API>;
    docsOptions: DocsOptions;
}
interface API_Provider<API> {
    channel?: Channel;
    renderPreview?: API_IframeRenderer;
    handleAPI(api: API): void;
    getConfig(): {
        sidebar?: API_SidebarOptions<API>;
        theme?: ThemeVars;
        StoryMapper?: API_StoryMapper;
        [k: string]: any;
    } & Partial<API_UIOptions>;
    [key: string]: any;
}
type API_IframeRenderer = (storyId: string, viewMode: API_ViewMode, id: string, baseUrl: string, scale: number, queryParams: Record<string, any>) => ReactElement<any, any> | null;
interface API_UIOptions {
    name?: string;
    url?: string;
    goFullScreen: boolean;
    showStoriesPanel: boolean;
    showAddonPanel: boolean;
    addonPanelInRight: boolean;
    theme?: ThemeVars;
    selectedPanel?: string;
}
interface API_Layout {
    initialActive: API_ActiveTabsType;
    navSize: number;
    bottomPanelHeight: number;
    rightPanelWidth: number;
    /**
     * The sizes of the panels when they were last visible used to restore the sizes when the panels
     * are shown again eg. when toggling fullscreen, panels, etc.
     */
    recentVisibleSizes: {
        navSize: number;
        bottomPanelHeight: number;
        rightPanelWidth: number;
    };
    panelPosition: API_PanelPositions;
    showTabs: boolean;
    showToolbar: boolean;
}
interface API_LayoutCustomisations {
    showPanel?: (state: State, defaultValue: boolean) => boolean | undefined;
    showSidebar?: (state: State, defaultValue: boolean) => boolean | undefined;
    showToolbar?: (state: State, defaultValue: boolean) => boolean | undefined;
}
interface API_UI {
    name?: string;
    url?: string;
    enableShortcuts: boolean;
}
type API_PanelPositions = 'bottom' | 'right';
type API_ActiveTabsType = 'sidebar' | 'canvas' | 'addons';
interface API_SidebarOptions<API = any> {
    showRoots?: boolean;
    filters?: Record<string, API_FilterFunction>;
    collapsedRoots?: string[];
    renderLabel?: (item: API_HashEntry, api: API) => any;
}
interface OnClearOptions {
    /** `true` when the user manually dismissed the notification. */
    dismissed: boolean;
    /** `true` when the notification timed out after the set duration. */
    timeout: boolean;
}
interface OnClickOptions {
    /** Function to dismiss the notification. */
    onDismiss: () => void;
}
interface API_Notification {
    id: string;
    content: {
        headline: string;
        subHeadline?: string | any;
    };
    duration?: number;
    link?: string;
    icon?: React.ReactNode;
    onClear?: (options: OnClearOptions) => void;
    onClick?: (options: OnClickOptions) => void;
}
type API_Versions = Record<string, string>;
type API_SetRefData = Partial<API_ComposedRef & {
    setStoriesData: SetStoriesStoryData;
    storyIndex: StoryIndex;
}>;
type API_StoryMapper = (ref: API_ComposedRef, story: SetStoriesStory) => SetStoriesStory;
interface API_LoadedRefData {
    index?: API_IndexHash;
    filteredIndex?: API_IndexHash;
    indexError?: Error;
    previewInitialized: boolean;
}
interface API_ComposedRef extends API_LoadedRefData {
    id: string;
    title?: string;
    url: string;
    type?: 'auto-inject' | 'unknown' | 'lazy' | 'server-checked';
    expanded?: boolean;
    versions?: API_Versions;
    loginUrl?: string;
    version?: string;
    sourceUrl?: string;
    /** DO NOT USE THIS */
    internal_index?: StoryIndex;
}
type API_ComposedRefUpdate = Partial<Pick<API_ComposedRef, 'title' | 'type' | 'expanded' | 'index' | 'filteredIndex' | 'versions' | 'loginUrl' | 'version' | 'indexError' | 'previewInitialized' | 'sourceUrl' | 'internal_index'>>;
type API_Refs = Record<string, API_ComposedRef>;
type API_RefId = string;
type API_RefUrl = string;

type Addon_Types = Exclude<Addon_TypesEnum, Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_TEST_PROVIDER>;
interface Addon_ArgType<TArg = unknown> extends InputType {
    defaultValue?: TArg;
}
type Addons_ArgTypes<TArgs = Args> = {
    [key in keyof Partial<TArgs>]: Addon_ArgType<TArgs[key]>;
} & {
    [key in string]: Addon_ArgType<unknown>;
};
type Addon_Comparator<T> = ((a: T, b: T) => boolean) | ((a: T, b: T) => number);
type Addon_StorySortMethod = 'configure' | 'alphabetical';
interface Addon_StorySortObjectParameter {
    method?: Addon_StorySortMethod;
    order?: any[];
    locales?: string;
    includeNames?: boolean;
}
type IndexEntryLegacy = [StoryId$1, any, Parameters, Parameters];
type Addon_StorySortComparator = Addon_Comparator<IndexEntryLegacy>;
type Addon_StorySortParameter = Addon_StorySortComparator | Addon_StorySortObjectParameter;
type Addon_StorySortComparatorV7 = Addon_Comparator<IndexEntry>;
type Addon_StorySortParameterV7 = Addon_StorySortComparatorV7 | Addon_StorySortObjectParameter;
interface Addon_OptionsParameter extends Object {
    storySort?: Addon_StorySortParameter;
    theme?: {
        base: string;
        brandTitle?: string;
    };
    [key: string]: any;
}
interface Addon_OptionsParameterV7 extends Object {
    storySort?: Addon_StorySortParameterV7;
    theme?: {
        base: string;
        brandTitle?: string;
    };
    [key: string]: any;
}
type Addon_StoryContext<TRenderer extends Renderer = Renderer> = StoryContext<TRenderer>;
type Addon_StoryContextUpdate = Partial<Addon_StoryContext>;
interface Addon_ReturnTypeFramework<ReturnType> extends Renderer {
    component: any;
    storyResult: ReturnType;
    canvasElement: any;
}
type Addon_PartialStoryFn<ReturnType = unknown> = PartialStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_LegacyStoryFn<ReturnType = unknown> = LegacyStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_ArgsStoryFn<ReturnType = unknown> = ArgsStoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_StoryFn<ReturnType = unknown> = StoryFn<Addon_ReturnTypeFramework<ReturnType>>;
type Addon_DecoratorFunction<StoryFnReturnType = unknown> = DecoratorFunction<Addon_ReturnTypeFramework<StoryFnReturnType>>;
type Addon_LoaderFunction = LoaderFunction$1<Addon_ReturnTypeFramework<unknown>>;
interface Addon_WrapperSettings {
    options: object;
    parameters: {
        [key: string]: any;
    };
}
type Addon_StoryWrapper = (storyFn: Addon_LegacyStoryFn, context: Addon_StoryContext, settings: Addon_WrapperSettings) => any;
type Addon_MakeDecoratorResult = (...args: any) => any;
interface Addon_AddStoryArgs<StoryFnReturnType = unknown> {
    id: StoryId$1;
    kind: StoryKind;
    name: StoryName;
    storyFn: Addon_StoryFn<StoryFnReturnType>;
    parameters: Parameters;
}
type Addon_ClientApiAddon<StoryFnReturnType = unknown> = Addon_Type & {
    apply: (a: Addon_StoryApi<StoryFnReturnType>, b: any[]) => any;
};
interface Addon_ClientApiAddons<StoryFnReturnType> {
    [key: string]: Addon_ClientApiAddon<StoryFnReturnType>;
}
type Addon_ClientApiReturnFn<StoryFnReturnType = unknown> = (...args: any[]) => Addon_StoryApi<StoryFnReturnType>;
interface Addon_StoryApi<StoryFnReturnType = unknown> {
    kind: StoryKind;
    add: (storyName: StoryName, storyFn: Addon_StoryFn<StoryFnReturnType>, parameters?: Parameters) => Addon_StoryApi<StoryFnReturnType>;
    addDecorator: (decorator: Addon_DecoratorFunction<StoryFnReturnType>) => Addon_StoryApi<StoryFnReturnType>;
    addLoader: (decorator: Addon_LoaderFunction) => Addon_StoryApi<StoryFnReturnType>;
    addParameters: (parameters: Parameters) => Addon_StoryApi<StoryFnReturnType>;
    [k: string]: string | Addon_ClientApiReturnFn<StoryFnReturnType>;
}
interface Addon_ClientStoryApi<StoryFnReturnType = unknown> {
}
type Addon_LoadFn = () => any;
type Addon_RequireContext = any;
type Addon_Loadable = Addon_RequireContext | [Addon_RequireContext] | Addon_LoadFn;
type Addon_BaseDecorators<StoryFnReturnType> = Array<(story: () => StoryFnReturnType, context: Addon_StoryContext) => StoryFnReturnType>;
interface Addon_BaseAnnotations<TArgs, StoryFnReturnType, TRenderer extends Renderer = Renderer> {
    /**
     * Dynamic data that are provided (and possibly updated by) Storybook and its addons.
     *
     * @see [Arg story inputs](https://storybook.js.org/docs/api/csf#args-story-inputs)
     */
    args?: Partial<TArgs>;
    /**
     * ArgTypes encode basic metadata for args, such as `name`, `description`, `defaultValue` for an
     * arg. These get automatically filled in by Storybook Docs.
     *
     * @see [Arg types](https://storybook.js.org/docs/api/arg-types)
     */
    argTypes?: Addons_ArgTypes<TArgs>;
    /**
     * Custom metadata for a story.
     *
     * @see [Parameters](https://storybook.js.org/docs/writing-stories/parameters)
     */
    parameters?: Parameters;
    /**
     * Wrapper components or Storybook decorators that wrap a story.
     *
     * Decorators defined in Meta will be applied to every story variation.
     *
     * @see [Decorators](https://storybook.js.org/docs/writing-stories/decorators)
     */
    decorators?: Addon_BaseDecorators<StoryFnReturnType>;
    /**
     * Define a custom render function for the story(ies). If not passed, a default render function by
     * the framework will be used.
     */
    render?: (args: TArgs, context: Addon_StoryContext<TRenderer>) => StoryFnReturnType;
    /** Function that is executed after the story is rendered. */
    play?: (context: Addon_StoryContext<TRenderer>) => Promise<void> | void;
}
interface Addon_Annotations<TArgs, StoryFnReturnType> extends Addon_BaseAnnotations<TArgs, StoryFnReturnType> {
    /**
     * Used to only include certain named exports as stories. Useful when you want to have non-story
     * exports such as mock data or ignore a few stories.
     *
     * @example
     *
     * ```ts
     * includeStories: ['SimpleStory', 'ComplexStory'];
     * includeStories: /.*Story$/;
     * ```
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    includeStories?: string[] | RegExp;
    /**
     * Used to exclude certain named exports. Useful when you want to have non-story exports such as
     * mock data or ignore a few stories.
     *
     * @example
     *
     * ```ts
     * excludeStories: ['simpleData', 'complexData'];
     * excludeStories: /.*Data$/;
     * ```
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    excludeStories?: string[] | RegExp;
}
interface Addon_BaseMeta<ComponentType> {
    /**
     * Title of the story which will be presented in the navigation. **Should be unique.**
     *
     * Stories can be organized in a nested structure using "/" as a separator.
     *
     * Since CSF 3.0 this property is optional.
     *
     * @example
     *
     * ```ts
     * export default { title: 'Design System/Atoms/Button' };
     * ```
     *
     * @see [Story Hierarchy](https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy)
     */
    title?: string;
    /**
     * Manually set the id of a story, which in particular is useful if you want to rename stories
     * without breaking permalinks.
     *
     * Storybook will prioritize the id over the title for ID generation, if provided, and will
     * prioritize the story.storyName over the export key for display.
     *
     * @see [Sidebar and URLs](https://storybook.js.org/docs/configure/user-interface/sidebar-and-urls#permalink-to-stories)
     */
    id?: string;
    /**
     * The primary component for your story.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     */
    component?: ComponentType;
    /**
     * Auxiliary sub-components that are part of the stories.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     *
     * @example
     *
     * ```ts
     * import { Button, ButtonGroup } from './components';
     *
     * export default {
     *   subcomponents: { Button, ButtonGroup },
     * };
     * ```
     *
     * By defining them each component will have its tab in the args table.
     */
    subcomponents?: Record<string, ComponentType>;
}
type Addon_BaseStoryObject<TArgs, StoryFnReturnType> = {
    /** Override the display name in the UI */
    storyName?: string;
};
type Addon_BaseStoryFn<TArgs, StoryFnReturnType> = {
    (args: TArgs, context: Addon_StoryContext): StoryFnReturnType;
} & Addon_BaseStoryObject<TArgs, StoryFnReturnType>;
type BaseStory<TArgs, StoryFnReturnType> = Addon_BaseStoryFn<TArgs, StoryFnReturnType> | Addon_BaseStoryObject<TArgs, StoryFnReturnType>;
interface Addon_RenderOptions {
    active: boolean;
}
type Addon_Type = Addon_BaseType | Addon_PageType | Addon_WrapperType | Addon_TestProviderType;
interface Addon_BaseType {
    /**
     * The title of the addon. This can be a simple string, but it can also be a
     * React.FunctionComponent or a React.ReactElement.
     */
    title: FC | ReactNode | (() => string);
    /**
     * The type of the addon.
     *
     * @example
     *
     * ```ts
     * Addon_TypesEnum.PANEL;
     * ```
     */
    type: Exclude<Addon_Types, Addon_TypesEnum.PREVIEW | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_TEST_PROVIDER>;
    /**
     * The unique id of the addon.
     *
     * @example 'my-org-name/my-addon-name';
     *
     * @warn This will become non-optional in 8.0
     *
     * This needs to be globally unique, so we recommend prefixing it with your org name or npm package name.
     *
     * Do not prefix with `storybook`, this is reserved for core storybook feature and core addons.
     */
    id?: string;
    /**
     * This component will wrap your `render` function.
     *
     * With it you can determine if you want your addon to be rendered or not.
     *
     * This is to facilitate addons keeping state, and keep listening for events even when they are
     * not currently on screen/rendered.
     */
    route?: (routeOptions: RenderData) => string;
    /** This will determine the value of `active` prop of your render function. */
    match?: (matchOptions: RenderData & {
        tabId?: string;
    }) => boolean;
    /**
     * The actual contents of your addon.
     *
     * This is called as a function, so if you want to use hooks, your function needs to return a
     * JSX.Element within which components are rendered
     */
    render: (props: Partial<Addon_RenderOptions>) => ReturnType<FC<Partial<Addon_RenderOptions>>>;
    /** @unstable */
    paramKey?: string;
    /** @unstable */
    disabled?: boolean | ((parameters: API_StoryEntry['parameters']) => boolean);
    /** @unstable */
    hidden?: boolean;
}
interface Addon_PageType {
    type: Addon_TypesEnum.experimental_PAGE;
    /** The unique id of the page. */
    id: string;
    /** The URL to navigate to when Storybook needs to navigate to this page. */
    url: string;
    /** The title is used in mobile mode to represent the page in the navigation. */
    title: FC | string | ReactElement | ReactNode;
    /**
     * The main content of the addon, a function component without any props. Storybook will render
     * your component always.
     *
     * If you want to render your component only when the URL matches, use the `Route` component.
     *
     * @example
     *
     * ```jsx
     * import { Route } from 'storybook/internal/router';
     *
     * Render: () => {
     *   return (
     *     <Route path="/my-addon">
     *       {' '}
     *       <MyAddonContent />{' '}
     *     </Route>
     *   );
     * };
     * ```
     */
    render: FC;
}
interface Addon_WrapperType {
    type: Addon_TypesEnum.PREVIEW;
    /** The unique id of the page. */
    id: string;
    /**
     * A React.FunctionComponent that wraps the story.
     *
     * This component must accept a children prop, and render it.
     */
    render: FC<PropsWithChildren<{
        index: number;
        children: ReactNode;
        id: string;
        storyId: StoryId$1;
    }>>;
}
interface Addon_TestProviderType {
    type: Addon_TypesEnum.experimental_TEST_PROVIDER;
    /** The unique id of the test provider. */
    id: string;
    render: () => ReactNode;
    sidebarContextMenu?: (options: {
        context: API_HashEntry;
    }) => ReactNode;
}
type Addon_TypeBaseNames = Exclude<Addon_TypesEnum, Addon_TypesEnum.PREVIEW | Addon_TypesEnum.experimental_PAGE | Addon_TypesEnum.experimental_TEST_PROVIDER>;
interface Addon_TypesMapping extends Record<Addon_TypeBaseNames, Addon_BaseType> {
    [Addon_TypesEnum.PREVIEW]: Addon_WrapperType;
    [Addon_TypesEnum.experimental_PAGE]: Addon_PageType;
    [Addon_TypesEnum.experimental_TEST_PROVIDER]: Addon_TestProviderType;
}
type Addon_Loader<API> = (api: API) => void;
interface Addon_Loaders<API> {
    [key: string]: Addon_Loader<API>;
}
interface Addon_Collection<T = Addon_Type> {
    [key: string]: T;
}
interface Addon_Elements {
    [key: string]: Addon_Collection;
}
interface Addon_ToolbarConfig {
    hidden?: boolean;
}
interface Addon_Config {
    theme?: ThemeVars;
    layoutCustomisations?: {
        showPanel?: API_LayoutCustomisations['showPanel'];
        showSidebar?: API_LayoutCustomisations['showSidebar'];
        showToolbar?: API_LayoutCustomisations['showToolbar'];
    };
    toolbar?: {
        [id: string]: Addon_ToolbarConfig;
    };
    sidebar?: API_SidebarOptions;
    [key: string]: any;
}
declare enum Addon_TypesEnum {
    /**
     * This API is used to create a tab the toolbar above the canvas, This API might be removed in the
     * future.
     *
     * @unstable
     */
    TAB = "tab",
    /** This adds panels to the addons side panel. */
    PANEL = "panel",
    /** This adds items in the toolbar above the canvas - on the left side. */
    TOOL = "tool",
    /** This adds items in the toolbar above the canvas - on the right side. */
    TOOLEXTRA = "toolextra",
    /**
     * This adds wrapper components around the canvas/iframe component storybook renders.
     *
     * @unstable this API is not stable yet, and is likely to change in 8.0.
     */
    PREVIEW = "preview",
    /**
     * This adds pages that render instead of the canvas.
     *
     * @unstable
     */
    experimental_PAGE = "page",
    /** This adds items to the Testing Module in the sidebar. */
    experimental_TEST_PROVIDER = "test-provider"
}

type OrString<T extends string> = T | (string & {});
type ViewMode = OrString<ViewMode$1 | 'settings'> | undefined;
type Layout = 'centered' | 'fullscreen' | 'padded' | 'none';
interface StorybookParameters {
    options?: Addon_OptionsParameterV7;
    /**
     * The layout property defines basic styles added to the preview body where the story is rendered.
     *
     * If you pass `none`, no styles are applied.
     */
    layout?: Layout;
}
interface StorybookTypes {
    parameters: StorybookParameters;
}
interface StorybookInternalParameters extends StorybookParameters {
    fileName?: string;
    docsOnly?: true;
}
type Path = string;

interface WebRenderer extends Renderer {
    canvasElement: HTMLElement;
}
type ModuleExport = any;
type ModuleExports = Record<string, ModuleExport>;
type ModuleImportFn = (path: Path) => Promise<ModuleExports>;
type MaybePromise<T> = Promise<T> | T;
type TeardownRenderToCanvas = () => MaybePromise<void>;
type RenderToCanvas<TRenderer extends Renderer> = (context: RenderContext<TRenderer>, element: TRenderer['canvasElement']) => MaybePromise<void | TeardownRenderToCanvas>;
interface ProjectAnnotations<TRenderer extends Renderer> extends ProjectAnnotations$1<TRenderer> {
    testingLibraryRender?: (...args: never[]) => {
        unmount: () => void;
    };
    renderToCanvas?: RenderToCanvas<TRenderer>;
}
type NamedExportsOrDefault<TExport> = TExport | {
    default: TExport;
};
type NamedOrDefaultProjectAnnotations<TRenderer extends Renderer = Renderer> = NamedExportsOrDefault<ProjectAnnotations<TRenderer>>;
type NormalizedProjectAnnotations<TRenderer extends Renderer = Renderer> = Omit<ProjectAnnotations<TRenderer>, 'decorators' | 'loaders' | 'runStep' | 'beforeAll'> & {
    argTypes?: StrictArgTypes;
    globalTypes?: StrictGlobalTypes;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction$1<TRenderer>[];
    runStep: StepRunner<TRenderer>;
    beforeAll: BeforeAll;
};
type NormalizedComponentAnnotations<TRenderer extends Renderer = Renderer> = Omit<ComponentAnnotations<TRenderer>, 'decorators' | 'loaders'> & {
    id: ComponentId;
    title: ComponentTitle;
    argTypes?: StrictArgTypes;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction$1<TRenderer>[];
};
type NormalizedStoryAnnotations<TRenderer extends Renderer = Renderer> = Omit<StoryAnnotations<TRenderer>, 'storyName' | 'story' | 'decorators' | 'loaders'> & {
    moduleExport: ModuleExport;
    id: StoryId$1;
    argTypes?: StrictArgTypes;
    name: StoryName;
    userStoryFn?: ArgsStoryFn<TRenderer>;
    decorators?: DecoratorFunction<TRenderer>[];
    loaders?: LoaderFunction$1<TRenderer>[];
};
type CSFFile<TRenderer extends Renderer = Renderer> = {
    meta: NormalizedComponentAnnotations<TRenderer>;
    stories: Record<StoryId$1, NormalizedStoryAnnotations<TRenderer>>;
    projectAnnotations?: NormalizedProjectAnnotations<TRenderer>;
    moduleExports: ModuleExports;
};
type PreparedStory<TRenderer extends Renderer = Renderer> = StoryContextForEnhancers<TRenderer> & {
    moduleExport: ModuleExport;
    originalStoryFn: ArgsStoryFn<TRenderer>;
    undecoratedStoryFn: LegacyStoryFn<TRenderer>;
    unboundStoryFn: LegacyStoryFn<TRenderer>;
    applyLoaders: (context: StoryContext<TRenderer>) => Promise<StoryContext<TRenderer>['loaded']>;
    applyBeforeEach: (context: StoryContext<TRenderer>) => Promise<CleanupCallback[]>;
    applyAfterEach: (context: StoryContext<TRenderer>) => Promise<void>;
    playFunction?: (context: StoryContext<TRenderer>) => Promise<void> | void;
    runStep: StepRunner<TRenderer>;
    mount: (context: StoryContext<TRenderer>) => () => Promise<Canvas>;
    testingLibraryRender?: (...args: never[]) => unknown;
    renderToCanvas?: ProjectAnnotations<TRenderer>['renderToCanvas'];
    usesMount: boolean;
    storyGlobals: Globals$1;
};
type PreparedMeta<TRenderer extends Renderer = Renderer> = Omit<StoryContextForEnhancers<TRenderer>, 'name' | 'story'> & {
    moduleExport: ModuleExport;
};
type BoundStory<TRenderer extends Renderer = Renderer> = PreparedStory<TRenderer> & {
    storyFn: PartialStoryFn<TRenderer>;
};
declare type RenderContext<TRenderer extends Renderer = Renderer> = StoryIdentifier & {
    showMain: () => void;
    showError: (error: {
        title: string;
        description: string;
    }) => void;
    showException: (err: Error) => void;
    forceRemount: boolean;
    storyContext: StoryContext<TRenderer>;
    storyFn: PartialStoryFn<TRenderer>;
    unboundStoryFn: LegacyStoryFn<TRenderer>;
};

interface BuilderStats {
    toJson: () => any;
}
type Builder_WithRequiredProperty<Type, Key extends keyof Type> = Type & {
    [Property in Key]-?: Type[Property];
};
type Builder_Unpromise<T extends Promise<any>> = T extends Promise<infer U> ? U : never;
type Builder_EnvsRaw = Record<string, string>;

type RenderContextCallbacks<TRenderer extends Renderer> = Pick<RenderContext<TRenderer>, 'showMain' | 'showError' | 'showException'>;
type StoryRenderOptions = {
    autoplay?: boolean;
    forceInitialArgs?: boolean;
};
type ResolvedModuleExportType = 'component' | 'meta' | 'story';
/**
 * What do we know about an of={} call?
 *
 * Technically, the type names aren't super accurate:
 *
 * - Meta === `CSFFile`
 * - Story === `PreparedStory` But these shorthands capture the idea of what is being talked about
 */
type ResolvedModuleExportFromType<TType extends ResolvedModuleExportType, TRenderer extends Renderer = Renderer> = TType extends 'component' ? {
    type: 'component';
    component: TRenderer['component'];
    projectAnnotations: NormalizedProjectAnnotations<Renderer>;
} : TType extends 'meta' ? {
    type: 'meta';
    csfFile: CSFFile<TRenderer>;
    preparedMeta: PreparedMeta;
} : {
    type: 'story';
    story: PreparedStory<TRenderer>;
};
type ResolvedModuleExport<TRenderer extends Renderer = Renderer> = {
    type: ResolvedModuleExportType;
} & (ResolvedModuleExportFromType<'component', TRenderer> | ResolvedModuleExportFromType<'meta', TRenderer> | ResolvedModuleExportFromType<'story', TRenderer>);
interface DocsContextProps<TRenderer extends Renderer = Renderer> {
    /**
     * Register a CSF file that this docs entry uses. Used by the `<Meta of={} />` block to attach,
     * and the `<Story meta={} />` bloc to reference
     */
    referenceMeta: (metaExports: ModuleExports, attach: boolean) => void;
    /**
     * Find a component, meta or story object from the direct export(s) from the CSF file. This is the
     * API that drives the `of={}` syntax.
     */
    resolveOf<TType extends ResolvedModuleExportType>(moduleExportOrType: ModuleExport | TType, validTypes?: TType[]): ResolvedModuleExportFromType<TType, TRenderer>;
    /**
     * Find a story's id from the name of the story. This is primarily used by the `<Story name={} />
     * block. Note that the story must be part of the primary CSF file of the docs entry.
     */
    storyIdByName: (storyName: StoryName) => StoryId$1;
    /**
     * Syncronously find a story by id (if the id is not provided, this will look up the primary story
     * in the CSF file, if such a file exists).
     */
    storyById: (id?: StoryId$1) => PreparedStory<TRenderer>;
    /** Syncronously find all stories of the component referenced by the CSF file. */
    componentStories: () => PreparedStory<TRenderer>[];
    /** Syncronously find all stories by CSF file. */
    componentStoriesFromCSFFile: (csfFile: CSFFile<TRenderer>) => PreparedStory<TRenderer>[];
    /** Get the story context of the referenced story. */
    getStoryContext: (story: PreparedStory<TRenderer>) => Omit<StoryContext<TRenderer>, 'abortSignal' | 'canvasElement' | 'step' | 'context'>;
    /** Asyncronously load an arbitrary story by id. */
    loadStory: (id: StoryId$1) => Promise<PreparedStory<TRenderer>>;
    /** Render a story to a given HTML element and keep it up to date across context changes */
    renderStoryToElement: (story: PreparedStory<TRenderer>, element: HTMLElement, callbacks: RenderContextCallbacks<TRenderer>, options: StoryRenderOptions) => () => Promise<void>;
    /** Storybook channel -- use for low level event watching/emitting */
    channel: Channel$1;
    /** Project annotations -- can be read to get the project's global annotations */
    projectAnnotations: NormalizedProjectAnnotations<TRenderer>;
}
type DocsRenderFunction<TRenderer extends Renderer> = (docsContext: DocsContextProps<TRenderer>, docsParameters: Parameters, element: HTMLElement) => Promise<void>;

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations$1<any>;
    var defaultProjectAnnotations: ProjectAnnotations$2<any>;
}
type WrappedStoryRef = {
    __pw_type: 'jsx';
    props: Record<string, any>;
} | {
    __pw_type: 'importRef';
};
type UnwrappedJSXStoryRef = {
    __pw_type: 'jsx';
    type: UnwrappedImportStoryRef;
};
type UnwrappedImportStoryRef = ComposedStoryFn$1;
declare global {
    function __pwUnwrapObject(storyRef: WrappedStoryRef): Promise<UnwrappedJSXStoryRef | UnwrappedImportStoryRef>;
}

interface Report<T = unknown> {
    type: string;
    version?: number;
    result: T;
    status: 'failed' | 'passed' | 'warning';
}
declare class ReporterAPI {
    reports: Report[];
    addReport(report: Report): Promise<void>;
}

type Store_CSFExports<TRenderer extends Renderer = Renderer, TArgs extends Args = Args> = {
    default: ComponentAnnotations<TRenderer, TArgs>;
    __esModule?: boolean;
    __namedExportsOrder?: string[];
};
/** A story function with partial args, used internally by composeStory */
type PartialArgsStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = (args?: TArgs) => (TRenderer & {
    T: TArgs;
})['storyResult'];
/**
 * A story that got recomposed for portable stories, containing all the necessary data to be
 * rendered in external environments
 */
type ComposedStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = PartialArgsStoryFn<TRenderer, TArgs> & {
    args: TArgs;
    id: StoryId$1;
    play?: (context?: Partial<StoryContext<TRenderer, Partial<TArgs>>>) => Promise<void>;
    run: (context?: Partial<StoryContext<TRenderer, Partial<TArgs>>>) => Promise<void>;
    load: () => Promise<void>;
    storyName: string;
    parameters: Parameters;
    argTypes: StrictArgTypes<TArgs>;
    reporting: ReporterAPI;
    tags: Tag$1[];
    globals: Globals$1;
};
/**
 * Based on a module of stories, it returns all stories within it, filtering non-stories Each story
 * will have partial props, as their props should be handled when composing stories
 */
type StoriesWithPartialProps<TRenderer extends Renderer, TModule> = {
    [K in keyof TModule as TModule[K] extends StoryAnnotationsOrFn<infer _, infer _TProps> ? K : never]: TModule[K] extends StoryAnnotationsOrFn<infer _, infer TProps> ? ComposedStoryFn<TRenderer, Partial<TProps>> : unknown;
};
/**
 * Type used for integrators of portable stories, as reference when creating their own composeStory
 * function
 */
interface ComposeStoryFn<TRenderer extends Renderer = Renderer, TArgs extends Args = Args> {
    (storyAnnotations: AnnotatedStoryFn<TRenderer, TArgs> | StoryAnnotations<TRenderer, TArgs>, componentAnnotations: ComponentAnnotations<TRenderer, TArgs>, projectAnnotations: ProjectAnnotations$1<TRenderer>, exportsName?: string): ComposedStoryFn;
}

declare enum CoreWebpackCompiler {
    Babel = "babel",
    SWC = "swc"
}

declare enum Feature {
    DOCS = "docs",
    TEST = "test",
    ONBOARDING = "onboarding",
    A11Y = "a11y"
}

declare enum SupportedLanguage {
    JAVASCRIPT = "javascript",
    TYPESCRIPT = "typescript"
}

export { type API_ActiveTabsType, type API_BaseEntry, type API_ComponentEntry, type API_ComposedRef, type API_ComposedRefUpdate, type API_DocsEntry, type API_FilterFunction, type API_GroupEntry, type API_HashEntry, type API_IframeRenderer, type API_IndexHash, type API_Layout, type API_LayoutCustomisations, type API_LeafEntry, type API_LoadedRefData, type API_MatchOptions, type API_Notification, type API_OptionsData, type API_PanelPositions, type API_PreparedIndexEntry, type API_PreparedStoryIndex, type API_Provider, type API_ProviderData, type API_RefId, type API_RefUrl, type API_Refs, type API_ReleaseNotes, type API_RenderOptions, type API_RootEntry, type API_RouteOptions, type API_SetRefData, type API_Settings, type API_SidebarOptions, type API_StateMerger, type API_StoryEntry, type API_StoryMapper, type API_TestEntry, type API_UI, type API_UIOptions, type API_UnknownEntries, type API_Version, type API_Versions$1 as API_Versions, type API_ViewMode, type Actor, type Addon_AddStoryArgs, type Addon_Annotations, type Addon_ArgType, type Addon_ArgsStoryFn, type Addon_BaseAnnotations, type Addon_BaseDecorators, type Addon_BaseMeta, type Addon_BaseStoryFn, type Addon_BaseStoryObject, type Addon_BaseType, type Addon_ClientApiAddon, type Addon_ClientApiAddons, type Addon_ClientApiReturnFn, type Addon_ClientStoryApi, type Addon_Collection, type Addon_Comparator, type Addon_Config, type Addon_DecoratorFunction, type Addon_Elements, type Addon_LegacyStoryFn, type Addon_LoadFn, type Addon_Loadable, type Addon_Loader, type Addon_LoaderFunction, type Addon_Loaders, type Addon_MakeDecoratorResult, type Addon_OptionsParameter, type Addon_OptionsParameterV7, type Addon_PageType, type Addon_PartialStoryFn, type Addon_RenderOptions, type Addon_RequireContext, type Addon_StoryApi, type Addon_StoryContext, type Addon_StoryContextUpdate, type Addon_StoryFn, type Addon_StorySortComparator, type Addon_StorySortComparatorV7, type Addon_StorySortMethod, type Addon_StorySortObjectParameter, type Addon_StorySortParameter, type Addon_StorySortParameterV7, type Addon_StoryWrapper, type Addon_TestProviderType, type Addon_ToolbarConfig, type Addon_Type, type Addon_Types, Addon_TypesEnum, type Addon_TypesMapping, type Addon_WrapperSettings, type Addon_WrapperType, type Addons_ArgTypes, type BaseIndexEntry, type BaseIndexInput, type BaseStory, type BoundStory, type Builder, type BuilderName, type BuilderOptions, type BuilderResult, type BuilderStats, type Builder_EnvsRaw, type Builder_Unpromise, type Builder_WithRequiredProperty, type CLIBaseOptions, type CLIOptions, type CSFFile, type CompatibleString, type ComponentManifest, type ComponentManifestGenerator, type ComponentsManifest, type ComposeStoryFn, type ComposedStoryFn, type CoreCommon_AddonEntry, type CoreCommon_AddonInfo, type CoreCommon_OptionsEntry, type CoreCommon_ResolvedAddonPreset, type CoreCommon_ResolvedAddonVirtual, type CoreCommon_StorybookInfo, type CoreConfig, CoreWebpackCompiler, type CsfEnricher, type DocsContextProps, type DocsIndexEntry, type DocsIndexInput, type DocsOptions, type DocsPreparedPayload, type DocsRenderFunction, type Entry, type Event, type EventInfo, Feature, type GlobalsUpdatedPayload, type IndexEntry, type IndexEntryLegacy, type IndexInput, type IndexInputStats, type IndexedCSFFile, type IndexedStory, type Indexer, type IndexerOptions, type LoadOptions, type LoadedPreset, type Middleware, MockUniversalStore, type ModuleExport, type ModuleExports, type ModuleImportFn, type NamedOrDefaultProjectAnnotations, type NormalizedComponentAnnotations, type NormalizedProjectAnnotations, type NormalizedStoriesSpecifier, type NormalizedStoryAnnotations, type Options, type PackageJson, type PartialArgsStoryFn, type Path, type PreparedMeta, type PreparedStory, type Preset, type PresetConfig, type PresetProperty, type PresetPropertyFn, type PresetValue, type Presets, type PreviewAnnotation, type ProjectAnnotations, type Ref, type RenderContext, type RenderContextCallbacks, type RenderToCanvas, type RendererName, type ResolvedModuleExport, type ResolvedModuleExportFromType, type ResolvedModuleExportType, type ServerApp, type SetGlobalsPayload, type SetStoriesPayload, type SetStoriesStory, type SetStoriesStoryData, type Stats, type Status, type StatusByTypeId, type StatusStore, type StatusStoreByTypeId, type StatusTypeId, type StatusValue, type StatusesByStoryIdAndTypeId, type StoreOptions, type Store_CSFExports, type StoriesEntry, type StoriesSpecifier, type StoriesWithPartialProps, type StoryIndex, type StoryIndexEntry, type StoryIndexInput, type StoryIndexV2, type StoryIndexV3, type StoryPreparedPayload, type StoryRenderOptions, type StorybookConfig, type StorybookConfigOptions, type StorybookConfigRaw, type StorybookInternalParameters, type StorybookParameters, type StorybookTypes, SupportedBuilder, SupportedFramework, SupportedLanguage, SupportedRenderer, type TagOptions, type TagsOptions, type TeardownRenderToCanvas, type TestBuildConfig, type TestBuildFlags, type TestProviderId, type TestProviderState, type TestProviderStateByProviderId, type TestProviderStoreById, type TypescriptOptions, UniversalStore, type UseStatusStore, type UseTestProviderStore, type V3CompatIndexEntry, type VersionCheck, type ViewMode, type WebRenderer };

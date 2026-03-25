import { StoryId } from 'storybook/internal/csf';
import { NormalizedProjectAnnotations, ProjectAnnotations, ComposedStoryFn } from 'storybook/internal/types';

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
interface Path {
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
interface Location extends Path {
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

/**
 * NOTE: If you refactor this to split up the modules into separate files,
 * you'll need to update the rollup config for react-router-dom-v5-compat.
 */

declare global {
    var __staticRouterHydrationData: HydrationState | undefined;
}

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations<any>;
    var defaultProjectAnnotations: ProjectAnnotations<any>;
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
type UnwrappedImportStoryRef = ComposedStoryFn;
declare global {
    function __pwUnwrapObject(storyRef: WrappedStoryRef): Promise<UnwrappedJSXStoryRef | UnwrappedImportStoryRef>;
}

type StatusValue = 'status-value:pending' | 'status-value:success' | 'status-value:error' | 'status-value:warning' | 'status-value:unknown';
type StatusTypeId = string;
interface Status {
    value: StatusValue;
    typeId: StatusTypeId;
    storyId: StoryId;
    title: string;
    description: string;
    data?: any;
    sidebarContextMenu?: boolean;
}

declare abstract class StorybookError extends Error {
    private _name;
    /** Category of the error. Used to classify the type of error, e.g., 'PREVIEW_API'. */
    readonly category: string;
    /** Code representing the error. Used to uniquely identify the error, e.g., 1. */
    readonly code: number;
    /**
     * Data associated with the error. Used to provide additional information in the error message or
     * to be passed to telemetry.
     */
    readonly data: {};
    /**
     * Specifies the documentation for the error.
     *
     * - If `true`, links to a documentation page on the Storybook website (make sure it exists before
     *   enabling) – This is not implemented yet.
     * - If a string, uses the provided URL for documentation (external or FAQ links).
     * - If `false` (default), no documentation link is added.
     */
    readonly documentation: boolean | string | string[];
    /** Flag used to easily determine if the error originates from Storybook. */
    readonly fromStorybook: true;
    /**
     * Flag used to determine if the error is handled by us and should therefore not be shown to the
     * user.
     */
    isHandledError: boolean;
    get fullErrorCode(): `SB_${string}_${string}`;
    /** Overrides the default `Error.name` property in the format: SB_<CATEGORY>_<CODE>. */
    get name(): string;
    set name(name: string);
    /**
     * A collection of sub errors which relate to a parent error.
     *
     * Sub-errors are used to represent multiple related errors that occurred together. When a
     * StorybookError with sub-errors is sent to telemetry, both the parent error and each sub-error
     * are sent as separate telemetry events. This allows for better error tracking and debugging.
     *
     * @example
     *
     * ```ts
     * const error1 = new SomeError();
     * const error2 = new AnotherError();
     * const parentError = new ParentError({
     *   // ... other props
     *   subErrors: [error1, error2],
     * });
     * ```
     */
    subErrors: StorybookError[];
    constructor(props: {
        category: string;
        code: number;
        message: string;
        documentation?: boolean | string | string[];
        isHandledError?: boolean;
        name: string;
        /**
         * Optional array of sub-errors that are related to this error. When this error is sent to
         * telemetry, each sub-error will be sent as a separate event.
         */
        subErrors?: StorybookError[];
    });
    /** Generates the error message along with additional documentation link (if applicable). */
    static getFullMessage({ documentation, code, category, message, }: ConstructorParameters<typeof StorybookError>[0]): string;
}

/**
 * If you can't find a suitable category for your error, create one based on the package name/file
 * path of which the error is thrown. For instance: If it's from `storybook/internal/client-logger`,
 * then CLIENT-LOGGER
 *
 * Categories are prefixed by a logical grouping, e.g. PREVIEW_ or FRAMEWORK_ to prevent manager and
 * preview errors from having the same category and error code.
 */
declare enum Category {
    BLOCKS = "BLOCKS",
    DOCS_TOOLS = "DOCS-TOOLS",
    PREVIEW_CLIENT_LOGGER = "PREVIEW_CLIENT-LOGGER",
    PREVIEW_CHANNELS = "PREVIEW_CHANNELS",
    PREVIEW_CORE_EVENTS = "PREVIEW_CORE-EVENTS",
    PREVIEW_INSTRUMENTER = "PREVIEW_INSTRUMENTER",
    PREVIEW_API = "PREVIEW_API",
    PREVIEW_REACT_DOM_SHIM = "PREVIEW_REACT-DOM-SHIM",
    PREVIEW_ROUTER = "PREVIEW_ROUTER",
    PREVIEW_THEMING = "PREVIEW_THEMING",
    RENDERER_HTML = "RENDERER_HTML",
    RENDERER_PREACT = "RENDERER_PREACT",
    RENDERER_REACT = "RENDERER_REACT",
    RENDERER_SERVER = "RENDERER_SERVER",
    RENDERER_SVELTE = "RENDERER_SVELTE",
    RENDERER_VUE = "RENDERER_VUE",
    RENDERER_VUE3 = "RENDERER_VUE3",
    RENDERER_WEB_COMPONENTS = "RENDERER_WEB-COMPONENTS",
    FRAMEWORK_NEXTJS = "FRAMEWORK_NEXTJS",
    ADDON_VITEST = "ADDON_VITEST",
    ADDON_A11Y = "ADDON_A11Y"
}
declare class MissingStoryAfterHmrError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class ImplicitActionsDuringRendering extends StorybookError {
    data: {
        phase: string;
        name: string;
        deprecated: boolean;
    };
    constructor(data: {
        phase: string;
        name: string;
        deprecated: boolean;
    });
}
declare class CalledExtractOnStoreError extends StorybookError {
    constructor();
}
declare class MissingRenderToCanvasError extends StorybookError {
    constructor();
}
declare class CalledPreviewMethodBeforeInitializationError extends StorybookError {
    data: {
        methodName: string;
    };
    constructor(data: {
        methodName: string;
    });
}
declare class StoryIndexFetchError extends StorybookError {
    data: {
        text: string;
    };
    constructor(data: {
        text: string;
    });
}
declare class MdxFileWithNoCsfReferencesError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class EmptyIndexError extends StorybookError {
    constructor();
}
declare class NoStoryMatchError extends StorybookError {
    data: {
        storySpecifier: string;
    };
    constructor(data: {
        storySpecifier: string;
    });
}
declare class MissingStoryFromCsfFileError extends StorybookError {
    data: {
        storyId: string;
    };
    constructor(data: {
        storyId: string;
    });
}
declare class StoryStoreAccessedBeforeInitializationError extends StorybookError {
    constructor();
}
declare class MountMustBeDestructuredError extends StorybookError {
    data: {
        playFunction: string;
    };
    constructor(data: {
        playFunction: string;
    });
}
declare class NoRenderFunctionError extends StorybookError {
    data: {
        id: string;
    };
    constructor(data: {
        id: string;
    });
}
declare class NoStoryMountedError extends StorybookError {
    constructor();
}
declare class StatusTypeIdMismatchError extends StorybookError {
    data: {
        status: Status;
        typeId: StatusTypeId;
    };
    constructor(data: {
        status: Status;
        typeId: StatusTypeId;
    });
}
declare class NextJsSharpError extends StorybookError {
    constructor();
}
declare class NextjsRouterMocksNotAvailable extends StorybookError {
    data: {
        importType: string;
    };
    constructor(data: {
        importType: string;
    });
}
declare class UnknownArgTypesError extends StorybookError {
    data: {
        type: object;
        language: string;
    };
    constructor(data: {
        type: object;
        language: string;
    });
}
declare class UnsupportedViewportDimensionError extends StorybookError {
    data: {
        dimension: string;
        value: string;
    };
    constructor(data: {
        dimension: string;
        value: string;
    });
}
declare class ElementA11yParameterError extends StorybookError {
    constructor();
}

export { CalledExtractOnStoreError, CalledPreviewMethodBeforeInitializationError, Category, ElementA11yParameterError, EmptyIndexError, ImplicitActionsDuringRendering, MdxFileWithNoCsfReferencesError, MissingRenderToCanvasError, MissingStoryAfterHmrError, MissingStoryFromCsfFileError, MountMustBeDestructuredError, NextJsSharpError, NextjsRouterMocksNotAvailable, NoRenderFunctionError, NoStoryMatchError, NoStoryMountedError, StatusTypeIdMismatchError, StoryIndexFetchError, StoryStoreAccessedBeforeInitializationError, UnknownArgTypesError, UnsupportedViewportDimensionError };

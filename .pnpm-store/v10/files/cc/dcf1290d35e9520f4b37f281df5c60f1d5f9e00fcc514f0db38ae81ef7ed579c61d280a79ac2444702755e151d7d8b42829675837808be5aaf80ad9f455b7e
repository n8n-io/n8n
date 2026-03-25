import { loadAllPresets } from 'storybook/internal/common';
export { getPreviewBodyTemplate, getPreviewHeadTemplate } from 'storybook/internal/common';
import * as storybook_internal_types from 'storybook/internal/types';
import { CLIOptions, LoadOptions, BuilderOptions, StorybookConfigRaw, IndexInputStats, NormalizedStoriesSpecifier, Path as Path$1, Indexer, DocsOptions, StoryIndexEntry, DocsIndexEntry, Tag, IndexEntry, StoryIndex, Options, NormalizedProjectAnnotations, ProjectAnnotations, ComposedStoryFn } from 'storybook/internal/types';
import { EventType } from 'storybook/internal/telemetry';
import { Channel } from 'storybook/internal/channels';
import { StoryId } from 'storybook/internal/csf';

type BuildStaticStandaloneOptions = CLIOptions & LoadOptions & BuilderOptions & {
    outputDir: string;
};
declare function buildStaticStandalone(options: BuildStaticStandaloneOptions): Promise<void>;

declare function buildDevStandalone(options: CLIOptions & LoadOptions & BuilderOptions & {
    storybookVersion?: string;
    previewConfigPath?: string;
}): Promise<{
    port: number;
    address: string;
    networkAddress: string;
}>;

type BuildIndexOptions = CLIOptions & LoadOptions & BuilderOptions;
declare const buildIndex: (options: BuildIndexOptions) => Promise<storybook_internal_types.StoryIndex>;
declare const buildIndexStandalone: (options: BuildIndexOptions & {
    outputFile: string;
}) => Promise<void>;

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

type TelemetryOptions = {
    cliOptions: CLIOptions;
    presetOptions?: Parameters<typeof loadAllPresets>[0];
    printError?: (err: any) => void;
    skipPrompt?: boolean;
};
type ErrorLevel = 'none' | 'error' | 'full';
declare function getErrorLevel({ cliOptions, presetOptions, skipPrompt, }: TelemetryOptions): Promise<ErrorLevel>;
declare function sendTelemetryError(_error: unknown, eventType: EventType, options: TelemetryOptions, blocking?: boolean, parent?: StorybookError): Promise<void>;
declare function isTelemetryEnabled(options: TelemetryOptions): boolean;
declare function withTelemetry<T>(eventType: EventType, options: TelemetryOptions, run: () => Promise<T>): Promise<T | undefined>;

declare function build(options?: any, frameworkOptions?: any): Promise<void | {
    port: number;
    address: string;
    networkAddress: string;
}>;

declare const mapStaticDir: (staticDir: NonNullable<StorybookConfigRaw["staticDirs"]>[number], configDir: string) => {
    staticDir: string;
    staticPath: string;
    targetDir: string;
    targetEndpoint: string;
};

/**
 * A function that json from a file
 */
interface ReadJsonSync {
    (packageJsonPath: string): any | undefined;
}

/**
 * Function that can match a path
 */
interface MatchPath {
    (requestedModule: string, readJson?: ReadJsonSync, fileExists?: (name: string) => boolean, extensions?: ReadonlyArray<string>): string | undefined;
}

declare class IndexingError extends Error {
    importPaths: string[];
    constructor(message: string, importPaths: string[], stack?: string);
    pathsString(): string;
    toString(): string;
}

type IndexStatsSummary = Record<keyof IndexInputStats, number>;

type StoryIndexEntryWithExtra = StoryIndexEntry & {
    extra: {
        metaId?: string;
        stats: IndexInputStats;
    };
};
/** A .mdx file will produce a docs entry */
type DocsCacheEntry = DocsIndexEntry;
/** A `_.stories._` file will produce a list of stories and possibly a docs entry */
type StoriesCacheEntry = {
    entries: (StoryIndexEntryWithExtra | DocsIndexEntry)[];
    dependents: Path$1[];
    type: 'stories';
};
type ErrorEntry = {
    type: 'error';
    err: IndexingError;
};
type CacheEntry = false | StoriesCacheEntry | DocsCacheEntry | ErrorEntry;
type SpecifierStoriesCache = Record<Path$1, CacheEntry>;
type StoryIndexGeneratorOptions = {
    workingDir: Path$1;
    configDir: Path$1;
    indexers: Indexer[];
    docs: DocsOptions;
    build?: StorybookConfigRaw['build'];
};
/**
 * The StoryIndexGenerator extracts stories and docs entries for each file matching (one or more)
 * stories "specifiers", as defined in main.js.
 *
 * The output is a set of entries (see above for the types).
 *
 * Each file is treated as a stories or a (modern) docs file.
 *
 * A stories file is indexed by an indexer (passed in), which produces a list of stories.
 *
 * - If the stories have the `parameters.docsOnly` setting, they are disregarded.
 * - If the stories have `autodocs` enabled, a docs entry is added pointing to the story file.
 *
 * A (modern) docs (.mdx) file is indexed, a docs entry is added.
 *
 * In the preview, a docs entry with the `autodocs` tag will be rendered as a CSF file that exports
 * an MDX template on the `docs.page` parameter, whereas other docs entries are rendered as MDX
 * files directly.
 *
 * The entries are "uniq"-ed and sorted. Stories entries are preferred to docs entries and MDX docs
 * entries are preferred to CSF templates (with warnings).
 */
declare class StoryIndexGenerator {
    readonly specifiers: NormalizedStoriesSpecifier[];
    readonly options: StoryIndexGeneratorOptions;
    private specifierToCache;
    /** Cache for findMatchingFiles results */
    private static findMatchingFilesCache;
    private lastIndex?;
    private lastStats?;
    private lastError?;
    constructor(specifiers: NormalizedStoriesSpecifier[], options: StoryIndexGeneratorOptions);
    /** Generate a cache key for findMatchingFiles */
    private static getFindMatchingFilesCacheKey;
    /** Clear the findMatchingFiles cache */
    static clearFindMatchingFilesCache(): void;
    static findMatchingFiles(specifier: NormalizedStoriesSpecifier, workingDir: Path$1, ignoreWarnings?: boolean): Promise<SpecifierStoriesCache>;
    static findMatchingFilesForSpecifiers(specifiers: NormalizedStoriesSpecifier[], workingDir: Path$1, ignoreWarnings?: boolean): Promise<Array<readonly [NormalizedStoriesSpecifier, SpecifierStoriesCache]>>;
    initialize(): Promise<void>;
    /** Run the updater function over all the empty cache entries */
    updateExtracted(updater: (specifier: NormalizedStoriesSpecifier, absolutePath: Path$1, existingEntry: CacheEntry) => Promise<CacheEntry>, overwrite?: boolean): Promise<void>;
    isDocsMdx(absolutePath: Path$1): boolean;
    ensureExtracted({ projectTags, }: {
        projectTags?: Tag[];
    }): Promise<{
        entries: (IndexEntry | ErrorEntry)[];
        stats: IndexStatsSummary;
    }>;
    findDependencies(absoluteImports: Path$1[]): StoriesCacheEntry[];
    /**
     * Try to find the component path from a raw import string and return it in the same format as
     * `importPath`. Respect tsconfig paths if available.
     *
     * If no such file exists, assume that the import is from a package and return the raw
     */
    resolveComponentPath(rawComponentPath: Path$1, absolutePath: Path$1, matchPath: MatchPath | undefined): string;
    extractStories(specifier: NormalizedStoriesSpecifier, absolutePath: Path$1, projectTags?: Tag[]): Promise<StoriesCacheEntry | DocsCacheEntry>;
    extractDocs(specifier: NormalizedStoriesSpecifier, absolutePath: Path$1, projectTags?: Tag[]): Promise<false | DocsIndexEntry>;
    chooseDuplicate(firstEntry: IndexEntry, secondEntry: IndexEntry, projectTags: Tag[]): IndexEntry;
    sortStories(entries: StoryIndex['entries'], storySortParameter: any): Promise<Record<string, IndexEntry>>;
    getIndex(): Promise<StoryIndex>;
    getIndexAndStats(): Promise<{
        storyIndex: StoryIndex;
        stats: IndexStatsSummary;
    }>;
    invalidateAll(): void;
    invalidate(specifier: NormalizedStoriesSpecifier, importPath: Path$1, removed: boolean): void;
    getPreviewCode(): Promise<string | undefined>;
    getProjectTags(previewCode?: string): string[];
    static storyFileNames(specifierToCache: Map<NormalizedStoriesSpecifier, SpecifierStoriesCache>): string[];
}

declare function loadStorybook(options: CLIOptions & LoadOptions & BuilderOptions & {
    storybookVersion?: string;
    previewConfigPath?: string;
}): Promise<Options>;

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
type ChannelLike = Pick<Channel, 'on' | 'off' | 'emit'>;
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

type TestProviderState = 'test-provider-state:pending' | 'test-provider-state:running' | 'test-provider-state:succeeded' | 'test-provider-state:crashed';
type TestProviderId = string;
type TestProviderStateByProviderId = Record<TestProviderId, TestProviderState>;
type TestProviderStoreEventType = 'run-all' | 'clear-all' | 'settings-changed';
type TestProviderStoreEvent = BaseEvent & {
    type: TestProviderStoreEventType;
};
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
type StatusByTypeId = Record<StatusTypeId, Status>;
type StatusesByStoryIdAndTypeId = Record<StoryId, StatusByTypeId>;
interface Status {
    value: StatusValue;
    typeId: StatusTypeId;
    storyId: StoryId;
    title: string;
    description: string;
    data?: any;
    sidebarContextMenu?: boolean;
}
declare const StatusStoreEventType: {
    readonly SELECT: "select";
};
type StatusStoreEvent = {
    type: typeof StatusStoreEventType.SELECT;
    payload: Status[];
};
type StatusStore = {
    getAll: () => StatusesByStoryIdAndTypeId;
    set: (statuses: Status[]) => void;
    onAllStatusChange: (listener: (statuses: StatusesByStoryIdAndTypeId, previousStatuses: StatusesByStoryIdAndTypeId) => void) => () => void;
    onSelect: (listener: (selectedStatuses: Status[]) => void) => () => void;
    unset: (storyIds?: StoryId[]) => void;
};
type StatusStoreByTypeId = StatusStore & {
    typeId: StatusTypeId;
};

declare const fullStatusStore: StatusStore & {
    selectStatuses: (statuses: Status[]) => void;
    typeId: undefined;
};
declare const getStatusStoreByTypeId: (typeId: StatusTypeId) => StatusStoreByTypeId;
declare const universalStatusStore: UniversalStore<StatusesByStoryIdAndTypeId, StatusStoreEvent>;

declare const fullTestProviderStore: {
    settingsChanged: () => void;
    onRunAll: (listener: () => void) => () => void;
    onClearAll: (listener: () => void) => () => void;
} & {
    getFullState: UniversalStore<TestProviderStateByProviderId, TestProviderStoreEvent>["getState"];
    setFullState: UniversalStore<TestProviderStateByProviderId, TestProviderStoreEvent>["setState"];
    onSettingsChanged: (listener: (testProviderId: TestProviderId) => void) => () => void;
    runAll: () => void;
    clearAll: () => void;
};
declare const getTestProviderStoreById: (testProviderId: TestProviderId) => TestProviderStoreById;
declare const universalTestProviderStore: UniversalStore<TestProviderStateByProviderId, TestProviderStoreEvent>;

export { type BuildIndexOptions, type BuildStaticStandaloneOptions, StoryIndexGenerator, build, buildDevStandalone, buildIndex, buildIndexStandalone, buildStaticStandalone, MockUniversalStore as experimental_MockUniversalStore, UniversalStore as experimental_UniversalStore, getStatusStoreByTypeId as experimental_getStatusStore, getTestProviderStoreById as experimental_getTestProviderStore, loadStorybook as experimental_loadStorybook, getErrorLevel, fullStatusStore as internal_fullStatusStore, fullTestProviderStore as internal_fullTestProviderStore, universalStatusStore as internal_universalStatusStore, universalTestProviderStore as internal_universalTestProviderStore, isTelemetryEnabled, mapStaticDir, sendTelemetryError, withTelemetry };

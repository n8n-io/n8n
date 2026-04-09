import { loadAllPresets } from '@storybook/core/common';
export { getPreviewBodyTemplate, getPreviewHeadTemplate } from '@storybook/core/common';
import { CLIOptions, LoadOptions, BuilderOptions, StorybookConfigRaw, IndexInputStats, NormalizedStoriesSpecifier, Path, Tag, IndexEntry, DocsIndexEntry, StoryIndex, Indexer, DocsOptions, StoryIndexEntry, Options } from '@storybook/core/types';
import { EventType } from '@storybook/core/telemetry';
import { Channel } from '@storybook/core/channels';

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

type TelemetryOptions = {
    cliOptions: CLIOptions;
    presetOptions?: Parameters<typeof loadAllPresets>[0];
    printError?: (err: any) => void;
    skipPrompt?: boolean;
};
type ErrorLevel = 'none' | 'error' | 'full';
declare function getErrorLevel({ cliOptions, presetOptions, skipPrompt, }: TelemetryOptions): Promise<ErrorLevel>;
declare function sendTelemetryError(_error: unknown, eventType: EventType, options: TelemetryOptions): Promise<void>;
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
    dependents: Path[];
    type: 'stories';
};
type ErrorEntry = {
    type: 'error';
    err: IndexingError;
};
type CacheEntry = false | StoriesCacheEntry | DocsCacheEntry | ErrorEntry;
type StoryIndexGeneratorOptions = {
    workingDir: Path;
    configDir: Path;
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
    private lastIndex?;
    private lastStats?;
    private lastError?;
    constructor(specifiers: NormalizedStoriesSpecifier[], options: StoryIndexGeneratorOptions);
    initialize(): Promise<void>;
    /** Run the updater function over all the empty cache entries */
    updateExtracted(updater: (specifier: NormalizedStoriesSpecifier, absolutePath: Path, existingEntry: CacheEntry) => Promise<CacheEntry>, overwrite?: boolean): Promise<void>;
    isDocsMdx(absolutePath: Path): boolean;
    ensureExtracted({ projectTags, }: {
        projectTags?: Tag[];
    }): Promise<{
        entries: (IndexEntry | ErrorEntry)[];
        stats: IndexStatsSummary;
    }>;
    findDependencies(absoluteImports: Path[]): StoriesCacheEntry[];
    /**
     * Try to find the component path from a raw import string and return it in the same format as
     * `importPath`. Respect tsconfig paths if available.
     *
     * If no such file exists, assume that the import is from a package and return the raw
     */
    resolveComponentPath(rawComponentPath: Path, absolutePath: Path, matchPath: MatchPath | undefined): string;
    extractStories(specifier: NormalizedStoriesSpecifier, absolutePath: Path, projectTags?: Tag[]): Promise<StoriesCacheEntry | DocsCacheEntry>;
    extractDocs(specifier: NormalizedStoriesSpecifier, absolutePath: Path, projectTags?: Tag[]): Promise<false | DocsIndexEntry>;
    chooseDuplicate(firstEntry: IndexEntry, secondEntry: IndexEntry, projectTags: Tag[]): IndexEntry;
    sortStories(entries: StoryIndex['entries'], storySortParameter: any): Promise<Record<string, IndexEntry>>;
    getIndex(): Promise<StoryIndex>;
    getIndexAndStats(): Promise<{
        storyIndex: StoryIndex;
        stats: IndexStatsSummary;
    }>;
    invalidateAll(): void;
    invalidate(specifier: NormalizedStoriesSpecifier, importPath: Path, removed: boolean): void;
    getPreviewCode(): Promise<string | undefined>;
    getProjectTags(previewCode?: string): string[];
    storyFileNames(): string[];
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
 * import * as testUtils from '@storybook/test'; // in stories
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

export { type BuildStaticStandaloneOptions, StoryIndexGenerator, build, buildDevStandalone, buildStaticStandalone, MockUniversalStore as experimental_MockUniversalStore, UniversalStore as experimental_UniversalStore, loadStorybook as experimental_loadStorybook, getErrorLevel, mapStaticDir, sendTelemetryError, withTelemetry };

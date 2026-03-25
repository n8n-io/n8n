import { Channel } from 'storybook/internal/channels';
import * as storybook_internal_types from 'storybook/internal/types';
import { Args, Renderer, StoryContext, DecoratorApplicator, StoryId, Addon_StoryWrapper, PreparedStory, Globals, GlobalTypes, StoryIndex, StoryName, ComponentTitle, IndexEntry, Path, StoryAnnotationsOrFn, NormalizedComponentAnnotations, NormalizedStoryAnnotations, ModuleExports, CSFFile, NormalizedProjectAnnotations, ModuleExport, PreparedMeta, ProjectAnnotations, StepRunner, ComposedStoryFn, Store_CSFExports, ComposeStoryFn, LegacyStoryAnnotationsOrFn, ComponentAnnotations, NamedOrDefaultProjectAnnotations, ModuleImportFn, StoryContextForEnhancers, Parameters, StrictArgTypes, ArgTypesEnhancer, LegacyStoryFn, DecoratorFunction, PartialStoryFn, StoryContextUpdate, NormalizedStoriesSpecifier, Addon_StorySortParameterV7, DocsContextProps, ResolvedModuleExportType, ResolvedModuleExportFromType, StoryRenderOptions, RenderContextCallbacks, RenderToCanvas, ViewMode } from 'storybook/internal/types';
import * as storybook_internal_csf from 'storybook/internal/csf';
import { Story, Meta, CleanupCallback, StoryContext as StoryContext$1, Args as Args$1 } from 'storybook/internal/csf';
import { RequestData, ArgTypesRequestPayload } from 'storybook/internal/core-events';

declare class AddonStore {
    constructor();
    private channel;
    private promise;
    private resolve;
    getChannel: () => Channel;
    ready: () => Promise<Channel>;
    hasChannel: () => boolean;
    setChannel: (channel: Channel) => void;
}
declare const addons: AddonStore;

interface Hook {
    name: string;
    memoizedState?: any;
    deps?: any[] | undefined;
}
interface Effect {
    create: () => (() => void) | void;
    destroy?: (() => void) | void;
}
type AbstractFunction = (...args: any[]) => any;
declare class HooksContext<TRenderer extends Renderer, TArgs extends Args = Args> {
    hookListsMap: WeakMap<AbstractFunction, Hook[]>;
    mountedDecorators: Set<AbstractFunction>;
    prevMountedDecorators: Set<AbstractFunction>;
    currentHooks: Hook[];
    nextHookIndex: number;
    currentPhase: 'MOUNT' | 'UPDATE' | 'NONE';
    currentEffects: Effect[];
    prevEffects: Effect[];
    currentDecoratorName: string | null;
    hasUpdates: boolean;
    currentContext: StoryContext<TRenderer, TArgs> | null;
    renderListener: (storyId: StoryId) => void;
    constructor();
    init(): void;
    clean(): void;
    getNextHook(): Hook;
    triggerEffects(): void;
    addRenderListeners(): void;
    removeRenderListeners(): void;
}
declare const applyHooks: <TRenderer extends Renderer>(applyDecorators: DecoratorApplicator<TRenderer>) => DecoratorApplicator<TRenderer>;
/**
 * Returns a memoized value.
 *
 * @example
 *
 * ```ts
 * const memoizedValue = useMemo(() => {
 *   return doExpensiveCalculation(a, b);
 * }, [a, b]);
 * ```
 *
 * @template T The type of the memoized value.
 * @param {() => T} nextCreate A function that returns the memoized value.
 * @param {any[]} [deps] An optional array of dependencies. If any of the dependencies change, the
 *   memoized value will be recomputed.
 * @returns {T} The memoized value.
 */
declare function useMemo<T>(nextCreate: () => T, deps?: any[]): T;
/**
 * Returns a memoized callback.
 *
 * @example
 *
 * ```ts
 * const memoizedCallback = useCallback(() => {
 *   doSomething(a, b);
 * }, [a, b]);
 * ```
 *
 * @template T The type of the callback function.
 * @param {T} callback The callback function to memoize.
 * @param {any[]} [deps] An optional array of dependencies. If any of the dependencies change, the
 *   memoized callback will be recomputed.
 * @returns {T} The memoized callback.
 */
declare function useCallback<T>(callback: T, deps?: any[]): T;
/**
 * Returns a mutable ref object.
 *
 * @example
 *
 * ```ts
 * const ref = useRef(0);
 * ref.current = 1;
 * ```
 *
 * @template T The type of the ref object.
 * @param {T} initialValue The initial value of the ref object.
 * @returns {{ current: T }} The mutable ref object.
 */
declare function useRef<T>(initialValue: T): {
    current: T;
};
/**
 * Returns a stateful value and a function to update it.
 *
 * @example
 *
 * ```ts
 * const [count, setCount] = useState(0);
 * setCount(count + 1);
 * ```
 *
 * @template S The type of the state.
 * @param {(() => S) | S} initialState The initial state value or a function that returns the
 *   initial state value.
 * @returns {[S, (update: ((prevState: S) => S) | S) => void]} An array containing the current state
 *   value and a function to update it.
 */
declare function useState<S>(initialState: (() => S) | S): [S, (update: ((prevState: S) => S) | S) => void];
/**
 * Given a file name, creates an object with utilities to manage a log file. It creates a temporary
 * log file which you can manage with the returned functions. You can then decide whether to move
 * the log file to the users project, or remove it.
 *
 * @example
 *
 * ```tsx
 *   const initialState = { count: 0 };
 *
 *   function reducer(state, action) {
 *     switch (action.type) {
 *       case 'increment':
 *         return { count: state.count + 1 };
 *       case 'decrement':
 *         return { count: state.count - 1 };
 *       default:
 *         throw new Error();
 *       }
 *     }
 *   }
 *   function Counter() {
 *     const [state, dispatch] = useReducer(reducer, initialState);
 *     return (
 *       <>
 *         Count: {state.count}
 *           <button onClick={() => dispatch({ type: 'increment' })}>+</button>
 *           <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
 *       </>
 *     );
 *   }
 * ```
 */
declare function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
declare function useReducer<S, I, A>(reducer: (state: S, action: A) => S, initialArg: I, init: (initialArg: I) => S): [S, (action: A) => void];
/**
 * Triggers a side effect, see https://reactjs.org/docs/hooks-reference.html#usestate Effects are
 * triggered synchronously after rendering the story
 *
 * @example
 *
 * ```ts
 * useEffect(() => {
 *   // Do something after rendering the story
 *   return () => {
 *     // Do something when the component unmounts or the effect is re-run
 *   };
 * }, [dependency1, dependency2]);
 * ```
 *
 * @param {() => (() => void) | void} create A function that creates the effect. It should return a
 *   cleanup function, or nothing.
 * @param {any[]} [deps] An optional array of dependencies. If any of the dependencies change, the
 *   effect will be re-run.
 * @returns {void}
 */
declare function useEffect(create: () => (() => void) | void, deps?: any[]): void;
interface Listener {
    (...args: any[]): void;
}
interface EventMap {
    [eventId: string]: Listener;
}
/**
 * Subscribes to events emitted by the Storybook channel and returns a function to emit events.
 *
 * @example
 *
 * ```ts
 * // Subscribe to an event and emit it
 * const emit = useChannel({ 'my-event': (arg1, arg2) => console.log(arg1, arg2) });
 * emit('my-event', 'Hello', 'world!');
 * ```
 *
 * @param {EventMap} eventMap A map of event listeners to subscribe to.
 * @param {any[]} [deps=[]] An optional array of dependencies. If any of the dependencies change,
 *   the event listeners will be re-subscribed. Default is `[]`
 * @returns {(...args: any[]) => void} A function to emit events to the Storybook channel.
 */
declare function useChannel(eventMap: EventMap, deps?: any[]): (eventName: string, ...args: any) => void;
/**
 * Returns the current story context, including the story's ID, parameters, and other metadata.
 *
 * @example
 *
 * ```ts
 * const { id, parameters } = useStoryContext();
 * console.log(`Current story ID: ${id}`);
 * console.log(`Current story parameters: ${JSON.stringify(parameters)}`);
 * ```
 *
 * @template TRenderer The type of the story's renderer.
 * @template TArgs The type of the story's args.
 * @returns {StoryContext<TRenderer>} The current story context.
 */
declare function useStoryContext<TRenderer extends Renderer, TArgs extends Args = Args>(): StoryContext<TRenderer>;
/**
 * Returns the value of a specific parameter for the current story, or a default value if the
 * parameter is not set.
 *
 * @example
 *
 * ```ts
 * // Retrieve the value of a parameter named "myParam"
 * const myParamValue = useParameter<string>('myParam', 'default value');
 * console.log(`The value of myParam is: ${myParamValue}`);
 * ```
 *
 * @template S The type of the parameter value.
 * @param {string} parameterKey The key of the parameter to retrieve.
 * @param {S} [defaultValue] An optional default value to return if the parameter is not set.
 * @returns {S | undefined} The value of the parameter, or the default value if the parameter is not
 *   set.
 */
declare function useParameter<S>(parameterKey: string, defaultValue?: S): S | undefined;
/**
 * Returns the current args for the story, and functions to update and reset them.
 *
 * @example
 *
 * ```ts
 * const [args, updateArgs, resetArgs] = useArgs<{ name: string; age: number }>();
 * console.log(`Current args: ${JSON.stringify(args)}`);
 * updateArgs({ name: 'John' });
 * resetArgs(['name']);
 * ```
 *
 * @template TArgs The type of the story's args.
 * @returns {[TArgs, (newArgs: Partial<TArgs>) => void, (argNames?: (keyof TArgs)[]) => void]} An
 *   array containing the current args, a function to update them, and a function to reset them.
 */
declare function useArgs<TArgs extends Args = Args>(): [
    TArgs,
    (newArgs: Partial<TArgs>) => void,
    (argNames?: (keyof TArgs)[]) => void
];
/**
 * Returns the current global args for the story, and a function to update them.
 *
 * @example
 *
 * ```ts
 * const [globals, updateGlobals] = useGlobals();
 * console.log(`Current globals: ${JSON.stringify(globals)}`);
 * updateGlobals({ theme: 'dark' });
 * ```
 *
 * @returns {[Args, (newGlobals: Args) => void]} An array containing the current global args, and a
 *   function to update them.
 */
declare function useGlobals(): [Args, (newGlobals: Args) => void];

type MakeDecoratorResult = (...args: any) => any;
interface MakeDecoratorOptions {
    name: string;
    parameterName: string;
    skipIfNoParametersOrOptions?: boolean;
    wrapper: Addon_StoryWrapper;
}
/**
 * Creates a Storybook decorator function that can be used to wrap stories with additional
 * functionality.
 *
 * @example
 *
 * ```jsx
 * const myDecorator = makeDecorator({
 *   name: 'My Decorator',
 *   parameterName: 'myDecorator',
 *   wrapper: (storyFn, context, { options }) => {
 *     const { myOption } = options;
 *     <div style={{ backgroundColor: myOption }}>{storyFn()}</div>;
 *   },
 * });
 *
 * export const decorators = [myDecorator];
 * ```
 *
 * @param {MakeDecoratorOptions} options - The options for the decorator.
 * @param {string} options.name - The name of the decorator.
 * @param {string} options.parameterName - The name of the parameter that will be used to pass
 *   options to the decorator.
 * @param {Addon_StoryWrapper} options.wrapper - The function that will be used to wrap the story.
 * @param {boolean} [options.skipIfNoParametersOrOptions=false] - Whether to skip the decorator if
 *   no options or parameters are provided. Default is `false`
 * @returns {MakeDecoratorResult} A function that can be used as a Storybook decorator.
 */
declare const makeDecorator: ({ name, parameterName, wrapper, skipIfNoParametersOrOptions, }: MakeDecoratorOptions) => MakeDecoratorResult;

declare function mockChannel(): Channel;

declare class ArgsStore {
    initialArgsByStoryId: Record<StoryId, Args>;
    argsByStoryId: Record<StoryId, Args>;
    get(storyId: StoryId): Args;
    setInitial(story: PreparedStory<any>): void;
    updateFromDelta(story: PreparedStory<any>, delta: Args): void;
    updateFromPersisted(story: PreparedStory<any>, persisted: Args): void;
    update(storyId: StoryId, argsUpdate: Partial<Args>): void;
}

declare class GlobalsStore {
    allowedGlobalNames: Set<string>;
    initialGlobals: Globals;
    globals: Globals;
    constructor({ globals, globalTypes, }: {
        globals?: Globals;
        globalTypes?: GlobalTypes;
    });
    set({ globals, globalTypes }: {
        globals?: Globals;
        globalTypes?: GlobalTypes;
    }): void;
    filterAllowedGlobals(globals: Globals): Globals;
    updateFromPersisted(persisted: Globals): void;
    get(): Globals;
    update(newGlobals: Globals): void;
}

type StorySpecifier = StoryId | {
    name: StoryName;
    title: ComponentTitle;
} | '*';
declare class StoryIndexStore {
    entries: StoryIndex['entries'];
    constructor({ entries }?: StoryIndex);
    entryFromSpecifier(specifier: StorySpecifier): IndexEntry | undefined;
    storyIdToEntry(storyId: StoryId): IndexEntry;
    importPathToEntry(importPath: Path): IndexEntry;
}

declare function normalizeStory<TRenderer extends Renderer>(key: StoryId, storyAnnotations: StoryAnnotationsOrFn<TRenderer>, meta: NormalizedComponentAnnotations<TRenderer>): NormalizedStoryAnnotations<TRenderer>;

declare function processCSFFile<TRenderer extends Renderer>(moduleExports: ModuleExports, importPath: Path, title: ComponentTitle): CSFFile<TRenderer>;

declare function prepareStory<TRenderer extends Renderer>(storyAnnotations: NormalizedStoryAnnotations<TRenderer>, componentAnnotations: NormalizedComponentAnnotations<TRenderer>, projectAnnotations: NormalizedProjectAnnotations<TRenderer>): PreparedStory<TRenderer>;
declare function prepareMeta<TRenderer extends Renderer>(componentAnnotations: NormalizedComponentAnnotations<TRenderer>, projectAnnotations: NormalizedProjectAnnotations<TRenderer>, moduleExport: ModuleExport): PreparedMeta<TRenderer>;

declare function normalizeProjectAnnotations<TRenderer extends Renderer>({ argTypes, globalTypes, argTypesEnhancers, decorators, loaders, beforeEach, afterEach, initialGlobals, ...annotations }: ProjectAnnotations<TRenderer>): NormalizedProjectAnnotations<TRenderer>;

declare const normalizeArrays: <T>(array: T[] | T | undefined) => T[];

declare function composeConfigs<TRenderer extends Renderer>(moduleExportList: ModuleExports[]): NormalizedProjectAnnotations<TRenderer>;

/**
 * Compose step runners to create a single step runner that applies each step runner in order.
 *
 * A step runner is a function that takes a defined step:
 *
 * @example
 *
 * ```ts
 * step('label', () => {});
 * ```
 *
 * ...and runs it. The prototypical example is from `core/interactions` where the step runner will
 * decorate all instrumented code inside the step with information about the label.
 *
 * In theory it is possible to have more than one addon that wants to run steps; they can be
 * composed together in a similar fashion to decorators. In some ways step runners are like
 * decorators except it is not intended that they change the context or the play function.
 *
 * The basic implementation of a step runner is `async (label, play, context) => play(context)` --
 * in fact this is what `composeStepRunners([])` will do.
 *
 * @param stepRunners An array of StepRunner
 * @returns A StepRunner that is the composition of the arguments
 */
declare function composeStepRunners<TRenderer extends Renderer>(stepRunners: StepRunner<TRenderer>[]): StepRunner<TRenderer>;

declare global {
    var globalProjectAnnotations: NormalizedProjectAnnotations<any>;
    var defaultProjectAnnotations: ProjectAnnotations<any>;
}
declare function setDefaultProjectAnnotations<TRenderer extends Renderer = Renderer>(_defaultProjectAnnotations: ProjectAnnotations<TRenderer>): void;
declare function setProjectAnnotations<TRenderer extends Renderer = Renderer>(projectAnnotations: NamedOrDefaultProjectAnnotations<TRenderer> | NamedOrDefaultProjectAnnotations<TRenderer>[]): NormalizedProjectAnnotations<TRenderer>;
declare function composeStory<TRenderer extends Renderer = Renderer, TArgs extends Args = Args>(storyAnnotations: LegacyStoryAnnotationsOrFn<TRenderer>, componentAnnotations: ComponentAnnotations<TRenderer, TArgs>, projectAnnotations?: ProjectAnnotations<TRenderer>, defaultConfig?: ProjectAnnotations<TRenderer>, exportsName?: string): ComposedStoryFn<TRenderer, Partial<TArgs>>;
declare function composeStories<TModule extends Store_CSFExports>(storiesImport: TModule, globalConfig: ProjectAnnotations<Renderer>, composeStoryFn?: ComposeStoryFn): {};
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
declare function createPlaywrightTest<TFixture extends {
    extend: any;
}>(baseTest: TFixture): TFixture;

declare function getCsfFactoryAnnotations<TRenderer extends Renderer = Renderer, TArgs extends Args = Args>(story: LegacyStoryAnnotationsOrFn<TRenderer> | Story<Renderer>, meta?: ComponentAnnotations<TRenderer, TArgs> | Meta<Renderer>, projectAnnotations?: ProjectAnnotations<TRenderer>): {
    story: storybook_internal_csf.StoryAnnotations<Renderer, unknown>;
    meta: ComponentAnnotations<Renderer, unknown>;
    preview: storybook_internal_types.NormalizedProjectAnnotations<Renderer>;
} | {
    story: LegacyStoryAnnotationsOrFn<TRenderer>;
    meta: ComponentAnnotations<TRenderer, TArgs> | ComponentAnnotations<Renderer, unknown> | undefined;
    preview: ProjectAnnotations<TRenderer> | undefined;
};

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

declare class StoryStore<TRenderer extends Renderer> {
    importFn: ModuleImportFn;
    storyIndex: StoryIndexStore;
    projectAnnotations: NormalizedProjectAnnotations<TRenderer>;
    userGlobals: GlobalsStore;
    args: ArgsStore;
    hooks: Record<StoryId, HooksContext<TRenderer>>;
    cleanupCallbacks: Record<StoryId, CleanupCallback[] | undefined>;
    cachedCSFFiles?: Record<Path, CSFFile<TRenderer>>;
    processCSFFileWithCache: typeof processCSFFile;
    prepareMetaWithCache: typeof prepareMeta;
    prepareStoryWithCache: typeof prepareStory;
    constructor(storyIndex: StoryIndex, importFn: ModuleImportFn, projectAnnotations: ProjectAnnotations<TRenderer>);
    setProjectAnnotations(projectAnnotations: ProjectAnnotations<TRenderer>): void;
    onStoriesChanged({ importFn, storyIndex, }: {
        importFn?: ModuleImportFn;
        storyIndex?: StoryIndex;
    }): Promise<void>;
    storyIdToEntry(storyId: StoryId): Promise<IndexEntry>;
    loadCSFFileByStoryId(storyId: StoryId): Promise<CSFFile<TRenderer>>;
    loadAllCSFFiles(): Promise<StoryStore<TRenderer>['cachedCSFFiles']>;
    cacheAllCSFFiles(): Promise<void>;
    preparedMetaFromCSFFile({ csfFile }: {
        csfFile: CSFFile<TRenderer>;
    }): PreparedMeta<TRenderer>;
    loadStory({ storyId }: {
        storyId: StoryId;
    }): Promise<PreparedStory<TRenderer>>;
    storyFromCSFFile({ storyId, csfFile, }: {
        storyId: StoryId;
        csfFile: CSFFile<TRenderer>;
    }): PreparedStory<TRenderer>;
    componentStoriesFromCSFFile({ csfFile, }: {
        csfFile: CSFFile<TRenderer>;
    }): PreparedStory<TRenderer>[];
    loadEntry(id: StoryId): Promise<{
        entryExports: ModuleExports;
        csfFiles: CSFFile<TRenderer>[];
    }>;
    getStoryContext(story: PreparedStory<TRenderer>, { forceInitialArgs }?: {
        forceInitialArgs?: boolean | undefined;
    }): {
        args: storybook_internal_csf.Args;
        initialGlobals: storybook_internal_csf.Globals;
        globalTypes: (storybook_internal_csf.GlobalTypes & storybook_internal_csf.StrictGlobalTypes) | undefined;
        userGlobals: storybook_internal_csf.Globals;
        reporting: ReporterAPI;
        globals: {
            [x: string]: any;
        };
        hooks: unknown;
        component?: (TRenderer & {
            T: any;
        })["component"] | undefined;
        subcomponents?: Record<string, (TRenderer & {
            T: any;
        })["component"]> | undefined;
        parameters: storybook_internal_csf.Parameters;
        initialArgs: storybook_internal_csf.Args;
        argTypes: storybook_internal_csf.StrictArgTypes<storybook_internal_csf.Args>;
        componentId: storybook_internal_csf.ComponentId;
        title: storybook_internal_csf.ComponentTitle;
        kind: storybook_internal_csf.ComponentTitle;
        id: StoryId;
        name: storybook_internal_csf.StoryName;
        story: storybook_internal_csf.StoryName;
        tags: storybook_internal_csf.Tag[];
        moduleExport: storybook_internal_types.ModuleExport;
        originalStoryFn: storybook_internal_csf.ArgsStoryFn<TRenderer>;
        undecoratedStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        unboundStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        applyLoaders: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<Record<string, any>>;
        applyBeforeEach: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<CleanupCallback[]>;
        applyAfterEach: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<void>;
        playFunction?: ((context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<void> | void) | undefined;
        runStep: storybook_internal_csf.StepRunner<TRenderer>;
        mount: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => () => Promise<storybook_internal_csf.Canvas>;
        testingLibraryRender?: (...args: never[]) => unknown;
        renderToCanvas?: storybook_internal_types.RenderToCanvas<TRenderer> | undefined;
        usesMount: boolean;
        storyGlobals: storybook_internal_csf.Globals;
    } & Pick<storybook_internal_csf.StoryContextForLoaders<Renderer, storybook_internal_csf.Args>, "allArgs" | "argsByTarget" | "unmappedArgs">;
    addCleanupCallbacks(story: PreparedStory<TRenderer>, ...callbacks: CleanupCallback[]): void;
    cleanupStory(story: PreparedStory<TRenderer>): Promise<void>;
    extract(options?: {
        includeDocsOnly?: boolean;
    }): Record<StoryId, StoryContextForEnhancers<TRenderer>>;
}

/**
 * Safely combine parameters recursively. Only copy objects when needed. Algorithm = always
 * overwrite the existing value UNLESS both values are plain objects. In this case flag the key as
 * "special" and handle it with a heuristic.
 */
declare const combineParameters: (...parameterSets: (Parameters | undefined)[]) => Parameters;

type PropDescriptor = string[] | RegExp;
declare const filterArgTypes: (argTypes: StrictArgTypes, include?: PropDescriptor, exclude?: PropDescriptor) => Partial<StrictArgTypes<storybook_internal_csf.Args>>;

declare const inferControls: ArgTypesEnhancer<Renderer>;

declare function decorateStory<TRenderer extends Renderer>(storyFn: LegacyStoryFn<TRenderer>, decorator: DecoratorFunction<TRenderer>, bindWithContext: (storyFn: LegacyStoryFn<TRenderer>) => PartialStoryFn<TRenderer>): LegacyStoryFn<TRenderer>;
/**
 * Currently StoryContextUpdates are allowed to have any key in the type. However, you cannot
 * overwrite any of the build-it "static" keys.
 *
 * @param inputContextUpdate StoryContextUpdate
 * @returns StoryContextUpdate
 */
declare function sanitizeStoryContextUpdate({ componentId, title, kind, id, name, story, parameters, initialArgs, argTypes, ...update }?: StoryContextUpdate): StoryContextUpdate;
declare function defaultDecorateStory<TRenderer extends Renderer>(storyFn: LegacyStoryFn<TRenderer>, decorators: DecoratorFunction<TRenderer>[]): LegacyStoryFn<TRenderer>;

declare const combineArgs: (value: any, update: any) => Args;

declare const userOrAutoTitleFromSpecifier: (fileName: string | number, entry: NormalizedStoriesSpecifier, userTitle?: string) => string | undefined;
declare const userOrAutoTitle: (fileName: string, storiesEntries: NormalizedStoriesSpecifier[], userTitle?: string) => string | undefined;

declare const sortStoriesV7: (stories: IndexEntry[], storySortParameter: Addon_StorySortParameterV7, fileNameOrder: Path[]) => IndexEntry[];

declare class DocsContext<TRenderer extends Renderer> implements DocsContextProps<TRenderer> {
    channel: Channel;
    protected store: StoryStore<TRenderer>;
    renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement'];
    private componentStoriesValue;
    private storyIdToCSFFile;
    private exportToStory;
    private exportsToCSFFile;
    private nameToStoryId;
    private attachedCSFFiles;
    private primaryStory?;
    constructor(channel: Channel, store: StoryStore<TRenderer>, renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement'], 
    /** The CSF files known (via the index) to be refererenced by this docs file */
    csfFiles: CSFFile<TRenderer>[]);
    referenceCSFFile(csfFile: CSFFile<TRenderer>): void;
    attachCSFFile(csfFile: CSFFile<TRenderer>): void;
    referenceMeta(metaExports: ModuleExports, attach: boolean): void;
    get projectAnnotations(): storybook_internal_types.NormalizedProjectAnnotations<TRenderer>;
    private resolveAttachedModuleExportType;
    private resolveModuleExport;
    resolveOf<TType extends ResolvedModuleExportType>(moduleExportOrType: ModuleExport | TType, validTypes?: TType[]): ResolvedModuleExportFromType<TType, TRenderer>;
    storyIdByName: (storyName: StoryName) => string;
    componentStories: () => PreparedStory<TRenderer>[];
    componentStoriesFromCSFFile: (csfFile: CSFFile<TRenderer>) => PreparedStory<TRenderer>[];
    storyById: (storyId?: StoryId) => PreparedStory<TRenderer>;
    getStoryContext: (story: PreparedStory<TRenderer>) => {
        loaded: {};
        viewMode: string;
        args: storybook_internal_csf.Args;
        initialGlobals: storybook_internal_csf.Globals;
        globalTypes: (storybook_internal_csf.GlobalTypes & storybook_internal_csf.StrictGlobalTypes) | undefined;
        userGlobals: storybook_internal_csf.Globals;
        reporting: ReporterAPI;
        globals: {
            [x: string]: any;
        };
        hooks: unknown;
        component?: (TRenderer & {
            T: any;
        })["component"] | undefined;
        subcomponents?: Record<string, (TRenderer & {
            T: any;
        })["component"]> | undefined;
        parameters: storybook_internal_csf.Parameters;
        initialArgs: storybook_internal_csf.Args;
        argTypes: storybook_internal_csf.StrictArgTypes<storybook_internal_csf.Args>;
        componentId: storybook_internal_csf.ComponentId;
        title: storybook_internal_csf.ComponentTitle;
        kind: storybook_internal_csf.ComponentTitle;
        id: StoryId;
        name: StoryName;
        story: StoryName;
        tags: storybook_internal_csf.Tag[];
        moduleExport: ModuleExport;
        originalStoryFn: storybook_internal_csf.ArgsStoryFn<TRenderer>;
        undecoratedStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        unboundStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        applyLoaders: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<Record<string, any>>;
        applyBeforeEach: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<storybook_internal_csf.CleanupCallback[]>;
        applyAfterEach: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<void>;
        playFunction?: ((context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => Promise<void> | void) | undefined;
        runStep: storybook_internal_csf.StepRunner<TRenderer>;
        mount: (context: storybook_internal_csf.StoryContext<TRenderer, storybook_internal_csf.Args>) => () => Promise<storybook_internal_csf.Canvas>;
        testingLibraryRender?: (...args: never[]) => unknown;
        renderToCanvas?: storybook_internal_types.RenderToCanvas<TRenderer> | undefined;
        usesMount: boolean;
        storyGlobals: storybook_internal_csf.Globals;
        allArgs: any;
        argsByTarget: any;
        unmappedArgs: any;
    };
    loadStory: (id: StoryId) => Promise<PreparedStory<TRenderer>>;
}

type RenderType = 'story' | 'docs';
/**
 * A "Render" represents the rendering of a single entry to a single location
 *
 * The implementations of render are used for two key purposes:
 *
 * - Tracking the state of the rendering as it moves between preparing, rendering and tearing down.
 * - Tracking what is rendered to know if a change requires re-rendering or teardown + recreation.
 */
interface Render<TRenderer extends Renderer> {
    renderId: number;
    type: RenderType;
    id: StoryId;
    isPreparing: () => boolean;
    isEqual: (other: Render<TRenderer>) => boolean;
    disableKeyListeners: boolean;
    teardown?: (options: {
        viewModeChanged: boolean;
    }) => Promise<void>;
    torndown: boolean;
    renderToElement: (canvasElement: TRenderer['canvasElement'], renderStoryToElement?: any, options?: StoryRenderOptions) => Promise<void>;
}

/**
 * A CsfDocsRender is a render of a docs entry that is rendered based on a CSF file.
 *
 * The expectation is the primary CSF file which is the `importPath` for the entry will define a
 * story which may contain the actual rendered JSX code for the template in the `docs.page`
 * parameter.
 *
 * Use cases:
 *
 * - Autodocs, where there is no story, and we fall back to the globally defined template.
 */
declare class CsfDocsRender<TRenderer extends Renderer> implements Render<TRenderer> {
    protected channel: Channel;
    protected store: StoryStore<TRenderer>;
    entry: IndexEntry;
    private callbacks;
    readonly renderId: number;
    readonly type: RenderType;
    readonly subtype = "csf";
    readonly id: StoryId;
    story?: PreparedStory<TRenderer>;
    rerender?: () => Promise<void>;
    teardownRender?: (options: {
        viewModeChanged?: boolean;
    }) => Promise<void>;
    torndown: boolean;
    readonly disableKeyListeners = false;
    preparing: boolean;
    csfFiles?: CSFFile<TRenderer>[];
    constructor(channel: Channel, store: StoryStore<TRenderer>, entry: IndexEntry, callbacks: RenderContextCallbacks<TRenderer>);
    isPreparing(): boolean;
    prepare(): Promise<void>;
    isEqual(other: Render<TRenderer>): boolean;
    docsContext(renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement']): DocsContext<TRenderer>;
    renderToElement(canvasElement: TRenderer['canvasElement'], renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement']): Promise<void>;
    teardown({ viewModeChanged }?: {
        viewModeChanged?: boolean;
    }): Promise<void>;
}

/**
 * A MdxDocsRender is a render of a docs entry that comes from a true MDX file, that is a `.mdx`
 * file that doesn't get compiled to a CSF file.
 *
 * A MDX render can reference (import) zero or more CSF files that contain stories.
 *
 * Use cases:
 *
 * - *.mdx file that may or may not reference a specific CSF file with `<Meta of={} />`
 */
declare class MdxDocsRender<TRenderer extends Renderer> implements Render<TRenderer> {
    protected channel: Channel;
    protected store: StoryStore<TRenderer>;
    entry: IndexEntry;
    private callbacks;
    readonly renderId: number;
    readonly type: RenderType;
    readonly subtype = "mdx";
    readonly id: StoryId;
    private exports?;
    rerender?: () => Promise<void>;
    teardownRender?: (options: {
        viewModeChanged?: boolean;
    }) => Promise<void>;
    torndown: boolean;
    readonly disableKeyListeners = false;
    preparing: boolean;
    csfFiles?: CSFFile<TRenderer>[];
    constructor(channel: Channel, store: StoryStore<TRenderer>, entry: IndexEntry, callbacks: RenderContextCallbacks<TRenderer>);
    isPreparing(): boolean;
    prepare(): Promise<void>;
    isEqual(other: Render<TRenderer>): boolean;
    docsContext(renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement']): DocsContext<TRenderer>;
    renderToElement(canvasElement: TRenderer['canvasElement'], renderStoryToElement: DocsContextProps<TRenderer>['renderStoryToElement']): Promise<void>;
    teardown({ viewModeChanged }?: {
        viewModeChanged?: boolean;
    }): Promise<void>;
}

type RenderPhase = 'preparing' | 'loading' | 'beforeEach' | 'rendering' | 'playing' | 'played' | 'completing' | 'completed' | 'afterEach' | 'finished' | 'aborted' | 'errored';
declare class StoryRender<TRenderer extends Renderer> implements Render<TRenderer> {
    channel: Channel;
    store: StoryStore<TRenderer>;
    private renderToScreen;
    private callbacks;
    id: StoryId;
    viewMode: StoryContext<TRenderer>['viewMode'];
    renderOptions: StoryRenderOptions;
    readonly renderId: number;
    type: RenderType;
    story?: PreparedStory<TRenderer>;
    phase?: RenderPhase;
    private abortController;
    private canvasElement?;
    private notYetRendered;
    private rerenderEnqueued;
    disableKeyListeners: boolean;
    private teardownRender;
    torndown: boolean;
    constructor(channel: Channel, store: StoryStore<TRenderer>, renderToScreen: RenderToCanvas<TRenderer>, callbacks: RenderContextCallbacks<TRenderer> & {
        showStoryDuringRender?: () => void;
    }, id: StoryId, viewMode: StoryContext<TRenderer>['viewMode'], renderOptions?: StoryRenderOptions, story?: PreparedStory<TRenderer>);
    private runPhase;
    private checkIfAborted;
    prepare(): Promise<void>;
    isEqual(other: Render<TRenderer>): boolean;
    isPreparing(): boolean;
    isPending(): boolean;
    renderToElement(canvasElement: TRenderer['canvasElement']): Promise<void>;
    private storyContext;
    render({ initial, forceRemount, }?: {
        initial?: boolean;
        forceRemount?: boolean;
    }): Promise<void>;
    /**
     * Rerender the story. If the story is currently pending (loading/rendering), the rerender will be
     * enqueued, and will be executed after the current render is completed. Rerendering while playing
     * will not be enqueued, and will be executed immediately, to support rendering args changes while
     * playing.
     */
    rerender(): Promise<void>;
    remount(): Promise<void>;
    cancelRender(): void;
    cancelPlayFunction(): void;
    teardown(): Promise<void>;
}

type MaybePromise<T> = Promise<T> | T;
declare class Preview<TRenderer extends Renderer> {
    importFn: ModuleImportFn;
    getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>;
    protected channel: Channel;
    protected storyStoreValue?: StoryStore<TRenderer>;
    renderToCanvas?: RenderToCanvas<TRenderer>;
    storyRenders: StoryRender<TRenderer>[];
    previewEntryError?: Error;
    private projectAnnotationsBeforeInitialization?;
    private beforeAllCleanup?;
    protected storeInitializationPromise: Promise<void>;
    protected resolveStoreInitializationPromise: () => void;
    protected rejectStoreInitializationPromise: (err: Error) => void;
    constructor(importFn: ModuleImportFn, getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>, channel?: Channel, shouldInitialize?: boolean);
    get storyStore(): StoryStore<TRenderer>;
    protected initialize(): Promise<void>;
    ready(): Promise<void>;
    setupListeners(): void;
    getProjectAnnotationsOrRenderError(): Promise<ProjectAnnotations<TRenderer>>;
    initializeWithProjectAnnotations(projectAnnotations: ProjectAnnotations<TRenderer>): Promise<void>;
    runBeforeAllHook(projectAnnotations: ProjectAnnotations<TRenderer>): Promise<void>;
    getStoryIndexFromServer(): Promise<StoryIndex>;
    protected initializeWithStoryIndex(storyIndex: StoryIndex): void;
    setInitialGlobals(): Promise<void>;
    emitGlobals(): void;
    onGetProjectAnnotationsChanged({ getProjectAnnotations, }: {
        getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>;
    }): Promise<void>;
    onStoryIndexChanged(): Promise<void>;
    onStoriesChanged({ importFn, storyIndex, }: {
        importFn?: ModuleImportFn;
        storyIndex?: StoryIndex;
    }): Promise<void>;
    onUpdateGlobals({ globals: updatedGlobals, currentStory, }: {
        globals: Globals;
        currentStory?: PreparedStory<TRenderer>;
    }): Promise<void>;
    onUpdateArgs({ storyId, updatedArgs }: {
        storyId: StoryId;
        updatedArgs: Args;
    }): Promise<void>;
    onRequestArgTypesInfo({ id, payload }: RequestData<ArgTypesRequestPayload>): Promise<void>;
    onResetArgs({ storyId, argNames }: {
        storyId: string;
        argNames?: string[];
    }): Promise<void>;
    onForceReRender(): Promise<void>;
    onForceRemount({ storyId }: {
        storyId: StoryId;
    }): Promise<void>;
    onStoryHotUpdated(): Promise<void>;
    renderStoryToElement(story: PreparedStory<TRenderer>, element: TRenderer['canvasElement'], callbacks: RenderContextCallbacks<TRenderer>, options: StoryRenderOptions): () => Promise<void>;
    teardownRender(render: StoryRender<TRenderer> | CsfDocsRender<TRenderer> | MdxDocsRender<TRenderer>, { viewModeChanged }?: {
        viewModeChanged?: boolean;
    }): Promise<void>;
    loadStory({ storyId }: {
        storyId: StoryId;
    }): Promise<PreparedStory<TRenderer>>;
    getStoryContext(story: PreparedStory<TRenderer>, { forceInitialArgs }?: {
        forceInitialArgs?: boolean | undefined;
    }): {
        args: Args;
        initialGlobals: Globals;
        globalTypes: (storybook_internal_csf.GlobalTypes & storybook_internal_csf.StrictGlobalTypes) | undefined;
        userGlobals: Globals;
        reporting: ReporterAPI;
        globals: {
            [x: string]: any;
        };
        hooks: unknown;
        component?: (TRenderer & {
            T: any;
        })["component"] | undefined;
        subcomponents?: Record<string, (TRenderer & {
            T: any;
        })["component"]> | undefined;
        parameters: storybook_internal_csf.Parameters;
        initialArgs: Args;
        argTypes: storybook_internal_csf.StrictArgTypes<Args>;
        componentId: storybook_internal_csf.ComponentId;
        title: storybook_internal_csf.ComponentTitle;
        kind: storybook_internal_csf.ComponentTitle;
        id: StoryId;
        name: storybook_internal_csf.StoryName;
        story: storybook_internal_csf.StoryName;
        tags: storybook_internal_csf.Tag[];
        moduleExport: storybook_internal_types.ModuleExport;
        originalStoryFn: storybook_internal_csf.ArgsStoryFn<TRenderer>;
        undecoratedStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        unboundStoryFn: storybook_internal_csf.LegacyStoryFn<TRenderer>;
        applyLoaders: (context: storybook_internal_csf.StoryContext<TRenderer, Args>) => Promise<Record<string, any>>;
        applyBeforeEach: (context: storybook_internal_csf.StoryContext<TRenderer, Args>) => Promise<CleanupCallback[]>;
        applyAfterEach: (context: storybook_internal_csf.StoryContext<TRenderer, Args>) => Promise<void>;
        playFunction?: ((context: storybook_internal_csf.StoryContext<TRenderer, Args>) => Promise<void> | void) | undefined;
        runStep: storybook_internal_csf.StepRunner<TRenderer>;
        mount: (context: storybook_internal_csf.StoryContext<TRenderer, Args>) => () => Promise<storybook_internal_csf.Canvas>;
        testingLibraryRender?: (...args: never[]) => unknown;
        renderToCanvas?: RenderToCanvas<TRenderer> | undefined;
        usesMount: boolean;
        storyGlobals: Globals;
    } & Pick<storybook_internal_csf.StoryContextForLoaders<Renderer, Args>, "allArgs" | "argsByTarget" | "unmappedArgs">;
    extract(options?: {
        includeDocsOnly: boolean;
    }): Promise<Record<string, storybook_internal_csf.StoryContextForEnhancers<TRenderer, Args>>>;
    renderPreviewEntryError(reason: string, err: Error): void;
}

interface SelectionSpecifier {
    storySpecifier: StorySpecifier;
    viewMode: ViewMode;
    args?: Args;
    globals?: Args;
}
interface Selection {
    storyId: StoryId;
    viewMode: ViewMode;
}
interface SelectionStore {
    selectionSpecifier: SelectionSpecifier | null;
    selection?: Selection;
    setSelection(selection: Selection): void;
    setQueryParams(queryParams: Record<PropertyKey, unknown>): void;
}

interface View<TStorybookRoot> {
    prepareForStory(story: PreparedStory<any>): TStorybookRoot;
    prepareForDocs(): TStorybookRoot;
    showErrorDisplay(err: {
        message?: string;
        stack?: string;
    }): void;
    showNoPreview(): void;
    showPreparingStory(options?: {
        immediate: boolean;
    }): void;
    showPreparingDocs(options?: {
        immediate: boolean;
    }): void;
    showMain(): void;
    showDocs(): void;
    showStory(): void;
    showStoryDuringRender(): void;
}

type PossibleRender<TRenderer extends Renderer> = StoryRender<TRenderer> | CsfDocsRender<TRenderer> | MdxDocsRender<TRenderer>;
declare class PreviewWithSelection<TRenderer extends Renderer> extends Preview<TRenderer> {
    importFn: ModuleImportFn;
    getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>;
    selectionStore: SelectionStore;
    view: View<TRenderer['canvasElement']>;
    currentSelection?: Selection;
    currentRender?: PossibleRender<TRenderer>;
    constructor(importFn: ModuleImportFn, getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>, selectionStore: SelectionStore, view: View<TRenderer['canvasElement']>);
    setupListeners(): void;
    setInitialGlobals(): Promise<void>;
    initializeWithStoryIndex(storyIndex: StoryIndex): Promise<void>;
    selectSpecifiedStory(): Promise<void>;
    onGetProjectAnnotationsChanged({ getProjectAnnotations, }: {
        getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>;
    }): Promise<void>;
    onStoriesChanged({ importFn, storyIndex, }: {
        importFn?: ModuleImportFn;
        storyIndex?: StoryIndex;
    }): Promise<void>;
    onKeydown(event: KeyboardEvent): void;
    onSetCurrentStory(selection: {
        storyId: StoryId;
        viewMode?: ViewMode;
    }): Promise<void>;
    onUpdateQueryParams(queryParams: any): void;
    onUpdateGlobals({ globals }: {
        globals: Globals;
    }): Promise<void>;
    onUpdateArgs({ storyId, updatedArgs }: {
        storyId: StoryId;
        updatedArgs: Args;
    }): Promise<void>;
    onPreloadStories({ ids }: {
        ids: string[];
    }): Promise<void>;
    protected renderSelection({ persistedArgs }?: {
        persistedArgs?: Args;
    }): Promise<void>;
    teardownRender(render: PossibleRender<TRenderer>, { viewModeChanged }?: {
        viewModeChanged?: boolean;
    }): Promise<void>;
    mainStoryCallbacks(storyId: StoryId): {
        showStoryDuringRender: () => void;
        showMain: () => void;
        showError: (err: {
            title: string;
            description: string;
        }) => void;
        showException: (err: Error) => void;
    };
    renderPreviewEntryError(reason: string, err: Error): void;
    renderMissingStory(): void;
    renderStoryLoadingException(storySpecifier: StorySpecifier, err: Error): void;
    renderException(storyId: StoryId, error: Error): void;
    renderError(storyId: StoryId, { title, description }: {
        title: string;
        description: string;
    }): void;
}

declare class PreviewWeb<TRenderer extends Renderer> extends PreviewWithSelection<TRenderer> {
    importFn: ModuleImportFn;
    getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>;
    constructor(importFn: ModuleImportFn, getProjectAnnotations: () => MaybePromise<ProjectAnnotations<TRenderer>>);
}

declare class UrlStore implements SelectionStore {
    selectionSpecifier: SelectionSpecifier | null;
    selection?: Selection;
    constructor();
    setSelection(selection: Selection): void;
    setQueryParams(queryParams: Record<PropertyKey, unknown>): void;
}

declare enum Mode {
    'MAIN' = "MAIN",
    'NOPREVIEW' = "NOPREVIEW",
    'PREPARING_STORY' = "PREPARING_STORY",
    'PREPARING_DOCS' = "PREPARING_DOCS",
    'ERROR' = "ERROR"
}
declare const layoutClassMap: {
    readonly centered: "sb-main-centered";
    readonly fullscreen: "sb-main-fullscreen";
    readonly padded: "sb-main-padded";
};
type Layout = keyof typeof layoutClassMap | 'none';
declare class WebView implements View<HTMLElement> {
    private currentLayoutClass?;
    private testing;
    private preparingTimeout?;
    constructor();
    prepareForStory(story: PreparedStory<any>): HTMLElement;
    storyRoot(): HTMLElement;
    prepareForDocs(): HTMLElement;
    docsRoot(): HTMLElement;
    applyLayout(layout?: Layout): void;
    checkIfLayoutExists(layout: keyof typeof layoutClassMap): void;
    showMode(mode: Mode): void;
    showErrorDisplay({ message, stack }: {
        message?: string | undefined;
        stack?: string | undefined;
    }): void;
    showNoPreview(): void;
    showPreparingStory({ immediate }?: {
        immediate?: boolean | undefined;
    }): void;
    showPreparingDocs({ immediate }?: {
        immediate?: boolean | undefined;
    }): void;
    showMain(): void;
    showDocs(): void;
    showStory(): void;
    showStoryDuringRender(): void;
}

declare function simulateDOMContentLoaded(): void;
declare function simulatePageLoad($container: any): void;

type ReducedStoryContext = Omit<StoryContext$1<any, Args$1>, 'abortSignal' | 'canvasElement' | 'step' | 'context'>;
declare function emitTransformCode(source: string | undefined, context: ReducedStoryContext): Promise<void>;

declare function pauseAnimations(atEnd?: boolean): CleanupCallback;
declare function waitForAnimations(signal?: AbortSignal): Promise<void>;

export { DocsContext, HooksContext, Preview, PreviewWeb, PreviewWithSelection, type PropDescriptor, type Report, ReporterAPI, type SelectionStore, StoryStore, UrlStore, type View, WebView, addons, applyHooks, combineArgs, combineParameters, composeConfigs, composeStepRunners, composeStories, composeStory, createPlaywrightTest, decorateStory, defaultDecorateStory, emitTransformCode, filterArgTypes, getCsfFactoryAnnotations, inferControls, makeDecorator, mockChannel, normalizeArrays, normalizeProjectAnnotations, normalizeStory, pauseAnimations, prepareMeta, prepareStory, sanitizeStoryContextUpdate, setDefaultProjectAnnotations, setProjectAnnotations, simulateDOMContentLoaded, simulatePageLoad, sortStoriesV7, useArgs, useCallback, useChannel, useEffect, useGlobals, useMemo, useParameter, useReducer, useRef, useState, useStoryContext, userOrAutoTitle, userOrAutoTitleFromSpecifier, waitForAnimations };

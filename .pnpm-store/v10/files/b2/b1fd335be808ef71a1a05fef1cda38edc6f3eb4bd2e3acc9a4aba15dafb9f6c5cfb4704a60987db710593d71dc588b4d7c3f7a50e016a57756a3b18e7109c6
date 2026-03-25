import { App } from 'vue-demi';
import { ComputedRef } from 'vue-demi';
import type { DebuggerEvent } from 'vue-demi';
import { EffectScope } from 'vue-demi';
import type { Plugin as Plugin_2 } from 'vue-demi';
import { Ref } from 'vue-demi';
import { ToRef } from 'vue-demi';
import { ToRefs } from 'vue-demi';
import { UnwrapRef } from 'vue-demi';
import type { WatchOptions } from 'vue-demi';
import { WritableComputedRef } from 'vue-demi';

/**
 * Creates an _accept_ function to pass to `import.meta.hot` in Vite applications.
 *
 * @example
 * ```js
 * const useUser = defineStore(...)
 * if (import.meta.hot) {
 *   import.meta.hot.accept(acceptHMRUpdate(useUser, import.meta.hot))
 * }
 * ```
 *
 * @param initialUseStore - return of the defineStore to hot update
 * @param hot - `import.meta.hot`
 */
export declare function acceptHMRUpdate<Id extends string = string, S extends StateTree = StateTree, G extends _GettersTree<S> = _GettersTree<S>, A = _ActionsTree>(initialUseStore: StoreDefinition<Id, S, G, A>, hot: any): (newModule: any) => any;

/**
 * Type of an object of Actions. For internal usage only.
 * For internal use **only**
 */
export declare type _ActionsTree = Record<string, _Method>;

export declare type _Awaited<T> = T extends null | undefined ? T : T extends object & {
    then(onfulfilled: infer F): any;
} ? F extends (value: infer V, ...args: any) => any ? _Awaited<V> : never : T;

/**
 * Creates a Pinia instance to be used by the application
 */
export declare function createPinia(): Pinia;

/**
 * Recursive `Partial<T>`. Used by {@link Store['$patch']}.
 *
 * For internal use **only**
 */
export declare type _DeepPartial<T> = {
    [K in keyof T]?: _DeepPartial<T[K]>;
};

/**
 * Options parameter of `defineStore()` for setup stores. Can be extended to
 * augment stores with the plugin API. @see {@link DefineStoreOptionsBase}.
 */
export declare interface DefineSetupStoreOptions<Id extends string, S extends StateTree, G, A> extends DefineStoreOptionsBase<S, Store<Id, S, G, A>> {
    /**
     * Extracted actions. Added by useStore(). SHOULD NOT be added by the user when
     * creating the store. Can be used in plugins to get the list of actions in a
     * store defined with a setup function. Note this is always defined
     */
    actions?: A;
}

/**
 * Creates a `useStore` function that retrieves the store instance
 *
 * @param id - id of the store (must be unique)
 * @param options - options to define the store
 */
export declare function defineStore<Id extends string, S extends StateTree = {}, G extends _GettersTree<S> = {}, A = {}>(id: Id, options: Omit<DefineStoreOptions<Id, S, G, A>, 'id'>): StoreDefinition<Id, S, G, A>;

/**
 * Creates a `useStore` function that retrieves the store instance
 *
 * @param options - options to define the store
 */
export declare function defineStore<Id extends string, S extends StateTree = {}, G extends _GettersTree<S> = {}, A = {}>(options: DefineStoreOptions<Id, S, G, A>): StoreDefinition<Id, S, G, A>;

/**
 * Creates a `useStore` function that retrieves the store instance
 *
 * @param id - id of the store (must be unique)
 * @param storeSetup - function that defines the store
 * @param options - extra options
 */
export declare function defineStore<Id extends string, SS>(id: Id, storeSetup: (helpers: SetupStoreHelpers) => SS, options?: DefineSetupStoreOptions<Id, _ExtractStateFromSetupStore<SS>, _ExtractGettersFromSetupStore<SS>, _ExtractActionsFromSetupStore<SS>>): StoreDefinition<Id, _ExtractStateFromSetupStore<SS>, _ExtractGettersFromSetupStore<SS>, _ExtractActionsFromSetupStore<SS>>;

/**
 * Options parameter of `defineStore()` for option stores. Can be extended to
 * augment stores with the plugin API. @see {@link DefineStoreOptionsBase}.
 */
export declare interface DefineStoreOptions<Id extends string, S extends StateTree, G, A> extends DefineStoreOptionsBase<S, Store<Id, S, G, A>> {
    /**
     * Unique string key to identify the store across the application.
     */
    id: Id;
    /**
     * Function to create a fresh state. **Must be an arrow function** to ensure
     * correct typings!
     */
    state?: () => S;
    /**
     * Optional object of getters.
     */
    getters?: G & ThisType<UnwrapRef<S> & _StoreWithGetters<G> & PiniaCustomProperties> & _GettersTree<S>;
    /**
     * Optional object of actions.
     */
    actions?: A & ThisType<A & UnwrapRef<S> & _StoreWithState<Id, S, G, A> & _StoreWithGetters<G> & PiniaCustomProperties>;
    /**
     * Allows hydrating the store during SSR when complex state (like client side only refs) are used in the store
     * definition and copying the value from `pinia.state` isn't enough.
     *
     * @example
     * If in your `state`, you use any `customRef`s, any `computed`s, or any `ref`s that have a different value on
     * Server and Client, you need to manually hydrate them. e.g., a custom ref that is stored in the local
     * storage:
     *
     * ```ts
     * const useStore = defineStore('main', {
     *   state: () => ({
     *     n: useLocalStorage('key', 0)
     *   }),
     *   hydrate(storeState, initialState) {
     *     // @ts-expect-error: https://github.com/microsoft/TypeScript/issues/43826
     *     storeState.n = useLocalStorage('key', 0)
     *   }
     * })
     * ```
     *
     * @param storeState - the current state in the store
     * @param initialState - initialState
     */
    hydrate?(storeState: UnwrapRef<S>, initialState: UnwrapRef<S>): void;
}

/**
 * Options passed to `defineStore()` that are common between option and setup
 * stores. Extend this interface if you want to add custom options to both kinds
 * of stores.
 */
export declare interface DefineStoreOptionsBase<S extends StateTree, Store> {
}

/**
 * Available `options` when creating a pinia plugin.
 */
export declare interface DefineStoreOptionsInPlugin<Id extends string, S extends StateTree, G, A> extends Omit<DefineStoreOptions<Id, S, G, A>, 'id' | 'actions'> {
    /**
     * Extracted object of actions. Added by useStore() when the store is built
     * using the setup API, otherwise uses the one passed to `defineStore()`.
     * Defaults to an empty object if no actions are defined.
     */
    actions: A;
}

/**
 * Dispose a Pinia instance by stopping its effectScope and removing the state, plugins and stores. This is mostly
 * useful in tests, with both a testing pinia or a regular pinia and in applications that use multiple pinia instances.
 * Once disposed, the pinia instance cannot be used anymore.
 *
 * @param pinia - pinia instance
 */
export declare function disposePinia(pinia: Pinia): void;

/**
 * For internal use **only**
 */
export declare type _ExtractActionsFromSetupStore<SS> = SS extends undefined | void ? {} : Pick<SS, _ExtractActionsFromSetupStore_Keys<SS>>;

/**
 * Type that enables refactoring through IDE.
 * For internal use **only**
 */
export declare type _ExtractActionsFromSetupStore_Keys<SS> = keyof {
    [K in keyof SS as SS[K] extends _Method ? K : never]: any;
};

/**
 * For internal use **only**
 */
export declare type _ExtractGettersFromSetupStore<SS> = SS extends undefined | void ? {} : Pick<SS, _ExtractGettersFromSetupStore_Keys<SS>>;

/**
 * Type that enables refactoring through IDE.
 * For internal use **only**
 */
export declare type _ExtractGettersFromSetupStore_Keys<SS> = keyof {
    [K in keyof SS as SS[K] extends ComputedRef ? K : never]: any;
};

/**
 * For internal use **only**
 */
export declare type _ExtractStateFromSetupStore<SS> = SS extends undefined | void ? {} : Pick<SS, _ExtractStateFromSetupStore_Keys<SS>>;

/**
 * Type that enables refactoring through IDE.
 * For internal use **only**
 */
export declare type _ExtractStateFromSetupStore_Keys<SS> = keyof {
    [K in keyof SS as SS[K] extends _Method | ComputedRef ? never : K]: any;
};

/**
 * Get the currently active pinia if there is any.
 */
export declare const getActivePinia: () => Pinia | undefined;

/**
 * Type of an object of Getters that infers the argument. For internal usage only.
 * For internal use **only**
 */
export declare type _GettersTree<S extends StateTree> = Record<string, ((state: UnwrapRef<S> & UnwrapRef<PiniaCustomStateProperties<S>>) => any) | (() => any)>;

/**
 * Internal utility type
 */
declare type _IfEquals<X, Y, A = true, B = false> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

/**
 * Internal utility type
 */
declare type _IsReadonly<T, K extends keyof T> = _IfEquals<{
    [P in K]: T[P];
}, {
    -readonly [P in K]: T[P];
}, false, // Property is not readonly if they are the same
true>;

/**
 * Allows directly using actions from your store without using the composition
 * API (`setup()`) by generating an object to be spread in the `methods` field
 * of a component. The values of the object are the actions while the keys are
 * the names of the resulting methods.
 *
 * @example
 * ```js
 * export default {
 *   methods: {
 *     // other methods properties
 *     // useCounterStore has two actions named `increment` and `setCount`
 *     ...mapActions(useCounterStore, { more: 'increment', setIt: 'setCount' })
 *   },
 *
 *   created() {
 *     this.more()
 *     this.setIt(2)
 *   }
 * }
 * ```
 *
 * @param useStore - store to map from
 * @param keyMapper - object to define new names for the actions
 */
export declare function mapActions<Id extends string, S extends StateTree, G extends _GettersTree<S>, A, KeyMapper extends Record<string, keyof A>>(useStore: StoreDefinition<Id, S, G, A>, keyMapper: KeyMapper): _MapActionsObjectReturn<A, KeyMapper>;

/**
 * Allows directly using actions from your store without using the composition
 * API (`setup()`) by generating an object to be spread in the `methods` field
 * of a component.
 *
 * @example
 * ```js
 * export default {
 *   methods: {
 *     // other methods properties
 *     ...mapActions(useCounterStore, ['increment', 'setCount'])
 *   },
 *
 *   created() {
 *     this.increment()
 *     this.setCount(2) // pass arguments as usual
 *   }
 * }
 * ```
 *
 * @param useStore - store to map from
 * @param keys - array of action names to map
 */
export declare function mapActions<Id extends string, S extends StateTree, G extends _GettersTree<S>, A>(useStore: StoreDefinition<Id, S, G, A>, keys: Array<keyof A>): _MapActionsReturn<A>;

/**
 * For internal use **only**
 */
export declare type _MapActionsObjectReturn<A, T extends Record<string, keyof A>> = {
    [key in keyof T]: A[T[key]];
};

/**
 * For internal use **only**
 */
export declare type _MapActionsReturn<A> = {
    [key in keyof A]: A[key];
};

/**
 * Alias for `mapState()`. You should use `mapState()` instead.
 * @deprecated use `mapState()` instead.
 */
export declare const mapGetters: typeof mapState;

/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component. The values of the object are the state properties/getters
 * while the keys are the names of the resulting computed properties.
 * Optionally, you can also pass a custom function that will receive the store
 * as its first argument. Note that while it has access to the component
 * instance via `this`, it won't be typed.
 *
 * @example
 * ```js
 * export default {
 *   computed: {
 *     // other computed properties
 *     // useCounterStore has a state property named `count` and a getter `double`
 *     ...mapState(useCounterStore, {
 *       n: 'count',
 *       triple: store => store.n * 3,
 *       // note we can't use an arrow function if we want to use `this`
 *       custom(store) {
 *         return this.someComponentValue + store.n
 *       },
 *       doubleN: 'double'
 *     })
 *   },
 *
 *   created() {
 *     this.n // 2
 *     this.doubleN // 4
 *   }
 * }
 * ```
 *
 * @param useStore - store to map from
 * @param keyMapper - object of state properties or getters
 */
export declare function mapState<Id extends string, S extends StateTree, G extends _GettersTree<S> | {
    [key: string]: ComputedRef;
}, A, KeyMapper extends Record<string, keyof S | keyof G | ((store: Store<Id, S, G, A>) => any)>>(useStore: StoreDefinition<Id, S, G, A>, keyMapper: KeyMapper): _MapStateObjectReturn<Id, S, G, A, KeyMapper>;

/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @example
 * ```js
 * export default {
 *   computed: {
 *     // other computed properties
 *     ...mapState(useCounterStore, ['count', 'double'])
 *   },
 *
 *   created() {
 *     this.count // 2
 *     this.double // 4
 *   }
 * }
 * ```
 *
 * @param useStore - store to map from
 * @param keys - array of state properties or getters
 */
export declare function mapState<Id extends string, S extends StateTree, G extends _GettersTree<S> | {
    [key: string]: ComputedRef;
}, A, Keys extends keyof S | keyof G>(useStore: StoreDefinition<Id, S, G, A>, keys: readonly Keys[]): _MapStateReturn<S, G, Keys>;

/**
 * For internal use **only**
 */
export declare type _MapStateObjectReturn<Id extends string, S extends StateTree, G extends _GettersTree<S> | {
    [key: string]: ComputedRef;
}, A, T extends Record<string, keyof S | keyof G | ((store: Store<Id, S, G, A>) => any)> = {}> = {
    [key in keyof T]: () => T[key] extends (store: any) => infer R ? R : T[key] extends keyof Store<Id, S, G, A> ? Store<Id, S, G, A>[T[key]] : never;
};

/**
 * For internal use **only**
 */
export declare type _MapStateReturn<S extends StateTree, G extends _GettersTree<S> | {
    [key: string]: ComputedRef;
}, Keys extends keyof S | keyof G = keyof S | keyof G> = {
    [key in Keys]: key extends keyof Store<string, S, G, {}> ? () => Store<string, S, G, {}>[key] : never;
};

/**
 * Allows using stores without the composition API (`setup()`) by generating an
 * object to be spread in the `computed` field of a component. It accepts a list
 * of store definitions.
 *
 * @example
 * ```js
 * export default {
 *   computed: {
 *     // other computed properties
 *     ...mapStores(useUserStore, useCartStore)
 *   },
 *
 *   created() {
 *     this.userStore // store with id "user"
 *     this.cartStore // store with id "cart"
 *   }
 * }
 * ```
 *
 * @param stores - list of stores to map to an object
 */
export declare function mapStores<Stores extends any[]>(...stores: [...Stores]): _Spread<Stores>;

/**
 * Interface to allow customizing map helpers. Extend this interface with the
 * following properties:
 *
 * - `suffix`: string. Affects the suffix of `mapStores()`, defaults to `Store`.
 */
export declare interface MapStoresCustomization {
}

/**
 * Same as `mapState()` but creates computed setters as well so the state can be
 * modified. Differently from `mapState()`, only `state` properties can be
 * added.
 *
 * @param useStore - store to map from
 * @param keyMapper - object of state properties
 */
export declare function mapWritableState<Id extends string, S extends StateTree, G extends _GettersTree<S>, A, KeyMapper extends Record<string, keyof S>>(useStore: StoreDefinition<Id, S, G, A>, keyMapper: KeyMapper): _MapWritableStateObjectReturn<S, KeyMapper>;

/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keys - array of state properties
 */
export declare function mapWritableState<Id extends string, S extends StateTree, G extends _GettersTree<S>, A, Keys extends keyof S>(useStore: StoreDefinition<Id, S, G, A>, keys: readonly Keys[]): {
    [K in Keys]: {
        get: () => S[K];
        set: (value: S[K]) => any;
    };
};

/**
 * For internal use **only**
 */
export declare type _MapWritableStateObjectReturn<S extends StateTree, T extends Record<string, keyof S>> = {
    [key in keyof T]: {
        get: () => S[T[key]];
        set: (value: S[T[key]]) => any;
    };
};

/**
 * For internal use **only**
 */
export declare type _MapWritableStateReturn<S extends StateTree> = {
    [key in keyof S]: {
        get: () => S[key];
        set: (value: S[key]) => any;
    };
};

/**
 * Generic type for a function that can infer arguments and return type
 *
 * For internal use **only**
 */
export declare type _Method = (...args: any[]) => any;

/**
 * Possible types for SubscriptionCallback
 */
export declare enum MutationType {
    /**
     * Direct mutation of the state:
     *
     * - `store.name = 'new name'`
     * - `store.$state.name = 'new name'`
     * - `store.list.push('new item')`
     */
    direct = "direct",
    /**
     * Mutated the state with `$patch` and an object
     *
     * - `store.$patch({ name: 'newName' })`
     */
    patchObject = "patch object",
    /**
     * Mutated the state with `$patch` and a function
     *
     * - `store.$patch(state => state.name = 'newName')`
     */
    patchFunction = "patch function"
}

/**
 * Every application must own its own pinia to be able to create stores
 */
export declare interface Pinia {
    install: (app: App) => void;
    /**
     * root state
     */
    state: Ref<Record<string, StateTree>>;
    /**
     * Adds a store plugin to extend every store
     *
     * @param plugin - store plugin to add
     */
    use(plugin: PiniaPlugin): Pinia;
    /* Excluded from this release type: _p */
    /* Excluded from this release type: _a */
    /* Excluded from this release type: _e */
    /* Excluded from this release type: _s */
    /* Excluded from this release type: _testing */
}

/**
 * Interface to be extended by the user when they add properties through plugins.
 */
export declare interface PiniaCustomProperties<Id extends string = string, S extends StateTree = StateTree, G = _GettersTree<S>, A = _ActionsTree> {
}

/**
 * Properties that are added to every `store.$state` by `pinia.use()`.
 */
export declare interface PiniaCustomStateProperties<S extends StateTree = StateTree> {
}

/**
 * Plugin to extend every store.
 */
export declare interface PiniaPlugin {
    /**
     * Plugin to extend every store. Returns an object to extend the store or
     * nothing.
     *
     * @param context - Context
     */
    (context: PiniaPluginContext): Partial<PiniaCustomProperties & PiniaCustomStateProperties> | void;
}

/**
 * Context argument passed to Pinia plugins.
 */
export declare interface PiniaPluginContext<Id extends string = string, S extends StateTree = StateTree, G = _GettersTree<S>, A = _ActionsTree> {
    /**
     * pinia instance.
     */
    pinia: Pinia;
    /**
     * Current app created with `Vue.createApp()`.
     */
    app: App;
    /**
     * Current store being extended.
     */
    store: Store<Id, S, G, A>;
    /**
     * Initial options defining the store when calling `defineStore()`.
     */
    options: DefineStoreOptionsInPlugin<Id, S, G, A>;
}

/**
 * Plugin to extend every store.
 * @deprecated use PiniaPlugin instead
 */
export declare type PiniaStorePlugin = PiniaPlugin;

/**
 * Vue 2 Plugin that must be installed for pinia to work. Note **you don't need
 * this plugin if you are using Nuxt.js**. Use the `buildModule` instead:
 * https://pinia.vuejs.org/ssr/nuxt.html.
 *
 * @example
 * ```js
 * import Vue from 'vue'
 * import { PiniaVuePlugin, createPinia } from 'pinia'
 *
 * Vue.use(PiniaVuePlugin)
 * const pinia = createPinia()
 *
 * new Vue({
 *   el: '#app',
 *   // ...
 *   pinia,
 * })
 * ```
 *
 * @param _Vue - `Vue` imported from 'vue'.
 */
export declare const PiniaVuePlugin: Plugin_2;

declare interface _SetActivePinia {
    (pinia: Pinia): Pinia;
    (pinia: undefined): undefined;
    (pinia: Pinia | undefined): Pinia | undefined;
}

/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
export declare const setActivePinia: _SetActivePinia;

/**
 * Changes the suffix added by `mapStores()`. Can be set to an empty string.
 * Defaults to `"Store"`. Make sure to extend the MapStoresCustomization
 * interface if you are using TypeScript.
 *
 * @param suffix - new suffix
 */
export declare function setMapStoreSuffix(suffix: MapStoresCustomization extends Record<'suffix', infer Suffix> ? Suffix : string): void;

/**
 * Return type of `defineStore()` with a setup function.
 * - `Id` is a string literal of the store's name
 * - `SS` is the return type of the setup function
 * @see {@link StoreDefinition}
 */
export declare interface SetupStoreDefinition<Id extends string, SS> extends StoreDefinition<Id, _ExtractStateFromSetupStore<SS>, _ExtractGettersFromSetupStore<SS>, _ExtractActionsFromSetupStore<SS>> {
}

declare interface SetupStoreHelpers {
    action: <Fn extends _Method>(fn: Fn) => Fn;
}

/**
 * Tells Pinia to skip the hydration process of a given object. This is useful in setup stores (only) when you return a
 * stateful object in the store but it isn't really state. e.g. returning a router instance in a setup store.
 *
 * @param obj - target object
 * @returns obj
 */
export declare function skipHydrate<T = any>(obj: T): T;

/**
 * For internal use **only**.
 */
export declare type _Spread<A extends readonly any[]> = A extends [infer L, ...infer R] ? _StoreObject<L> & _Spread<R> : unknown;

/**
 * Generic state of a Store
 */
export declare type StateTree = Record<string | number | symbol, any>;

/**
 * Store type to build a store.
 */
export declare type Store<Id extends string = string, S extends StateTree = {}, G = {}, A = {}> = _StoreWithState<Id, S, G, A> & UnwrapRef<S> & _StoreWithGetters<G> & (_ActionsTree extends A ? {} : A) & PiniaCustomProperties<Id, S, G, A> & PiniaCustomStateProperties<S>;

/**
 * Extract the actions of a store type. Works with both a Setup Store or an
 * Options Store.
 */
export declare type StoreActions<SS> = SS extends Store<string, StateTree, _GettersTree<StateTree>, infer A> ? A : _ExtractActionsFromSetupStore<SS>;

/**
 * Return type of `defineStore()`. Function that allows instantiating a store.
 */
export declare interface StoreDefinition<Id extends string = string, S extends StateTree = StateTree, G = _GettersTree<S>, A = _ActionsTree> {
    /**
     * Returns a store, creates it if necessary.
     *
     * @param pinia - Pinia instance to retrieve the store
     * @param hot - dev only hot module replacement
     */
    (pinia?: Pinia | null | undefined, hot?: StoreGeneric): Store<Id, S, G, A>;
    /**
     * Id of the store. Used by map helpers.
     */
    $id: Id;
    /* Excluded from this release type: _pinia */
}

/**
 * Generic and type-unsafe version of Store. Doesn't fail on access with
 * strings, making it much easier to write generic functions that do not care
 * about the kind of store that is passed.
 */
export declare type StoreGeneric = Store<string, StateTree, _GettersTree<StateTree>, _ActionsTree>;

/**
 * Extract the getters of a store type. Works with both a Setup Store or an
 * Options Store.
 */
export declare type StoreGetters<SS> = SS extends Store<string, StateTree, infer G, _ActionsTree> ? _StoreWithGetters<G> : _ExtractGettersFromSetupStore<SS>;

/**
 * For internal use **only**.
 */
export declare type _StoreObject<S> = S extends StoreDefinition<infer Ids, infer State, infer Getters, infer Actions> ? {
    [Id in `${Ids}${MapStoresCustomization extends Record<'suffix', infer Suffix> ? Suffix : 'Store'}`]: () => Store<Id extends `${infer RealId}${MapStoresCustomization extends Record<'suffix', infer Suffix> ? Suffix : 'Store'}` ? RealId : string, State, Getters, Actions>;
} : {};

/**
 * Argument of `store.$onAction()`
 */
export declare type StoreOnActionListener<Id extends string, S extends StateTree, G, A> = (context: StoreOnActionListenerContext<Id, S, G, {} extends A ? _ActionsTree : A>) => void;

/**
 * Context object passed to callbacks of `store.$onAction(context => {})`
 * TODO: should have only the Id, the Store and Actions to generate the proper object
 */
export declare type StoreOnActionListenerContext<Id extends string, S extends StateTree, G, A> = _ActionsTree extends A ? _StoreOnActionListenerContext<StoreGeneric, string, _ActionsTree> : {
    [Name in keyof A]: Name extends string ? _StoreOnActionListenerContext<Store<Id, S, G, A>, Name, A> : never;
}[keyof A];

/**
 * Actual type for {@link StoreOnActionListenerContext}. Exists for refactoring
 * purposes. For internal use only.
 * For internal use **only**
 */
export declare interface _StoreOnActionListenerContext<Store, ActionName extends string, A> {
    /**
     * Name of the action
     */
    name: ActionName;
    /**
     * Store that is invoking the action
     */
    store: Store;
    /**
     * Parameters passed to the action
     */
    args: A extends Record<ActionName, _Method> ? Parameters<A[ActionName]> : unknown[];
    /**
     * Sets up a hook once the action is finished. It receives the return value
     * of the action, if it's a Promise, it will be unwrapped.
     */
    after: (callback: A extends Record<ActionName, _Method> ? (resolvedReturn: _Awaited<ReturnType<A[ActionName]>>) => void : () => void) => void;
    /**
     * Sets up a hook if the action fails. Return `false` to catch the error and
     * stop it from propagating.
     */
    onError: (callback: (error: unknown) => void) => void;
}

/**
 * Properties of a store.
 */
export declare interface StoreProperties<Id extends string> {
    /**
     * Unique identifier of the store
     */
    $id: Id;
    /* Excluded from this release type: _p */
    /* Excluded from this release type: _getters */
    /* Excluded from this release type: _isOptionsAPI */
    /**
     * Used by devtools plugin to retrieve properties added with plugins. Removed
     * in production. Can be used by the user to add property keys of the store
     * that should be displayed in devtools.
     */
    _customProperties: Set<string>;
    /* Excluded from this release type: _hotUpdate */
    /* Excluded from this release type: _hotUpdating */
    /* Excluded from this release type: _hmrPayload */
}

/**
 * Extract the state of a store type. Works with both a Setup Store or an
 * Options Store. Note this unwraps refs.
 */
export declare type StoreState<SS> = SS extends Store<string, infer S, _GettersTree<StateTree>, _ActionsTree> ? UnwrapRef<S> : _ExtractStateFromSetupStore<SS>;

/**
 * Extracts the return type for `storeToRefs`.
 * Will convert any `getters` into `ComputedRef`.
 */
declare type StoreToRefs<SS extends StoreGeneric> = _ToStateRefs<SS> & ToRefs<PiniaCustomStateProperties<StoreState<SS>>> & _ToComputedRefs<StoreGetters<SS>>;

/**
 * Creates an object of references with all the state, getters, and plugin-added
 * state properties of the store. Similar to `toRefs()` but specifically
 * designed for Pinia stores so methods and non reactive properties are
 * completely ignored.
 *
 * @param store - store to extract the refs from
 */
export declare function storeToRefs<SS extends StoreGeneric>(store: SS): StoreToRefs<SS>;

/**
 * Store augmented for actions. For internal usage only.
 * For internal use **only**
 */
export declare type _StoreWithActions<A> = {
    [k in keyof A]: A[k] extends (...args: infer P) => infer R ? (...args: P) => R : never;
};

/**
 * Store augmented with getters. For internal usage only.
 * For internal use **only**
 */
export declare type _StoreWithGetters<G> = _StoreWithGetters_Readonly<G> & _StoreWithGetters_Writable<G>;

/**
 * Store augmented with readonly getters. For internal usage **only**.
 */
declare type _StoreWithGetters_Readonly<G> = {
    readonly [K in keyof G as G[K] extends (...args: any[]) => any ? K : ComputedRef extends G[K] ? K : never]: G[K] extends (...args: any[]) => infer R ? R : UnwrapRef<G[K]>;
};

/**
 * Store augmented with writable getters. For internal usage **only**.
 */
declare type _StoreWithGetters_Writable<G> = {
    [K in keyof G as G[K] extends WritableComputedRef<any> ? K : never]: G[K] extends WritableComputedRef<infer R, infer _S> ? R : never;
};

/**
 * Base store with state and functions. Should not be used directly.
 */
export declare interface _StoreWithState<Id extends string, S extends StateTree, G, A> extends StoreProperties<Id> {
    /**
     * State of the Store. Setting it will internally call `$patch()` to update the state.
     */
    $state: UnwrapRef<S> & PiniaCustomStateProperties<S>;
    /**
     * Applies a state patch to current state. Allows passing nested values
     *
     * @param partialState - patch to apply to the state
     */
    $patch(partialState: _DeepPartial<UnwrapRef<S>>): void;
    /**
     * Group multiple changes into one function. Useful when mutating objects like
     * Sets or arrays and applying an object patch isn't practical, e.g. appending
     * to an array. The function passed to `$patch()` **must be synchronous**.
     *
     * @param stateMutator - function that mutates `state`, cannot be asynchronous
     */
    $patch<F extends (state: UnwrapRef<S>) => any>(stateMutator: ReturnType<F> extends Promise<any> ? never : F): void;
    /**
     * Resets the store to its initial state by building a new state object.
     */
    $reset(): void;
    /**
     * Setups a callback to be called whenever the state changes. It also returns a function to remove the callback. Note
     * that when calling `store.$subscribe()` inside of a component, it will be automatically cleaned up when the
     * component gets unmounted unless `detached` is set to true.
     *
     * @param callback - callback passed to the watcher
     * @param options - `watch` options + `detached` to detach the subscription from the context (usually a component)
     * this is called from. Note that the `flush` option does not affect calls to `store.$patch()`.
     * @returns function that removes the watcher
     */
    $subscribe(callback: SubscriptionCallback<S>, options?: {
        detached?: boolean;
    } & WatchOptions): () => void;
    /**
     * Setups a callback to be called every time an action is about to get
     * invoked. The callback receives an object with all the relevant information
     * of the invoked action:
     * - `store`: the store it is invoked on
     * - `name`: The name of the action
     * - `args`: The parameters passed to the action
     *
     * On top of these, it receives two functions that allow setting up a callback
     * once the action finishes or when it fails.
     *
     * It also returns a function to remove the callback. Note than when calling
     * `store.$onAction()` inside of a component, it will be automatically cleaned
     * up when the component gets unmounted unless `detached` is set to true.
     *
     * @example
     *
     *```js
     *store.$onAction(({ after, onError }) => {
     *  // Here you could share variables between all of the hooks as well as
     *  // setting up watchers and clean them up
     *  after((resolvedValue) => {
     *    // can be used to cleanup side effects
     * .  // `resolvedValue` is the value returned by the action, if it's a
     * .  // Promise, it will be the resolved value instead of the Promise
     *  })
     *  onError((error) => {
     *    // can be used to pass up errors
     *  })
     *})
     *```
     *
     * @param callback - callback called before every action
     * @param detached - detach the subscription from the context this is called from
     * @returns function that removes the watcher
     */
    $onAction(callback: StoreOnActionListener<Id, S, G, A>, detached?: boolean): () => void;
    /**
     * Stops the associated effect scope of the store and remove it from the store
     * registry. Plugins can override this method to cleanup any added effects.
     * e.g. devtools plugin stops displaying disposed stores from devtools.
     * Note this doesn't delete the state of the store, you have to do it manually with
     * `delete pinia.state.value[store.$id]` if you want to. If you don't and the
     * store is used again, it will reuse the previous state.
     */
    $dispose(): void;
    /* Excluded from this release type: _r */
}

/**
 * Callback of a subscription
 */
export declare type SubscriptionCallback<S> = (
/**
 * Object with information relative to the store mutation that triggered the
 * subscription.
 */
mutation: SubscriptionCallbackMutation<S>, 
/**
 * State of the store when the subscription is triggered. Same as
 * `store.$state`.
 */
state: UnwrapRef<S>) => void;

/**
 * Context object passed to a subscription callback.
 */
export declare type SubscriptionCallbackMutation<S> = SubscriptionCallbackMutationDirect | SubscriptionCallbackMutationPatchObject<S> | SubscriptionCallbackMutationPatchFunction;

/**
 * Base type for the context passed to a subscription callback. Internal type.
 */
export declare interface _SubscriptionCallbackMutationBase {
    /**
     * Type of the mutation.
     */
    type: MutationType;
    /**
     * `id` of the store doing the mutation.
     */
    storeId: string;
    /**
     * 🔴 DEV ONLY, DO NOT use for production code. Different mutation calls. Comes from
     * https://vuejs.org/guide/extras/reactivity-in-depth.html#reactivity-debugging and allows to track mutations in
     * devtools and plugins **during development only**.
     */
    events?: DebuggerEvent[] | DebuggerEvent;
}

/**
 * Context passed to a subscription callback when directly mutating the state of
 * a store with `store.someState = newValue` or `store.$state.someState =
 * newValue`.
 */
export declare interface SubscriptionCallbackMutationDirect extends _SubscriptionCallbackMutationBase {
    type: MutationType.direct;
    events: DebuggerEvent;
}

/**
 * Context passed to a subscription callback when `store.$patch()` is called
 * with a function.
 */
export declare interface SubscriptionCallbackMutationPatchFunction extends _SubscriptionCallbackMutationBase {
    type: MutationType.patchFunction;
    events: DebuggerEvent[];
}

/**
 * Context passed to a subscription callback when `store.$patch()` is called
 * with an object.
 */
export declare interface SubscriptionCallbackMutationPatchObject<S> extends _SubscriptionCallbackMutationBase {
    type: MutationType.patchObject;
    events: DebuggerEvent[];
    /**
     * Object passed to `store.$patch()`.
     */
    payload: _DeepPartial<UnwrapRef<S>>;
}

/**
 * Extracts the getters of a store while keeping writable and readonly properties. **Internal type DO NOT USE**.
 */
declare type _ToComputedRefs<SS> = {
    [K in keyof SS]: true extends _IsReadonly<SS, K> ? ComputedRef<SS[K]> : WritableComputedRef<SS[K]>;
};

/**
 * Extracts the refs of a state object from a store. If the state value is a Ref or type that extends ref, it will be kept as is.
 * Otherwise, it will be converted into a Ref. **Internal type DO NOT USE**.
 */
declare type _ToStateRefs<SS> = SS extends Store<string, infer UnwrappedState, _GettersTree<StateTree>, _ActionsTree> ? UnwrappedState extends _UnwrapAll<Pick<infer State, infer Key>> ? {
    [K in Key]: ToRef<State[K]>;
} : ToRefs<UnwrappedState> : ToRefs<StoreState<SS>>;

/**
 * Type that enables refactoring through IDE.
 * For internal use **only**
 */
export declare type _UnwrapAll<SS> = {
    [K in keyof SS]: UnwrapRef<SS[K]>;
};

export { }

// Extensions of Vue types to be appended manually
// https://github.com/microsoft/rushstack/issues/2090
// https://github.com/microsoft/rushstack/issues/1709

// @ts-ignore: works on Vue 2, fails in Vue 3
declare module 'vue/types/vue' {
  interface Vue {
    /**
     * Currently installed pinia instance.
     */
    $pinia: Pinia

    /**
     * Cache of stores instantiated by the current instance. Used by map
     * helpers. Used internally by Pinia.
     *
     * @internal
     */
    _pStores?: Record<string, Store>
  }
}

// @ts-ignore: works on Vue 2, fails in Vue 3
declare module 'vue/types/options' {
  interface ComponentOptions<V> {
    /**
     * Pinia instance to install in your application. Should be passed to the
     * root Vue.
     */
    pinia?: Pinia
  }
}

/**
 * NOTE: Used to be `@vue/runtime-core` but it break types from time to time. Then, in Vue docs, we started recommending
 * to use `vue` instead of `@vue/runtime-core` but that broke others' types so we reverted it. Now, local types do not
 * work if we use `@vue/runtime-core` so we are using `vue` again.
 */
// @ts-ignore: works on Vue 3, fails in Vue 2
declare module 'vue' {
  // This seems to be needed to not break auto import types based on the order
  // https://github.com/vuejs/pinia/pull/2730
  interface GlobalComponents {}
  interface ComponentCustomProperties {
    /**
     * Access to the application's Pinia
     */
    $pinia: Pinia

    /**
     * Cache of stores instantiated by the current instance. Used by devtools to
     * list currently used stores. Used internally by Pinia.
     *
     * @internal
     */
    _pStores?: Record<string, StoreGeneric>
  }
}

// normally this is only needed in .d.ts files
export {}

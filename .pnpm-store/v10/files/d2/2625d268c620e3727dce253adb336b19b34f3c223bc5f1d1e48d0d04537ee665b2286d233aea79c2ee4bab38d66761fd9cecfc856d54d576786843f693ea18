/*!
 * pinia v2.2.4
 * (c) 2024 Eduardo San Martin Morote
 * @license MIT
 */
'use strict';

var vueDemi = require('vue-demi');

/**
 * setActivePinia must be called to handle SSR at the top of functions like
 * `fetch`, `setup`, `serverPrefetch` and others
 */
let activePinia;
/**
 * Sets or unsets the active pinia. Used in SSR and internally when calling
 * actions and getters
 *
 * @param pinia - Pinia instance
 */
// @ts-expect-error: cannot constrain the type of the return
const setActivePinia = (pinia) => (activePinia = pinia);
/**
 * Get the currently active pinia if there is any.
 */
const getActivePinia = () => (vueDemi.hasInjectionContext() && vueDemi.inject(piniaSymbol)) || activePinia;
const piniaSymbol = (/* istanbul ignore next */ Symbol());

function isPlainObject(
// eslint-disable-next-line @typescript-eslint/no-explicit-any
o) {
    return (o &&
        typeof o === 'object' &&
        Object.prototype.toString.call(o) === '[object Object]' &&
        typeof o.toJSON !== 'function');
}
// type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }
// TODO: can we change these to numbers?
/**
 * Possible types for SubscriptionCallback
 */
exports.MutationType = void 0;
(function (MutationType) {
    /**
     * Direct mutation of the state:
     *
     * - `store.name = 'new name'`
     * - `store.$state.name = 'new name'`
     * - `store.list.push('new item')`
     */
    MutationType["direct"] = "direct";
    /**
     * Mutated the state with `$patch` and an object
     *
     * - `store.$patch({ name: 'newName' })`
     */
    MutationType["patchObject"] = "patch object";
    /**
     * Mutated the state with `$patch` and a function
     *
     * - `store.$patch(state => state.name = 'newName')`
     */
    MutationType["patchFunction"] = "patch function";
    // maybe reset? for $state = {} and $reset
})(exports.MutationType || (exports.MutationType = {}));

const IS_CLIENT = typeof window !== 'undefined';

/**
 * Creates a Pinia instance to be used by the application
 */
function createPinia() {
    const scope = vueDemi.effectScope(true);
    // NOTE: here we could check the window object for a state and directly set it
    // if there is anything like it with Vue 3 SSR
    const state = scope.run(() => vueDemi.ref({}));
    let _p = [];
    // plugins added before calling app.use(pinia)
    let toBeInstalled = [];
    const pinia = vueDemi.markRaw({
        install(app) {
            // this allows calling useStore() outside of a component setup after
            // installing pinia's plugin
            setActivePinia(pinia);
            if (!vueDemi.isVue2) {
                pinia._a = app;
                app.provide(piniaSymbol, pinia);
                app.config.globalProperties.$pinia = pinia;
                toBeInstalled.forEach((plugin) => _p.push(plugin));
                toBeInstalled = [];
            }
        },
        use(plugin) {
            if (!this._a && !vueDemi.isVue2) {
                toBeInstalled.push(plugin);
            }
            else {
                _p.push(plugin);
            }
            return this;
        },
        _p,
        // it's actually undefined here
        // @ts-expect-error
        _a: null,
        _e: scope,
        _s: new Map(),
        state,
    });
    return pinia;
}
/**
 * Dispose a Pinia instance by stopping its effectScope and removing the state, plugins and stores. This is mostly
 * useful in tests, with both a testing pinia or a regular pinia and in applications that use multiple pinia instances.
 * Once disposed, the pinia instance cannot be used anymore.
 *
 * @param pinia - pinia instance
 */
function disposePinia(pinia) {
    pinia._e.stop();
    pinia._s.clear();
    pinia._p.splice(0);
    pinia.state.value = {};
    // @ts-expect-error: non valid
    pinia._a = null;
}

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
function acceptHMRUpdate(initialUseStore, hot) {
    // strip as much as possible from iife.prod
    {
        return () => { };
    }
}

const noop = () => { };
function addSubscription(subscriptions, callback, detached, onCleanup = noop) {
    subscriptions.push(callback);
    const removeSubscription = () => {
        const idx = subscriptions.indexOf(callback);
        if (idx > -1) {
            subscriptions.splice(idx, 1);
            onCleanup();
        }
    };
    if (!detached && vueDemi.getCurrentScope()) {
        vueDemi.onScopeDispose(removeSubscription);
    }
    return removeSubscription;
}
function triggerSubscriptions(subscriptions, ...args) {
    subscriptions.slice().forEach((callback) => {
        callback(...args);
    });
}

const fallbackRunWithContext = (fn) => fn();
/**
 * Marks a function as an action for `$onAction`
 * @internal
 */
const ACTION_MARKER = Symbol();
/**
 * Action name symbol. Allows to add a name to an action after defining it
 * @internal
 */
const ACTION_NAME = Symbol();
function mergeReactiveObjects(target, patchToApply) {
    // Handle Map instances
    if (target instanceof Map && patchToApply instanceof Map) {
        patchToApply.forEach((value, key) => target.set(key, value));
    }
    else if (target instanceof Set && patchToApply instanceof Set) {
        // Handle Set instances
        patchToApply.forEach(target.add, target);
    }
    // no need to go through symbols because they cannot be serialized anyway
    for (const key in patchToApply) {
        if (!patchToApply.hasOwnProperty(key))
            continue;
        const subPatch = patchToApply[key];
        const targetValue = target[key];
        if (isPlainObject(targetValue) &&
            isPlainObject(subPatch) &&
            target.hasOwnProperty(key) &&
            !vueDemi.isRef(subPatch) &&
            !vueDemi.isReactive(subPatch)) {
            // NOTE: here I wanted to warn about inconsistent types but it's not possible because in setup stores one might
            // start the value of a property as a certain type e.g. a Map, and then for some reason, during SSR, change that
            // to `undefined`. When trying to hydrate, we want to override the Map with `undefined`.
            target[key] = mergeReactiveObjects(targetValue, subPatch);
        }
        else {
            // @ts-expect-error: subPatch is a valid value
            target[key] = subPatch;
        }
    }
    return target;
}
const skipHydrateSymbol = /* istanbul ignore next */ Symbol();
const skipHydrateMap = /*#__PURE__*/ new WeakMap();
/**
 * Tells Pinia to skip the hydration process of a given object. This is useful in setup stores (only) when you return a
 * stateful object in the store but it isn't really state. e.g. returning a router instance in a setup store.
 *
 * @param obj - target object
 * @returns obj
 */
function skipHydrate(obj) {
    return vueDemi.isVue2
        ? // in @vue/composition-api, the refs are sealed so defineProperty doesn't work...
            /* istanbul ignore next */ skipHydrateMap.set(obj, 1) && obj
        : Object.defineProperty(obj, skipHydrateSymbol, {});
}
/**
 * Returns whether a value should be hydrated
 *
 * @param obj - target variable
 * @returns true if `obj` should be hydrated
 */
function shouldHydrate(obj) {
    return vueDemi.isVue2
        ? /* istanbul ignore next */ !skipHydrateMap.has(obj)
        : !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}
const { assign } = Object;
function isComputed(o) {
    return !!(vueDemi.isRef(o) && o.effect);
}
function createOptionsStore(id, options, pinia, hot) {
    const { state, actions, getters } = options;
    const initialState = pinia.state.value[id];
    let store;
    function setup() {
        if (!initialState && (!false)) {
            /* istanbul ignore if */
            if (vueDemi.isVue2) {
                vueDemi.set(pinia.state.value, id, state ? state() : {});
            }
            else {
                pinia.state.value[id] = state ? state() : {};
            }
        }
        // avoid creating a state in pinia.state.value
        const localState = vueDemi.toRefs(pinia.state.value[id]);
        return assign(localState, actions, Object.keys(getters || {}).reduce((computedGetters, name) => {
            computedGetters[name] = vueDemi.markRaw(vueDemi.computed(() => {
                setActivePinia(pinia);
                // it was created just before
                const store = pinia._s.get(id);
                // allow cross using stores
                /* istanbul ignore if */
                if (vueDemi.isVue2 && !store._r)
                    return;
                // @ts-expect-error
                // return getters![name].call(context, context)
                // TODO: avoid reading the getter while assigning with a global variable
                return getters[name].call(store, store);
            }));
            return computedGetters;
        }, {}));
    }
    store = createSetupStore(id, setup, options, pinia, hot, true);
    return store;
}
function createSetupStore($id, setup, options = {}, pinia, hot, isOptionsStore) {
    let scope;
    const optionsForPlugin = assign({ actions: {} }, options);
    // watcher options for $subscribe
    const $subscribeOptions = { deep: true };
    // internal state
    let isListening; // set to true at the end
    let isSyncListening; // set to true at the end
    let subscriptions = [];
    let actionSubscriptions = [];
    let debuggerEvents;
    const initialState = pinia.state.value[$id];
    // avoid setting the state for option stores if it is set
    // by the setup
    if (!isOptionsStore && !initialState && (!false)) {
        /* istanbul ignore if */
        if (vueDemi.isVue2) {
            vueDemi.set(pinia.state.value, $id, {});
        }
        else {
            pinia.state.value[$id] = {};
        }
    }
    vueDemi.ref({});
    // avoid triggering too many listeners
    // https://github.com/vuejs/pinia/issues/1129
    let activeListener;
    function $patch(partialStateOrMutator) {
        let subscriptionMutation;
        isListening = isSyncListening = false;
        if (typeof partialStateOrMutator === 'function') {
            partialStateOrMutator(pinia.state.value[$id]);
            subscriptionMutation = {
                type: exports.MutationType.patchFunction,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        else {
            mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
            subscriptionMutation = {
                type: exports.MutationType.patchObject,
                payload: partialStateOrMutator,
                storeId: $id,
                events: debuggerEvents,
            };
        }
        const myListenerId = (activeListener = Symbol());
        vueDemi.nextTick().then(() => {
            if (activeListener === myListenerId) {
                isListening = true;
            }
        });
        isSyncListening = true;
        // because we paused the watcher, we need to manually call the subscriptions
        triggerSubscriptions(subscriptions, subscriptionMutation, pinia.state.value[$id]);
    }
    const $reset = isOptionsStore
        ? function $reset() {
            const { state } = options;
            const newState = state ? state() : {};
            // we use a patch to group all changes into one single subscription
            this.$patch(($state) => {
                // @ts-expect-error: FIXME: shouldn't error?
                assign($state, newState);
            });
        }
        : /* istanbul ignore next */
            noop;
    function $dispose() {
        scope.stop();
        subscriptions = [];
        actionSubscriptions = [];
        pinia._s.delete($id);
    }
    /**
     * Helper that wraps function so it can be tracked with $onAction
     * @param fn - action to wrap
     * @param name - name of the action
     */
    const action = (fn, name = '') => {
        if (ACTION_MARKER in fn) {
            fn[ACTION_NAME] = name;
            return fn;
        }
        const wrappedAction = function () {
            setActivePinia(pinia);
            const args = Array.from(arguments);
            const afterCallbackList = [];
            const onErrorCallbackList = [];
            function after(callback) {
                afterCallbackList.push(callback);
            }
            function onError(callback) {
                onErrorCallbackList.push(callback);
            }
            // @ts-expect-error
            triggerSubscriptions(actionSubscriptions, {
                args,
                name: wrappedAction[ACTION_NAME],
                store,
                after,
                onError,
            });
            let ret;
            try {
                ret = fn.apply(this && this.$id === $id ? this : store, args);
                // handle sync errors
            }
            catch (error) {
                triggerSubscriptions(onErrorCallbackList, error);
                throw error;
            }
            if (ret instanceof Promise) {
                return ret
                    .then((value) => {
                    triggerSubscriptions(afterCallbackList, value);
                    return value;
                })
                    .catch((error) => {
                    triggerSubscriptions(onErrorCallbackList, error);
                    return Promise.reject(error);
                });
            }
            // trigger after callbacks
            triggerSubscriptions(afterCallbackList, ret);
            return ret;
        };
        wrappedAction[ACTION_MARKER] = true;
        wrappedAction[ACTION_NAME] = name; // will be set later
        // @ts-expect-error: we are intentionally limiting the returned type to just Fn
        // because all the added properties are internals that are exposed through `$onAction()` only
        return wrappedAction;
    };
    const partialStore = {
        _p: pinia,
        // _s: scope,
        $id,
        $onAction: addSubscription.bind(null, actionSubscriptions),
        $patch,
        $reset,
        $subscribe(callback, options = {}) {
            const removeSubscription = addSubscription(subscriptions, callback, options.detached, () => stopWatcher());
            const stopWatcher = scope.run(() => vueDemi.watch(() => pinia.state.value[$id], (state) => {
                if (options.flush === 'sync' ? isSyncListening : isListening) {
                    callback({
                        storeId: $id,
                        type: exports.MutationType.direct,
                        events: debuggerEvents,
                    }, state);
                }
            }, assign({}, $subscribeOptions, options)));
            return removeSubscription;
        },
        $dispose,
    };
    /* istanbul ignore if */
    if (vueDemi.isVue2) {
        // start as non ready
        partialStore._r = false;
    }
    const store = vueDemi.reactive(partialStore);
    // store the partial store now so the setup of stores can instantiate each other before they are finished without
    // creating infinite loops.
    pinia._s.set($id, store);
    const runWithContext = (pinia._a && pinia._a.runWithContext) || fallbackRunWithContext;
    // TODO: idea create skipSerialize that marks properties as non serializable and they are skipped
    const setupStore = runWithContext(() => pinia._e.run(() => (scope = vueDemi.effectScope()).run(() => setup({ action }))));
    // overwrite existing actions to support $onAction
    for (const key in setupStore) {
        const prop = setupStore[key];
        if ((vueDemi.isRef(prop) && !isComputed(prop)) || vueDemi.isReactive(prop)) {
            // mark it as a piece of state to be serialized
            if (!isOptionsStore) {
                // in setup stores we must hydrate the state and sync pinia state tree with the refs the user just created
                if (initialState && shouldHydrate(prop)) {
                    if (vueDemi.isRef(prop)) {
                        prop.value = initialState[key];
                    }
                    else {
                        // probably a reactive object, lets recursively assign
                        // @ts-expect-error: prop is unknown
                        mergeReactiveObjects(prop, initialState[key]);
                    }
                }
                // transfer the ref to the pinia state to keep everything in sync
                /* istanbul ignore if */
                if (vueDemi.isVue2) {
                    vueDemi.set(pinia.state.value[$id], key, prop);
                }
                else {
                    pinia.state.value[$id][key] = prop;
                }
            }
            // action
        }
        else if (typeof prop === 'function') {
            const actionValue = action(prop, key);
            // this a hot module replacement store because the hotUpdate method needs
            // to do it with the right context
            /* istanbul ignore if */
            if (vueDemi.isVue2) {
                vueDemi.set(setupStore, key, actionValue);
            }
            else {
                // @ts-expect-error
                setupStore[key] = actionValue;
            }
            // list actions so they can be used in plugins
            // @ts-expect-error
            optionsForPlugin.actions[key] = prop;
        }
        else ;
    }
    // add the state, getters, and action properties
    /* istanbul ignore if */
    if (vueDemi.isVue2) {
        Object.keys(setupStore).forEach((key) => {
            vueDemi.set(store, key, setupStore[key]);
        });
    }
    else {
        assign(store, setupStore);
        // allows retrieving reactive objects with `storeToRefs()`. Must be called after assigning to the reactive object.
        // Make `storeToRefs()` work with `reactive()` #799
        assign(vueDemi.toRaw(store), setupStore);
    }
    // use this instead of a computed with setter to be able to create it anywhere
    // without linking the computed lifespan to wherever the store is first
    // created.
    Object.defineProperty(store, '$state', {
        get: () => (pinia.state.value[$id]),
        set: (state) => {
            $patch(($state) => {
                // @ts-expect-error: FIXME: shouldn't error?
                assign($state, state);
            });
        },
    });
    /* istanbul ignore if */
    if (vueDemi.isVue2) {
        // mark the store as ready before plugins
        store._r = true;
    }
    // apply all plugins
    pinia._p.forEach((extender) => {
        /* istanbul ignore else */
        {
            assign(store, scope.run(() => extender({
                store: store,
                app: pinia._a,
                pinia,
                options: optionsForPlugin,
            })));
        }
    });
    // only apply hydrate to option stores with an initial state in pinia
    if (initialState &&
        isOptionsStore &&
        options.hydrate) {
        options.hydrate(store.$state, initialState);
    }
    isListening = true;
    isSyncListening = true;
    return store;
}
// improves tree shaking
/*#__NO_SIDE_EFFECTS__*/
function defineStore(
// TODO: add proper types from above
idOrOptions, setup, setupOptions) {
    let id;
    let options;
    const isSetupStore = typeof setup === 'function';
    if (typeof idOrOptions === 'string') {
        id = idOrOptions;
        // the option store setup will contain the actual options in this case
        options = isSetupStore ? setupOptions : setup;
    }
    else {
        options = idOrOptions;
        id = idOrOptions.id;
    }
    function useStore(pinia, hot) {
        const hasContext = vueDemi.hasInjectionContext();
        pinia =
            // in test mode, ignore the argument provided as we can always retrieve a
            // pinia instance with getActivePinia()
            ((process.env.NODE_ENV === 'test') && activePinia && activePinia._testing ? null : pinia) ||
                (hasContext ? vueDemi.inject(piniaSymbol, null) : null);
        if (pinia)
            setActivePinia(pinia);
        pinia = activePinia;
        if (!pinia._s.has(id)) {
            // creating the store registers it in `pinia._s`
            if (isSetupStore) {
                createSetupStore(id, setup, options, pinia);
            }
            else {
                createOptionsStore(id, options, pinia);
            }
        }
        const store = pinia._s.get(id);
        // StoreGeneric cannot be casted towards Store
        return store;
    }
    useStore.$id = id;
    return useStore;
}

let mapStoreSuffix = 'Store';
/**
 * Changes the suffix added by `mapStores()`. Can be set to an empty string.
 * Defaults to `"Store"`. Make sure to extend the MapStoresCustomization
 * interface if you are using TypeScript.
 *
 * @param suffix - new suffix
 */
function setMapStoreSuffix(suffix // could be 'Store' but that would be annoying for JS
) {
    mapStoreSuffix = suffix;
}
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
function mapStores(...stores) {
    return stores.reduce((reduced, useStore) => {
        // @ts-expect-error: $id is added by defineStore
        reduced[useStore.$id + mapStoreSuffix] = function () {
            return useStore(this.$pinia);
        };
        return reduced;
    }, {});
}
/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            reduced[key] = function () {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[key];
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function () {
                const store = useStore(this.$pinia);
                const storeKey = keysOrMapper[key];
                // for some reason TS is unable to infer the type of storeKey to be a
                // function
                return typeof storeKey === 'function'
                    ? storeKey.call(this, store)
                    : // @ts-expect-error: FIXME: should work?
                        store[storeKey];
            };
            return reduced;
        }, {});
}
/**
 * Alias for `mapState()`. You should use `mapState()` instead.
 * @deprecated use `mapState()` instead.
 */
const mapGetters = mapState;
/**
 * Allows directly using actions from your store without using the composition
 * API (`setup()`) by generating an object to be spread in the `methods` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapActions(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function (...args) {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[key](...args);
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-expect-error
            reduced[key] = function (...args) {
                // @ts-expect-error: FIXME: should work?
                return useStore(this.$pinia)[keysOrMapper[key]](...args);
            };
            return reduced;
        }, {});
}
/**
 * Allows using state and getters from one store without using the composition
 * API (`setup()`) by generating an object to be spread in the `computed` field
 * of a component.
 *
 * @param useStore - store to map from
 * @param keysOrMapper - array or object
 */
function mapWritableState(useStore, keysOrMapper) {
    return Array.isArray(keysOrMapper)
        ? keysOrMapper.reduce((reduced, key) => {
            // @ts-ignore
            reduced[key] = {
                get() {
                    // @ts-expect-error: FIXME: should work?
                    return useStore(this.$pinia)[key];
                },
                set(value) {
                    // @ts-expect-error: FIXME: should work?
                    return (useStore(this.$pinia)[key] = value);
                },
            };
            return reduced;
        }, {})
        : Object.keys(keysOrMapper).reduce((reduced, key) => {
            // @ts-ignore
            reduced[key] = {
                get() {
                    // @ts-expect-error: FIXME: should work?
                    return useStore(this.$pinia)[keysOrMapper[key]];
                },
                set(value) {
                    // @ts-expect-error: FIXME: should work?
                    return (useStore(this.$pinia)[keysOrMapper[key]] = value);
                },
            };
            return reduced;
        }, {});
}

/**
 * Creates an object of references with all the state, getters, and plugin-added
 * state properties of the store. Similar to `toRefs()` but specifically
 * designed for Pinia stores so methods and non reactive properties are
 * completely ignored.
 *
 * @param store - store to extract the refs from
 */
function storeToRefs(store) {
    // See https://github.com/vuejs/pinia/issues/852
    // It's easier to just use toRefs() even if it includes more stuff
    if (vueDemi.isVue2) {
        // @ts-expect-error: toRefs include methods and others
        return vueDemi.toRefs(store);
    }
    else {
        store = vueDemi.toRaw(store);
        const refs = {};
        for (const key in store) {
            const value = store[key];
            if (vueDemi.isRef(value) || vueDemi.isReactive(value)) {
                // @ts-expect-error: the key is state or getter
                refs[key] =
                    // ---
                    vueDemi.toRef(store, key);
            }
        }
        return refs;
    }
}

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
const PiniaVuePlugin = function (_Vue) {
    // Equivalent of
    // app.config.globalProperties.$pinia = pinia
    _Vue.mixin({
        beforeCreate() {
            const options = this.$options;
            if (options.pinia) {
                const pinia = options.pinia;
                // HACK: taken from provide(): https://github.com/vuejs/composition-api/blob/main/src/apis/inject.ts#L31
                /* istanbul ignore else */
                if (!this._provided) {
                    const provideCache = {};
                    Object.defineProperty(this, '_provided', {
                        get: () => provideCache,
                        set: (v) => Object.assign(provideCache, v),
                    });
                }
                this._provided[piniaSymbol] = pinia;
                // propagate the pinia instance in an SSR friendly way
                // avoid adding it to nuxt twice
                /* istanbul ignore else */
                if (!this.$pinia) {
                    this.$pinia = pinia;
                }
                pinia._a = this;
                if (IS_CLIENT) {
                    // this allows calling useStore() outside of a component setup after
                    // installing pinia's plugin
                    setActivePinia(pinia);
                }
            }
            else if (!this.$pinia && options.parent && options.parent.$pinia) {
                this.$pinia = options.parent.$pinia;
            }
        },
        destroyed() {
            delete this._pStores;
        },
    });
};

exports.PiniaVuePlugin = PiniaVuePlugin;
exports.acceptHMRUpdate = acceptHMRUpdate;
exports.createPinia = createPinia;
exports.defineStore = defineStore;
exports.disposePinia = disposePinia;
exports.getActivePinia = getActivePinia;
exports.mapActions = mapActions;
exports.mapGetters = mapGetters;
exports.mapState = mapState;
exports.mapStores = mapStores;
exports.mapWritableState = mapWritableState;
exports.setActivePinia = setActivePinia;
exports.setMapStoreSuffix = setMapStoreSuffix;
exports.skipHydrate = skipHydrate;
exports.storeToRefs = storeToRefs;

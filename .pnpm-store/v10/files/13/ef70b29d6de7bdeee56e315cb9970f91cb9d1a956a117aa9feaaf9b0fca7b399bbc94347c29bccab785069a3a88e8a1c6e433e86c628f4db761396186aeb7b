(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('mobx'), require('react'), require('react-dom'), require('use-sync-external-store/shim')) :
    typeof define === 'function' && define.amd ? define(['exports', 'mobx', 'react', 'react-dom', 'use-sync-external-store/shim'], factory) :
    (global = global || self, factory(global.mobxReactLite = {}, global.mobx, global.React, global.ReactDOM, global.shim));
}(this, (function (exports, mobx, React, reactDom, shim) { 'use strict';

    var React__default = 'default' in React ? React['default'] : React;

    if (!React.useState) {
      throw new Error("mobx-react-lite requires React with Hooks support");
    }
    if (!mobx.makeObservable) {
      throw new Error("mobx-react-lite@3 requires mobx at least version 6 to be available");
    }

    function defaultNoopBatch(callback) {
      callback();
    }
    function observerBatching(reactionScheduler) {
      if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch;
        {
          console.warn("[MobX] Failed to get unstable_batched updates from react-dom / react-native");
        }
      }
      mobx.configure({
        reactionScheduler: reactionScheduler
      });
    }
    var isObserverBatched = function isObserverBatched() {
      {
        console.warn("[MobX] Deprecated");
      }
      return true;
    };

    var deprecatedMessages = [];
    function useDeprecated(msg) {
      if (!deprecatedMessages.includes(msg)) {
        deprecatedMessages.push(msg);
        console.warn(msg);
      }
    }

    function printDebugValue(v) {
      return mobx.getDependencyTree(v);
    }

    var globalIsUsingStaticRendering = false;
    function enableStaticRendering(enable) {
      globalIsUsingStaticRendering = enable;
    }
    function isUsingStaticRendering() {
      return globalIsUsingStaticRendering;
    }

    var REGISTRY_FINALIZE_AFTER = 10000;
    var REGISTRY_SWEEP_INTERVAL = 10000;
    var TimerBasedFinalizationRegistry = /*#__PURE__*/function () {
      function TimerBasedFinalizationRegistry(finalize) {
        var _this = this;
        this.finalize = void 0;
        this.registrations = new Map();
        this.sweepTimeout = void 0;
        this.sweep = function (maxAge) {
          if (maxAge === void 0) {
            maxAge = REGISTRY_FINALIZE_AFTER;
          }
          // cancel timeout so we can force sweep anytime
          clearTimeout(_this.sweepTimeout);
          _this.sweepTimeout = undefined;
          var now = Date.now();
          _this.registrations.forEach(function (registration, token) {
            if (now - registration.registeredAt >= maxAge) {
              _this.finalize(registration.value);
              _this.registrations["delete"](token);
            }
          });
          if (_this.registrations.size > 0) {
            _this.scheduleSweep();
          }
        };
        this.finalizeAllImmediately = function () {
          _this.sweep(0);
        };
        this.finalize = finalize;
      }
      // Token is actually required with this impl
      var _proto = TimerBasedFinalizationRegistry.prototype;
      _proto.register = function register(target, value, token) {
        this.registrations.set(token, {
          value: value,
          registeredAt: Date.now()
        });
        this.scheduleSweep();
      };
      _proto.unregister = function unregister(token) {
        this.registrations["delete"](token);
      }
      // Bound so it can be used directly as setTimeout callback.
      ;
      _proto.scheduleSweep = function scheduleSweep() {
        if (this.sweepTimeout === undefined) {
          this.sweepTimeout = setTimeout(this.sweep, REGISTRY_SWEEP_INTERVAL);
        }
      };
      return TimerBasedFinalizationRegistry;
    }();
    var UniversalFinalizationRegistry = typeof FinalizationRegistry !== "undefined" ? FinalizationRegistry : TimerBasedFinalizationRegistry;

    var observerFinalizationRegistry = /*#__PURE__*/new UniversalFinalizationRegistry(function (adm) {
      var _adm$reaction;
      (_adm$reaction = adm.reaction) == null ? void 0 : _adm$reaction.dispose();
      adm.reaction = null;
    });

    function createReaction(adm) {
      adm.reaction = new mobx.Reaction("observer" + adm.name, function () {
        adm.stateVersion = Symbol();
        // onStoreChange won't be available until the component "mounts".
        // If state changes in between initial render and mount,
        // `useSyncExternalStore` should handle that by checking the state version and issuing update.
        adm.onStoreChange == null ? void 0 : adm.onStoreChange();
      });
    }
    function useObserver(render, baseComponentName) {
      if (baseComponentName === void 0) {
        baseComponentName = "observed";
      }
      if (isUsingStaticRendering()) {
        return render();
      }
      var admRef = React__default.useRef(null);
      if (!admRef.current) {
        // First render
        var _adm = {
          reaction: null,
          onStoreChange: null,
          stateVersion: Symbol(),
          name: baseComponentName,
          subscribe: function subscribe(onStoreChange) {
            // Do NOT access admRef here!
            observerFinalizationRegistry.unregister(_adm);
            _adm.onStoreChange = onStoreChange;
            if (!_adm.reaction) {
              // We've lost our reaction and therefore all subscriptions, occurs when:
              // 1. Timer based finalization registry disposed reaction before component mounted.
              // 2. React "re-mounts" same component without calling render in between (typically <StrictMode>).
              // We have to recreate reaction and schedule re-render to recreate subscriptions,
              // even if state did not change.
              createReaction(_adm);
              // `onStoreChange` won't force update if subsequent `getSnapshot` returns same value.
              // So we make sure that is not the case
              _adm.stateVersion = Symbol();
            }
            return function () {
              var _adm$reaction;
              // Do NOT access admRef here!
              _adm.onStoreChange = null;
              (_adm$reaction = _adm.reaction) == null ? void 0 : _adm$reaction.dispose();
              _adm.reaction = null;
            };
          },
          getSnapshot: function getSnapshot() {
            // Do NOT access admRef here!
            return _adm.stateVersion;
          }
        };
        admRef.current = _adm;
      }
      var adm = admRef.current;
      if (!adm.reaction) {
        // First render or reaction was disposed by registry before subscribe
        createReaction(adm);
        // StrictMode/ConcurrentMode/Suspense may mean that our component is
        // rendered and abandoned multiple times, so we need to track leaked
        // Reactions.
        observerFinalizationRegistry.register(admRef, adm, adm);
      }
      React__default.useDebugValue(adm.reaction, printDebugValue);
      shim.useSyncExternalStore(
      // Both of these must be stable, otherwise it would keep resubscribing every render.
      adm.subscribe, adm.getSnapshot, adm.getSnapshot);
      // render the original component, but have the
      // reaction track the observables, so that rendering
      // can be invalidated (see above) once a dependency changes
      var renderResult;
      var exception;
      adm.reaction.track(function () {
        try {
          renderResult = render();
        } catch (e) {
          exception = e;
        }
      });
      if (exception) {
        throw exception; // re-throw any exceptions caught during rendering
      }

      return renderResult;
    }

    var _Object$getOwnPropert, _Object$getOwnPropert2;
    var warnObserverOptionsDeprecated = true;
    var hasSymbol = typeof Symbol === "function" && Symbol["for"];
    var isFunctionNameConfigurable = (_Object$getOwnPropert = (_Object$getOwnPropert2 = /*#__PURE__*/Object.getOwnPropertyDescriptor(function () {}, "name")) == null ? void 0 : _Object$getOwnPropert2.configurable) != null ? _Object$getOwnPropert : false;
    // Using react-is had some issues (and operates on elements, not on types), see #608 / #609
    var ReactForwardRefSymbol = hasSymbol ? /*#__PURE__*/Symbol["for"]("react.forward_ref") : typeof React.forwardRef === "function" && /*#__PURE__*/React.forwardRef(function (props) {
      return null;
    })["$$typeof"];
    var ReactMemoSymbol = hasSymbol ? /*#__PURE__*/Symbol["for"]("react.memo") : typeof React.memo === "function" && /*#__PURE__*/React.memo(function (props) {
      return null;
    })["$$typeof"];
    // n.b. base case is not used for actual typings or exported in the typing files
    function observer(baseComponent,
    // TODO remove in next major
    options) {
      var _options$forwardRef;
      if ( warnObserverOptionsDeprecated && options) {
        warnObserverOptionsDeprecated = false;
        console.warn("[mobx-react-lite] `observer(fn, { forwardRef: true })` is deprecated, use `observer(React.forwardRef(fn))`");
      }
      if (ReactMemoSymbol && baseComponent["$$typeof"] === ReactMemoSymbol) {
        throw new Error("[mobx-react-lite] You are trying to use `observer` on a function component wrapped in either another `observer` or `React.memo`. The observer already applies 'React.memo' for you.");
      }
      // The working of observer is explained step by step in this talk: https://www.youtube.com/watch?v=cPF4iBedoF0&feature=youtu.be&t=1307
      if (isUsingStaticRendering()) {
        return baseComponent;
      }
      var useForwardRef = (_options$forwardRef = options == null ? void 0 : options.forwardRef) != null ? _options$forwardRef : false;
      var render = baseComponent;
      var baseComponentName = baseComponent.displayName || baseComponent.name;
      // If already wrapped with forwardRef, unwrap,
      // so we can patch render and apply memo
      if (ReactForwardRefSymbol && baseComponent["$$typeof"] === ReactForwardRefSymbol) {
        useForwardRef = true;
        render = baseComponent["render"];
        if (typeof render !== "function") {
          throw new Error("[mobx-react-lite] `render` property of ForwardRef was not a function");
        }
      }
      var observerComponent = function observerComponent(props, ref) {
        return useObserver(function () {
          return render(props, ref);
        }, baseComponentName);
      };
      observerComponent.displayName = baseComponent.displayName;
      if (isFunctionNameConfigurable) {
        Object.defineProperty(observerComponent, "name", {
          value: baseComponent.name,
          writable: true,
          configurable: true
        });
      }
      // Support legacy context: `contextTypes` must be applied before `memo`
      if (baseComponent.contextTypes) {
        observerComponent.contextTypes = baseComponent.contextTypes;
      }
      if (useForwardRef) {
        // `forwardRef` must be applied prior `memo`
        // `forwardRef(observer(cmp))` throws:
        // "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))"
        observerComponent = React.forwardRef(observerComponent);
      }
      // memo; we are not interested in deep updates
      // in props; we assume that if deep objects are changed,
      // this is in observables, which would have been tracked anyway
      observerComponent = React.memo(observerComponent);
      copyStaticProperties(baseComponent, observerComponent);
      {
        Object.defineProperty(observerComponent, "contextTypes", {
          set: function set() {
            var _this$type, _this$type2;
            throw new Error("[mobx-react-lite] `" + (this.displayName || ((_this$type = this.type) == null ? void 0 : _this$type.displayName) || ((_this$type2 = this.type) == null ? void 0 : _this$type2.name) || "Component") + ".contextTypes` must be set before applying `observer`.");
          }
        });
      }
      return observerComponent;
    }
    // based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
    var hoistBlackList = {
      $$typeof: true,
      render: true,
      compare: true,
      type: true,
      // Don't redefine `displayName`,
      // it's defined as getter-setter pair on `memo` (see #3192).
      displayName: true
    };
    function copyStaticProperties(base, target) {
      Object.keys(base).forEach(function (key) {
        if (!hoistBlackList[key]) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key));
        }
      });
    }

    function ObserverComponent(_ref) {
      var children = _ref.children,
        render = _ref.render;
      var component = children || render;
      if (typeof component !== "function") {
        return null;
      }
      return useObserver(component);
    }
    {
      ObserverComponent.propTypes = {
        children: ObserverPropsCheck,
        render: ObserverPropsCheck
      };
    }
    ObserverComponent.displayName = "Observer";
    function ObserverPropsCheck(props, key, componentName, location, propFullName) {
      var extraKey = key === "children" ? "render" : "children";
      var hasProp = typeof props[key] === "function";
      var hasExtraProp = typeof props[extraKey] === "function";
      if (hasProp && hasExtraProp) {
        return new Error("MobX Observer: Do not use children and render in the same time in`" + componentName);
      }
      if (hasProp || hasExtraProp) {
        return null;
      }
      return new Error("Invalid prop `" + propFullName + "` of type `" + typeof props[key] + "` supplied to" + " `" + componentName + "`, expected `function`.");
    }

    function useLocalObservable(initializer, annotations) {
      return React.useState(function () {
        return mobx.observable(initializer(), annotations, {
          autoBind: true
        });
      })[0];
    }

    function useAsObservableSource(current) {
      useDeprecated("[mobx-react-lite] 'useAsObservableSource' is deprecated, please store the values directly in an observable, for example by using 'useLocalObservable', and sync future updates using 'useEffect' when needed. See the README for examples.");
      // We're deliberately not using idiomatic destructuring for the hook here.
      // Accessing the state value as an array element prevents TypeScript from generating unnecessary helpers in the resulting code.
      // For further details, please refer to mobxjs/mobx#3842.
      var res = React.useState(function () {
        return mobx.observable(current, {}, {
          deep: false
        });
      })[0];
      mobx.runInAction(function () {
        Object.assign(res, current);
      });
      return res;
    }

    function useLocalStore(initializer, current) {
      {
        useDeprecated("[mobx-react-lite] 'useLocalStore' is deprecated, use 'useLocalObservable' instead.");
      }
      var source = current && useAsObservableSource(current);
      return React.useState(function () {
        return mobx.observable(initializer(source), undefined, {
          autoBind: true
        });
      })[0];
    }

    var _observerFinalization;
    observerBatching(reactDom.unstable_batchedUpdates);
    var clearTimers = (_observerFinalization = observerFinalizationRegistry["finalizeAllImmediately"]) != null ? _observerFinalization : function () {};
    function useObserver$1(fn, baseComponentName) {
      if (baseComponentName === void 0) {
        baseComponentName = "observed";
      }
      {
        useDeprecated("[mobx-react-lite] 'useObserver(fn)' is deprecated. Use `<Observer>{fn}</Observer>` instead, or wrap the entire component in `observer`.");
      }
      return useObserver(fn, baseComponentName);
    }
    function useStaticRendering(enable) {
      {
        console.warn("[mobx-react-lite] 'useStaticRendering' is deprecated, use 'enableStaticRendering' instead");
      }
      enableStaticRendering(enable);
    }

    exports.Observer = ObserverComponent;
    exports._observerFinalizationRegistry = observerFinalizationRegistry;
    exports.clearTimers = clearTimers;
    exports.enableStaticRendering = enableStaticRendering;
    exports.isObserverBatched = isObserverBatched;
    exports.isUsingStaticRendering = isUsingStaticRendering;
    exports.observer = observer;
    exports.observerBatching = observerBatching;
    exports.useAsObservableSource = useAsObservableSource;
    exports.useLocalObservable = useLocalObservable;
    exports.useLocalStore = useLocalStore;
    exports.useObserver = useObserver$1;
    exports.useStaticRendering = useStaticRendering;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=mobxreactlite.umd.development.js.map

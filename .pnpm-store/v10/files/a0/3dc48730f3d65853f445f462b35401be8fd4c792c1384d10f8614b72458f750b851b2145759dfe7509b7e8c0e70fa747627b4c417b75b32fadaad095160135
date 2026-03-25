import { _getGlobalState, Reaction, _allowStateChanges, untracked, isObservableMap, isObservableObject, isObservableArray, observable } from 'mobx';
import React__default, { PureComponent, Component } from 'react';
import { isUsingStaticRendering, _observerFinalizationRegistry, observer as observer$1 } from 'mobx-react-lite';
export { Observer, enableStaticRendering, isUsingStaticRendering, observerBatching, useAsObservableSource, useLocalObservable, useLocalStore, useObserver, useStaticRendering } from 'mobx-react-lite';

function shallowEqual(objA, objB) {
  //From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
  if (is(objA, objB)) {
    return true;
  }
  if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
    return false;
  }
  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) {
    return false;
  }
  for (var i = 0; i < keysA.length; i++) {
    if (!Object.hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
      return false;
    }
  }
  return true;
}
function is(x, y) {
  // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
var hoistBlackList = {
  $$typeof: 1,
  render: 1,
  compare: 1,
  type: 1,
  childContextTypes: 1,
  contextType: 1,
  contextTypes: 1,
  defaultProps: 1,
  getDefaultProps: 1,
  getDerivedStateFromError: 1,
  getDerivedStateFromProps: 1,
  mixins: 1,
  displayName: 1,
  propTypes: 1
};
function copyStaticProperties(base, target) {
  var protoProps = Object.getOwnPropertyNames(Object.getPrototypeOf(base));
  Object.getOwnPropertyNames(base).forEach(function (key) {
    if (!hoistBlackList[key] && protoProps.indexOf(key) === -1) {
      Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key));
    }
  });
}
/**
 * Utilities for patching componentWillUnmount, to make sure @disposeOnUnmount works correctly icm with user defined hooks
 * and the handler provided by mobx-react
 */
var mobxMixins = /*#__PURE__*/Symbol("patchMixins");
var mobxPatchedDefinition = /*#__PURE__*/Symbol("patchedDefinition");
function getMixins(target, methodName) {
  var mixins = target[mobxMixins] = target[mobxMixins] || {};
  var methodMixins = mixins[methodName] = mixins[methodName] || {};
  methodMixins.locks = methodMixins.locks || 0;
  methodMixins.methods = methodMixins.methods || [];
  return methodMixins;
}
function wrapper(realMethod, mixins) {
  var _this = this;
  for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }
  // locks are used to ensure that mixins are invoked only once per invocation, even on recursive calls
  mixins.locks++;
  try {
    var retVal;
    if (realMethod !== undefined && realMethod !== null) {
      retVal = realMethod.apply(this, args);
    }
    return retVal;
  } finally {
    mixins.locks--;
    if (mixins.locks === 0) {
      mixins.methods.forEach(function (mx) {
        mx.apply(_this, args);
      });
    }
  }
}
function wrapFunction(realMethod, mixins) {
  var fn = function fn() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }
    wrapper.call.apply(wrapper, [this, realMethod, mixins].concat(args));
  };
  return fn;
}
function patch(target, methodName, mixinMethod) {
  var mixins = getMixins(target, methodName);
  if (mixins.methods.indexOf(mixinMethod) < 0) {
    mixins.methods.push(mixinMethod);
  }
  var oldDefinition = Object.getOwnPropertyDescriptor(target, methodName);
  if (oldDefinition && oldDefinition[mobxPatchedDefinition]) {
    // already patched definition, do not repatch
    return;
  }
  var originalMethod = target[methodName];
  var newDefinition = createDefinition(target, methodName, oldDefinition ? oldDefinition.enumerable : undefined, mixins, originalMethod);
  Object.defineProperty(target, methodName, newDefinition);
}
function createDefinition(target, methodName, enumerable, mixins, originalMethod) {
  var _ref;
  var wrappedFunc = wrapFunction(originalMethod, mixins);
  return _ref = {}, _ref[mobxPatchedDefinition] = true, _ref.get = function get() {
    return wrappedFunc;
  }, _ref.set = function set(value) {
    if (this === target) {
      wrappedFunc = wrapFunction(value, mixins);
    } else {
      // when it is an instance of the prototype/a child prototype patch that particular case again separately
      // since we need to store separate values depending on wether it is the actual instance, the prototype, etc
      // e.g. the method for super might not be the same as the method for the prototype which might be not the same
      // as the method for the instance
      var newDefinition = createDefinition(this, methodName, enumerable, mixins, value);
      Object.defineProperty(this, methodName, newDefinition);
    }
  }, _ref.configurable = true, _ref.enumerable = enumerable, _ref;
}

var administrationSymbol = /*#__PURE__*/Symbol("ObserverAdministration");
var isMobXReactObserverSymbol = /*#__PURE__*/Symbol("isMobXReactObserver");
var observablePropDescriptors;
{
  observablePropDescriptors = {
    props: /*#__PURE__*/createObservablePropDescriptor("props"),
    state: /*#__PURE__*/createObservablePropDescriptor("state"),
    context: /*#__PURE__*/createObservablePropDescriptor("context")
  };
}
function getAdministration(component) {
  var _component$administra;
  // We create administration lazily, because we can't patch constructor
  // and the exact moment of initialization partially depends on React internals.
  // At the time of writing this, the first thing invoked is one of the observable getter/setter (state/props/context).
  return (_component$administra = component[administrationSymbol]) != null ? _component$administra : component[administrationSymbol] = {
    reaction: null,
    mounted: false,
    reactionInvalidatedBeforeMount: false,
    forceUpdate: null,
    name: getDisplayName(component.constructor),
    state: undefined,
    props: undefined,
    context: undefined
  };
}
function makeClassComponentObserver(componentClass) {
  var prototype = componentClass.prototype;
  if (componentClass[isMobXReactObserverSymbol]) {
    var displayName = getDisplayName(componentClass);
    throw new Error("The provided component class (" + displayName + ") has already been declared as an observer component.");
  } else {
    componentClass[isMobXReactObserverSymbol] = true;
  }
  if (prototype.componentWillReact) {
    throw new Error("The componentWillReact life-cycle event is no longer supported");
  }
  if (componentClass["__proto__"] !== PureComponent) {
    if (!prototype.shouldComponentUpdate) {
      prototype.shouldComponentUpdate = observerSCU;
    } else if (prototype.shouldComponentUpdate !== observerSCU) {
      // n.b. unequal check, instead of existence check, as @observer might be on superclass as well
      throw new Error("It is not allowed to use shouldComponentUpdate in observer based components.");
    }
  }
  {
    Object.defineProperties(prototype, observablePropDescriptors);
  }
  var originalRender = prototype.render;
  if (typeof originalRender !== "function") {
    var _displayName = getDisplayName(componentClass);
    throw new Error("[mobx-react] class component (" + _displayName + ") is missing `render` method." + "\n`observer` requires `render` being a function defined on prototype." + "\n`render = () => {}` or `render = function() {}` is not supported.");
  }
  prototype.render = function () {
    Object.defineProperty(this, "render", {
      // There is no safe way to replace render, therefore it's forbidden.
      configurable: false,
      writable: false,
      value: isUsingStaticRendering() ? originalRender : createReactiveRender.call(this, originalRender)
    });
    return this.render();
  };
  var originalComponentDidMount = prototype.componentDidMount;
  prototype.componentDidMount = function () {
    var _this = this;
    if ( this.componentDidMount !== Object.getPrototypeOf(this).componentDidMount) {
      var _displayName2 = getDisplayName(componentClass);
      throw new Error("[mobx-react] `observer(" + _displayName2 + ").componentDidMount` must be defined on prototype." + "\n`componentDidMount = () => {}` or `componentDidMount = function() {}` is not supported.");
    }
    // `componentDidMount` may not be called at all. React can abandon the instance after `render`.
    // That's why we use finalization registry to dispose reaction created during render.
    // Happens with `<Suspend>` see #3492
    //
    // `componentDidMount` can be called immediately after `componentWillUnmount` without calling `render` in between.
    // Happens with `<StrictMode>`see #3395.
    //
    // If `componentDidMount` is called, it's guaranteed to run synchronously with render (similary to `useLayoutEffect`).
    // Therefore we don't have to worry about external (observable) state being updated before mount (no state version checking).
    //
    // Things may change: "In the future, React will provide a feature that lets components preserve state between unmounts"
    var admin = getAdministration(this);
    admin.mounted = true;
    // Component instance committed, prevent reaction disposal.
    _observerFinalizationRegistry.unregister(this);
    // We don't set forceUpdate before mount because it requires a reference to `this`,
    // therefore `this` could NOT be garbage collected before mount,
    // preventing reaction disposal by FinalizationRegistry and leading to memory leak.
    // As an alternative we could have `admin.instanceRef = new WeakRef(this)`, but lets avoid it if possible.
    admin.forceUpdate = function () {
      return _this.forceUpdate();
    };
    if (!admin.reaction || admin.reactionInvalidatedBeforeMount) {
      // Missing reaction:
      // 1. Instance was unmounted (reaction disposed) and immediately remounted without running render #3395.
      // 2. Reaction was disposed by finalization registry before mount. Shouldn't ever happen for class components:
      // `componentDidMount` runs synchronously after render, but our registry are deferred (can't run in between).
      // In any case we lost subscriptions to observables, so we have to create new reaction and re-render to resubscribe.
      // The reaction will be created lazily by following render.
      // Reaction invalidated before mount:
      // 1. A descendant's `componenDidMount` invalidated it's parent #3730
      admin.forceUpdate();
    }
    return originalComponentDidMount == null ? void 0 : originalComponentDidMount.apply(this, arguments);
  };
  // TODO@major Overly complicated "patch" is only needed to support the deprecated @disposeOnUnmount
  patch(prototype, "componentWillUnmount", function () {
    var _admin$reaction;
    if (isUsingStaticRendering()) {
      return;
    }
    var admin = getAdministration(this);
    (_admin$reaction = admin.reaction) == null ? void 0 : _admin$reaction.dispose();
    admin.reaction = null;
    admin.forceUpdate = null;
    admin.mounted = false;
    admin.reactionInvalidatedBeforeMount = false;
  });
  return componentClass;
}
// Generates a friendly name for debugging
function getDisplayName(componentClass) {
  return componentClass.displayName || componentClass.name || "<component>";
}
function createReactiveRender(originalRender) {
  var boundOriginalRender = originalRender.bind(this);
  var admin = getAdministration(this);
  function reactiveRender() {
    if (!admin.reaction) {
      // Create reaction lazily to support re-mounting #3395
      admin.reaction = createReaction(admin);
      if (!admin.mounted) {
        // React can abandon this instance and never call `componentDidMount`/`componentWillUnmount`,
        // we have to make sure reaction will be disposed.
        _observerFinalizationRegistry.register(this, admin, this);
      }
    }
    var error = undefined;
    var renderResult = undefined;
    admin.reaction.track(function () {
      try {
        // TODO@major
        // Optimization: replace with _allowStateChangesStart/End (not available in mobx@6.0.0)
        renderResult = _allowStateChanges(false, boundOriginalRender);
      } catch (e) {
        error = e;
      }
    });
    if (error) {
      throw error;
    }
    return renderResult;
  }
  return reactiveRender;
}
function createReaction(admin) {
  return new Reaction(admin.name + ".render()", function () {
    if (!admin.mounted) {
      // This is neccessary to avoid react warning about calling forceUpdate on component that isn't mounted yet.
      // This happens when component is abandoned after render - our reaction is already created and reacts to changes.
      // `componenDidMount` runs synchronously after `render`, so unlike functional component, there is no delay during which the reaction could be invalidated.
      // However `componentDidMount` runs AFTER it's descendants' `componentDidMount`, which CAN invalidate the reaction, see #3730. Therefore remember and forceUpdate on mount.
      admin.reactionInvalidatedBeforeMount = true;
      return;
    }
    try {
      admin.forceUpdate == null ? void 0 : admin.forceUpdate();
    } catch (error) {
      var _admin$reaction2;
      (_admin$reaction2 = admin.reaction) == null ? void 0 : _admin$reaction2.dispose();
      admin.reaction = null;
    }
  });
}
function observerSCU(nextProps, nextState) {
  if (isUsingStaticRendering()) {
    console.warn("[mobx-react] It seems that a re-rendering of a React component is triggered while in static (server-side) mode. Please make sure components are rendered only once server-side.");
  }
  // update on any state changes (as is the default)
  if (this.state !== nextState) {
    return true;
  }
  // update if props are shallowly not equal, inspired by PureRenderMixin
  // we could return just 'false' here, and avoid the `skipRender` checks etc
  // however, it is nicer if lifecycle events are triggered like usually,
  // so we return true here if props are shallowly modified.
  return !shallowEqual(this.props, nextProps);
}
function createObservablePropDescriptor(key) {
  return {
    configurable: true,
    enumerable: true,
    get: function get() {
      var admin = getAdministration(this);
      var derivation = _getGlobalState().trackingDerivation;
      if (derivation && derivation !== admin.reaction) {
        throw new Error("[mobx-react] Cannot read \"" + admin.name + "." + key + "\" in a reactive context, as it isn't observable.\n                    Please use component lifecycle method to copy the value into a local observable first.\n                    See https://github.com/mobxjs/mobx/blob/main/packages/mobx-react/README.md#note-on-using-props-and-state-in-derivations");
      }
      return admin[key];
    },
    set: function set(value) {
      getAdministration(this)[key] = value;
    }
  };
}

function observer(component, context) {
  if (context && context.kind !== "class") {
    throw new Error("The @observer decorator can be used on classes only");
  }
  if (component["isMobxInjector"] === true) {
    console.warn("Mobx observer: You are trying to use `observer` on a component that already has `inject`. Please apply `observer` before applying `inject`");
  }
  if (Object.prototype.isPrototypeOf.call(Component, component) || Object.prototype.isPrototypeOf.call(PureComponent, component)) {
    // Class component
    return makeClassComponentObserver(component);
  } else {
    // Function component
    return observer$1(component);
  }
}

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}

var _excluded = ["children"];
var MobXProviderContext = /*#__PURE__*/React__default.createContext({});
function Provider(props) {
  var children = props.children,
    stores = _objectWithoutPropertiesLoose(props, _excluded);
  var parentValue = React__default.useContext(MobXProviderContext);
  var mutableProviderRef = React__default.useRef(_extends({}, parentValue, stores));
  var value = mutableProviderRef.current;
  {
    var newValue = _extends({}, value, stores); // spread in previous state for the context based stores
    if (!shallowEqual(value, newValue)) {
      throw new Error("MobX Provider: The set of provided stores has changed. See: https://github.com/mobxjs/mobx-react#the-set-of-provided-stores-has-changed-error.");
    }
  }
  return React__default.createElement(MobXProviderContext.Provider, {
    value: value
  }, children);
}
Provider.displayName = "MobXProvider";

/**
 * Store Injection
 */
function createStoreInjector(grabStoresFn, component, injectNames, makeReactive) {
  // Support forward refs
  var Injector = React__default.forwardRef(function (props, ref) {
    var newProps = _extends({}, props);
    var context = React__default.useContext(MobXProviderContext);
    Object.assign(newProps, grabStoresFn(context || {}, newProps) || {});
    if (ref) {
      newProps.ref = ref;
    }
    return React__default.createElement(component, newProps);
  });
  if (makeReactive) Injector = observer(Injector);
  Injector["isMobxInjector"] = true; // assigned late to suppress observer warning
  // Static fields from component should be visible on the generated Injector
  copyStaticProperties(component, Injector);
  Injector["wrappedComponent"] = component;
  Injector.displayName = getInjectName(component, injectNames);
  return Injector;
}
function getInjectName(component, injectNames) {
  var displayName;
  var componentName = component.displayName || component.name || component.constructor && component.constructor.name || "Component";
  if (injectNames) displayName = "inject-with-" + injectNames + "(" + componentName + ")";else displayName = "inject(" + componentName + ")";
  return displayName;
}
function grabStoresByName(storeNames) {
  return function (baseStores, nextProps) {
    storeNames.forEach(function (storeName) {
      if (storeName in nextProps // prefer props over stores
      ) return;
      if (!(storeName in baseStores)) throw new Error("MobX injector: Store '" + storeName + "' is not available! Make sure it is provided by some Provider");
      nextProps[storeName] = baseStores[storeName];
    });
    return nextProps;
  };
}
/**
 * higher order component that injects stores to a child.
 * takes either a varargs list of strings, which are stores read from the context,
 * or a function that manually maps the available stores from the context to props:
 * storesToProps(mobxStores, props, context) => newProps
 */
function inject() {
  for (var _len = arguments.length, storeNames = new Array(_len), _key = 0; _key < _len; _key++) {
    storeNames[_key] = arguments[_key];
  }
  if (typeof arguments[0] === "function") {
    var grabStoresFn = arguments[0];
    return function (componentClass) {
      return createStoreInjector(grabStoresFn, componentClass, grabStoresFn.name, true);
    };
  } else {
    return function (componentClass) {
      return createStoreInjector(grabStoresByName(storeNames), componentClass, storeNames.join("-"), false);
    };
  }
}

var reactMajorVersion = /*#__PURE__*/Number.parseInt( /*#__PURE__*/React__default.version.split(".")[0]);
var warnedAboutDisposeOnUnmountDeprecated = false;
var protoStoreKey = /*#__PURE__*/Symbol("disposeOnUnmountProto");
var instStoreKey = /*#__PURE__*/Symbol("disposeOnUnmountInst");
function runDisposersOnWillUnmount() {
  var _this = this;
  [].concat(this[protoStoreKey] || [], this[instStoreKey] || []).forEach(function (propKeyOrFunction) {
    var prop = typeof propKeyOrFunction === "string" ? _this[propKeyOrFunction] : propKeyOrFunction;
    if (prop !== undefined && prop !== null) {
      if (Array.isArray(prop)) prop.map(function (f) {
        return f();
      });else prop();
    }
  });
}
/**
 * @deprecated `disposeOnUnmount` is not compatible with React 18 and higher.
 */
function disposeOnUnmount(target, propertyKeyOrFunction) {
  if (Array.isArray(propertyKeyOrFunction)) {
    return propertyKeyOrFunction.map(function (fn) {
      return disposeOnUnmount(target, fn);
    });
  }
  if (!warnedAboutDisposeOnUnmountDeprecated) {
    if (reactMajorVersion >= 18) {
      console.error("[mobx-react] disposeOnUnmount is not compatible with React 18 and higher. Don't use it.");
    } else {
      console.warn("[mobx-react] disposeOnUnmount is deprecated. It won't work correctly with React 18 and higher.");
    }
    warnedAboutDisposeOnUnmountDeprecated = true;
  }
  var c = Object.getPrototypeOf(target).constructor;
  var c2 = Object.getPrototypeOf(target.constructor);
  // Special case for react-hot-loader
  var c3 = Object.getPrototypeOf(Object.getPrototypeOf(target));
  if (!(c === React__default.Component || c === React__default.PureComponent || c2 === React__default.Component || c2 === React__default.PureComponent || c3 === React__default.Component || c3 === React__default.PureComponent)) {
    throw new Error("[mobx-react] disposeOnUnmount only supports direct subclasses of React.Component or React.PureComponent.");
  }
  if (typeof propertyKeyOrFunction !== "string" && typeof propertyKeyOrFunction !== "function" && !Array.isArray(propertyKeyOrFunction)) {
    throw new Error("[mobx-react] disposeOnUnmount only works if the parameter is either a property key or a function.");
  }
  // decorator's target is the prototype, so it doesn't have any instance properties like props
  var isDecorator = typeof propertyKeyOrFunction === "string";
  // add property key / function we want run (disposed) to the store
  var componentWasAlreadyModified = !!target[protoStoreKey] || !!target[instStoreKey];
  var store = isDecorator ?
  // decorators are added to the prototype store
  target[protoStoreKey] || (target[protoStoreKey] = []) :
  // functions are added to the instance store
  target[instStoreKey] || (target[instStoreKey] = []);
  store.push(propertyKeyOrFunction);
  // tweak the component class componentWillUnmount if not done already
  if (!componentWasAlreadyModified) {
    patch(target, "componentWillUnmount", runDisposersOnWillUnmount);
  }
  // return the disposer as is if invoked as a non decorator
  if (typeof propertyKeyOrFunction !== "string") {
    return propertyKeyOrFunction;
  }
}

// Copied from React.PropTypes
function createChainableTypeChecker(validator) {
  function checkType(isRequired, props, propName, componentName, location, propFullName) {
    for (var _len = arguments.length, rest = new Array(_len > 6 ? _len - 6 : 0), _key = 6; _key < _len; _key++) {
      rest[_key - 6] = arguments[_key];
    }
    return untracked(function () {
      componentName = componentName || "<<anonymous>>";
      propFullName = propFullName || propName;
      if (props[propName] == null) {
        if (isRequired) {
          var actual = props[propName] === null ? "null" : "undefined";
          return new Error("The " + location + " `" + propFullName + "` is marked as required " + "in `" + componentName + "`, but its value is `" + actual + "`.");
        }
        return null;
      } else {
        // @ts-ignore rest arg is necessary for some React internals - fails tests otherwise
        return validator.apply(void 0, [props, propName, componentName, location, propFullName].concat(rest));
      }
    });
  }
  var chainedCheckType = checkType.bind(null, false);
  // Add isRequired to satisfy Requirable
  chainedCheckType.isRequired = checkType.bind(null, true);
  return chainedCheckType;
}
// Copied from React.PropTypes
function isSymbol(propType, propValue) {
  // Native Symbol.
  if (propType === "symbol") {
    return true;
  }
  // 19.4.3.5 Symbol.prototype[@@toStringTag] === 'Symbol'
  if (propValue["@@toStringTag"] === "Symbol") {
    return true;
  }
  // Fallback for non-spec compliant Symbols which are polyfilled.
  if (typeof Symbol === "function" && propValue instanceof Symbol) {
    return true;
  }
  return false;
}
// Copied from React.PropTypes
function getPropType(propValue) {
  var propType = typeof propValue;
  if (Array.isArray(propValue)) {
    return "array";
  }
  if (propValue instanceof RegExp) {
    // Old webkits (at least until Android 4.0) return 'function' rather than
    // 'object' for typeof a RegExp. We'll normalize this here so that /bla/
    // passes PropTypes.object.
    return "object";
  }
  if (isSymbol(propType, propValue)) {
    return "symbol";
  }
  return propType;
}
// This handles more types than `getPropType`. Only used for error messages.
// Copied from React.PropTypes
function getPreciseType(propValue) {
  var propType = getPropType(propValue);
  if (propType === "object") {
    if (propValue instanceof Date) {
      return "date";
    } else if (propValue instanceof RegExp) {
      return "regexp";
    }
  }
  return propType;
}
function createObservableTypeCheckerCreator(allowNativeType, mobxType) {
  return createChainableTypeChecker(function (props, propName, componentName, location, propFullName) {
    return untracked(function () {
      if (allowNativeType) {
        if (getPropType(props[propName]) === mobxType.toLowerCase()) return null;
      }
      var mobxChecker;
      switch (mobxType) {
        case "Array":
          mobxChecker = isObservableArray;
          break;
        case "Object":
          mobxChecker = isObservableObject;
          break;
        case "Map":
          mobxChecker = isObservableMap;
          break;
        default:
          throw new Error("Unexpected mobxType: " + mobxType);
      }
      var propValue = props[propName];
      if (!mobxChecker(propValue)) {
        var preciseType = getPreciseType(propValue);
        var nativeTypeExpectationMessage = allowNativeType ? " or javascript `" + mobxType.toLowerCase() + "`" : "";
        return new Error("Invalid prop `" + propFullName + "` of type `" + preciseType + "` supplied to" + " `" + componentName + "`, expected `mobx.Observable" + mobxType + "`" + nativeTypeExpectationMessage + ".");
      }
      return null;
    });
  });
}
function createObservableArrayOfTypeChecker(allowNativeType, typeChecker) {
  return createChainableTypeChecker(function (props, propName, componentName, location, propFullName) {
    for (var _len2 = arguments.length, rest = new Array(_len2 > 5 ? _len2 - 5 : 0), _key2 = 5; _key2 < _len2; _key2++) {
      rest[_key2 - 5] = arguments[_key2];
    }
    return untracked(function () {
      if (typeof typeChecker !== "function") {
        return new Error("Property `" + propFullName + "` of component `" + componentName + "` has " + "invalid PropType notation.");
      } else {
        var error = createObservableTypeCheckerCreator(allowNativeType, "Array")(props, propName, componentName, location, propFullName);
        if (error instanceof Error) return error;
        var propValue = props[propName];
        for (var i = 0; i < propValue.length; i++) {
          error = typeChecker.apply(void 0, [propValue, i, componentName, location, propFullName + "[" + i + "]"].concat(rest));
          if (error instanceof Error) return error;
        }
        return null;
      }
    });
  });
}
var observableArray = /*#__PURE__*/createObservableTypeCheckerCreator(false, "Array");
var observableArrayOf = /*#__PURE__*/createObservableArrayOfTypeChecker.bind(null, false);
var observableMap = /*#__PURE__*/createObservableTypeCheckerCreator(false, "Map");
var observableObject = /*#__PURE__*/createObservableTypeCheckerCreator(false, "Object");
var arrayOrObservableArray = /*#__PURE__*/createObservableTypeCheckerCreator(true, "Array");
var arrayOrObservableArrayOf = /*#__PURE__*/createObservableArrayOfTypeChecker.bind(null, true);
var objectOrObservableObject = /*#__PURE__*/createObservableTypeCheckerCreator(true, "Object");
var PropTypes = {
  observableArray: observableArray,
  observableArrayOf: observableArrayOf,
  observableMap: observableMap,
  observableObject: observableObject,
  arrayOrObservableArray: arrayOrObservableArray,
  arrayOrObservableArrayOf: arrayOrObservableArrayOf,
  objectOrObservableObject: objectOrObservableObject
};

if (!Component) {
  throw new Error("mobx-react requires React to be available");
}
if (!observable) {
  throw new Error("mobx-react requires mobx to be available");
}

export { MobXProviderContext, PropTypes, Provider, disposeOnUnmount, inject, observer };
//# sourceMappingURL=mobxreact.esm.development.js.map

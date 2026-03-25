(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.mobx = {}));
}(this, (function (exports) { 'use strict';

    var niceErrors = {
      0: "Invalid value for configuration 'enforceActions', expected 'never', 'always' or 'observed'",
      1: function _(annotationType, key) {
        return "Cannot apply '" + annotationType + "' to '" + key.toString() + "': Field not found.";
      },
      /*
      2(prop) {
          return `invalid decorator for '${prop.toString()}'`
      },
      3(prop) {
          return `Cannot decorate '${prop.toString()}': action can only be used on properties with a function value.`
      },
      4(prop) {
          return `Cannot decorate '${prop.toString()}': computed can only be used on getter properties.`
      },
      */
      5: "'keys()' can only be used on observable objects, arrays, sets and maps",
      6: "'values()' can only be used on observable objects, arrays, sets and maps",
      7: "'entries()' can only be used on observable objects, arrays and maps",
      8: "'set()' can only be used on observable objects, arrays and maps",
      9: "'remove()' can only be used on observable objects, arrays and maps",
      10: "'has()' can only be used on observable objects, arrays and maps",
      11: "'get()' can only be used on observable objects, arrays and maps",
      12: "Invalid annotation",
      13: "Dynamic observable objects cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)",
      14: "Intercept handlers should return nothing or a change object",
      15: "Observable arrays cannot be frozen. If you're passing observables to 3rd party component/function that calls Object.freeze, pass copy instead: toJS(observable)",
      16: "Modification exception: the internal structure of an observable array was changed.",
      17: function _(index, length) {
        return "[mobx.array] Index out of bounds, " + index + " is larger than " + length;
      },
      18: "mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js",
      19: function _(other) {
        return "Cannot initialize from classes that inherit from Map: " + other.constructor.name;
      },
      20: function _(other) {
        return "Cannot initialize map from " + other;
      },
      21: function _(dataStructure) {
        return "Cannot convert to map from '" + dataStructure + "'";
      },
      22: "mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js",
      23: "It is not possible to get index atoms from arrays",
      24: function _(thing) {
        return "Cannot obtain administration from " + thing;
      },
      25: function _(property, name) {
        return "the entry '" + property + "' does not exist in the observable map '" + name + "'";
      },
      26: "please specify a property",
      27: function _(property, name) {
        return "no observable property '" + property.toString() + "' found on the observable object '" + name + "'";
      },
      28: function _(thing) {
        return "Cannot obtain atom from " + thing;
      },
      29: "Expecting some object",
      30: "invalid action stack. did you forget to finish an action?",
      31: "missing option for computed: get",
      32: function _(name, derivation) {
        return "Cycle detected in computation " + name + ": " + derivation;
      },
      33: function _(name) {
        return "The setter of computed value '" + name + "' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?";
      },
      34: function _(name) {
        return "[ComputedValue '" + name + "'] It is not possible to assign a new value to a computed value.";
      },
      35: "There are multiple, different versions of MobX active. Make sure MobX is loaded only once or use `configure({ isolateGlobalState: true })`",
      36: "isolateGlobalState should be called before MobX is running any reactions",
      37: function _(method) {
        return "[mobx] `observableArray." + method + "()` mutates the array in-place, which is not allowed inside a derivation. Use `array.slice()." + method + "()` instead";
      },
      38: "'ownKeys()' can only be used on observable objects",
      39: "'defineProperty()' can only be used on observable objects"
    };
    var errors =  niceErrors ;
    function die(error) {
      for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }
      {
        var e = typeof error === "string" ? error : errors[error];
        if (typeof e === "function") e = e.apply(null, args);
        throw new Error("[MobX] " + e);
      }
    }

    var mockGlobal = {};
    function getGlobal() {
      if (typeof globalThis !== "undefined") {
        return globalThis;
      }
      if (typeof window !== "undefined") {
        return window;
      }
      if (typeof global !== "undefined") {
        return global;
      }
      if (typeof self !== "undefined") {
        return self;
      }
      return mockGlobal;
    }

    // We shorten anything used > 5 times
    var assign = Object.assign;
    var getDescriptor = Object.getOwnPropertyDescriptor;
    var defineProperty = Object.defineProperty;
    var objectPrototype = Object.prototype;
    var EMPTY_ARRAY = [];
    Object.freeze(EMPTY_ARRAY);
    var EMPTY_OBJECT = {};
    Object.freeze(EMPTY_OBJECT);
    var hasProxy = typeof Proxy !== "undefined";
    var plainObjectString = /*#__PURE__*/Object.toString();
    function assertProxies() {
      if (!hasProxy) {
        die( "`Proxy` objects are not available in the current environment. Please configure MobX to enable a fallback implementation.`" );
      }
    }
    function warnAboutProxyRequirement(msg) {
      if ( globalState.verifyProxies) {
        die("MobX is currently configured to be able to run in ES5 mode, but in ES5 MobX won't be able to " + msg);
      }
    }
    function getNextId() {
      return ++globalState.mobxGuid;
    }
    /**
     * Makes sure that the provided function is invoked at most once.
     */
    function once(func) {
      var invoked = false;
      return function () {
        if (invoked) {
          return;
        }
        invoked = true;
        return func.apply(this, arguments);
      };
    }
    var noop = function noop() {};
    function isFunction(fn) {
      return typeof fn === "function";
    }
    function isStringish(value) {
      var t = typeof value;
      switch (t) {
        case "string":
        case "symbol":
        case "number":
          return true;
      }
      return false;
    }
    function isObject(value) {
      return value !== null && typeof value === "object";
    }
    function isPlainObject(value) {
      if (!isObject(value)) {
        return false;
      }
      var proto = Object.getPrototypeOf(value);
      if (proto == null) {
        return true;
      }
      var protoConstructor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
      return typeof protoConstructor === "function" && protoConstructor.toString() === plainObjectString;
    }
    // https://stackoverflow.com/a/37865170
    function isGenerator(obj) {
      var constructor = obj == null ? void 0 : obj.constructor;
      if (!constructor) {
        return false;
      }
      if ("GeneratorFunction" === constructor.name || "GeneratorFunction" === constructor.displayName) {
        return true;
      }
      return false;
    }
    function addHiddenProp(object, propName, value) {
      defineProperty(object, propName, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: value
      });
    }
    function addHiddenFinalProp(object, propName, value) {
      defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
      });
    }
    function createInstanceofPredicate(name, theClass) {
      var propName = "isMobX" + name;
      theClass.prototype[propName] = true;
      return function (x) {
        return isObject(x) && x[propName] === true;
      };
    }
    function isES6Map(thing) {
      return thing instanceof Map;
    }
    function isES6Set(thing) {
      return thing instanceof Set;
    }
    var hasGetOwnPropertySymbols = typeof Object.getOwnPropertySymbols !== "undefined";
    /**
     * Returns the following: own enumerable keys and symbols.
     */
    function getPlainObjectKeys(object) {
      var keys = Object.keys(object);
      // Not supported in IE, so there are not going to be symbol props anyway...
      if (!hasGetOwnPropertySymbols) {
        return keys;
      }
      var symbols = Object.getOwnPropertySymbols(object);
      if (!symbols.length) {
        return keys;
      }
      return [].concat(keys, symbols.filter(function (s) {
        return objectPrototype.propertyIsEnumerable.call(object, s);
      }));
    }
    // From Immer utils
    // Returns all own keys, including non-enumerable and symbolic
    var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : hasGetOwnPropertySymbols ? function (obj) {
      return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));
    } : /* istanbul ignore next */Object.getOwnPropertyNames;
    function stringifyKey(key) {
      if (typeof key === "string") {
        return key;
      }
      if (typeof key === "symbol") {
        return key.toString();
      }
      return new String(key).toString();
    }
    function toPrimitive(value) {
      return value === null ? null : typeof value === "object" ? "" + value : value;
    }
    function hasProp(target, prop) {
      return objectPrototype.hasOwnProperty.call(target, prop);
    }
    // From Immer utils
    var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors(target) {
      // Polyfill needed for Hermes and IE, see https://github.com/facebook/hermes/issues/274
      var res = {};
      // Note: without polyfill for ownKeys, symbols won't be picked up
      ownKeys(target).forEach(function (key) {
        res[key] = getDescriptor(target, key);
      });
      return res;
    };

    function _defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
      }
    }
    function _createClass(Constructor, protoProps, staticProps) {
      if (protoProps) _defineProperties(Constructor.prototype, protoProps);
      if (staticProps) _defineProperties(Constructor, staticProps);
      Object.defineProperty(Constructor, "prototype", {
        writable: false
      });
      return Constructor;
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
    function _inheritsLoose(subClass, superClass) {
      subClass.prototype = Object.create(superClass.prototype);
      subClass.prototype.constructor = subClass;
      _setPrototypeOf(subClass, superClass);
    }
    function _setPrototypeOf(o, p) {
      _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
        o.__proto__ = p;
        return o;
      };
      return _setPrototypeOf(o, p);
    }
    function _assertThisInitialized(self) {
      if (self === void 0) {
        throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
      }
      return self;
    }
    function _unsupportedIterableToArray(o, minLen) {
      if (!o) return;
      if (typeof o === "string") return _arrayLikeToArray(o, minLen);
      var n = Object.prototype.toString.call(o).slice(8, -1);
      if (n === "Object" && o.constructor) n = o.constructor.name;
      if (n === "Map" || n === "Set") return Array.from(o);
      if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
    }
    function _arrayLikeToArray(arr, len) {
      if (len == null || len > arr.length) len = arr.length;
      for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
      return arr2;
    }
    function _createForOfIteratorHelperLoose(o, allowArrayLike) {
      var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"];
      if (it) return (it = it.call(o)).next.bind(it);
      if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") {
        if (it) o = it;
        var i = 0;
        return function () {
          if (i >= o.length) return {
            done: true
          };
          return {
            done: false,
            value: o[i++]
          };
        };
      }
      throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
    }
    function _toPrimitive(input, hint) {
      if (typeof input !== "object" || input === null) return input;
      var prim = input[Symbol.toPrimitive];
      if (prim !== undefined) {
        var res = prim.call(input, hint || "default");
        if (typeof res !== "object") return res;
        throw new TypeError("@@toPrimitive must return a primitive value.");
      }
      return (hint === "string" ? String : Number)(input);
    }
    function _toPropertyKey(arg) {
      var key = _toPrimitive(arg, "string");
      return typeof key === "symbol" ? key : String(key);
    }

    var storedAnnotationsSymbol = /*#__PURE__*/Symbol("mobx-stored-annotations");
    /**
     * Creates a function that acts as
     * - decorator
     * - annotation object
     */
    function createDecoratorAnnotation(annotation) {
      function decorator(target, property) {
        if (is20223Decorator(property)) {
          return annotation.decorate_20223_(target, property);
        } else {
          storeAnnotation(target, property, annotation);
        }
      }
      return Object.assign(decorator, annotation);
    }
    /**
     * Stores annotation to prototype,
     * so it can be inspected later by `makeObservable` called from constructor
     */
    function storeAnnotation(prototype, key, annotation) {
      if (!hasProp(prototype, storedAnnotationsSymbol)) {
        addHiddenProp(prototype, storedAnnotationsSymbol, _extends({}, prototype[storedAnnotationsSymbol]));
      }
      // @override must override something
      if ( isOverride(annotation) && !hasProp(prototype[storedAnnotationsSymbol], key)) {
        var fieldName = prototype.constructor.name + ".prototype." + key.toString();
        die("'" + fieldName + "' is decorated with 'override', " + "but no such decorated member was found on prototype.");
      }
      // Cannot re-decorate
      assertNotDecorated(prototype, annotation, key);
      // Ignore override
      if (!isOverride(annotation)) {
        prototype[storedAnnotationsSymbol][key] = annotation;
      }
    }
    function assertNotDecorated(prototype, annotation, key) {
      if ( !isOverride(annotation) && hasProp(prototype[storedAnnotationsSymbol], key)) {
        var fieldName = prototype.constructor.name + ".prototype." + key.toString();
        var currentAnnotationType = prototype[storedAnnotationsSymbol][key].annotationType_;
        var requestedAnnotationType = annotation.annotationType_;
        die("Cannot apply '@" + requestedAnnotationType + "' to '" + fieldName + "':" + ("\nThe field is already decorated with '@" + currentAnnotationType + "'.") + "\nRe-decorating fields is not allowed." + "\nUse '@override' decorator for methods overridden by subclass.");
      }
    }
    /**
     * Collects annotations from prototypes and stores them on target (instance)
     */
    function collectStoredAnnotations(target) {
      if (!hasProp(target, storedAnnotationsSymbol)) {
        // if (__DEV__ && !target[storedAnnotationsSymbol]) {
        //     die(
        //         `No annotations were passed to makeObservable, but no decorated members have been found either`
        //     )
        // }
        // We need a copy as we will remove annotation from the list once it's applied.
        addHiddenProp(target, storedAnnotationsSymbol, _extends({}, target[storedAnnotationsSymbol]));
      }
      return target[storedAnnotationsSymbol];
    }
    function is20223Decorator(context) {
      return typeof context == "object" && typeof context["kind"] == "string";
    }
    function assert20223DecoratorType(context, types) {
      if ( !types.includes(context.kind)) {
        die("The decorator applied to '" + String(context.name) + "' cannot be used on a " + context.kind + " element");
      }
    }

    var $mobx = /*#__PURE__*/Symbol("mobx administration");
    var Atom = /*#__PURE__*/function () {
      // for effective unobserving. BaseAtom has true, for extra optimization, so its onBecomeUnobserved never gets called, because it's not needed

      /**
       * Create a new atom. For debugging purposes it is recommended to give it a name.
       * The onBecomeObserved and onBecomeUnobserved callbacks can be used for resource management.
       */
      function Atom(name_) {
        if (name_ === void 0) {
          name_ =  "Atom@" + getNextId() ;
        }
        this.name_ = void 0;
        this.isPendingUnobservation_ = false;
        this.isBeingObserved_ = false;
        this.observers_ = new Set();
        this.diffValue_ = 0;
        this.lastAccessedBy_ = 0;
        this.lowestObserverState_ = IDerivationState_.NOT_TRACKING_;
        this.onBOL = void 0;
        this.onBUOL = void 0;
        this.name_ = name_;
      }
      // onBecomeObservedListeners
      var _proto = Atom.prototype;
      _proto.onBO = function onBO() {
        if (this.onBOL) {
          this.onBOL.forEach(function (listener) {
            return listener();
          });
        }
      };
      _proto.onBUO = function onBUO() {
        if (this.onBUOL) {
          this.onBUOL.forEach(function (listener) {
            return listener();
          });
        }
      }
      /**
       * Invoke this method to notify mobx that your atom has been used somehow.
       * Returns true if there is currently a reactive context.
       */;
      _proto.reportObserved = function reportObserved$1() {
        return reportObserved(this);
      }
      /**
       * Invoke this method _after_ this method has changed to signal mobx that all its observers should invalidate.
       */;
      _proto.reportChanged = function reportChanged() {
        startBatch();
        propagateChanged(this);
        endBatch();
      };
      _proto.toString = function toString() {
        return this.name_;
      };
      return Atom;
    }();
    var isAtom = /*#__PURE__*/createInstanceofPredicate("Atom", Atom);
    function createAtom(name, onBecomeObservedHandler, onBecomeUnobservedHandler) {
      if (onBecomeObservedHandler === void 0) {
        onBecomeObservedHandler = noop;
      }
      if (onBecomeUnobservedHandler === void 0) {
        onBecomeUnobservedHandler = noop;
      }
      var atom = new Atom(name);
      // default `noop` listener will not initialize the hook Set
      if (onBecomeObservedHandler !== noop) {
        onBecomeObserved(atom, onBecomeObservedHandler);
      }
      if (onBecomeUnobservedHandler !== noop) {
        onBecomeUnobserved(atom, onBecomeUnobservedHandler);
      }
      return atom;
    }

    function identityComparer(a, b) {
      return a === b;
    }
    function structuralComparer(a, b) {
      return deepEqual(a, b);
    }
    function shallowComparer(a, b) {
      return deepEqual(a, b, 1);
    }
    function defaultComparer(a, b) {
      if (Object.is) {
        return Object.is(a, b);
      }
      return a === b ? a !== 0 || 1 / a === 1 / b : a !== a && b !== b;
    }
    var comparer = {
      identity: identityComparer,
      structural: structuralComparer,
      "default": defaultComparer,
      shallow: shallowComparer
    };

    function deepEnhancer(v, _, name) {
      // it is an observable already, done
      if (isObservable(v)) {
        return v;
      }
      // something that can be converted and mutated?
      if (Array.isArray(v)) {
        return observable.array(v, {
          name: name
        });
      }
      if (isPlainObject(v)) {
        return observable.object(v, undefined, {
          name: name
        });
      }
      if (isES6Map(v)) {
        return observable.map(v, {
          name: name
        });
      }
      if (isES6Set(v)) {
        return observable.set(v, {
          name: name
        });
      }
      if (typeof v === "function" && !isAction(v) && !isFlow(v)) {
        if (isGenerator(v)) {
          return flow(v);
        } else {
          return autoAction(name, v);
        }
      }
      return v;
    }
    function shallowEnhancer(v, _, name) {
      if (v === undefined || v === null) {
        return v;
      }
      if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v) || isObservableSet(v)) {
        return v;
      }
      if (Array.isArray(v)) {
        return observable.array(v, {
          name: name,
          deep: false
        });
      }
      if (isPlainObject(v)) {
        return observable.object(v, undefined, {
          name: name,
          deep: false
        });
      }
      if (isES6Map(v)) {
        return observable.map(v, {
          name: name,
          deep: false
        });
      }
      if (isES6Set(v)) {
        return observable.set(v, {
          name: name,
          deep: false
        });
      }
      {
        die("The shallow modifier / decorator can only used in combination with arrays, objects, maps and sets");
      }
    }
    function referenceEnhancer(newValue) {
      // never turn into an observable
      return newValue;
    }
    function refStructEnhancer(v, oldValue) {
      if ( isObservable(v)) {
        die("observable.struct should not be used with observable values");
      }
      if (deepEqual(v, oldValue)) {
        return oldValue;
      }
      return v;
    }

    var OVERRIDE = "override";
    var override = /*#__PURE__*/createDecoratorAnnotation({
      annotationType_: OVERRIDE,
      make_: make_,
      extend_: extend_,
      decorate_20223_: decorate_20223_
    });
    function isOverride(annotation) {
      return annotation.annotationType_ === OVERRIDE;
    }
    function make_(adm, key) {
      // Must not be plain object
      if ( adm.isPlainObject_) {
        die("Cannot apply '" + this.annotationType_ + "' to '" + adm.name_ + "." + key.toString() + "':" + ("\n'" + this.annotationType_ + "' cannot be used on plain objects."));
      }
      // Must override something
      if ( !hasProp(adm.appliedAnnotations_, key)) {
        die("'" + adm.name_ + "." + key.toString() + "' is annotated with '" + this.annotationType_ + "', " + "but no such annotated member was found on prototype.");
      }
      return 0 /* MakeResult.Cancel */;
    }

    function extend_(adm, key, descriptor, proxyTrap) {
      die("'" + this.annotationType_ + "' can only be used with 'makeObservable'");
    }
    function decorate_20223_(desc, context) {
      console.warn("'" + this.annotationType_ + "' cannot be used with decorators - this is a no-op");
    }

    function createActionAnnotation(name, options) {
      return {
        annotationType_: name,
        options_: options,
        make_: make_$1,
        extend_: extend_$1,
        decorate_20223_: decorate_20223_$1
      };
    }
    function make_$1(adm, key, descriptor, source) {
      var _this$options_;
      // bound
      if ((_this$options_ = this.options_) != null && _this$options_.bound) {
        return this.extend_(adm, key, descriptor, false) === null ? 0 /* MakeResult.Cancel */ : 1 /* MakeResult.Break */;
      }
      // own
      if (source === adm.target_) {
        return this.extend_(adm, key, descriptor, false) === null ? 0 /* MakeResult.Cancel */ : 2 /* MakeResult.Continue */;
      }
      // prototype
      if (isAction(descriptor.value)) {
        // A prototype could have been annotated already by other constructor,
        // rest of the proto chain must be annotated already
        return 1 /* MakeResult.Break */;
      }

      var actionDescriptor = createActionDescriptor(adm, this, key, descriptor, false);
      defineProperty(source, key, actionDescriptor);
      return 2 /* MakeResult.Continue */;
    }

    function extend_$1(adm, key, descriptor, proxyTrap) {
      var actionDescriptor = createActionDescriptor(adm, this, key, descriptor);
      return adm.defineProperty_(key, actionDescriptor, proxyTrap);
    }
    function decorate_20223_$1(mthd, context) {
      {
        assert20223DecoratorType(context, ["method", "field"]);
      }
      var kind = context.kind,
        name = context.name,
        addInitializer = context.addInitializer;
      var ann = this;
      var _createAction = function _createAction(m) {
        var _ann$options_$name, _ann$options_, _ann$options_$autoAct, _ann$options_2;
        return createAction((_ann$options_$name = (_ann$options_ = ann.options_) == null ? void 0 : _ann$options_.name) != null ? _ann$options_$name : name.toString(), m, (_ann$options_$autoAct = (_ann$options_2 = ann.options_) == null ? void 0 : _ann$options_2.autoAction) != null ? _ann$options_$autoAct : false);
      };
      // Backwards/Legacy behavior, expects makeObservable(this)
      if (kind == "field") {
        addInitializer(function () {
          storeAnnotation(this, name, ann);
        });
        return;
      }
      if (kind == "method") {
        var _this$options_2;
        if (!isAction(mthd)) {
          mthd = _createAction(mthd);
        }
        if ((_this$options_2 = this.options_) != null && _this$options_2.bound) {
          addInitializer(function () {
            var self = this;
            var bound = self[name].bind(self);
            bound.isMobxAction = true;
            self[name] = bound;
          });
        }
        return mthd;
      }
      die("Cannot apply '" + ann.annotationType_ + "' to '" + String(name) + "' (kind: " + kind + "):" + ("\n'" + ann.annotationType_ + "' can only be used on properties with a function value."));
    }
    function assertActionDescriptor(adm, _ref, key, _ref2) {
      var annotationType_ = _ref.annotationType_;
      var value = _ref2.value;
      if ( !isFunction(value)) {
        die("Cannot apply '" + annotationType_ + "' to '" + adm.name_ + "." + key.toString() + "':" + ("\n'" + annotationType_ + "' can only be used on properties with a function value."));
      }
    }
    function createActionDescriptor(adm, annotation, key, descriptor,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors) {
      var _annotation$options_, _annotation$options_$, _annotation$options_2, _annotation$options_$2, _annotation$options_3, _annotation$options_4, _adm$proxy_2;
      if (safeDescriptors === void 0) {
        safeDescriptors = globalState.safeDescriptors;
      }
      assertActionDescriptor(adm, annotation, key, descriptor);
      var value = descriptor.value;
      if ((_annotation$options_ = annotation.options_) != null && _annotation$options_.bound) {
        var _adm$proxy_;
        value = value.bind((_adm$proxy_ = adm.proxy_) != null ? _adm$proxy_ : adm.target_);
      }
      return {
        value: createAction((_annotation$options_$ = (_annotation$options_2 = annotation.options_) == null ? void 0 : _annotation$options_2.name) != null ? _annotation$options_$ : key.toString(), value, (_annotation$options_$2 = (_annotation$options_3 = annotation.options_) == null ? void 0 : _annotation$options_3.autoAction) != null ? _annotation$options_$2 : false,
        // https://github.com/mobxjs/mobx/discussions/3140
        (_annotation$options_4 = annotation.options_) != null && _annotation$options_4.bound ? (_adm$proxy_2 = adm.proxy_) != null ? _adm$proxy_2 : adm.target_ : undefined),
        // Non-configurable for classes
        // prevents accidental field redefinition in subclass
        configurable: safeDescriptors ? adm.isPlainObject_ : true,
        // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
        enumerable: false,
        // Non-obsevable, therefore non-writable
        // Also prevents rewriting in subclass constructor
        writable: safeDescriptors ? false : true
      };
    }

    function createFlowAnnotation(name, options) {
      return {
        annotationType_: name,
        options_: options,
        make_: make_$2,
        extend_: extend_$2,
        decorate_20223_: decorate_20223_$2
      };
    }
    function make_$2(adm, key, descriptor, source) {
      var _this$options_;
      // own
      if (source === adm.target_) {
        return this.extend_(adm, key, descriptor, false) === null ? 0 /* MakeResult.Cancel */ : 2 /* MakeResult.Continue */;
      }
      // prototype
      // bound - must annotate protos to support super.flow()
      if ((_this$options_ = this.options_) != null && _this$options_.bound && (!hasProp(adm.target_, key) || !isFlow(adm.target_[key]))) {
        if (this.extend_(adm, key, descriptor, false) === null) {
          return 0 /* MakeResult.Cancel */;
        }
      }

      if (isFlow(descriptor.value)) {
        // A prototype could have been annotated already by other constructor,
        // rest of the proto chain must be annotated already
        return 1 /* MakeResult.Break */;
      }

      var flowDescriptor = createFlowDescriptor(adm, this, key, descriptor, false, false);
      defineProperty(source, key, flowDescriptor);
      return 2 /* MakeResult.Continue */;
    }

    function extend_$2(adm, key, descriptor, proxyTrap) {
      var _this$options_2;
      var flowDescriptor = createFlowDescriptor(adm, this, key, descriptor, (_this$options_2 = this.options_) == null ? void 0 : _this$options_2.bound);
      return adm.defineProperty_(key, flowDescriptor, proxyTrap);
    }
    function decorate_20223_$2(mthd, context) {
      var _this$options_3;
      {
        assert20223DecoratorType(context, ["method"]);
      }
      var name = context.name,
        addInitializer = context.addInitializer;
      if (!isFlow(mthd)) {
        mthd = flow(mthd);
      }
      if ((_this$options_3 = this.options_) != null && _this$options_3.bound) {
        addInitializer(function () {
          var self = this;
          var bound = self[name].bind(self);
          bound.isMobXFlow = true;
          self[name] = bound;
        });
      }
      return mthd;
    }
    function assertFlowDescriptor(adm, _ref, key, _ref2) {
      var annotationType_ = _ref.annotationType_;
      var value = _ref2.value;
      if ( !isFunction(value)) {
        die("Cannot apply '" + annotationType_ + "' to '" + adm.name_ + "." + key.toString() + "':" + ("\n'" + annotationType_ + "' can only be used on properties with a generator function value."));
      }
    }
    function createFlowDescriptor(adm, annotation, key, descriptor, bound,
    // provides ability to disable safeDescriptors for prototypes
    safeDescriptors) {
      if (safeDescriptors === void 0) {
        safeDescriptors = globalState.safeDescriptors;
      }
      assertFlowDescriptor(adm, annotation, key, descriptor);
      var value = descriptor.value;
      // In case of flow.bound, the descriptor can be from already annotated prototype
      if (!isFlow(value)) {
        value = flow(value);
      }
      if (bound) {
        var _adm$proxy_;
        // We do not keep original function around, so we bind the existing flow
        value = value.bind((_adm$proxy_ = adm.proxy_) != null ? _adm$proxy_ : adm.target_);
        // This is normally set by `flow`, but `bind` returns new function...
        value.isMobXFlow = true;
      }
      return {
        value: value,
        // Non-configurable for classes
        // prevents accidental field redefinition in subclass
        configurable: safeDescriptors ? adm.isPlainObject_ : true,
        // https://github.com/mobxjs/mobx/pull/2641#issuecomment-737292058
        enumerable: false,
        // Non-obsevable, therefore non-writable
        // Also prevents rewriting in subclass constructor
        writable: safeDescriptors ? false : true
      };
    }

    function createComputedAnnotation(name, options) {
      return {
        annotationType_: name,
        options_: options,
        make_: make_$3,
        extend_: extend_$3,
        decorate_20223_: decorate_20223_$3
      };
    }
    function make_$3(adm, key, descriptor) {
      return this.extend_(adm, key, descriptor, false) === null ? 0 /* MakeResult.Cancel */ : 1 /* MakeResult.Break */;
    }

    function extend_$3(adm, key, descriptor, proxyTrap) {
      assertComputedDescriptor(adm, this, key, descriptor);
      return adm.defineComputedProperty_(key, _extends({}, this.options_, {
        get: descriptor.get,
        set: descriptor.set
      }), proxyTrap);
    }
    function decorate_20223_$3(get, context) {
      {
        assert20223DecoratorType(context, ["getter"]);
      }
      var ann = this;
      var key = context.name,
        addInitializer = context.addInitializer;
      addInitializer(function () {
        var adm = asObservableObject(this)[$mobx];
        var options = _extends({}, ann.options_, {
          get: get,
          context: this
        });
        options.name || (options.name =  adm.name_ + "." + key.toString() );
        adm.values_.set(key, new ComputedValue(options));
      });
      return function () {
        return this[$mobx].getObservablePropValue_(key);
      };
    }
    function assertComputedDescriptor(adm, _ref, key, _ref2) {
      var annotationType_ = _ref.annotationType_;
      var get = _ref2.get;
      if ( !get) {
        die("Cannot apply '" + annotationType_ + "' to '" + adm.name_ + "." + key.toString() + "':" + ("\n'" + annotationType_ + "' can only be used on getter(+setter) properties."));
      }
    }

    function createObservableAnnotation(name, options) {
      return {
        annotationType_: name,
        options_: options,
        make_: make_$4,
        extend_: extend_$4,
        decorate_20223_: decorate_20223_$4
      };
    }
    function make_$4(adm, key, descriptor) {
      return this.extend_(adm, key, descriptor, false) === null ? 0 /* MakeResult.Cancel */ : 1 /* MakeResult.Break */;
    }

    function extend_$4(adm, key, descriptor, proxyTrap) {
      var _this$options_$enhanc, _this$options_;
      assertObservableDescriptor(adm, this, key, descriptor);
      return adm.defineObservableProperty_(key, descriptor.value, (_this$options_$enhanc = (_this$options_ = this.options_) == null ? void 0 : _this$options_.enhancer) != null ? _this$options_$enhanc : deepEnhancer, proxyTrap);
    }
    function decorate_20223_$4(desc, context) {
      {
        if (context.kind === "field") {
          throw die("Please use `@observable accessor " + String(context.name) + "` instead of `@observable " + String(context.name) + "`");
        }
        assert20223DecoratorType(context, ["accessor"]);
      }
      var ann = this;
      var kind = context.kind,
        name = context.name;
      // The laziness here is not ideal... It's a workaround to how 2022.3 Decorators are implemented:
      //   `addInitializer` callbacks are executed _before_ any accessors are defined (instead of the ideal-for-us right after each).
      //   This means that, if we were to do our stuff in an `addInitializer`, we'd attempt to read a private slot
      //   before it has been initialized. The runtime doesn't like that and throws a `Cannot read private member
      //   from an object whose class did not declare it` error.
      // TODO: it seems that this will not be required anymore in the final version of the spec
      // See TODO: link
      var initializedObjects = new WeakSet();
      function initializeObservable(target, value) {
        var _ann$options_$enhance, _ann$options_;
        var adm = asObservableObject(target)[$mobx];
        var observable = new ObservableValue(value, (_ann$options_$enhance = (_ann$options_ = ann.options_) == null ? void 0 : _ann$options_.enhancer) != null ? _ann$options_$enhance : deepEnhancer,  adm.name_ + "." + name.toString() , false);
        adm.values_.set(name, observable);
        initializedObjects.add(target);
      }
      if (kind == "accessor") {
        return {
          get: function get() {
            if (!initializedObjects.has(this)) {
              initializeObservable(this, desc.get.call(this));
            }
            return this[$mobx].getObservablePropValue_(name);
          },
          set: function set(value) {
            if (!initializedObjects.has(this)) {
              initializeObservable(this, value);
            }
            return this[$mobx].setObservablePropValue_(name, value);
          },
          init: function init(value) {
            if (!initializedObjects.has(this)) {
              initializeObservable(this, value);
            }
            return value;
          }
        };
      }
      return;
    }
    function assertObservableDescriptor(adm, _ref, key, descriptor) {
      var annotationType_ = _ref.annotationType_;
      if ( !("value" in descriptor)) {
        die("Cannot apply '" + annotationType_ + "' to '" + adm.name_ + "." + key.toString() + "':" + ("\n'" + annotationType_ + "' cannot be used on getter/setter properties"));
      }
    }

    var AUTO = "true";
    var autoAnnotation = /*#__PURE__*/createAutoAnnotation();
    function createAutoAnnotation(options) {
      return {
        annotationType_: AUTO,
        options_: options,
        make_: make_$5,
        extend_: extend_$5,
        decorate_20223_: decorate_20223_$5
      };
    }
    function make_$5(adm, key, descriptor, source) {
      var _this$options_3, _this$options_4;
      // getter -> computed
      if (descriptor.get) {
        return computed.make_(adm, key, descriptor, source);
      }
      // lone setter -> action setter
      if (descriptor.set) {
        // TODO make action applicable to setter and delegate to action.make_
        var set = createAction(key.toString(), descriptor.set);
        // own
        if (source === adm.target_) {
          return adm.defineProperty_(key, {
            configurable: globalState.safeDescriptors ? adm.isPlainObject_ : true,
            set: set
          }) === null ? 0 /* MakeResult.Cancel */ : 2 /* MakeResult.Continue */;
        }
        // proto
        defineProperty(source, key, {
          configurable: true,
          set: set
        });
        return 2 /* MakeResult.Continue */;
      }
      // function on proto -> autoAction/flow
      if (source !== adm.target_ && typeof descriptor.value === "function") {
        var _this$options_2;
        if (isGenerator(descriptor.value)) {
          var _this$options_;
          var flowAnnotation = (_this$options_ = this.options_) != null && _this$options_.autoBind ? flow.bound : flow;
          return flowAnnotation.make_(adm, key, descriptor, source);
        }
        var actionAnnotation = (_this$options_2 = this.options_) != null && _this$options_2.autoBind ? autoAction.bound : autoAction;
        return actionAnnotation.make_(adm, key, descriptor, source);
      }
      // other -> observable
      // Copy props from proto as well, see test:
      // "decorate should work with Object.create"
      var observableAnnotation = ((_this$options_3 = this.options_) == null ? void 0 : _this$options_3.deep) === false ? observable.ref : observable;
      // if function respect autoBind option
      if (typeof descriptor.value === "function" && (_this$options_4 = this.options_) != null && _this$options_4.autoBind) {
        var _adm$proxy_;
        descriptor.value = descriptor.value.bind((_adm$proxy_ = adm.proxy_) != null ? _adm$proxy_ : adm.target_);
      }
      return observableAnnotation.make_(adm, key, descriptor, source);
    }
    function extend_$5(adm, key, descriptor, proxyTrap) {
      var _this$options_5, _this$options_6;
      // getter -> computed
      if (descriptor.get) {
        return computed.extend_(adm, key, descriptor, proxyTrap);
      }
      // lone setter -> action setter
      if (descriptor.set) {
        // TODO make action applicable to setter and delegate to action.extend_
        return adm.defineProperty_(key, {
          configurable: globalState.safeDescriptors ? adm.isPlainObject_ : true,
          set: createAction(key.toString(), descriptor.set)
        }, proxyTrap);
      }
      // other -> observable
      // if function respect autoBind option
      if (typeof descriptor.value === "function" && (_this$options_5 = this.options_) != null && _this$options_5.autoBind) {
        var _adm$proxy_2;
        descriptor.value = descriptor.value.bind((_adm$proxy_2 = adm.proxy_) != null ? _adm$proxy_2 : adm.target_);
      }
      var observableAnnotation = ((_this$options_6 = this.options_) == null ? void 0 : _this$options_6.deep) === false ? observable.ref : observable;
      return observableAnnotation.extend_(adm, key, descriptor, proxyTrap);
    }
    function decorate_20223_$5(desc, context) {
      die("'" + this.annotationType_ + "' cannot be used as a decorator");
    }

    var OBSERVABLE = "observable";
    var OBSERVABLE_REF = "observable.ref";
    var OBSERVABLE_SHALLOW = "observable.shallow";
    var OBSERVABLE_STRUCT = "observable.struct";
    // Predefined bags of create observable options, to avoid allocating temporarily option objects
    // in the majority of cases
    var defaultCreateObservableOptions = {
      deep: true,
      name: undefined,
      defaultDecorator: undefined,
      proxy: true
    };
    Object.freeze(defaultCreateObservableOptions);
    function asCreateObservableOptions(thing) {
      return thing || defaultCreateObservableOptions;
    }
    var observableAnnotation = /*#__PURE__*/createObservableAnnotation(OBSERVABLE);
    var observableRefAnnotation = /*#__PURE__*/createObservableAnnotation(OBSERVABLE_REF, {
      enhancer: referenceEnhancer
    });
    var observableShallowAnnotation = /*#__PURE__*/createObservableAnnotation(OBSERVABLE_SHALLOW, {
      enhancer: shallowEnhancer
    });
    var observableStructAnnotation = /*#__PURE__*/createObservableAnnotation(OBSERVABLE_STRUCT, {
      enhancer: refStructEnhancer
    });
    var observableDecoratorAnnotation = /*#__PURE__*/createDecoratorAnnotation(observableAnnotation);
    function getEnhancerFromOptions(options) {
      return options.deep === true ? deepEnhancer : options.deep === false ? referenceEnhancer : getEnhancerFromAnnotation(options.defaultDecorator);
    }
    function getAnnotationFromOptions(options) {
      var _options$defaultDecor;
      return options ? (_options$defaultDecor = options.defaultDecorator) != null ? _options$defaultDecor : createAutoAnnotation(options) : undefined;
    }
    function getEnhancerFromAnnotation(annotation) {
      var _annotation$options_$, _annotation$options_;
      return !annotation ? deepEnhancer : (_annotation$options_$ = (_annotation$options_ = annotation.options_) == null ? void 0 : _annotation$options_.enhancer) != null ? _annotation$options_$ : deepEnhancer;
    }
    /**
     * Turns an object, array or function into a reactive structure.
     * @param v the value which should become observable.
     */
    function createObservable(v, arg2, arg3) {
      // @observable someProp; (2022.3 Decorators)
      if (is20223Decorator(arg2)) {
        return observableAnnotation.decorate_20223_(v, arg2);
      }
      // @observable someProp;
      if (isStringish(arg2)) {
        storeAnnotation(v, arg2, observableAnnotation);
        return;
      }
      // already observable - ignore
      if (isObservable(v)) {
        return v;
      }
      // plain object
      if (isPlainObject(v)) {
        return observable.object(v, arg2, arg3);
      }
      // Array
      if (Array.isArray(v)) {
        return observable.array(v, arg2);
      }
      // Map
      if (isES6Map(v)) {
        return observable.map(v, arg2);
      }
      // Set
      if (isES6Set(v)) {
        return observable.set(v, arg2);
      }
      // other object - ignore
      if (typeof v === "object" && v !== null) {
        return v;
      }
      // anything else
      return observable.box(v, arg2);
    }
    assign(createObservable, observableDecoratorAnnotation);
    var observableFactories = {
      box: function box(value, options) {
        var o = asCreateObservableOptions(options);
        return new ObservableValue(value, getEnhancerFromOptions(o), o.name, true, o.equals);
      },
      array: function array(initialValues, options) {
        var o = asCreateObservableOptions(options);
        return (globalState.useProxies === false || o.proxy === false ? createLegacyArray : createObservableArray)(initialValues, getEnhancerFromOptions(o), o.name);
      },
      map: function map(initialValues, options) {
        var o = asCreateObservableOptions(options);
        return new ObservableMap(initialValues, getEnhancerFromOptions(o), o.name);
      },
      set: function set(initialValues, options) {
        var o = asCreateObservableOptions(options);
        return new ObservableSet(initialValues, getEnhancerFromOptions(o), o.name);
      },
      object: function object(props, decorators, options) {
        return initObservable(function () {
          return extendObservable(globalState.useProxies === false || (options == null ? void 0 : options.proxy) === false ? asObservableObject({}, options) : asDynamicObservableObject({}, options), props, decorators);
        });
      },
      ref: /*#__PURE__*/createDecoratorAnnotation(observableRefAnnotation),
      shallow: /*#__PURE__*/createDecoratorAnnotation(observableShallowAnnotation),
      deep: observableDecoratorAnnotation,
      struct: /*#__PURE__*/createDecoratorAnnotation(observableStructAnnotation)
    };
    // eslint-disable-next-line
    var observable = /*#__PURE__*/assign(createObservable, observableFactories);

    var COMPUTED = "computed";
    var COMPUTED_STRUCT = "computed.struct";
    var computedAnnotation = /*#__PURE__*/createComputedAnnotation(COMPUTED);
    var computedStructAnnotation = /*#__PURE__*/createComputedAnnotation(COMPUTED_STRUCT, {
      equals: comparer.structural
    });
    /**
     * Decorator for class properties: @computed get value() { return expr; }.
     * For legacy purposes also invokable as ES5 observable created: `computed(() => expr)`;
     */
    var computed = function computed(arg1, arg2) {
      if (is20223Decorator(arg2)) {
        // @computed (2022.3 Decorators)
        return computedAnnotation.decorate_20223_(arg1, arg2);
      }
      if (isStringish(arg2)) {
        // @computed
        return storeAnnotation(arg1, arg2, computedAnnotation);
      }
      if (isPlainObject(arg1)) {
        // @computed({ options })
        return createDecoratorAnnotation(createComputedAnnotation(COMPUTED, arg1));
      }
      // computed(expr, options?)
      {
        if (!isFunction(arg1)) {
          die("First argument to `computed` should be an expression.");
        }
        if (isFunction(arg2)) {
          die("A setter as second argument is no longer supported, use `{ set: fn }` option instead");
        }
      }
      var opts = isPlainObject(arg2) ? arg2 : {};
      opts.get = arg1;
      opts.name || (opts.name = arg1.name || ""); /* for generated name */
      return new ComputedValue(opts);
    };
    Object.assign(computed, computedAnnotation);
    computed.struct = /*#__PURE__*/createDecoratorAnnotation(computedStructAnnotation);

    var _getDescriptor$config, _getDescriptor;
    // we don't use globalState for these in order to avoid possible issues with multiple
    // mobx versions
    var currentActionId = 0;
    var nextActionId = 1;
    var isFunctionNameConfigurable = (_getDescriptor$config = (_getDescriptor = /*#__PURE__*/getDescriptor(function () {}, "name")) == null ? void 0 : _getDescriptor.configurable) != null ? _getDescriptor$config : false;
    // we can safely recycle this object
    var tmpNameDescriptor = {
      value: "action",
      configurable: true,
      writable: false,
      enumerable: false
    };
    function createAction(actionName, fn, autoAction, ref) {
      if (autoAction === void 0) {
        autoAction = false;
      }
      {
        if (!isFunction(fn)) {
          die("`action` can only be invoked on functions");
        }
        if (typeof actionName !== "string" || !actionName) {
          die("actions should have valid names, got: '" + actionName + "'");
        }
      }
      function res() {
        return executeAction(actionName, autoAction, fn, ref || this, arguments);
      }
      res.isMobxAction = true;
      res.toString = function () {
        return fn.toString();
      };
      if (isFunctionNameConfigurable) {
        tmpNameDescriptor.value = actionName;
        defineProperty(res, "name", tmpNameDescriptor);
      }
      return res;
    }
    function executeAction(actionName, canRunAsDerivation, fn, scope, args) {
      var runInfo = _startAction(actionName, canRunAsDerivation, scope, args);
      try {
        return fn.apply(scope, args);
      } catch (err) {
        runInfo.error_ = err;
        throw err;
      } finally {
        _endAction(runInfo);
      }
    }
    function _startAction(actionName, canRunAsDerivation,
    // true for autoAction
    scope, args) {
      var notifySpy_ =  isSpyEnabled() && !!actionName;
      var startTime_ = 0;
      if ( notifySpy_) {
        startTime_ = Date.now();
        var flattenedArgs = args ? Array.from(args) : EMPTY_ARRAY;
        spyReportStart({
          type: ACTION,
          name: actionName,
          object: scope,
          arguments: flattenedArgs
        });
      }
      var prevDerivation_ = globalState.trackingDerivation;
      var runAsAction = !canRunAsDerivation || !prevDerivation_;
      startBatch();
      var prevAllowStateChanges_ = globalState.allowStateChanges; // by default preserve previous allow
      if (runAsAction) {
        untrackedStart();
        prevAllowStateChanges_ = allowStateChangesStart(true);
      }
      var prevAllowStateReads_ = allowStateReadsStart(true);
      var runInfo = {
        runAsAction_: runAsAction,
        prevDerivation_: prevDerivation_,
        prevAllowStateChanges_: prevAllowStateChanges_,
        prevAllowStateReads_: prevAllowStateReads_,
        notifySpy_: notifySpy_,
        startTime_: startTime_,
        actionId_: nextActionId++,
        parentActionId_: currentActionId
      };
      currentActionId = runInfo.actionId_;
      return runInfo;
    }
    function _endAction(runInfo) {
      if (currentActionId !== runInfo.actionId_) {
        die(30);
      }
      currentActionId = runInfo.parentActionId_;
      if (runInfo.error_ !== undefined) {
        globalState.suppressReactionErrors = true;
      }
      allowStateChangesEnd(runInfo.prevAllowStateChanges_);
      allowStateReadsEnd(runInfo.prevAllowStateReads_);
      endBatch();
      if (runInfo.runAsAction_) {
        untrackedEnd(runInfo.prevDerivation_);
      }
      if ( runInfo.notifySpy_) {
        spyReportEnd({
          time: Date.now() - runInfo.startTime_
        });
      }
      globalState.suppressReactionErrors = false;
    }
    function allowStateChanges(allowStateChanges, func) {
      var prev = allowStateChangesStart(allowStateChanges);
      try {
        return func();
      } finally {
        allowStateChangesEnd(prev);
      }
    }
    function allowStateChangesStart(allowStateChanges) {
      var prev = globalState.allowStateChanges;
      globalState.allowStateChanges = allowStateChanges;
      return prev;
    }
    function allowStateChangesEnd(prev) {
      globalState.allowStateChanges = prev;
    }

    var _Symbol$toPrimitive;
    var CREATE = "create";
    _Symbol$toPrimitive = Symbol.toPrimitive;
    var ObservableValue = /*#__PURE__*/function (_Atom) {
      _inheritsLoose(ObservableValue, _Atom);
      function ObservableValue(value, enhancer, name_, notifySpy, equals) {
        var _this;
        if (name_ === void 0) {
          name_ =  "ObservableValue@" + getNextId() ;
        }
        if (notifySpy === void 0) {
          notifySpy = true;
        }
        if (equals === void 0) {
          equals = comparer["default"];
        }
        _this = _Atom.call(this, name_) || this;
        _this.enhancer = void 0;
        _this.name_ = void 0;
        _this.equals = void 0;
        _this.hasUnreportedChange_ = false;
        _this.interceptors_ = void 0;
        _this.changeListeners_ = void 0;
        _this.value_ = void 0;
        _this.dehancer = void 0;
        _this.enhancer = enhancer;
        _this.name_ = name_;
        _this.equals = equals;
        _this.value_ = enhancer(value, undefined, name_);
        if ( notifySpy && isSpyEnabled()) {
          // only notify spy if this is a stand-alone observable
          spyReport({
            type: CREATE,
            object: _assertThisInitialized(_this),
            observableKind: "value",
            debugObjectName: _this.name_,
            newValue: "" + _this.value_
          });
        }
        return _this;
      }
      var _proto = ObservableValue.prototype;
      _proto.dehanceValue = function dehanceValue(value) {
        if (this.dehancer !== undefined) {
          return this.dehancer(value);
        }
        return value;
      };
      _proto.set = function set(newValue) {
        var oldValue = this.value_;
        newValue = this.prepareNewValue_(newValue);
        if (newValue !== globalState.UNCHANGED) {
          var notifySpy = isSpyEnabled();
          if ( notifySpy) {
            spyReportStart({
              type: UPDATE,
              object: this,
              observableKind: "value",
              debugObjectName: this.name_,
              newValue: newValue,
              oldValue: oldValue
            });
          }
          this.setNewValue_(newValue);
          if ( notifySpy) {
            spyReportEnd();
          }
        }
      };
      _proto.prepareNewValue_ = function prepareNewValue_(newValue) {
        checkIfStateModificationsAreAllowed(this);
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            object: this,
            type: UPDATE,
            newValue: newValue
          });
          if (!change) {
            return globalState.UNCHANGED;
          }
          newValue = change.newValue;
        }
        // apply modifier
        newValue = this.enhancer(newValue, this.value_, this.name_);
        return this.equals(this.value_, newValue) ? globalState.UNCHANGED : newValue;
      };
      _proto.setNewValue_ = function setNewValue_(newValue) {
        var oldValue = this.value_;
        this.value_ = newValue;
        this.reportChanged();
        if (hasListeners(this)) {
          notifyListeners(this, {
            type: UPDATE,
            object: this,
            newValue: newValue,
            oldValue: oldValue
          });
        }
      };
      _proto.get = function get() {
        this.reportObserved();
        return this.dehanceValue(this.value_);
      };
      _proto.intercept_ = function intercept_(handler) {
        return registerInterceptor(this, handler);
      };
      _proto.observe_ = function observe_(listener, fireImmediately) {
        if (fireImmediately) {
          listener({
            observableKind: "value",
            debugObjectName: this.name_,
            object: this,
            type: UPDATE,
            newValue: this.value_,
            oldValue: undefined
          });
        }
        return registerListener(this, listener);
      };
      _proto.raw = function raw() {
        // used by MST ot get undehanced value
        return this.value_;
      };
      _proto.toJSON = function toJSON() {
        return this.get();
      };
      _proto.toString = function toString() {
        return this.name_ + "[" + this.value_ + "]";
      };
      _proto.valueOf = function valueOf() {
        return toPrimitive(this.get());
      };
      _proto[_Symbol$toPrimitive] = function () {
        return this.valueOf();
      };
      return ObservableValue;
    }(Atom);
    var isObservableValue = /*#__PURE__*/createInstanceofPredicate("ObservableValue", ObservableValue);

    var _Symbol$toPrimitive$1;
    /**
     * A node in the state dependency root that observes other nodes, and can be observed itself.
     *
     * ComputedValue will remember the result of the computation for the duration of the batch, or
     * while being observed.
     *
     * During this time it will recompute only when one of its direct dependencies changed,
     * but only when it is being accessed with `ComputedValue.get()`.
     *
     * Implementation description:
     * 1. First time it's being accessed it will compute and remember result
     *    give back remembered result until 2. happens
     * 2. First time any deep dependency change, propagate POSSIBLY_STALE to all observers, wait for 3.
     * 3. When it's being accessed, recompute if any shallow dependency changed.
     *    if result changed: propagate STALE to all observers, that were POSSIBLY_STALE from the last step.
     *    go to step 2. either way
     *
     * If at any point it's outside batch and it isn't observed: reset everything and go to 1.
     */
    _Symbol$toPrimitive$1 = Symbol.toPrimitive;
    var ComputedValue = /*#__PURE__*/function () {
      // nodes we are looking at. Our value depends on these nodes
      // during tracking it's an array with new observed observers

      // to check for cycles

      // N.B: unminified as it is used by MST

      /**
       * Create a new computed value based on a function expression.
       *
       * The `name` property is for debug purposes only.
       *
       * The `equals` property specifies the comparer function to use to determine if a newly produced
       * value differs from the previous value. Two comparers are provided in the library; `defaultComparer`
       * compares based on identity comparison (===), and `structuralComparer` deeply compares the structure.
       * Structural comparison can be convenient if you always produce a new aggregated object and
       * don't want to notify observers if it is structurally the same.
       * This is useful for working with vectors, mouse coordinates etc.
       */
      function ComputedValue(options) {
        this.dependenciesState_ = IDerivationState_.NOT_TRACKING_;
        this.observing_ = [];
        this.newObserving_ = null;
        this.isBeingObserved_ = false;
        this.isPendingUnobservation_ = false;
        this.observers_ = new Set();
        this.diffValue_ = 0;
        this.runId_ = 0;
        this.lastAccessedBy_ = 0;
        this.lowestObserverState_ = IDerivationState_.UP_TO_DATE_;
        this.unboundDepsCount_ = 0;
        this.value_ = new CaughtException(null);
        this.name_ = void 0;
        this.triggeredBy_ = void 0;
        this.isComputing_ = false;
        this.isRunningSetter_ = false;
        this.derivation = void 0;
        this.setter_ = void 0;
        this.isTracing_ = TraceMode.NONE;
        this.scope_ = void 0;
        this.equals_ = void 0;
        this.requiresReaction_ = void 0;
        this.keepAlive_ = void 0;
        this.onBOL = void 0;
        this.onBUOL = void 0;
        if (!options.get) {
          die(31);
        }
        this.derivation = options.get;
        this.name_ = options.name || ( "ComputedValue@" + getNextId() );
        if (options.set) {
          this.setter_ = createAction( this.name_ + "-setter" , options.set);
        }
        this.equals_ = options.equals || (options.compareStructural || options.struct ? comparer.structural : comparer["default"]);
        this.scope_ = options.context;
        this.requiresReaction_ = options.requiresReaction;
        this.keepAlive_ = !!options.keepAlive;
      }
      var _proto = ComputedValue.prototype;
      _proto.onBecomeStale_ = function onBecomeStale_() {
        propagateMaybeChanged(this);
      };
      _proto.onBO = function onBO() {
        if (this.onBOL) {
          this.onBOL.forEach(function (listener) {
            return listener();
          });
        }
      };
      _proto.onBUO = function onBUO() {
        if (this.onBUOL) {
          this.onBUOL.forEach(function (listener) {
            return listener();
          });
        }
      }
      /**
       * Returns the current value of this computed value.
       * Will evaluate its computation first if needed.
       */;
      _proto.get = function get() {
        if (this.isComputing_) {
          die(32, this.name_, this.derivation);
        }
        if (globalState.inBatch === 0 &&
        // !globalState.trackingDerivatpion &&
        this.observers_.size === 0 && !this.keepAlive_) {
          if (shouldCompute(this)) {
            this.warnAboutUntrackedRead_();
            startBatch(); // See perf test 'computed memoization'
            this.value_ = this.computeValue_(false);
            endBatch();
          }
        } else {
          reportObserved(this);
          if (shouldCompute(this)) {
            var prevTrackingContext = globalState.trackingContext;
            if (this.keepAlive_ && !prevTrackingContext) {
              globalState.trackingContext = this;
            }
            if (this.trackAndCompute()) {
              propagateChangeConfirmed(this);
            }
            globalState.trackingContext = prevTrackingContext;
          }
        }
        var result = this.value_;
        if (isCaughtException(result)) {
          throw result.cause;
        }
        return result;
      };
      _proto.set = function set(value) {
        if (this.setter_) {
          if (this.isRunningSetter_) {
            die(33, this.name_);
          }
          this.isRunningSetter_ = true;
          try {
            this.setter_.call(this.scope_, value);
          } finally {
            this.isRunningSetter_ = false;
          }
        } else {
          die(34, this.name_);
        }
      };
      _proto.trackAndCompute = function trackAndCompute() {
        // N.B: unminified as it is used by MST
        var oldValue = this.value_;
        var wasSuspended = /* see #1208 */this.dependenciesState_ === IDerivationState_.NOT_TRACKING_;
        var newValue = this.computeValue_(true);
        var changed = wasSuspended || isCaughtException(oldValue) || isCaughtException(newValue) || !this.equals_(oldValue, newValue);
        if (changed) {
          this.value_ = newValue;
          if ( isSpyEnabled()) {
            spyReport({
              observableKind: "computed",
              debugObjectName: this.name_,
              object: this.scope_,
              type: "update",
              oldValue: oldValue,
              newValue: newValue
            });
          }
        }
        return changed;
      };
      _proto.computeValue_ = function computeValue_(track) {
        this.isComputing_ = true;
        // don't allow state changes during computation
        var prev = allowStateChangesStart(false);
        var res;
        if (track) {
          res = trackDerivedFunction(this, this.derivation, this.scope_);
        } else {
          if (globalState.disableErrorBoundaries === true) {
            res = this.derivation.call(this.scope_);
          } else {
            try {
              res = this.derivation.call(this.scope_);
            } catch (e) {
              res = new CaughtException(e);
            }
          }
        }
        allowStateChangesEnd(prev);
        this.isComputing_ = false;
        return res;
      };
      _proto.suspend_ = function suspend_() {
        if (!this.keepAlive_) {
          clearObserving(this);
          this.value_ = undefined; // don't hold on to computed value!
          if ( this.isTracing_ !== TraceMode.NONE) {
            console.log("[mobx.trace] Computed value '" + this.name_ + "' was suspended and it will recompute on the next access.");
          }
        }
      };
      _proto.observe_ = function observe_(listener, fireImmediately) {
        var _this = this;
        var firstTime = true;
        var prevValue = undefined;
        return autorun(function () {
          // TODO: why is this in a different place than the spyReport() function? in all other observables it's called in the same place
          var newValue = _this.get();
          if (!firstTime || fireImmediately) {
            var prevU = untrackedStart();
            listener({
              observableKind: "computed",
              debugObjectName: _this.name_,
              type: UPDATE,
              object: _this,
              newValue: newValue,
              oldValue: prevValue
            });
            untrackedEnd(prevU);
          }
          firstTime = false;
          prevValue = newValue;
        });
      };
      _proto.warnAboutUntrackedRead_ = function warnAboutUntrackedRead_() {
        if (this.isTracing_ !== TraceMode.NONE) {
          console.log("[mobx.trace] Computed value '" + this.name_ + "' is being read outside a reactive context. Doing a full recompute.");
        }
        if (typeof this.requiresReaction_ === "boolean" ? this.requiresReaction_ : globalState.computedRequiresReaction) {
          console.warn("[mobx] Computed value '" + this.name_ + "' is being read outside a reactive context. Doing a full recompute.");
        }
      };
      _proto.toString = function toString() {
        return this.name_ + "[" + this.derivation.toString() + "]";
      };
      _proto.valueOf = function valueOf() {
        return toPrimitive(this.get());
      };
      _proto[_Symbol$toPrimitive$1] = function () {
        return this.valueOf();
      };
      return ComputedValue;
    }();
    var isComputedValue = /*#__PURE__*/createInstanceofPredicate("ComputedValue", ComputedValue);

    var IDerivationState_;
    (function (IDerivationState_) {
      // before being run or (outside batch and not being observed)
      // at this point derivation is not holding any data about dependency tree
      IDerivationState_[IDerivationState_["NOT_TRACKING_"] = -1] = "NOT_TRACKING_";
      // no shallow dependency changed since last computation
      // won't recalculate derivation
      // this is what makes mobx fast
      IDerivationState_[IDerivationState_["UP_TO_DATE_"] = 0] = "UP_TO_DATE_";
      // some deep dependency changed, but don't know if shallow dependency changed
      // will require to check first if UP_TO_DATE or POSSIBLY_STALE
      // currently only ComputedValue will propagate POSSIBLY_STALE
      //
      // having this state is second big optimization:
      // don't have to recompute on every dependency change, but only when it's needed
      IDerivationState_[IDerivationState_["POSSIBLY_STALE_"] = 1] = "POSSIBLY_STALE_";
      // A shallow dependency has changed since last computation and the derivation
      // will need to recompute when it's needed next.
      IDerivationState_[IDerivationState_["STALE_"] = 2] = "STALE_";
    })(IDerivationState_ || (IDerivationState_ = {}));
    var TraceMode;
    (function (TraceMode) {
      TraceMode[TraceMode["NONE"] = 0] = "NONE";
      TraceMode[TraceMode["LOG"] = 1] = "LOG";
      TraceMode[TraceMode["BREAK"] = 2] = "BREAK";
    })(TraceMode || (TraceMode = {}));
    var CaughtException = function CaughtException(cause) {
      this.cause = void 0;
      this.cause = cause;
      // Empty
    };

    function isCaughtException(e) {
      return e instanceof CaughtException;
    }
    /**
     * Finds out whether any dependency of the derivation has actually changed.
     * If dependenciesState is 1 then it will recalculate dependencies,
     * if any dependency changed it will propagate it by changing dependenciesState to 2.
     *
     * By iterating over the dependencies in the same order that they were reported and
     * stopping on the first change, all the recalculations are only called for ComputedValues
     * that will be tracked by derivation. That is because we assume that if the first x
     * dependencies of the derivation doesn't change then the derivation should run the same way
     * up until accessing x-th dependency.
     */
    function shouldCompute(derivation) {
      switch (derivation.dependenciesState_) {
        case IDerivationState_.UP_TO_DATE_:
          return false;
        case IDerivationState_.NOT_TRACKING_:
        case IDerivationState_.STALE_:
          return true;
        case IDerivationState_.POSSIBLY_STALE_:
          {
            // state propagation can occur outside of action/reactive context #2195
            var prevAllowStateReads = allowStateReadsStart(true);
            var prevUntracked = untrackedStart(); // no need for those computeds to be reported, they will be picked up in trackDerivedFunction.
            var obs = derivation.observing_,
              l = obs.length;
            for (var i = 0; i < l; i++) {
              var obj = obs[i];
              if (isComputedValue(obj)) {
                if (globalState.disableErrorBoundaries) {
                  obj.get();
                } else {
                  try {
                    obj.get();
                  } catch (e) {
                    // we are not interested in the value *or* exception at this moment, but if there is one, notify all
                    untrackedEnd(prevUntracked);
                    allowStateReadsEnd(prevAllowStateReads);
                    return true;
                  }
                }
                // if ComputedValue `obj` actually changed it will be computed and propagated to its observers.
                // and `derivation` is an observer of `obj`
                // invariantShouldCompute(derivation)
                if (derivation.dependenciesState_ === IDerivationState_.STALE_) {
                  untrackedEnd(prevUntracked);
                  allowStateReadsEnd(prevAllowStateReads);
                  return true;
                }
              }
            }
            changeDependenciesStateTo0(derivation);
            untrackedEnd(prevUntracked);
            allowStateReadsEnd(prevAllowStateReads);
            return false;
          }
      }
    }
    function isComputingDerivation() {
      return globalState.trackingDerivation !== null; // filter out actions inside computations
    }

    function checkIfStateModificationsAreAllowed(atom) {
      var hasObservers = atom.observers_.size > 0;
      // Should not be possible to change observed state outside strict mode, except during initialization, see #563
      if (!globalState.allowStateChanges && (hasObservers || globalState.enforceActions === "always")) {
        console.warn("[MobX] " + (globalState.enforceActions ? "Since strict-mode is enabled, changing (observed) observable values without using an action is not allowed. Tried to modify: " : "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, a computed value or the render function of a React component? You can wrap side effects in 'runInAction' (or decorate functions with 'action') if needed. Tried to modify: ") + atom.name_);
      }
    }
    function checkIfStateReadsAreAllowed(observable) {
      if ( !globalState.allowStateReads && globalState.observableRequiresReaction) {
        console.warn("[mobx] Observable '" + observable.name_ + "' being read outside a reactive context.");
      }
    }
    /**
     * Executes the provided function `f` and tracks which observables are being accessed.
     * The tracking information is stored on the `derivation` object and the derivation is registered
     * as observer of any of the accessed observables.
     */
    function trackDerivedFunction(derivation, f, context) {
      var prevAllowStateReads = allowStateReadsStart(true);
      // pre allocate array allocation + room for variation in deps
      // array will be trimmed by bindDependencies
      changeDependenciesStateTo0(derivation);
      derivation.newObserving_ = new Array(derivation.observing_.length + 100);
      derivation.unboundDepsCount_ = 0;
      derivation.runId_ = ++globalState.runId;
      var prevTracking = globalState.trackingDerivation;
      globalState.trackingDerivation = derivation;
      globalState.inBatch++;
      var result;
      if (globalState.disableErrorBoundaries === true) {
        result = f.call(context);
      } else {
        try {
          result = f.call(context);
        } catch (e) {
          result = new CaughtException(e);
        }
      }
      globalState.inBatch--;
      globalState.trackingDerivation = prevTracking;
      bindDependencies(derivation);
      warnAboutDerivationWithoutDependencies(derivation);
      allowStateReadsEnd(prevAllowStateReads);
      return result;
    }
    function warnAboutDerivationWithoutDependencies(derivation) {
      if (derivation.observing_.length !== 0) {
        return;
      }
      if (typeof derivation.requiresObservable_ === "boolean" ? derivation.requiresObservable_ : globalState.reactionRequiresObservable) {
        console.warn("[mobx] Derivation '" + derivation.name_ + "' is created/updated without reading any observable value.");
      }
    }
    /**
     * diffs newObserving with observing.
     * update observing to be newObserving with unique observables
     * notify observers that become observed/unobserved
     */
    function bindDependencies(derivation) {
      // invariant(derivation.dependenciesState !== IDerivationState.NOT_TRACKING, "INTERNAL ERROR bindDependencies expects derivation.dependenciesState !== -1");
      var prevObserving = derivation.observing_;
      var observing = derivation.observing_ = derivation.newObserving_;
      var lowestNewObservingDerivationState = IDerivationState_.UP_TO_DATE_;
      // Go through all new observables and check diffValue: (this list can contain duplicates):
      //   0: first occurrence, change to 1 and keep it
      //   1: extra occurrence, drop it
      var i0 = 0,
        l = derivation.unboundDepsCount_;
      for (var i = 0; i < l; i++) {
        var dep = observing[i];
        if (dep.diffValue_ === 0) {
          dep.diffValue_ = 1;
          if (i0 !== i) {
            observing[i0] = dep;
          }
          i0++;
        }
        // Upcast is 'safe' here, because if dep is IObservable, `dependenciesState` will be undefined,
        // not hitting the condition
        if (dep.dependenciesState_ > lowestNewObservingDerivationState) {
          lowestNewObservingDerivationState = dep.dependenciesState_;
        }
      }
      observing.length = i0;
      derivation.newObserving_ = null; // newObserving shouldn't be needed outside tracking (statement moved down to work around FF bug, see #614)
      // Go through all old observables and check diffValue: (it is unique after last bindDependencies)
      //   0: it's not in new observables, unobserve it
      //   1: it keeps being observed, don't want to notify it. change to 0
      l = prevObserving.length;
      while (l--) {
        var _dep = prevObserving[l];
        if (_dep.diffValue_ === 0) {
          removeObserver(_dep, derivation);
        }
        _dep.diffValue_ = 0;
      }
      // Go through all new observables and check diffValue: (now it should be unique)
      //   0: it was set to 0 in last loop. don't need to do anything.
      //   1: it wasn't observed, let's observe it. set back to 0
      while (i0--) {
        var _dep2 = observing[i0];
        if (_dep2.diffValue_ === 1) {
          _dep2.diffValue_ = 0;
          addObserver(_dep2, derivation);
        }
      }
      // Some new observed derivations may become stale during this derivation computation
      // so they have had no chance to propagate staleness (#916)
      if (lowestNewObservingDerivationState !== IDerivationState_.UP_TO_DATE_) {
        derivation.dependenciesState_ = lowestNewObservingDerivationState;
        derivation.onBecomeStale_();
      }
    }
    function clearObserving(derivation) {
      // invariant(globalState.inBatch > 0, "INTERNAL ERROR clearObserving should be called only inside batch");
      var obs = derivation.observing_;
      derivation.observing_ = [];
      var i = obs.length;
      while (i--) {
        removeObserver(obs[i], derivation);
      }
      derivation.dependenciesState_ = IDerivationState_.NOT_TRACKING_;
    }
    function untracked(action) {
      var prev = untrackedStart();
      try {
        return action();
      } finally {
        untrackedEnd(prev);
      }
    }
    function untrackedStart() {
      var prev = globalState.trackingDerivation;
      globalState.trackingDerivation = null;
      return prev;
    }
    function untrackedEnd(prev) {
      globalState.trackingDerivation = prev;
    }
    function allowStateReadsStart(allowStateReads) {
      var prev = globalState.allowStateReads;
      globalState.allowStateReads = allowStateReads;
      return prev;
    }
    function allowStateReadsEnd(prev) {
      globalState.allowStateReads = prev;
    }
    /**
     * needed to keep `lowestObserverState` correct. when changing from (2 or 1) to 0
     *
     */
    function changeDependenciesStateTo0(derivation) {
      if (derivation.dependenciesState_ === IDerivationState_.UP_TO_DATE_) {
        return;
      }
      derivation.dependenciesState_ = IDerivationState_.UP_TO_DATE_;
      var obs = derivation.observing_;
      var i = obs.length;
      while (i--) {
        obs[i].lowestObserverState_ = IDerivationState_.UP_TO_DATE_;
      }
    }

    /**
     * These values will persist if global state is reset
     */
    var persistentKeys = ["mobxGuid", "spyListeners", "enforceActions", "computedRequiresReaction", "reactionRequiresObservable", "observableRequiresReaction", "allowStateReads", "disableErrorBoundaries", "runId", "UNCHANGED", "useProxies"];
    var MobXGlobals = function MobXGlobals() {
      this.version = 6;
      this.UNCHANGED = {};
      this.trackingDerivation = null;
      this.trackingContext = null;
      this.runId = 0;
      this.mobxGuid = 0;
      this.inBatch = 0;
      this.pendingUnobservations = [];
      this.pendingReactions = [];
      this.isRunningReactions = false;
      this.allowStateChanges = false;
      this.allowStateReads = true;
      this.enforceActions = true;
      this.spyListeners = [];
      this.globalReactionErrorHandlers = [];
      this.computedRequiresReaction = false;
      this.reactionRequiresObservable = false;
      this.observableRequiresReaction = false;
      this.disableErrorBoundaries = false;
      this.suppressReactionErrors = false;
      this.useProxies = true;
      this.verifyProxies = false;
      this.safeDescriptors = true;
    };
    var canMergeGlobalState = true;
    var isolateCalled = false;
    var globalState = /*#__PURE__*/function () {
      var global = /*#__PURE__*/getGlobal();
      if (global.__mobxInstanceCount > 0 && !global.__mobxGlobals) {
        canMergeGlobalState = false;
      }
      if (global.__mobxGlobals && global.__mobxGlobals.version !== new MobXGlobals().version) {
        canMergeGlobalState = false;
      }
      if (!canMergeGlobalState) {
        // Because this is a IIFE we need to let isolateCalled a chance to change
        // so we run it after the event loop completed at least 1 iteration
        setTimeout(function () {
          if (!isolateCalled) {
            die(35);
          }
        }, 1);
        return new MobXGlobals();
      } else if (global.__mobxGlobals) {
        global.__mobxInstanceCount += 1;
        if (!global.__mobxGlobals.UNCHANGED) {
          global.__mobxGlobals.UNCHANGED = {};
        } // make merge backward compatible
        return global.__mobxGlobals;
      } else {
        global.__mobxInstanceCount = 1;
        return global.__mobxGlobals = /*#__PURE__*/new MobXGlobals();
      }
    }();
    function isolateGlobalState() {
      if (globalState.pendingReactions.length || globalState.inBatch || globalState.isRunningReactions) {
        die(36);
      }
      isolateCalled = true;
      if (canMergeGlobalState) {
        var global = getGlobal();
        if (--global.__mobxInstanceCount === 0) {
          global.__mobxGlobals = undefined;
        }
        globalState = new MobXGlobals();
      }
    }
    function getGlobalState() {
      return globalState;
    }
    /**
     * For testing purposes only; this will break the internal state of existing observables,
     * but can be used to get back at a stable state after throwing errors
     */
    function resetGlobalState() {
      var defaultGlobals = new MobXGlobals();
      for (var key in defaultGlobals) {
        if (persistentKeys.indexOf(key) === -1) {
          globalState[key] = defaultGlobals[key];
        }
      }
      globalState.allowStateChanges = !globalState.enforceActions;
    }

    function hasObservers(observable) {
      return observable.observers_ && observable.observers_.size > 0;
    }
    function getObservers(observable) {
      return observable.observers_;
    }
    // function invariantObservers(observable: IObservable) {
    //     const list = observable.observers
    //     const map = observable.observersIndexes
    //     const l = list.length
    //     for (let i = 0; i < l; i++) {
    //         const id = list[i].__mapid
    //         if (i) {
    //             invariant(map[id] === i, "INTERNAL ERROR maps derivation.__mapid to index in list") // for performance
    //         } else {
    //             invariant(!(id in map), "INTERNAL ERROR observer on index 0 shouldn't be held in map.") // for performance
    //         }
    //     }
    //     invariant(
    //         list.length === 0 || Object.keys(map).length === list.length - 1,
    //         "INTERNAL ERROR there is no junk in map"
    //     )
    // }
    function addObserver(observable, node) {
      // invariant(node.dependenciesState !== -1, "INTERNAL ERROR, can add only dependenciesState !== -1");
      // invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR add already added node");
      // invariantObservers(observable);
      observable.observers_.add(node);
      if (observable.lowestObserverState_ > node.dependenciesState_) {
        observable.lowestObserverState_ = node.dependenciesState_;
      }
      // invariantObservers(observable);
      // invariant(observable._observers.indexOf(node) !== -1, "INTERNAL ERROR didn't add node");
    }

    function removeObserver(observable, node) {
      // invariant(globalState.inBatch > 0, "INTERNAL ERROR, remove should be called only inside batch");
      // invariant(observable._observers.indexOf(node) !== -1, "INTERNAL ERROR remove already removed node");
      // invariantObservers(observable);
      observable.observers_["delete"](node);
      if (observable.observers_.size === 0) {
        // deleting last observer
        queueForUnobservation(observable);
      }
      // invariantObservers(observable);
      // invariant(observable._observers.indexOf(node) === -1, "INTERNAL ERROR remove already removed node2");
    }

    function queueForUnobservation(observable) {
      if (observable.isPendingUnobservation_ === false) {
        // invariant(observable._observers.length === 0, "INTERNAL ERROR, should only queue for unobservation unobserved observables");
        observable.isPendingUnobservation_ = true;
        globalState.pendingUnobservations.push(observable);
      }
    }
    /**
     * Batch starts a transaction, at least for purposes of memoizing ComputedValues when nothing else does.
     * During a batch `onBecomeUnobserved` will be called at most once per observable.
     * Avoids unnecessary recalculations.
     */
    function startBatch() {
      globalState.inBatch++;
    }
    function endBatch() {
      if (--globalState.inBatch === 0) {
        runReactions();
        // the batch is actually about to finish, all unobserving should happen here.
        var list = globalState.pendingUnobservations;
        for (var i = 0; i < list.length; i++) {
          var observable = list[i];
          observable.isPendingUnobservation_ = false;
          if (observable.observers_.size === 0) {
            if (observable.isBeingObserved_) {
              // if this observable had reactive observers, trigger the hooks
              observable.isBeingObserved_ = false;
              observable.onBUO();
            }
            if (observable instanceof ComputedValue) {
              // computed values are automatically teared down when the last observer leaves
              // this process happens recursively, this computed might be the last observabe of another, etc..
              observable.suspend_();
            }
          }
        }
        globalState.pendingUnobservations = [];
      }
    }
    function reportObserved(observable) {
      checkIfStateReadsAreAllowed(observable);
      var derivation = globalState.trackingDerivation;
      if (derivation !== null) {
        /**
         * Simple optimization, give each derivation run an unique id (runId)
         * Check if last time this observable was accessed the same runId is used
         * if this is the case, the relation is already known
         */
        if (derivation.runId_ !== observable.lastAccessedBy_) {
          observable.lastAccessedBy_ = derivation.runId_;
          // Tried storing newObserving, or observing, or both as Set, but performance didn't come close...
          derivation.newObserving_[derivation.unboundDepsCount_++] = observable;
          if (!observable.isBeingObserved_ && globalState.trackingContext) {
            observable.isBeingObserved_ = true;
            observable.onBO();
          }
        }
        return observable.isBeingObserved_;
      } else if (observable.observers_.size === 0 && globalState.inBatch > 0) {
        queueForUnobservation(observable);
      }
      return false;
    }
    // function invariantLOS(observable: IObservable, msg: string) {
    //     // it's expensive so better not run it in produciton. but temporarily helpful for testing
    //     const min = getObservers(observable).reduce((a, b) => Math.min(a, b.dependenciesState), 2)
    //     if (min >= observable.lowestObserverState) return // <- the only assumption about `lowestObserverState`
    //     throw new Error(
    //         "lowestObserverState is wrong for " +
    //             msg +
    //             " because " +
    //             min +
    //             " < " +
    //             observable.lowestObserverState
    //     )
    // }
    /**
     * NOTE: current propagation mechanism will in case of self reruning autoruns behave unexpectedly
     * It will propagate changes to observers from previous run
     * It's hard or maybe impossible (with reasonable perf) to get it right with current approach
     * Hopefully self reruning autoruns aren't a feature people should depend on
     * Also most basic use cases should be ok
     */
    // Called by Atom when its value changes
    function propagateChanged(observable) {
      // invariantLOS(observable, "changed start");
      if (observable.lowestObserverState_ === IDerivationState_.STALE_) {
        return;
      }
      observable.lowestObserverState_ = IDerivationState_.STALE_;
      // Ideally we use for..of here, but the downcompiled version is really slow...
      observable.observers_.forEach(function (d) {
        if (d.dependenciesState_ === IDerivationState_.UP_TO_DATE_) {
          if ( d.isTracing_ !== TraceMode.NONE) {
            logTraceInfo(d, observable);
          }
          d.onBecomeStale_();
        }
        d.dependenciesState_ = IDerivationState_.STALE_;
      });
      // invariantLOS(observable, "changed end");
    }
    // Called by ComputedValue when it recalculate and its value changed
    function propagateChangeConfirmed(observable) {
      // invariantLOS(observable, "confirmed start");
      if (observable.lowestObserverState_ === IDerivationState_.STALE_) {
        return;
      }
      observable.lowestObserverState_ = IDerivationState_.STALE_;
      observable.observers_.forEach(function (d) {
        if (d.dependenciesState_ === IDerivationState_.POSSIBLY_STALE_) {
          d.dependenciesState_ = IDerivationState_.STALE_;
          if ( d.isTracing_ !== TraceMode.NONE) {
            logTraceInfo(d, observable);
          }
        } else if (d.dependenciesState_ === IDerivationState_.UP_TO_DATE_ // this happens during computing of `d`, just keep lowestObserverState up to date.
        ) {
          observable.lowestObserverState_ = IDerivationState_.UP_TO_DATE_;
        }
      });
      // invariantLOS(observable, "confirmed end");
    }
    // Used by computed when its dependency changed, but we don't wan't to immediately recompute.
    function propagateMaybeChanged(observable) {
      // invariantLOS(observable, "maybe start");
      if (observable.lowestObserverState_ !== IDerivationState_.UP_TO_DATE_) {
        return;
      }
      observable.lowestObserverState_ = IDerivationState_.POSSIBLY_STALE_;
      observable.observers_.forEach(function (d) {
        if (d.dependenciesState_ === IDerivationState_.UP_TO_DATE_) {
          d.dependenciesState_ = IDerivationState_.POSSIBLY_STALE_;
          d.onBecomeStale_();
        }
      });
      // invariantLOS(observable, "maybe end");
    }

    function logTraceInfo(derivation, observable) {
      console.log("[mobx.trace] '" + derivation.name_ + "' is invalidated due to a change in: '" + observable.name_ + "'");
      if (derivation.isTracing_ === TraceMode.BREAK) {
        var lines = [];
        printDepTree(getDependencyTree(derivation), lines, 1);
        // prettier-ignore
        new Function("debugger;\n/*\nTracing '" + derivation.name_ + "'\n\nYou are entering this break point because derivation '" + derivation.name_ + "' is being traced and '" + observable.name_ + "' is now forcing it to update.\nJust follow the stacktrace you should now see in the devtools to see precisely what piece of your code is causing this update\nThe stackframe you are looking for is at least ~6-8 stack-frames up.\n\n" + (derivation instanceof ComputedValue ? derivation.derivation.toString().replace(/[*]\//g, "/") : "") + "\n\nThe dependencies for this derivation are:\n\n" + lines.join("\n") + "\n*/\n    ")();
      }
    }
    function printDepTree(tree, lines, depth) {
      if (lines.length >= 1000) {
        lines.push("(and many more)");
        return;
      }
      lines.push("" + "\t".repeat(depth - 1) + tree.name);
      if (tree.dependencies) {
        tree.dependencies.forEach(function (child) {
          return printDepTree(child, lines, depth + 1);
        });
      }
    }

    var Reaction = /*#__PURE__*/function () {
      // nodes we are looking at. Our value depends on these nodes

      function Reaction(name_, onInvalidate_, errorHandler_, requiresObservable_) {
        if (name_ === void 0) {
          name_ =  "Reaction@" + getNextId() ;
        }
        this.name_ = void 0;
        this.onInvalidate_ = void 0;
        this.errorHandler_ = void 0;
        this.requiresObservable_ = void 0;
        this.observing_ = [];
        this.newObserving_ = [];
        this.dependenciesState_ = IDerivationState_.NOT_TRACKING_;
        this.diffValue_ = 0;
        this.runId_ = 0;
        this.unboundDepsCount_ = 0;
        this.isDisposed_ = false;
        this.isScheduled_ = false;
        this.isTrackPending_ = false;
        this.isRunning_ = false;
        this.isTracing_ = TraceMode.NONE;
        this.name_ = name_;
        this.onInvalidate_ = onInvalidate_;
        this.errorHandler_ = errorHandler_;
        this.requiresObservable_ = requiresObservable_;
      }
      var _proto = Reaction.prototype;
      _proto.onBecomeStale_ = function onBecomeStale_() {
        this.schedule_();
      };
      _proto.schedule_ = function schedule_() {
        if (!this.isScheduled_) {
          this.isScheduled_ = true;
          globalState.pendingReactions.push(this);
          runReactions();
        }
      };
      _proto.isScheduled = function isScheduled() {
        return this.isScheduled_;
      }
      /**
       * internal, use schedule() if you intend to kick off a reaction
       */;
      _proto.runReaction_ = function runReaction_() {
        if (!this.isDisposed_) {
          startBatch();
          this.isScheduled_ = false;
          var prev = globalState.trackingContext;
          globalState.trackingContext = this;
          if (shouldCompute(this)) {
            this.isTrackPending_ = true;
            try {
              this.onInvalidate_();
              if ("development" !== "production" && this.isTrackPending_ && isSpyEnabled()) {
                // onInvalidate didn't trigger track right away..
                spyReport({
                  name: this.name_,
                  type: "scheduled-reaction"
                });
              }
            } catch (e) {
              this.reportExceptionInDerivation_(e);
            }
          }
          globalState.trackingContext = prev;
          endBatch();
        }
      };
      _proto.track = function track(fn) {
        if (this.isDisposed_) {
          return;
          // console.warn("Reaction already disposed") // Note: Not a warning / error in mobx 4 either
        }

        startBatch();
        var notify = isSpyEnabled();
        var startTime;
        if ( notify) {
          startTime = Date.now();
          spyReportStart({
            name: this.name_,
            type: "reaction"
          });
        }
        this.isRunning_ = true;
        var prevReaction = globalState.trackingContext; // reactions could create reactions...
        globalState.trackingContext = this;
        var result = trackDerivedFunction(this, fn, undefined);
        globalState.trackingContext = prevReaction;
        this.isRunning_ = false;
        this.isTrackPending_ = false;
        if (this.isDisposed_) {
          // disposed during last run. Clean up everything that was bound after the dispose call.
          clearObserving(this);
        }
        if (isCaughtException(result)) {
          this.reportExceptionInDerivation_(result.cause);
        }
        if ( notify) {
          spyReportEnd({
            time: Date.now() - startTime
          });
        }
        endBatch();
      };
      _proto.reportExceptionInDerivation_ = function reportExceptionInDerivation_(error) {
        var _this = this;
        if (this.errorHandler_) {
          this.errorHandler_(error, this);
          return;
        }
        if (globalState.disableErrorBoundaries) {
          throw error;
        }
        var message =  "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '" + this + "'" ;
        if (!globalState.suppressReactionErrors) {
          console.error(message, error);
          /** If debugging brought you here, please, read the above message :-). Tnx! */
        } else {
          console.warn("[mobx] (error in reaction '" + this.name_ + "' suppressed, fix error of causing action below)");
        } // prettier-ignore
        if ( isSpyEnabled()) {
          spyReport({
            type: "error",
            name: this.name_,
            message: message,
            error: "" + error
          });
        }
        globalState.globalReactionErrorHandlers.forEach(function (f) {
          return f(error, _this);
        });
      };
      _proto.dispose = function dispose() {
        if (!this.isDisposed_) {
          this.isDisposed_ = true;
          if (!this.isRunning_) {
            // if disposed while running, clean up later. Maybe not optimal, but rare case
            startBatch();
            clearObserving(this);
            endBatch();
          }
        }
      };
      _proto.getDisposer_ = function getDisposer_(abortSignal) {
        var _this2 = this;
        var dispose = function dispose() {
          _this2.dispose();
          abortSignal == null ? void 0 : abortSignal.removeEventListener == null ? void 0 : abortSignal.removeEventListener("abort", dispose);
        };
        abortSignal == null ? void 0 : abortSignal.addEventListener == null ? void 0 : abortSignal.addEventListener("abort", dispose);
        dispose[$mobx] = this;
        return dispose;
      };
      _proto.toString = function toString() {
        return "Reaction[" + this.name_ + "]";
      };
      _proto.trace = function trace$1(enterBreakPoint) {
        if (enterBreakPoint === void 0) {
          enterBreakPoint = false;
        }
        trace(this, enterBreakPoint);
      };
      return Reaction;
    }();
    function onReactionError(handler) {
      globalState.globalReactionErrorHandlers.push(handler);
      return function () {
        var idx = globalState.globalReactionErrorHandlers.indexOf(handler);
        if (idx >= 0) {
          globalState.globalReactionErrorHandlers.splice(idx, 1);
        }
      };
    }
    /**
     * Magic number alert!
     * Defines within how many times a reaction is allowed to re-trigger itself
     * until it is assumed that this is gonna be a never ending loop...
     */
    var MAX_REACTION_ITERATIONS = 100;
    var reactionScheduler = function reactionScheduler(f) {
      return f();
    };
    function runReactions() {
      // Trampolining, if runReactions are already running, new reactions will be picked up
      if (globalState.inBatch > 0 || globalState.isRunningReactions) {
        return;
      }
      reactionScheduler(runReactionsHelper);
    }
    function runReactionsHelper() {
      globalState.isRunningReactions = true;
      var allReactions = globalState.pendingReactions;
      var iterations = 0;
      // While running reactions, new reactions might be triggered.
      // Hence we work with two variables and check whether
      // we converge to no remaining reactions after a while.
      while (allReactions.length > 0) {
        if (++iterations === MAX_REACTION_ITERATIONS) {
          console.error( "Reaction doesn't converge to a stable state after " + MAX_REACTION_ITERATIONS + " iterations." + (" Probably there is a cycle in the reactive function: " + allReactions[0]) );
          allReactions.splice(0); // clear reactions
        }

        var remainingReactions = allReactions.splice(0);
        for (var i = 0, l = remainingReactions.length; i < l; i++) {
          remainingReactions[i].runReaction_();
        }
      }
      globalState.isRunningReactions = false;
    }
    var isReaction = /*#__PURE__*/createInstanceofPredicate("Reaction", Reaction);
    function setReactionScheduler(fn) {
      var baseScheduler = reactionScheduler;
      reactionScheduler = function reactionScheduler(f) {
        return fn(function () {
          return baseScheduler(f);
        });
      };
    }

    function isSpyEnabled() {
      return  !!globalState.spyListeners.length;
    }
    function spyReport(event) {
      if (!globalState.spyListeners.length) {
        return;
      }
      var listeners = globalState.spyListeners;
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i](event);
      }
    }
    function spyReportStart(event) {
      var change = _extends({}, event, {
        spyReportStart: true
      });
      spyReport(change);
    }
    var END_EVENT = {
      type: "report-end",
      spyReportEnd: true
    };
    function spyReportEnd(change) {
      if (change) {
        spyReport(_extends({}, change, {
          type: "report-end",
          spyReportEnd: true
        }));
      } else {
        spyReport(END_EVENT);
      }
    }
    function spy(listener) {
      {
        globalState.spyListeners.push(listener);
        return once(function () {
          globalState.spyListeners = globalState.spyListeners.filter(function (l) {
            return l !== listener;
          });
        });
      }
    }

    var ACTION = "action";
    var ACTION_BOUND = "action.bound";
    var AUTOACTION = "autoAction";
    var AUTOACTION_BOUND = "autoAction.bound";
    var DEFAULT_ACTION_NAME = "<unnamed action>";
    var actionAnnotation = /*#__PURE__*/createActionAnnotation(ACTION);
    var actionBoundAnnotation = /*#__PURE__*/createActionAnnotation(ACTION_BOUND, {
      bound: true
    });
    var autoActionAnnotation = /*#__PURE__*/createActionAnnotation(AUTOACTION, {
      autoAction: true
    });
    var autoActionBoundAnnotation = /*#__PURE__*/createActionAnnotation(AUTOACTION_BOUND, {
      autoAction: true,
      bound: true
    });
    function createActionFactory(autoAction) {
      var res = function action(arg1, arg2) {
        // action(fn() {})
        if (isFunction(arg1)) {
          return createAction(arg1.name || DEFAULT_ACTION_NAME, arg1, autoAction);
        }
        // action("name", fn() {})
        if (isFunction(arg2)) {
          return createAction(arg1, arg2, autoAction);
        }
        // @action (2022.3 Decorators)
        if (is20223Decorator(arg2)) {
          return (autoAction ? autoActionAnnotation : actionAnnotation).decorate_20223_(arg1, arg2);
        }
        // @action
        if (isStringish(arg2)) {
          return storeAnnotation(arg1, arg2, autoAction ? autoActionAnnotation : actionAnnotation);
        }
        // action("name") & @action("name")
        if (isStringish(arg1)) {
          return createDecoratorAnnotation(createActionAnnotation(autoAction ? AUTOACTION : ACTION, {
            name: arg1,
            autoAction: autoAction
          }));
        }
        {
          die("Invalid arguments for `action`");
        }
      };
      return res;
    }
    var action = /*#__PURE__*/createActionFactory(false);
    Object.assign(action, actionAnnotation);
    var autoAction = /*#__PURE__*/createActionFactory(true);
    Object.assign(autoAction, autoActionAnnotation);
    action.bound = /*#__PURE__*/createDecoratorAnnotation(actionBoundAnnotation);
    autoAction.bound = /*#__PURE__*/createDecoratorAnnotation(autoActionBoundAnnotation);
    function runInAction(fn) {
      return executeAction(fn.name || DEFAULT_ACTION_NAME, false, fn, this, undefined);
    }
    function isAction(thing) {
      return isFunction(thing) && thing.isMobxAction === true;
    }

    /**
     * Creates a named reactive view and keeps it alive, so that the view is always
     * updated if one of the dependencies changes, even when the view is not further used by something else.
     * @param view The reactive view
     * @returns disposer function, which can be used to stop the view from being updated in the future.
     */
    function autorun(view, opts) {
      var _opts$name, _opts, _opts2, _opts2$signal, _opts3;
      if (opts === void 0) {
        opts = EMPTY_OBJECT;
      }
      {
        if (!isFunction(view)) {
          die("Autorun expects a function as first argument");
        }
        if (isAction(view)) {
          die("Autorun does not accept actions since actions are untrackable");
        }
      }
      var name = (_opts$name = (_opts = opts) == null ? void 0 : _opts.name) != null ? _opts$name :  view.name || "Autorun@" + getNextId() ;
      var runSync = !opts.scheduler && !opts.delay;
      var reaction;
      if (runSync) {
        // normal autorun
        reaction = new Reaction(name, function () {
          this.track(reactionRunner);
        }, opts.onError, opts.requiresObservable);
      } else {
        var scheduler = createSchedulerFromOptions(opts);
        // debounced autorun
        var isScheduled = false;
        reaction = new Reaction(name, function () {
          if (!isScheduled) {
            isScheduled = true;
            scheduler(function () {
              isScheduled = false;
              if (!reaction.isDisposed_) {
                reaction.track(reactionRunner);
              }
            });
          }
        }, opts.onError, opts.requiresObservable);
      }
      function reactionRunner() {
        view(reaction);
      }
      if (!((_opts2 = opts) != null && (_opts2$signal = _opts2.signal) != null && _opts2$signal.aborted)) {
        reaction.schedule_();
      }
      return reaction.getDisposer_((_opts3 = opts) == null ? void 0 : _opts3.signal);
    }
    var run = function run(f) {
      return f();
    };
    function createSchedulerFromOptions(opts) {
      return opts.scheduler ? opts.scheduler : opts.delay ? function (f) {
        return setTimeout(f, opts.delay);
      } : run;
    }
    function reaction(expression, effect, opts) {
      var _opts$name2, _opts4, _opts4$signal, _opts5;
      if (opts === void 0) {
        opts = EMPTY_OBJECT;
      }
      {
        if (!isFunction(expression) || !isFunction(effect)) {
          die("First and second argument to reaction should be functions");
        }
        if (!isPlainObject(opts)) {
          die("Third argument of reactions should be an object");
        }
      }
      var name = (_opts$name2 = opts.name) != null ? _opts$name2 :  "Reaction@" + getNextId() ;
      var effectAction = action(name, opts.onError ? wrapErrorHandler(opts.onError, effect) : effect);
      var runSync = !opts.scheduler && !opts.delay;
      var scheduler = createSchedulerFromOptions(opts);
      var firstTime = true;
      var isScheduled = false;
      var value;
      var oldValue;
      var equals = opts.compareStructural ? comparer.structural : opts.equals || comparer["default"];
      var r = new Reaction(name, function () {
        if (firstTime || runSync) {
          reactionRunner();
        } else if (!isScheduled) {
          isScheduled = true;
          scheduler(reactionRunner);
        }
      }, opts.onError, opts.requiresObservable);
      function reactionRunner() {
        isScheduled = false;
        if (r.isDisposed_) {
          return;
        }
        var changed = false;
        r.track(function () {
          var nextValue = allowStateChanges(false, function () {
            return expression(r);
          });
          changed = firstTime || !equals(value, nextValue);
          oldValue = value;
          value = nextValue;
        });
        if (firstTime && opts.fireImmediately) {
          effectAction(value, oldValue, r);
        } else if (!firstTime && changed) {
          effectAction(value, oldValue, r);
        }
        firstTime = false;
      }
      if (!((_opts4 = opts) != null && (_opts4$signal = _opts4.signal) != null && _opts4$signal.aborted)) {
        r.schedule_();
      }
      return r.getDisposer_((_opts5 = opts) == null ? void 0 : _opts5.signal);
    }
    function wrapErrorHandler(errorHandler, baseFn) {
      return function () {
        try {
          return baseFn.apply(this, arguments);
        } catch (e) {
          errorHandler.call(this, e);
        }
      };
    }

    var ON_BECOME_OBSERVED = "onBO";
    var ON_BECOME_UNOBSERVED = "onBUO";
    function onBecomeObserved(thing, arg2, arg3) {
      return interceptHook(ON_BECOME_OBSERVED, thing, arg2, arg3);
    }
    function onBecomeUnobserved(thing, arg2, arg3) {
      return interceptHook(ON_BECOME_UNOBSERVED, thing, arg2, arg3);
    }
    function interceptHook(hook, thing, arg2, arg3) {
      var atom = typeof arg3 === "function" ? getAtom(thing, arg2) : getAtom(thing);
      var cb = isFunction(arg3) ? arg3 : arg2;
      var listenersKey = hook + "L";
      if (atom[listenersKey]) {
        atom[listenersKey].add(cb);
      } else {
        atom[listenersKey] = new Set([cb]);
      }
      return function () {
        var hookListeners = atom[listenersKey];
        if (hookListeners) {
          hookListeners["delete"](cb);
          if (hookListeners.size === 0) {
            delete atom[listenersKey];
          }
        }
      };
    }

    var NEVER = "never";
    var ALWAYS = "always";
    var OBSERVED = "observed";
    // const IF_AVAILABLE = "ifavailable"
    function configure(options) {
      if (options.isolateGlobalState === true) {
        isolateGlobalState();
      }
      var useProxies = options.useProxies,
        enforceActions = options.enforceActions;
      if (useProxies !== undefined) {
        globalState.useProxies = useProxies === ALWAYS ? true : useProxies === NEVER ? false : typeof Proxy !== "undefined";
      }
      if (useProxies === "ifavailable") {
        globalState.verifyProxies = true;
      }
      if (enforceActions !== undefined) {
        var ea = enforceActions === ALWAYS ? ALWAYS : enforceActions === OBSERVED;
        globalState.enforceActions = ea;
        globalState.allowStateChanges = ea === true || ea === ALWAYS ? false : true;
      }
      ["computedRequiresReaction", "reactionRequiresObservable", "observableRequiresReaction", "disableErrorBoundaries", "safeDescriptors"].forEach(function (key) {
        if (key in options) {
          globalState[key] = !!options[key];
        }
      });
      globalState.allowStateReads = !globalState.observableRequiresReaction;
      if ( globalState.disableErrorBoundaries === true) {
        console.warn("WARNING: Debug feature only. MobX will NOT recover from errors when `disableErrorBoundaries` is enabled.");
      }
      if (options.reactionScheduler) {
        setReactionScheduler(options.reactionScheduler);
      }
    }

    function extendObservable(target, properties, annotations, options) {
      {
        if (arguments.length > 4) {
          die("'extendObservable' expected 2-4 arguments");
        }
        if (typeof target !== "object") {
          die("'extendObservable' expects an object as first argument");
        }
        if (isObservableMap(target)) {
          die("'extendObservable' should not be used on maps, use map.merge instead");
        }
        if (!isPlainObject(properties)) {
          die("'extendObservable' only accepts plain objects as second argument");
        }
        if (isObservable(properties) || isObservable(annotations)) {
          die("Extending an object with another observable (object) is not supported");
        }
      }
      // Pull descriptors first, so we don't have to deal with props added by administration ($mobx)
      var descriptors = getOwnPropertyDescriptors(properties);
      initObservable(function () {
        var adm = asObservableObject(target, options)[$mobx];
        ownKeys(descriptors).forEach(function (key) {
          adm.extend_(key, descriptors[key],
          // must pass "undefined" for { key: undefined }
          !annotations ? true : key in annotations ? annotations[key] : true);
        });
      });
      return target;
    }

    function getDependencyTree(thing, property) {
      return nodeToDependencyTree(getAtom(thing, property));
    }
    function nodeToDependencyTree(node) {
      var result = {
        name: node.name_
      };
      if (node.observing_ && node.observing_.length > 0) {
        result.dependencies = unique(node.observing_).map(nodeToDependencyTree);
      }
      return result;
    }
    function getObserverTree(thing, property) {
      return nodeToObserverTree(getAtom(thing, property));
    }
    function nodeToObserverTree(node) {
      var result = {
        name: node.name_
      };
      if (hasObservers(node)) {
        result.observers = Array.from(getObservers(node)).map(nodeToObserverTree);
      }
      return result;
    }
    function unique(list) {
      return Array.from(new Set(list));
    }

    var generatorId = 0;
    function FlowCancellationError() {
      this.message = "FLOW_CANCELLED";
    }
    FlowCancellationError.prototype = /*#__PURE__*/Object.create(Error.prototype);
    function isFlowCancellationError(error) {
      return error instanceof FlowCancellationError;
    }
    var flowAnnotation = /*#__PURE__*/createFlowAnnotation("flow");
    var flowBoundAnnotation = /*#__PURE__*/createFlowAnnotation("flow.bound", {
      bound: true
    });
    var flow = /*#__PURE__*/Object.assign(function flow(arg1, arg2) {
      // @flow (2022.3 Decorators)
      if (is20223Decorator(arg2)) {
        return flowAnnotation.decorate_20223_(arg1, arg2);
      }
      // @flow
      if (isStringish(arg2)) {
        return storeAnnotation(arg1, arg2, flowAnnotation);
      }
      // flow(fn)
      if ( arguments.length !== 1) {
        die("Flow expects single argument with generator function");
      }
      var generator = arg1;
      var name = generator.name || "<unnamed flow>";
      // Implementation based on https://github.com/tj/co/blob/master/index.js
      var res = function res() {
        var ctx = this;
        var args = arguments;
        var runId = ++generatorId;
        var gen = action(name + " - runid: " + runId + " - init", generator).apply(ctx, args);
        var rejector;
        var pendingPromise = undefined;
        var promise = new Promise(function (resolve, reject) {
          var stepId = 0;
          rejector = reject;
          function onFulfilled(res) {
            pendingPromise = undefined;
            var ret;
            try {
              ret = action(name + " - runid: " + runId + " - yield " + stepId++, gen.next).call(gen, res);
            } catch (e) {
              return reject(e);
            }
            next(ret);
          }
          function onRejected(err) {
            pendingPromise = undefined;
            var ret;
            try {
              ret = action(name + " - runid: " + runId + " - yield " + stepId++, gen["throw"]).call(gen, err);
            } catch (e) {
              return reject(e);
            }
            next(ret);
          }
          function next(ret) {
            if (isFunction(ret == null ? void 0 : ret.then)) {
              // an async iterator
              ret.then(next, reject);
              return;
            }
            if (ret.done) {
              return resolve(ret.value);
            }
            pendingPromise = Promise.resolve(ret.value);
            return pendingPromise.then(onFulfilled, onRejected);
          }
          onFulfilled(undefined); // kick off the process
        });

        promise.cancel = action(name + " - runid: " + runId + " - cancel", function () {
          try {
            if (pendingPromise) {
              cancelPromise(pendingPromise);
            }
            // Finally block can return (or yield) stuff..
            var _res = gen["return"](undefined);
            // eat anything that promise would do, it's cancelled!
            var yieldedPromise = Promise.resolve(_res.value);
            yieldedPromise.then(noop, noop);
            cancelPromise(yieldedPromise); // maybe it can be cancelled :)
            // reject our original promise
            rejector(new FlowCancellationError());
          } catch (e) {
            rejector(e); // there could be a throwing finally block
          }
        });

        return promise;
      };
      res.isMobXFlow = true;
      return res;
    }, flowAnnotation);
    flow.bound = /*#__PURE__*/createDecoratorAnnotation(flowBoundAnnotation);
    function cancelPromise(promise) {
      if (isFunction(promise.cancel)) {
        promise.cancel();
      }
    }
    function flowResult(result) {
      return result; // just tricking TypeScript :)
    }

    function isFlow(fn) {
      return (fn == null ? void 0 : fn.isMobXFlow) === true;
    }

    function interceptReads(thing, propOrHandler, handler) {
      var target;
      if (isObservableMap(thing) || isObservableArray(thing) || isObservableValue(thing)) {
        target = getAdministration(thing);
      } else if (isObservableObject(thing)) {
        if ( !isStringish(propOrHandler)) {
          return die("InterceptReads can only be used with a specific property, not with an object in general");
        }
        target = getAdministration(thing, propOrHandler);
      } else {
        return die("Expected observable map, object or array as first array");
      }
      if ( target.dehancer !== undefined) {
        return die("An intercept reader was already established");
      }
      target.dehancer = typeof propOrHandler === "function" ? propOrHandler : handler;
      return function () {
        target.dehancer = undefined;
      };
    }

    function intercept(thing, propOrHandler, handler) {
      if (isFunction(handler)) {
        return interceptProperty(thing, propOrHandler, handler);
      } else {
        return interceptInterceptable(thing, propOrHandler);
      }
    }
    function interceptInterceptable(thing, handler) {
      return getAdministration(thing).intercept_(handler);
    }
    function interceptProperty(thing, property, handler) {
      return getAdministration(thing, property).intercept_(handler);
    }

    function _isComputed(value, property) {
      if (property === undefined) {
        return isComputedValue(value);
      }
      if (isObservableObject(value) === false) {
        return false;
      }
      if (!value[$mobx].values_.has(property)) {
        return false;
      }
      var atom = getAtom(value, property);
      return isComputedValue(atom);
    }
    function isComputed(value) {
      if ( arguments.length > 1) {
        return die("isComputed expects only 1 argument. Use isComputedProp to inspect the observability of a property");
      }
      return _isComputed(value);
    }
    function isComputedProp(value, propName) {
      if ( !isStringish(propName)) {
        return die("isComputed expected a property name as second argument");
      }
      return _isComputed(value, propName);
    }

    function _isObservable(value, property) {
      if (!value) {
        return false;
      }
      if (property !== undefined) {
        if ( (isObservableMap(value) || isObservableArray(value))) {
          return die("isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.");
        }
        if (isObservableObject(value)) {
          return value[$mobx].values_.has(property);
        }
        return false;
      }
      // For first check, see #701
      return isObservableObject(value) || !!value[$mobx] || isAtom(value) || isReaction(value) || isComputedValue(value);
    }
    function isObservable(value) {
      if ( arguments.length !== 1) {
        die("isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property");
      }
      return _isObservable(value);
    }
    function isObservableProp(value, propName) {
      if ( !isStringish(propName)) {
        return die("expected a property name as second argument");
      }
      return _isObservable(value, propName);
    }

    function keys(obj) {
      if (isObservableObject(obj)) {
        return obj[$mobx].keys_();
      }
      if (isObservableMap(obj) || isObservableSet(obj)) {
        return Array.from(obj.keys());
      }
      if (isObservableArray(obj)) {
        return obj.map(function (_, index) {
          return index;
        });
      }
      die(5);
    }
    function values(obj) {
      if (isObservableObject(obj)) {
        return keys(obj).map(function (key) {
          return obj[key];
        });
      }
      if (isObservableMap(obj)) {
        return keys(obj).map(function (key) {
          return obj.get(key);
        });
      }
      if (isObservableSet(obj)) {
        return Array.from(obj.values());
      }
      if (isObservableArray(obj)) {
        return obj.slice();
      }
      die(6);
    }
    function entries(obj) {
      if (isObservableObject(obj)) {
        return keys(obj).map(function (key) {
          return [key, obj[key]];
        });
      }
      if (isObservableMap(obj)) {
        return keys(obj).map(function (key) {
          return [key, obj.get(key)];
        });
      }
      if (isObservableSet(obj)) {
        return Array.from(obj.entries());
      }
      if (isObservableArray(obj)) {
        return obj.map(function (key, index) {
          return [index, key];
        });
      }
      die(7);
    }
    function set(obj, key, value) {
      if (arguments.length === 2 && !isObservableSet(obj)) {
        startBatch();
        var _values = key;
        try {
          for (var _key in _values) {
            set(obj, _key, _values[_key]);
          }
        } finally {
          endBatch();
        }
        return;
      }
      if (isObservableObject(obj)) {
        obj[$mobx].set_(key, value);
      } else if (isObservableMap(obj)) {
        obj.set(key, value);
      } else if (isObservableSet(obj)) {
        obj.add(key);
      } else if (isObservableArray(obj)) {
        if (typeof key !== "number") {
          key = parseInt(key, 10);
        }
        if (key < 0) {
          die("Invalid index: '" + key + "'");
        }
        startBatch();
        if (key >= obj.length) {
          obj.length = key + 1;
        }
        obj[key] = value;
        endBatch();
      } else {
        die(8);
      }
    }
    function remove(obj, key) {
      if (isObservableObject(obj)) {
        obj[$mobx].delete_(key);
      } else if (isObservableMap(obj)) {
        obj["delete"](key);
      } else if (isObservableSet(obj)) {
        obj["delete"](key);
      } else if (isObservableArray(obj)) {
        if (typeof key !== "number") {
          key = parseInt(key, 10);
        }
        obj.splice(key, 1);
      } else {
        die(9);
      }
    }
    function has(obj, key) {
      if (isObservableObject(obj)) {
        return obj[$mobx].has_(key);
      } else if (isObservableMap(obj)) {
        return obj.has(key);
      } else if (isObservableSet(obj)) {
        return obj.has(key);
      } else if (isObservableArray(obj)) {
        return key >= 0 && key < obj.length;
      }
      die(10);
    }
    function get(obj, key) {
      if (!has(obj, key)) {
        return undefined;
      }
      if (isObservableObject(obj)) {
        return obj[$mobx].get_(key);
      } else if (isObservableMap(obj)) {
        return obj.get(key);
      } else if (isObservableArray(obj)) {
        return obj[key];
      }
      die(11);
    }
    function apiDefineProperty(obj, key, descriptor) {
      if (isObservableObject(obj)) {
        return obj[$mobx].defineProperty_(key, descriptor);
      }
      die(39);
    }
    function apiOwnKeys(obj) {
      if (isObservableObject(obj)) {
        return obj[$mobx].ownKeys_();
      }
      die(38);
    }

    function observe(thing, propOrCb, cbOrFire, fireImmediately) {
      if (isFunction(cbOrFire)) {
        return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
      } else {
        return observeObservable(thing, propOrCb, cbOrFire);
      }
    }
    function observeObservable(thing, listener, fireImmediately) {
      return getAdministration(thing).observe_(listener, fireImmediately);
    }
    function observeObservableProperty(thing, property, listener, fireImmediately) {
      return getAdministration(thing, property).observe_(listener, fireImmediately);
    }

    function cache(map, key, value) {
      map.set(key, value);
      return value;
    }
    function toJSHelper(source, __alreadySeen) {
      if (source == null || typeof source !== "object" || source instanceof Date || !isObservable(source)) {
        return source;
      }
      if (isObservableValue(source) || isComputedValue(source)) {
        return toJSHelper(source.get(), __alreadySeen);
      }
      if (__alreadySeen.has(source)) {
        return __alreadySeen.get(source);
      }
      if (isObservableArray(source)) {
        var res = cache(__alreadySeen, source, new Array(source.length));
        source.forEach(function (value, idx) {
          res[idx] = toJSHelper(value, __alreadySeen);
        });
        return res;
      }
      if (isObservableSet(source)) {
        var _res = cache(__alreadySeen, source, new Set());
        source.forEach(function (value) {
          _res.add(toJSHelper(value, __alreadySeen));
        });
        return _res;
      }
      if (isObservableMap(source)) {
        var _res2 = cache(__alreadySeen, source, new Map());
        source.forEach(function (value, key) {
          _res2.set(key, toJSHelper(value, __alreadySeen));
        });
        return _res2;
      } else {
        // must be observable object
        var _res3 = cache(__alreadySeen, source, {});
        apiOwnKeys(source).forEach(function (key) {
          if (objectPrototype.propertyIsEnumerable.call(source, key)) {
            _res3[key] = toJSHelper(source[key], __alreadySeen);
          }
        });
        return _res3;
      }
    }
    /**
     * Recursively converts an observable to it's non-observable native counterpart.
     * It does NOT recurse into non-observables, these are left as they are, even if they contain observables.
     * Computed and other non-enumerable properties are completely ignored.
     * Complex scenarios require custom solution, eg implementing `toJSON` or using `serializr` lib.
     */
    function toJS(source, options) {
      if ( options) {
        die("toJS no longer supports options");
      }
      return toJSHelper(source, new Map());
    }

    function trace() {
      var enterBreakPoint = false;
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }
      if (typeof args[args.length - 1] === "boolean") {
        enterBreakPoint = args.pop();
      }
      var derivation = getAtomFromArgs(args);
      if (!derivation) {
        return die("'trace(break?)' can only be used inside a tracked computed value or a Reaction. Consider passing in the computed value or reaction explicitly");
      }
      if (derivation.isTracing_ === TraceMode.NONE) {
        console.log("[mobx.trace] '" + derivation.name_ + "' tracing enabled");
      }
      derivation.isTracing_ = enterBreakPoint ? TraceMode.BREAK : TraceMode.LOG;
    }
    function getAtomFromArgs(args) {
      switch (args.length) {
        case 0:
          return globalState.trackingDerivation;
        case 1:
          return getAtom(args[0]);
        case 2:
          return getAtom(args[0], args[1]);
      }
    }

    /**
     * During a transaction no views are updated until the end of the transaction.
     * The transaction will be run synchronously nonetheless.
     *
     * @param action a function that updates some reactive state
     * @returns any value that was returned by the 'action' parameter.
     */
    function transaction(action, thisArg) {
      if (thisArg === void 0) {
        thisArg = undefined;
      }
      startBatch();
      try {
        return action.apply(thisArg);
      } finally {
        endBatch();
      }
    }

    function when(predicate, arg1, arg2) {
      if (arguments.length === 1 || arg1 && typeof arg1 === "object") {
        return whenPromise(predicate, arg1);
      }
      return _when(predicate, arg1, arg2 || {});
    }
    function _when(predicate, effect, opts) {
      var timeoutHandle;
      if (typeof opts.timeout === "number") {
        var error = new Error("WHEN_TIMEOUT");
        timeoutHandle = setTimeout(function () {
          if (!disposer[$mobx].isDisposed_) {
            disposer();
            if (opts.onError) {
              opts.onError(error);
            } else {
              throw error;
            }
          }
        }, opts.timeout);
      }
      opts.name =  opts.name || "When@" + getNextId() ;
      var effectAction = createAction( opts.name + "-effect" , effect);
      // eslint-disable-next-line
      var disposer = autorun(function (r) {
        // predicate should not change state
        var cond = allowStateChanges(false, predicate);
        if (cond) {
          r.dispose();
          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }
          effectAction();
        }
      }, opts);
      return disposer;
    }
    function whenPromise(predicate, opts) {
      var _opts$signal;
      if ( opts && opts.onError) {
        return die("the options 'onError' and 'promise' cannot be combined");
      }
      if (opts != null && (_opts$signal = opts.signal) != null && _opts$signal.aborted) {
        return Object.assign(Promise.reject(new Error("WHEN_ABORTED")), {
          cancel: function cancel() {
            return null;
          }
        });
      }
      var cancel;
      var abort;
      var res = new Promise(function (resolve, reject) {
        var _opts$signal2;
        var disposer = _when(predicate, resolve, _extends({}, opts, {
          onError: reject
        }));
        cancel = function cancel() {
          disposer();
          reject(new Error("WHEN_CANCELLED"));
        };
        abort = function abort() {
          disposer();
          reject(new Error("WHEN_ABORTED"));
        };
        opts == null ? void 0 : (_opts$signal2 = opts.signal) == null ? void 0 : _opts$signal2.addEventListener == null ? void 0 : _opts$signal2.addEventListener("abort", abort);
      })["finally"](function () {
        var _opts$signal3;
        return opts == null ? void 0 : (_opts$signal3 = opts.signal) == null ? void 0 : _opts$signal3.removeEventListener == null ? void 0 : _opts$signal3.removeEventListener("abort", abort);
      });
      res.cancel = cancel;
      return res;
    }

    function getAdm(target) {
      return target[$mobx];
    }
    // Optimization: we don't need the intermediate objects and could have a completely custom administration for DynamicObjects,
    // and skip either the internal values map, or the base object with its property descriptors!
    var objectProxyTraps = {
      has: function has(target, name) {
        if ( globalState.trackingDerivation) {
          warnAboutProxyRequirement("detect new properties using the 'in' operator. Use 'has' from 'mobx' instead.");
        }
        return getAdm(target).has_(name);
      },
      get: function get(target, name) {
        return getAdm(target).get_(name);
      },
      set: function set(target, name, value) {
        var _getAdm$set_;
        if (!isStringish(name)) {
          return false;
        }
        if ( !getAdm(target).values_.has(name)) {
          warnAboutProxyRequirement("add a new observable property through direct assignment. Use 'set' from 'mobx' instead.");
        }
        // null (intercepted) -> true (success)
        return (_getAdm$set_ = getAdm(target).set_(name, value, true)) != null ? _getAdm$set_ : true;
      },
      deleteProperty: function deleteProperty(target, name) {
        var _getAdm$delete_;
        {
          warnAboutProxyRequirement("delete properties from an observable object. Use 'remove' from 'mobx' instead.");
        }
        if (!isStringish(name)) {
          return false;
        }
        // null (intercepted) -> true (success)
        return (_getAdm$delete_ = getAdm(target).delete_(name, true)) != null ? _getAdm$delete_ : true;
      },
      defineProperty: function defineProperty(target, name, descriptor) {
        var _getAdm$definePropert;
        {
          warnAboutProxyRequirement("define property on an observable object. Use 'defineProperty' from 'mobx' instead.");
        }
        // null (intercepted) -> true (success)
        return (_getAdm$definePropert = getAdm(target).defineProperty_(name, descriptor)) != null ? _getAdm$definePropert : true;
      },
      ownKeys: function ownKeys(target) {
        if ( globalState.trackingDerivation) {
          warnAboutProxyRequirement("iterate keys to detect added / removed properties. Use 'keys' from 'mobx' instead.");
        }
        return getAdm(target).ownKeys_();
      },
      preventExtensions: function preventExtensions(target) {
        die(13);
      }
    };
    function asDynamicObservableObject(target, options) {
      var _target$$mobx, _target$$mobx$proxy_;
      assertProxies();
      target = asObservableObject(target, options);
      return (_target$$mobx$proxy_ = (_target$$mobx = target[$mobx]).proxy_) != null ? _target$$mobx$proxy_ : _target$$mobx.proxy_ = new Proxy(target, objectProxyTraps);
    }

    function hasInterceptors(interceptable) {
      return interceptable.interceptors_ !== undefined && interceptable.interceptors_.length > 0;
    }
    function registerInterceptor(interceptable, handler) {
      var interceptors = interceptable.interceptors_ || (interceptable.interceptors_ = []);
      interceptors.push(handler);
      return once(function () {
        var idx = interceptors.indexOf(handler);
        if (idx !== -1) {
          interceptors.splice(idx, 1);
        }
      });
    }
    function interceptChange(interceptable, change) {
      var prevU = untrackedStart();
      try {
        // Interceptor can modify the array, copy it to avoid concurrent modification, see #1950
        var interceptors = [].concat(interceptable.interceptors_ || []);
        for (var i = 0, l = interceptors.length; i < l; i++) {
          change = interceptors[i](change);
          if (change && !change.type) {
            die(14);
          }
          if (!change) {
            break;
          }
        }
        return change;
      } finally {
        untrackedEnd(prevU);
      }
    }

    function hasListeners(listenable) {
      return listenable.changeListeners_ !== undefined && listenable.changeListeners_.length > 0;
    }
    function registerListener(listenable, handler) {
      var listeners = listenable.changeListeners_ || (listenable.changeListeners_ = []);
      listeners.push(handler);
      return once(function () {
        var idx = listeners.indexOf(handler);
        if (idx !== -1) {
          listeners.splice(idx, 1);
        }
      });
    }
    function notifyListeners(listenable, change) {
      var prevU = untrackedStart();
      var listeners = listenable.changeListeners_;
      if (!listeners) {
        return;
      }
      listeners = listeners.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        listeners[i](change);
      }
      untrackedEnd(prevU);
    }

    function makeObservable(target, annotations, options) {
      initObservable(function () {
        var _annotations;
        var adm = asObservableObject(target, options)[$mobx];
        if ("development" !== "production" && annotations && target[storedAnnotationsSymbol]) {
          die("makeObservable second arg must be nullish when using decorators. Mixing @decorator syntax with annotations is not supported.");
        }
        // Default to decorators
        (_annotations = annotations) != null ? _annotations : annotations = collectStoredAnnotations(target);
        // Annotate
        ownKeys(annotations).forEach(function (key) {
          return adm.make_(key, annotations[key]);
        });
      });
      return target;
    }
    // proto[keysSymbol] = new Set<PropertyKey>()
    var keysSymbol = /*#__PURE__*/Symbol("mobx-keys");
    function makeAutoObservable(target, overrides, options) {
      {
        if (!isPlainObject(target) && !isPlainObject(Object.getPrototypeOf(target))) {
          die("'makeAutoObservable' can only be used for classes that don't have a superclass");
        }
        if (isObservableObject(target)) {
          die("makeAutoObservable can only be used on objects not already made observable");
        }
      }
      // Optimization: avoid visiting protos
      // Assumes that annotation.make_/.extend_ works the same for plain objects
      if (isPlainObject(target)) {
        return extendObservable(target, target, overrides, options);
      }
      initObservable(function () {
        var adm = asObservableObject(target, options)[$mobx];
        // Optimization: cache keys on proto
        // Assumes makeAutoObservable can be called only once per object and can't be used in subclass
        if (!target[keysSymbol]) {
          var proto = Object.getPrototypeOf(target);
          var keys = new Set([].concat(ownKeys(target), ownKeys(proto)));
          keys["delete"]("constructor");
          keys["delete"]($mobx);
          addHiddenProp(proto, keysSymbol, keys);
        }
        target[keysSymbol].forEach(function (key) {
          return adm.make_(key,
          // must pass "undefined" for { key: undefined }
          !overrides ? true : key in overrides ? overrides[key] : true);
        });
      });
      return target;
    }

    var SPLICE = "splice";
    var UPDATE = "update";
    var MAX_SPLICE_SIZE = 10000; // See e.g. https://github.com/mobxjs/mobx/issues/859
    var arrayTraps = {
      get: function get(target, name) {
        var adm = target[$mobx];
        if (name === $mobx) {
          return adm;
        }
        if (name === "length") {
          return adm.getArrayLength_();
        }
        if (typeof name === "string" && !isNaN(name)) {
          return adm.get_(parseInt(name));
        }
        if (hasProp(arrayExtensions, name)) {
          return arrayExtensions[name];
        }
        return target[name];
      },
      set: function set(target, name, value) {
        var adm = target[$mobx];
        if (name === "length") {
          adm.setArrayLength_(value);
        }
        if (typeof name === "symbol" || isNaN(name)) {
          target[name] = value;
        } else {
          // numeric string
          adm.set_(parseInt(name), value);
        }
        return true;
      },
      preventExtensions: function preventExtensions() {
        die(15);
      }
    };
    var ObservableArrayAdministration = /*#__PURE__*/function () {
      // this is the prop that gets proxied, so can't replace it!

      function ObservableArrayAdministration(name, enhancer, owned_, legacyMode_) {
        if (name === void 0) {
          name =  "ObservableArray@" + getNextId() ;
        }
        this.owned_ = void 0;
        this.legacyMode_ = void 0;
        this.atom_ = void 0;
        this.values_ = [];
        this.interceptors_ = void 0;
        this.changeListeners_ = void 0;
        this.enhancer_ = void 0;
        this.dehancer = void 0;
        this.proxy_ = void 0;
        this.lastKnownLength_ = 0;
        this.owned_ = owned_;
        this.legacyMode_ = legacyMode_;
        this.atom_ = new Atom(name);
        this.enhancer_ = function (newV, oldV) {
          return enhancer(newV, oldV,  name + "[..]" );
        };
      }
      var _proto = ObservableArrayAdministration.prototype;
      _proto.dehanceValue_ = function dehanceValue_(value) {
        if (this.dehancer !== undefined) {
          return this.dehancer(value);
        }
        return value;
      };
      _proto.dehanceValues_ = function dehanceValues_(values) {
        if (this.dehancer !== undefined && values.length > 0) {
          return values.map(this.dehancer);
        }
        return values;
      };
      _proto.intercept_ = function intercept_(handler) {
        return registerInterceptor(this, handler);
      };
      _proto.observe_ = function observe_(listener, fireImmediately) {
        if (fireImmediately === void 0) {
          fireImmediately = false;
        }
        if (fireImmediately) {
          listener({
            observableKind: "array",
            object: this.proxy_,
            debugObjectName: this.atom_.name_,
            type: "splice",
            index: 0,
            added: this.values_.slice(),
            addedCount: this.values_.length,
            removed: [],
            removedCount: 0
          });
        }
        return registerListener(this, listener);
      };
      _proto.getArrayLength_ = function getArrayLength_() {
        this.atom_.reportObserved();
        return this.values_.length;
      };
      _proto.setArrayLength_ = function setArrayLength_(newLength) {
        if (typeof newLength !== "number" || isNaN(newLength) || newLength < 0) {
          die("Out of range: " + newLength);
        }
        var currentLength = this.values_.length;
        if (newLength === currentLength) {
          return;
        } else if (newLength > currentLength) {
          var newItems = new Array(newLength - currentLength);
          for (var i = 0; i < newLength - currentLength; i++) {
            newItems[i] = undefined;
          } // No Array.fill everywhere...
          this.spliceWithArray_(currentLength, 0, newItems);
        } else {
          this.spliceWithArray_(newLength, currentLength - newLength);
        }
      };
      _proto.updateArrayLength_ = function updateArrayLength_(oldLength, delta) {
        if (oldLength !== this.lastKnownLength_) {
          die(16);
        }
        this.lastKnownLength_ += delta;
        if (this.legacyMode_ && delta > 0) {
          reserveArrayBuffer(oldLength + delta + 1);
        }
      };
      _proto.spliceWithArray_ = function spliceWithArray_(index, deleteCount, newItems) {
        var _this = this;
        checkIfStateModificationsAreAllowed(this.atom_);
        var length = this.values_.length;
        if (index === undefined) {
          index = 0;
        } else if (index > length) {
          index = length;
        } else if (index < 0) {
          index = Math.max(0, length + index);
        }
        if (arguments.length === 1) {
          deleteCount = length - index;
        } else if (deleteCount === undefined || deleteCount === null) {
          deleteCount = 0;
        } else {
          deleteCount = Math.max(0, Math.min(deleteCount, length - index));
        }
        if (newItems === undefined) {
          newItems = EMPTY_ARRAY;
        }
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            object: this.proxy_,
            type: SPLICE,
            index: index,
            removedCount: deleteCount,
            added: newItems
          });
          if (!change) {
            return EMPTY_ARRAY;
          }
          deleteCount = change.removedCount;
          newItems = change.added;
        }
        newItems = newItems.length === 0 ? newItems : newItems.map(function (v) {
          return _this.enhancer_(v, undefined);
        });
        if (this.legacyMode_ || "development" !== "production") {
          var lengthDelta = newItems.length - deleteCount;
          this.updateArrayLength_(length, lengthDelta); // checks if internal array wasn't modified
        }

        var res = this.spliceItemsIntoValues_(index, deleteCount, newItems);
        if (deleteCount !== 0 || newItems.length !== 0) {
          this.notifyArraySplice_(index, newItems, res);
        }
        return this.dehanceValues_(res);
      };
      _proto.spliceItemsIntoValues_ = function spliceItemsIntoValues_(index, deleteCount, newItems) {
        if (newItems.length < MAX_SPLICE_SIZE) {
          var _this$values_;
          return (_this$values_ = this.values_).splice.apply(_this$values_, [index, deleteCount].concat(newItems));
        } else {
          // The items removed by the splice
          var res = this.values_.slice(index, index + deleteCount);
          // The items that that should remain at the end of the array
          var oldItems = this.values_.slice(index + deleteCount);
          // New length is the previous length + addition count - deletion count
          this.values_.length += newItems.length - deleteCount;
          for (var i = 0; i < newItems.length; i++) {
            this.values_[index + i] = newItems[i];
          }
          for (var _i = 0; _i < oldItems.length; _i++) {
            this.values_[index + newItems.length + _i] = oldItems[_i];
          }
          return res;
        }
      };
      _proto.notifyArrayChildUpdate_ = function notifyArrayChildUpdate_(index, newValue, oldValue) {
        var notifySpy = !this.owned_ && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          observableKind: "array",
          object: this.proxy_,
          type: UPDATE,
          debugObjectName: this.atom_.name_,
          index: index,
          newValue: newValue,
          oldValue: oldValue
        } : null;
        // The reason why this is on right hand side here (and not above), is this way the uglifier will drop it, but it won't
        // cause any runtime overhead in development mode without NODE_ENV set, unless spying is enabled
        if ( notifySpy) {
          spyReportStart(change);
        }
        this.atom_.reportChanged();
        if (notify) {
          notifyListeners(this, change);
        }
        if ( notifySpy) {
          spyReportEnd();
        }
      };
      _proto.notifyArraySplice_ = function notifyArraySplice_(index, added, removed) {
        var notifySpy = !this.owned_ && isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          observableKind: "array",
          object: this.proxy_,
          debugObjectName: this.atom_.name_,
          type: SPLICE,
          index: index,
          removed: removed,
          added: added,
          removedCount: removed.length,
          addedCount: added.length
        } : null;
        if ( notifySpy) {
          spyReportStart(change);
        }
        this.atom_.reportChanged();
        // conform: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/observe
        if (notify) {
          notifyListeners(this, change);
        }
        if ( notifySpy) {
          spyReportEnd();
        }
      };
      _proto.get_ = function get_(index) {
        if (this.legacyMode_ && index >= this.values_.length) {
          console.warn( "[mobx.array] Attempt to read an array index (" + index + ") that is out of bounds (" + this.values_.length + "). Please check length first. Out of bound indices will not be tracked by MobX" );
          return undefined;
        }
        this.atom_.reportObserved();
        return this.dehanceValue_(this.values_[index]);
      };
      _proto.set_ = function set_(index, newValue) {
        var values = this.values_;
        if (this.legacyMode_ && index > values.length) {
          // out of bounds
          die(17, index, values.length);
        }
        if (index < values.length) {
          // update at index in range
          checkIfStateModificationsAreAllowed(this.atom_);
          var oldValue = values[index];
          if (hasInterceptors(this)) {
            var change = interceptChange(this, {
              type: UPDATE,
              object: this.proxy_,
              index: index,
              newValue: newValue
            });
            if (!change) {
              return;
            }
            newValue = change.newValue;
          }
          newValue = this.enhancer_(newValue, oldValue);
          var changed = newValue !== oldValue;
          if (changed) {
            values[index] = newValue;
            this.notifyArrayChildUpdate_(index, newValue, oldValue);
          }
        } else {
          // For out of bound index, we don't create an actual sparse array,
          // but rather fill the holes with undefined (same as setArrayLength_).
          // This could be considered a bug.
          var newItems = new Array(index + 1 - values.length);
          for (var i = 0; i < newItems.length - 1; i++) {
            newItems[i] = undefined;
          } // No Array.fill everywhere...
          newItems[newItems.length - 1] = newValue;
          this.spliceWithArray_(values.length, 0, newItems);
        }
      };
      return ObservableArrayAdministration;
    }();
    function createObservableArray(initialValues, enhancer, name, owned) {
      if (name === void 0) {
        name =  "ObservableArray@" + getNextId() ;
      }
      if (owned === void 0) {
        owned = false;
      }
      assertProxies();
      return initObservable(function () {
        var adm = new ObservableArrayAdministration(name, enhancer, owned, false);
        addHiddenFinalProp(adm.values_, $mobx, adm);
        var proxy = new Proxy(adm.values_, arrayTraps);
        adm.proxy_ = proxy;
        if (initialValues && initialValues.length) {
          adm.spliceWithArray_(0, 0, initialValues);
        }
        return proxy;
      });
    }
    // eslint-disable-next-line
    var arrayExtensions = {
      clear: function clear() {
        return this.splice(0);
      },
      replace: function replace(newItems) {
        var adm = this[$mobx];
        return adm.spliceWithArray_(0, adm.values_.length, newItems);
      },
      // Used by JSON.stringify
      toJSON: function toJSON() {
        return this.slice();
      },
      /*
       * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
       * since these functions alter the inner structure of the array, the have side effects.
       * Because the have side effects, they should not be used in computed function,
       * and for that reason the do not call dependencyState.notifyObserved
       */
      splice: function splice(index, deleteCount) {
        for (var _len = arguments.length, newItems = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
          newItems[_key - 2] = arguments[_key];
        }
        var adm = this[$mobx];
        switch (arguments.length) {
          case 0:
            return [];
          case 1:
            return adm.spliceWithArray_(index);
          case 2:
            return adm.spliceWithArray_(index, deleteCount);
        }
        return adm.spliceWithArray_(index, deleteCount, newItems);
      },
      spliceWithArray: function spliceWithArray(index, deleteCount, newItems) {
        return this[$mobx].spliceWithArray_(index, deleteCount, newItems);
      },
      push: function push() {
        var adm = this[$mobx];
        for (var _len2 = arguments.length, items = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          items[_key2] = arguments[_key2];
        }
        adm.spliceWithArray_(adm.values_.length, 0, items);
        return adm.values_.length;
      },
      pop: function pop() {
        return this.splice(Math.max(this[$mobx].values_.length - 1, 0), 1)[0];
      },
      shift: function shift() {
        return this.splice(0, 1)[0];
      },
      unshift: function unshift() {
        var adm = this[$mobx];
        for (var _len3 = arguments.length, items = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
          items[_key3] = arguments[_key3];
        }
        adm.spliceWithArray_(0, 0, items);
        return adm.values_.length;
      },
      reverse: function reverse() {
        // reverse by default mutates in place before returning the result
        // which makes it both a 'derivation' and a 'mutation'.
        if (globalState.trackingDerivation) {
          die(37, "reverse");
        }
        this.replace(this.slice().reverse());
        return this;
      },
      sort: function sort() {
        // sort by default mutates in place before returning the result
        // which goes against all good practices. Let's not change the array in place!
        if (globalState.trackingDerivation) {
          die(37, "sort");
        }
        var copy = this.slice();
        copy.sort.apply(copy, arguments);
        this.replace(copy);
        return this;
      },
      remove: function remove(value) {
        var adm = this[$mobx];
        var idx = adm.dehanceValues_(adm.values_).indexOf(value);
        if (idx > -1) {
          this.splice(idx, 1);
          return true;
        }
        return false;
      }
    };
    /**
     * Wrap function from prototype
     * Without this, everything works as well, but this works
     * faster as everything works on unproxied values
     */
    addArrayExtension("at", simpleFunc);
    addArrayExtension("concat", simpleFunc);
    addArrayExtension("flat", simpleFunc);
    addArrayExtension("includes", simpleFunc);
    addArrayExtension("indexOf", simpleFunc);
    addArrayExtension("join", simpleFunc);
    addArrayExtension("lastIndexOf", simpleFunc);
    addArrayExtension("slice", simpleFunc);
    addArrayExtension("toString", simpleFunc);
    addArrayExtension("toLocaleString", simpleFunc);
    addArrayExtension("toSorted", simpleFunc);
    addArrayExtension("toSpliced", simpleFunc);
    addArrayExtension("with", simpleFunc);
    // map
    addArrayExtension("every", mapLikeFunc);
    addArrayExtension("filter", mapLikeFunc);
    addArrayExtension("find", mapLikeFunc);
    addArrayExtension("findIndex", mapLikeFunc);
    addArrayExtension("findLast", mapLikeFunc);
    addArrayExtension("findLastIndex", mapLikeFunc);
    addArrayExtension("flatMap", mapLikeFunc);
    addArrayExtension("forEach", mapLikeFunc);
    addArrayExtension("map", mapLikeFunc);
    addArrayExtension("some", mapLikeFunc);
    addArrayExtension("toReversed", mapLikeFunc);
    // reduce
    addArrayExtension("reduce", reduceLikeFunc);
    addArrayExtension("reduceRight", reduceLikeFunc);
    function addArrayExtension(funcName, funcFactory) {
      if (typeof Array.prototype[funcName] === "function") {
        arrayExtensions[funcName] = funcFactory(funcName);
      }
    }
    // Report and delegate to dehanced array
    function simpleFunc(funcName) {
      return function () {
        var adm = this[$mobx];
        adm.atom_.reportObserved();
        var dehancedValues = adm.dehanceValues_(adm.values_);
        return dehancedValues[funcName].apply(dehancedValues, arguments);
      };
    }
    // Make sure callbacks recieve correct array arg #2326
    function mapLikeFunc(funcName) {
      return function (callback, thisArg) {
        var _this2 = this;
        var adm = this[$mobx];
        adm.atom_.reportObserved();
        var dehancedValues = adm.dehanceValues_(adm.values_);
        return dehancedValues[funcName](function (element, index) {
          return callback.call(thisArg, element, index, _this2);
        });
      };
    }
    // Make sure callbacks recieve correct array arg #2326
    function reduceLikeFunc(funcName) {
      return function () {
        var _this3 = this;
        var adm = this[$mobx];
        adm.atom_.reportObserved();
        var dehancedValues = adm.dehanceValues_(adm.values_);
        // #2432 - reduce behavior depends on arguments.length
        var callback = arguments[0];
        arguments[0] = function (accumulator, currentValue, index) {
          return callback(accumulator, currentValue, index, _this3);
        };
        return dehancedValues[funcName].apply(dehancedValues, arguments);
      };
    }
    var isObservableArrayAdministration = /*#__PURE__*/createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);
    function isObservableArray(thing) {
      return isObject(thing) && isObservableArrayAdministration(thing[$mobx]);
    }

    var _Symbol$iterator, _Symbol$toStringTag;
    var ObservableMapMarker = {};
    var ADD = "add";
    var DELETE = "delete";
    // just extend Map? See also https://gist.github.com/nestharus/13b4d74f2ef4a2f4357dbd3fc23c1e54
    // But: https://github.com/mobxjs/mobx/issues/1556
    _Symbol$iterator = Symbol.iterator;
    _Symbol$toStringTag = Symbol.toStringTag;
    var ObservableMap = /*#__PURE__*/function () {
      // hasMap, not hashMap >-).

      function ObservableMap(initialData, enhancer_, name_) {
        var _this = this;
        if (enhancer_ === void 0) {
          enhancer_ = deepEnhancer;
        }
        if (name_ === void 0) {
          name_ =  "ObservableMap@" + getNextId() ;
        }
        this.enhancer_ = void 0;
        this.name_ = void 0;
        this[$mobx] = ObservableMapMarker;
        this.data_ = void 0;
        this.hasMap_ = void 0;
        this.keysAtom_ = void 0;
        this.interceptors_ = void 0;
        this.changeListeners_ = void 0;
        this.dehancer = void 0;
        this.enhancer_ = enhancer_;
        this.name_ = name_;
        if (!isFunction(Map)) {
          die(18);
        }
        initObservable(function () {
          _this.keysAtom_ = createAtom("development" !== "production" ? _this.name_ + ".keys()" : "ObservableMap.keys()");
          _this.data_ = new Map();
          _this.hasMap_ = new Map();
          if (initialData) {
            _this.merge(initialData);
          }
        });
      }
      var _proto = ObservableMap.prototype;
      _proto.has_ = function has_(key) {
        return this.data_.has(key);
      };
      _proto.has = function has(key) {
        var _this2 = this;
        if (!globalState.trackingDerivation) {
          return this.has_(key);
        }
        var entry = this.hasMap_.get(key);
        if (!entry) {
          var newEntry = entry = new ObservableValue(this.has_(key), referenceEnhancer,  this.name_ + "." + stringifyKey(key) + "?" , false);
          this.hasMap_.set(key, newEntry);
          onBecomeUnobserved(newEntry, function () {
            return _this2.hasMap_["delete"](key);
          });
        }
        return entry.get();
      };
      _proto.set = function set(key, value) {
        var hasKey = this.has_(key);
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            type: hasKey ? UPDATE : ADD,
            object: this,
            newValue: value,
            name: key
          });
          if (!change) {
            return this;
          }
          value = change.newValue;
        }
        if (hasKey) {
          this.updateValue_(key, value);
        } else {
          this.addValue_(key, value);
        }
        return this;
      };
      _proto["delete"] = function _delete(key) {
        var _this3 = this;
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            type: DELETE,
            object: this,
            name: key
          });
          if (!change) {
            return false;
          }
        }
        if (this.has_(key)) {
          var notifySpy = isSpyEnabled();
          var notify = hasListeners(this);
          var _change = notify || notifySpy ? {
            observableKind: "map",
            debugObjectName: this.name_,
            type: DELETE,
            object: this,
            oldValue: this.data_.get(key).value_,
            name: key
          } : null;
          if ( notifySpy) {
            spyReportStart(_change);
          } // TODO fix type
          transaction(function () {
            var _this3$hasMap_$get;
            _this3.keysAtom_.reportChanged();
            (_this3$hasMap_$get = _this3.hasMap_.get(key)) == null ? void 0 : _this3$hasMap_$get.setNewValue_(false);
            var observable = _this3.data_.get(key);
            observable.setNewValue_(undefined);
            _this3.data_["delete"](key);
          });
          if (notify) {
            notifyListeners(this, _change);
          }
          if ( notifySpy) {
            spyReportEnd();
          }
          return true;
        }
        return false;
      };
      _proto.updateValue_ = function updateValue_(key, newValue) {
        var observable = this.data_.get(key);
        newValue = observable.prepareNewValue_(newValue);
        if (newValue !== globalState.UNCHANGED) {
          var notifySpy = isSpyEnabled();
          var notify = hasListeners(this);
          var change = notify || notifySpy ? {
            observableKind: "map",
            debugObjectName: this.name_,
            type: UPDATE,
            object: this,
            oldValue: observable.value_,
            name: key,
            newValue: newValue
          } : null;
          if ( notifySpy) {
            spyReportStart(change);
          } // TODO fix type
          observable.setNewValue_(newValue);
          if (notify) {
            notifyListeners(this, change);
          }
          if ( notifySpy) {
            spyReportEnd();
          }
        }
      };
      _proto.addValue_ = function addValue_(key, newValue) {
        var _this4 = this;
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        transaction(function () {
          var _this4$hasMap_$get;
          var observable = new ObservableValue(newValue, _this4.enhancer_,  _this4.name_ + "." + stringifyKey(key) , false);
          _this4.data_.set(key, observable);
          newValue = observable.value_; // value might have been changed
          (_this4$hasMap_$get = _this4.hasMap_.get(key)) == null ? void 0 : _this4$hasMap_$get.setNewValue_(true);
          _this4.keysAtom_.reportChanged();
        });
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          observableKind: "map",
          debugObjectName: this.name_,
          type: ADD,
          object: this,
          name: key,
          newValue: newValue
        } : null;
        if ( notifySpy) {
          spyReportStart(change);
        } // TODO fix type
        if (notify) {
          notifyListeners(this, change);
        }
        if ( notifySpy) {
          spyReportEnd();
        }
      };
      _proto.get = function get(key) {
        if (this.has(key)) {
          return this.dehanceValue_(this.data_.get(key).get());
        }
        return this.dehanceValue_(undefined);
      };
      _proto.dehanceValue_ = function dehanceValue_(value) {
        if (this.dehancer !== undefined) {
          return this.dehancer(value);
        }
        return value;
      };
      _proto.keys = function keys() {
        this.keysAtom_.reportObserved();
        return this.data_.keys();
      };
      _proto.values = function values() {
        var self = this;
        var keys = this.keys();
        return makeIterable({
          next: function next() {
            var _keys$next = keys.next(),
              done = _keys$next.done,
              value = _keys$next.value;
            return {
              done: done,
              value: done ? undefined : self.get(value)
            };
          }
        });
      };
      _proto.entries = function entries() {
        var self = this;
        var keys = this.keys();
        return makeIterable({
          next: function next() {
            var _keys$next2 = keys.next(),
              done = _keys$next2.done,
              value = _keys$next2.value;
            return {
              done: done,
              value: done ? undefined : [value, self.get(value)]
            };
          }
        });
      };
      _proto[_Symbol$iterator] = function () {
        return this.entries();
      };
      _proto.forEach = function forEach(callback, thisArg) {
        for (var _iterator = _createForOfIteratorHelperLoose(this), _step; !(_step = _iterator()).done;) {
          var _step$value = _step.value,
            key = _step$value[0],
            value = _step$value[1];
          callback.call(thisArg, value, key, this);
        }
      }
      /** Merge another object into this object, returns this. */;
      _proto.merge = function merge(other) {
        var _this5 = this;
        if (isObservableMap(other)) {
          other = new Map(other);
        }
        transaction(function () {
          if (isPlainObject(other)) {
            getPlainObjectKeys(other).forEach(function (key) {
              return _this5.set(key, other[key]);
            });
          } else if (Array.isArray(other)) {
            other.forEach(function (_ref) {
              var key = _ref[0],
                value = _ref[1];
              return _this5.set(key, value);
            });
          } else if (isES6Map(other)) {
            if (other.constructor !== Map) {
              die(19, other);
            }
            other.forEach(function (value, key) {
              return _this5.set(key, value);
            });
          } else if (other !== null && other !== undefined) {
            die(20, other);
          }
        });
        return this;
      };
      _proto.clear = function clear() {
        var _this6 = this;
        transaction(function () {
          untracked(function () {
            for (var _iterator2 = _createForOfIteratorHelperLoose(_this6.keys()), _step2; !(_step2 = _iterator2()).done;) {
              var key = _step2.value;
              _this6["delete"](key);
            }
          });
        });
      };
      _proto.replace = function replace(values) {
        var _this7 = this;
        // Implementation requirements:
        // - respect ordering of replacement map
        // - allow interceptors to run and potentially prevent individual operations
        // - don't recreate observables that already exist in original map (so we don't destroy existing subscriptions)
        // - don't _keysAtom.reportChanged if the keys of resulting map are indentical (order matters!)
        // - note that result map may differ from replacement map due to the interceptors
        transaction(function () {
          // Convert to map so we can do quick key lookups
          var replacementMap = convertToMap(values);
          var orderedData = new Map();
          // Used for optimization
          var keysReportChangedCalled = false;
          // Delete keys that don't exist in replacement map
          // if the key deletion is prevented by interceptor
          // add entry at the beginning of the result map
          for (var _iterator3 = _createForOfIteratorHelperLoose(_this7.data_.keys()), _step3; !(_step3 = _iterator3()).done;) {
            var key = _step3.value;
            // Concurrently iterating/deleting keys
            // iterator should handle this correctly
            if (!replacementMap.has(key)) {
              var deleted = _this7["delete"](key);
              // Was the key removed?
              if (deleted) {
                // _keysAtom.reportChanged() was already called
                keysReportChangedCalled = true;
              } else {
                // Delete prevented by interceptor
                var value = _this7.data_.get(key);
                orderedData.set(key, value);
              }
            }
          }
          // Merge entries
          for (var _iterator4 = _createForOfIteratorHelperLoose(replacementMap.entries()), _step4; !(_step4 = _iterator4()).done;) {
            var _step4$value = _step4.value,
              _key = _step4$value[0],
              _value = _step4$value[1];
            // We will want to know whether a new key is added
            var keyExisted = _this7.data_.has(_key);
            // Add or update value
            _this7.set(_key, _value);
            // The addition could have been prevent by interceptor
            if (_this7.data_.has(_key)) {
              // The update could have been prevented by interceptor
              // and also we want to preserve existing values
              // so use value from _data map (instead of replacement map)
              var _value2 = _this7.data_.get(_key);
              orderedData.set(_key, _value2);
              // Was a new key added?
              if (!keyExisted) {
                // _keysAtom.reportChanged() was already called
                keysReportChangedCalled = true;
              }
            }
          }
          // Check for possible key order change
          if (!keysReportChangedCalled) {
            if (_this7.data_.size !== orderedData.size) {
              // If size differs, keys are definitely modified
              _this7.keysAtom_.reportChanged();
            } else {
              var iter1 = _this7.data_.keys();
              var iter2 = orderedData.keys();
              var next1 = iter1.next();
              var next2 = iter2.next();
              while (!next1.done) {
                if (next1.value !== next2.value) {
                  _this7.keysAtom_.reportChanged();
                  break;
                }
                next1 = iter1.next();
                next2 = iter2.next();
              }
            }
          }
          // Use correctly ordered map
          _this7.data_ = orderedData;
        });
        return this;
      };
      _proto.toString = function toString() {
        return "[object ObservableMap]";
      };
      _proto.toJSON = function toJSON() {
        return Array.from(this);
      };
      /**
       * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
       * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
       * for callback details
       */
      _proto.observe_ = function observe_(listener, fireImmediately) {
        if ( fireImmediately === true) {
          die("`observe` doesn't support fireImmediately=true in combination with maps.");
        }
        return registerListener(this, listener);
      };
      _proto.intercept_ = function intercept_(handler) {
        return registerInterceptor(this, handler);
      };
      _createClass(ObservableMap, [{
        key: "size",
        get: function get() {
          this.keysAtom_.reportObserved();
          return this.data_.size;
        }
      }, {
        key: _Symbol$toStringTag,
        get: function get() {
          return "Map";
        }
      }]);
      return ObservableMap;
    }();
    // eslint-disable-next-line
    var isObservableMap = /*#__PURE__*/createInstanceofPredicate("ObservableMap", ObservableMap);
    function convertToMap(dataStructure) {
      if (isES6Map(dataStructure) || isObservableMap(dataStructure)) {
        return dataStructure;
      } else if (Array.isArray(dataStructure)) {
        return new Map(dataStructure);
      } else if (isPlainObject(dataStructure)) {
        var map = new Map();
        for (var key in dataStructure) {
          map.set(key, dataStructure[key]);
        }
        return map;
      } else {
        return die(21, dataStructure);
      }
    }

    var _Symbol$iterator$1, _Symbol$toStringTag$1;
    var ObservableSetMarker = {};
    _Symbol$iterator$1 = Symbol.iterator;
    _Symbol$toStringTag$1 = Symbol.toStringTag;
    var ObservableSet = /*#__PURE__*/function () {
      function ObservableSet(initialData, enhancer, name_) {
        var _this = this;
        if (enhancer === void 0) {
          enhancer = deepEnhancer;
        }
        if (name_ === void 0) {
          name_ =  "ObservableSet@" + getNextId() ;
        }
        this.name_ = void 0;
        this[$mobx] = ObservableSetMarker;
        this.data_ = new Set();
        this.atom_ = void 0;
        this.changeListeners_ = void 0;
        this.interceptors_ = void 0;
        this.dehancer = void 0;
        this.enhancer_ = void 0;
        this.name_ = name_;
        if (!isFunction(Set)) {
          die(22);
        }
        this.enhancer_ = function (newV, oldV) {
          return enhancer(newV, oldV, name_);
        };
        initObservable(function () {
          _this.atom_ = createAtom(_this.name_);
          if (initialData) {
            _this.replace(initialData);
          }
        });
      }
      var _proto = ObservableSet.prototype;
      _proto.dehanceValue_ = function dehanceValue_(value) {
        if (this.dehancer !== undefined) {
          return this.dehancer(value);
        }
        return value;
      };
      _proto.clear = function clear() {
        var _this2 = this;
        transaction(function () {
          untracked(function () {
            for (var _iterator = _createForOfIteratorHelperLoose(_this2.data_.values()), _step; !(_step = _iterator()).done;) {
              var value = _step.value;
              _this2["delete"](value);
            }
          });
        });
      };
      _proto.forEach = function forEach(callbackFn, thisArg) {
        for (var _iterator2 = _createForOfIteratorHelperLoose(this), _step2; !(_step2 = _iterator2()).done;) {
          var value = _step2.value;
          callbackFn.call(thisArg, value, value, this);
        }
      };
      _proto.add = function add(value) {
        var _this3 = this;
        checkIfStateModificationsAreAllowed(this.atom_);
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            type: ADD,
            object: this,
            newValue: value
          });
          if (!change) {
            return this;
          }
          // ideally, value = change.value would be done here, so that values can be
          // changed by interceptor. Same applies for other Set and Map api's.
        }

        if (!this.has(value)) {
          transaction(function () {
            _this3.data_.add(_this3.enhancer_(value, undefined));
            _this3.atom_.reportChanged();
          });
          var notifySpy =  isSpyEnabled();
          var notify = hasListeners(this);
          var _change = notify || notifySpy ? {
            observableKind: "set",
            debugObjectName: this.name_,
            type: ADD,
            object: this,
            newValue: value
          } : null;
          if (notifySpy && "development" !== "production") {
            spyReportStart(_change);
          }
          if (notify) {
            notifyListeners(this, _change);
          }
          if (notifySpy && "development" !== "production") {
            spyReportEnd();
          }
        }
        return this;
      };
      _proto["delete"] = function _delete(value) {
        var _this4 = this;
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            type: DELETE,
            object: this,
            oldValue: value
          });
          if (!change) {
            return false;
          }
        }
        if (this.has(value)) {
          var notifySpy =  isSpyEnabled();
          var notify = hasListeners(this);
          var _change2 = notify || notifySpy ? {
            observableKind: "set",
            debugObjectName: this.name_,
            type: DELETE,
            object: this,
            oldValue: value
          } : null;
          if (notifySpy && "development" !== "production") {
            spyReportStart(_change2);
          }
          transaction(function () {
            _this4.atom_.reportChanged();
            _this4.data_["delete"](value);
          });
          if (notify) {
            notifyListeners(this, _change2);
          }
          if (notifySpy && "development" !== "production") {
            spyReportEnd();
          }
          return true;
        }
        return false;
      };
      _proto.has = function has(value) {
        this.atom_.reportObserved();
        return this.data_.has(this.dehanceValue_(value));
      };
      _proto.entries = function entries() {
        var nextIndex = 0;
        var keys = Array.from(this.keys());
        var values = Array.from(this.values());
        return makeIterable({
          next: function next() {
            var index = nextIndex;
            nextIndex += 1;
            return index < values.length ? {
              value: [keys[index], values[index]],
              done: false
            } : {
              done: true
            };
          }
        });
      };
      _proto.keys = function keys() {
        return this.values();
      };
      _proto.values = function values() {
        this.atom_.reportObserved();
        var self = this;
        var nextIndex = 0;
        var observableValues = Array.from(this.data_.values());
        return makeIterable({
          next: function next() {
            return nextIndex < observableValues.length ? {
              value: self.dehanceValue_(observableValues[nextIndex++]),
              done: false
            } : {
              done: true
            };
          }
        });
      };
      _proto.replace = function replace(other) {
        var _this5 = this;
        if (isObservableSet(other)) {
          other = new Set(other);
        }
        transaction(function () {
          if (Array.isArray(other)) {
            _this5.clear();
            other.forEach(function (value) {
              return _this5.add(value);
            });
          } else if (isES6Set(other)) {
            _this5.clear();
            other.forEach(function (value) {
              return _this5.add(value);
            });
          } else if (other !== null && other !== undefined) {
            die("Cannot initialize set from " + other);
          }
        });
        return this;
      };
      _proto.observe_ = function observe_(listener, fireImmediately) {
        // ... 'fireImmediately' could also be true?
        if ( fireImmediately === true) {
          die("`observe` doesn't support fireImmediately=true in combination with sets.");
        }
        return registerListener(this, listener);
      };
      _proto.intercept_ = function intercept_(handler) {
        return registerInterceptor(this, handler);
      };
      _proto.toJSON = function toJSON() {
        return Array.from(this);
      };
      _proto.toString = function toString() {
        return "[object ObservableSet]";
      };
      _proto[_Symbol$iterator$1] = function () {
        return this.values();
      };
      _createClass(ObservableSet, [{
        key: "size",
        get: function get() {
          this.atom_.reportObserved();
          return this.data_.size;
        }
      }, {
        key: _Symbol$toStringTag$1,
        get: function get() {
          return "Set";
        }
      }]);
      return ObservableSet;
    }();
    // eslint-disable-next-line
    var isObservableSet = /*#__PURE__*/createInstanceofPredicate("ObservableSet", ObservableSet);

    var descriptorCache = /*#__PURE__*/Object.create(null);
    var REMOVE = "remove";
    var ObservableObjectAdministration = /*#__PURE__*/function () {
      function ObservableObjectAdministration(target_, values_, name_,
      // Used anytime annotation is not explicitely provided
      defaultAnnotation_) {
        if (values_ === void 0) {
          values_ = new Map();
        }
        if (defaultAnnotation_ === void 0) {
          defaultAnnotation_ = autoAnnotation;
        }
        this.target_ = void 0;
        this.values_ = void 0;
        this.name_ = void 0;
        this.defaultAnnotation_ = void 0;
        this.keysAtom_ = void 0;
        this.changeListeners_ = void 0;
        this.interceptors_ = void 0;
        this.proxy_ = void 0;
        this.isPlainObject_ = void 0;
        this.appliedAnnotations_ = void 0;
        this.pendingKeys_ = void 0;
        this.target_ = target_;
        this.values_ = values_;
        this.name_ = name_;
        this.defaultAnnotation_ = defaultAnnotation_;
        this.keysAtom_ = new Atom( this.name_ + ".keys" );
        // Optimization: we use this frequently
        this.isPlainObject_ = isPlainObject(this.target_);
        if ( !isAnnotation(this.defaultAnnotation_)) {
          die("defaultAnnotation must be valid annotation");
        }
        {
          // Prepare structure for tracking which fields were already annotated
          this.appliedAnnotations_ = {};
        }
      }
      var _proto = ObservableObjectAdministration.prototype;
      _proto.getObservablePropValue_ = function getObservablePropValue_(key) {
        return this.values_.get(key).get();
      };
      _proto.setObservablePropValue_ = function setObservablePropValue_(key, newValue) {
        var observable = this.values_.get(key);
        if (observable instanceof ComputedValue) {
          observable.set(newValue);
          return true;
        }
        // intercept
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            type: UPDATE,
            object: this.proxy_ || this.target_,
            name: key,
            newValue: newValue
          });
          if (!change) {
            return null;
          }
          newValue = change.newValue;
        }
        newValue = observable.prepareNewValue_(newValue);
        // notify spy & observers
        if (newValue !== globalState.UNCHANGED) {
          var notify = hasListeners(this);
          var notifySpy =  isSpyEnabled();
          var _change = notify || notifySpy ? {
            type: UPDATE,
            observableKind: "object",
            debugObjectName: this.name_,
            object: this.proxy_ || this.target_,
            oldValue: observable.value_,
            name: key,
            newValue: newValue
          } : null;
          if ( notifySpy) {
            spyReportStart(_change);
          }
          observable.setNewValue_(newValue);
          if (notify) {
            notifyListeners(this, _change);
          }
          if ( notifySpy) {
            spyReportEnd();
          }
        }
        return true;
      };
      _proto.get_ = function get_(key) {
        if (globalState.trackingDerivation && !hasProp(this.target_, key)) {
          // Key doesn't exist yet, subscribe for it in case it's added later
          this.has_(key);
        }
        return this.target_[key];
      }
      /**
       * @param {PropertyKey} key
       * @param {any} value
       * @param {Annotation|boolean} annotation true - use default annotation, false - copy as is
       * @param {boolean} proxyTrap whether it's called from proxy trap
       * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
       */;
      _proto.set_ = function set_(key, value, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        // Don't use .has(key) - we care about own
        if (hasProp(this.target_, key)) {
          // Existing prop
          if (this.values_.has(key)) {
            // Observable (can be intercepted)
            return this.setObservablePropValue_(key, value);
          } else if (proxyTrap) {
            // Non-observable - proxy
            return Reflect.set(this.target_, key, value);
          } else {
            // Non-observable
            this.target_[key] = value;
            return true;
          }
        } else {
          // New prop
          return this.extend_(key, {
            value: value,
            enumerable: true,
            writable: true,
            configurable: true
          }, this.defaultAnnotation_, proxyTrap);
        }
      }
      // Trap for "in"
      ;
      _proto.has_ = function has_(key) {
        if (!globalState.trackingDerivation) {
          // Skip key subscription outside derivation
          return key in this.target_;
        }
        this.pendingKeys_ || (this.pendingKeys_ = new Map());
        var entry = this.pendingKeys_.get(key);
        if (!entry) {
          entry = new ObservableValue(key in this.target_, referenceEnhancer,  this.name_ + "." + stringifyKey(key) + "?" , false);
          this.pendingKeys_.set(key, entry);
        }
        return entry.get();
      }
      /**
       * @param {PropertyKey} key
       * @param {Annotation|boolean} annotation true - use default annotation, false - ignore prop
       */;
      _proto.make_ = function make_(key, annotation) {
        if (annotation === true) {
          annotation = this.defaultAnnotation_;
        }
        if (annotation === false) {
          return;
        }
        assertAnnotable(this, annotation, key);
        if (!(key in this.target_)) {
          var _this$target_$storedA;
          // Throw on missing key, except for decorators:
          // Decorator annotations are collected from whole prototype chain.
          // When called from super() some props may not exist yet.
          // However we don't have to worry about missing prop,
          // because the decorator must have been applied to something.
          if ((_this$target_$storedA = this.target_[storedAnnotationsSymbol]) != null && _this$target_$storedA[key]) {
            return; // will be annotated by subclass constructor
          } else {
            die(1, annotation.annotationType_, this.name_ + "." + key.toString());
          }
        }
        var source = this.target_;
        while (source && source !== objectPrototype) {
          var descriptor = getDescriptor(source, key);
          if (descriptor) {
            var outcome = annotation.make_(this, key, descriptor, source);
            if (outcome === 0 /* MakeResult.Cancel */) {
              return;
            }
            if (outcome === 1 /* MakeResult.Break */) {
              break;
            }
          }
          source = Object.getPrototypeOf(source);
        }
        recordAnnotationApplied(this, annotation, key);
      }
      /**
       * @param {PropertyKey} key
       * @param {PropertyDescriptor} descriptor
       * @param {Annotation|boolean} annotation true - use default annotation, false - copy as is
       * @param {boolean} proxyTrap whether it's called from proxy trap
       * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
       */;
      _proto.extend_ = function extend_(key, descriptor, annotation, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        if (annotation === true) {
          annotation = this.defaultAnnotation_;
        }
        if (annotation === false) {
          return this.defineProperty_(key, descriptor, proxyTrap);
        }
        assertAnnotable(this, annotation, key);
        var outcome = annotation.extend_(this, key, descriptor, proxyTrap);
        if (outcome) {
          recordAnnotationApplied(this, annotation, key);
        }
        return outcome;
      }
      /**
       * @param {PropertyKey} key
       * @param {PropertyDescriptor} descriptor
       * @param {boolean} proxyTrap whether it's called from proxy trap
       * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
       */;
      _proto.defineProperty_ = function defineProperty_(key, descriptor, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        try {
          startBatch();
          // Delete
          var deleteOutcome = this.delete_(key);
          if (!deleteOutcome) {
            // Failure or intercepted
            return deleteOutcome;
          }
          // ADD interceptor
          if (hasInterceptors(this)) {
            var change = interceptChange(this, {
              object: this.proxy_ || this.target_,
              name: key,
              type: ADD,
              newValue: descriptor.value
            });
            if (!change) {
              return null;
            }
            var newValue = change.newValue;
            if (descriptor.value !== newValue) {
              descriptor = _extends({}, descriptor, {
                value: newValue
              });
            }
          }
          // Define
          if (proxyTrap) {
            if (!Reflect.defineProperty(this.target_, key, descriptor)) {
              return false;
            }
          } else {
            defineProperty(this.target_, key, descriptor);
          }
          // Notify
          this.notifyPropertyAddition_(key, descriptor.value);
        } finally {
          endBatch();
        }
        return true;
      }
      // If original descriptor becomes relevant, move this to annotation directly
      ;
      _proto.defineObservableProperty_ = function defineObservableProperty_(key, value, enhancer, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        try {
          startBatch();
          // Delete
          var deleteOutcome = this.delete_(key);
          if (!deleteOutcome) {
            // Failure or intercepted
            return deleteOutcome;
          }
          // ADD interceptor
          if (hasInterceptors(this)) {
            var change = interceptChange(this, {
              object: this.proxy_ || this.target_,
              name: key,
              type: ADD,
              newValue: value
            });
            if (!change) {
              return null;
            }
            value = change.newValue;
          }
          var cachedDescriptor = getCachedObservablePropDescriptor(key);
          var descriptor = {
            configurable: globalState.safeDescriptors ? this.isPlainObject_ : true,
            enumerable: true,
            get: cachedDescriptor.get,
            set: cachedDescriptor.set
          };
          // Define
          if (proxyTrap) {
            if (!Reflect.defineProperty(this.target_, key, descriptor)) {
              return false;
            }
          } else {
            defineProperty(this.target_, key, descriptor);
          }
          var observable = new ObservableValue(value, enhancer, "development" !== "production" ? this.name_ + "." + key.toString() : "ObservableObject.key", false);
          this.values_.set(key, observable);
          // Notify (value possibly changed by ObservableValue)
          this.notifyPropertyAddition_(key, observable.value_);
        } finally {
          endBatch();
        }
        return true;
      }
      // If original descriptor becomes relevant, move this to annotation directly
      ;
      _proto.defineComputedProperty_ = function defineComputedProperty_(key, options, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        try {
          startBatch();
          // Delete
          var deleteOutcome = this.delete_(key);
          if (!deleteOutcome) {
            // Failure or intercepted
            return deleteOutcome;
          }
          // ADD interceptor
          if (hasInterceptors(this)) {
            var change = interceptChange(this, {
              object: this.proxy_ || this.target_,
              name: key,
              type: ADD,
              newValue: undefined
            });
            if (!change) {
              return null;
            }
          }
          options.name || (options.name = "development" !== "production" ? this.name_ + "." + key.toString() : "ObservableObject.key");
          options.context = this.proxy_ || this.target_;
          var cachedDescriptor = getCachedObservablePropDescriptor(key);
          var descriptor = {
            configurable: globalState.safeDescriptors ? this.isPlainObject_ : true,
            enumerable: false,
            get: cachedDescriptor.get,
            set: cachedDescriptor.set
          };
          // Define
          if (proxyTrap) {
            if (!Reflect.defineProperty(this.target_, key, descriptor)) {
              return false;
            }
          } else {
            defineProperty(this.target_, key, descriptor);
          }
          this.values_.set(key, new ComputedValue(options));
          // Notify
          this.notifyPropertyAddition_(key, undefined);
        } finally {
          endBatch();
        }
        return true;
      }
      /**
       * @param {PropertyKey} key
       * @param {PropertyDescriptor} descriptor
       * @param {boolean} proxyTrap whether it's called from proxy trap
       * @returns {boolean|null} true on success, false on failure (proxyTrap + non-configurable), null when cancelled by interceptor
       */;
      _proto.delete_ = function delete_(key, proxyTrap) {
        if (proxyTrap === void 0) {
          proxyTrap = false;
        }
        checkIfStateModificationsAreAllowed(this.keysAtom_);
        // No such prop
        if (!hasProp(this.target_, key)) {
          return true;
        }
        // Intercept
        if (hasInterceptors(this)) {
          var change = interceptChange(this, {
            object: this.proxy_ || this.target_,
            name: key,
            type: REMOVE
          });
          // Cancelled
          if (!change) {
            return null;
          }
        }
        // Delete
        try {
          var _this$pendingKeys_, _this$pendingKeys_$ge;
          startBatch();
          var notify = hasListeners(this);
          var notifySpy = "development" !== "production" && isSpyEnabled();
          var observable = this.values_.get(key);
          // Value needed for spies/listeners
          var value = undefined;
          // Optimization: don't pull the value unless we will need it
          if (!observable && (notify || notifySpy)) {
            var _getDescriptor;
            value = (_getDescriptor = getDescriptor(this.target_, key)) == null ? void 0 : _getDescriptor.value;
          }
          // delete prop (do first, may fail)
          if (proxyTrap) {
            if (!Reflect.deleteProperty(this.target_, key)) {
              return false;
            }
          } else {
            delete this.target_[key];
          }
          // Allow re-annotating this field
          if ("development" !== "production") {
            delete this.appliedAnnotations_[key];
          }
          // Clear observable
          if (observable) {
            this.values_["delete"](key);
            // for computed, value is undefined
            if (observable instanceof ObservableValue) {
              value = observable.value_;
            }
            // Notify: autorun(() => obj[key]), see #1796
            propagateChanged(observable);
          }
          // Notify "keys/entries/values" observers
          this.keysAtom_.reportChanged();
          // Notify "has" observers
          // "in" as it may still exist in proto
          (_this$pendingKeys_ = this.pendingKeys_) == null ? void 0 : (_this$pendingKeys_$ge = _this$pendingKeys_.get(key)) == null ? void 0 : _this$pendingKeys_$ge.set(key in this.target_);
          // Notify spies/listeners
          if (notify || notifySpy) {
            var _change2 = {
              type: REMOVE,
              observableKind: "object",
              object: this.proxy_ || this.target_,
              debugObjectName: this.name_,
              oldValue: value,
              name: key
            };
            if ("development" !== "production" && notifySpy) {
              spyReportStart(_change2);
            }
            if (notify) {
              notifyListeners(this, _change2);
            }
            if ("development" !== "production" && notifySpy) {
              spyReportEnd();
            }
          }
        } finally {
          endBatch();
        }
        return true;
      }
      /**
       * Observes this object. Triggers for the events 'add', 'update' and 'delete'.
       * See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/observe
       * for callback details
       */;
      _proto.observe_ = function observe_(callback, fireImmediately) {
        if ( fireImmediately === true) {
          die("`observe` doesn't support the fire immediately property for observable objects.");
        }
        return registerListener(this, callback);
      };
      _proto.intercept_ = function intercept_(handler) {
        return registerInterceptor(this, handler);
      };
      _proto.notifyPropertyAddition_ = function notifyPropertyAddition_(key, value) {
        var _this$pendingKeys_2, _this$pendingKeys_2$g;
        var notify = hasListeners(this);
        var notifySpy =  isSpyEnabled();
        if (notify || notifySpy) {
          var change = notify || notifySpy ? {
            type: ADD,
            observableKind: "object",
            debugObjectName: this.name_,
            object: this.proxy_ || this.target_,
            name: key,
            newValue: value
          } : null;
          if ( notifySpy) {
            spyReportStart(change);
          }
          if (notify) {
            notifyListeners(this, change);
          }
          if ( notifySpy) {
            spyReportEnd();
          }
        }
        (_this$pendingKeys_2 = this.pendingKeys_) == null ? void 0 : (_this$pendingKeys_2$g = _this$pendingKeys_2.get(key)) == null ? void 0 : _this$pendingKeys_2$g.set(true);
        // Notify "keys/entries/values" observers
        this.keysAtom_.reportChanged();
      };
      _proto.ownKeys_ = function ownKeys_() {
        this.keysAtom_.reportObserved();
        return ownKeys(this.target_);
      };
      _proto.keys_ = function keys_() {
        // Returns enumerable && own, but unfortunately keysAtom will report on ANY key change.
        // There is no way to distinguish between Object.keys(object) and Reflect.ownKeys(object) - both are handled by ownKeys trap.
        // We can either over-report in Object.keys(object) or under-report in Reflect.ownKeys(object)
        // We choose to over-report in Object.keys(object), because:
        // - typically it's used with simple data objects
        // - when symbolic/non-enumerable keys are relevant Reflect.ownKeys works as expected
        this.keysAtom_.reportObserved();
        return Object.keys(this.target_);
      };
      return ObservableObjectAdministration;
    }();
    function asObservableObject(target, options) {
      var _options$name;
      if ( options && isObservableObject(target)) {
        die("Options can't be provided for already observable objects.");
      }
      if (hasProp(target, $mobx)) {
        if ( !(getAdministration(target) instanceof ObservableObjectAdministration)) {
          die("Cannot convert '" + getDebugName(target) + "' into observable object:" + "\nThe target is already observable of different type." + "\nExtending builtins is not supported.");
        }
        return target;
      }
      if ( !Object.isExtensible(target)) {
        die("Cannot make the designated object observable; it is not extensible");
      }
      var name = (_options$name = options == null ? void 0 : options.name) != null ? _options$name :  (isPlainObject(target) ? "ObservableObject" : target.constructor.name) + "@" + getNextId() ;
      var adm = new ObservableObjectAdministration(target, new Map(), String(name), getAnnotationFromOptions(options));
      addHiddenProp(target, $mobx, adm);
      return target;
    }
    var isObservableObjectAdministration = /*#__PURE__*/createInstanceofPredicate("ObservableObjectAdministration", ObservableObjectAdministration);
    function getCachedObservablePropDescriptor(key) {
      return descriptorCache[key] || (descriptorCache[key] = {
        get: function get() {
          return this[$mobx].getObservablePropValue_(key);
        },
        set: function set(value) {
          return this[$mobx].setObservablePropValue_(key, value);
        }
      });
    }
    function isObservableObject(thing) {
      if (isObject(thing)) {
        return isObservableObjectAdministration(thing[$mobx]);
      }
      return false;
    }
    function recordAnnotationApplied(adm, annotation, key) {
      var _adm$target_$storedAn;
      {
        adm.appliedAnnotations_[key] = annotation;
      }
      // Remove applied decorator annotation so we don't try to apply it again in subclass constructor
      (_adm$target_$storedAn = adm.target_[storedAnnotationsSymbol]) == null ? true : delete _adm$target_$storedAn[key];
    }
    function assertAnnotable(adm, annotation, key) {
      // Valid annotation
      if ( !isAnnotation(annotation)) {
        die("Cannot annotate '" + adm.name_ + "." + key.toString() + "': Invalid annotation.");
      }
      /*
      // Configurable, not sealed, not frozen
      // Possibly not needed, just a little better error then the one thrown by engine.
      // Cases where this would be useful the most (subclass field initializer) are not interceptable by this.
      if (__DEV__) {
          const configurable = getDescriptor(adm.target_, key)?.configurable
          const frozen = Object.isFrozen(adm.target_)
          const sealed = Object.isSealed(adm.target_)
          if (!configurable || frozen || sealed) {
              const fieldName = `${adm.name_}.${key.toString()}`
              const requestedAnnotationType = annotation.annotationType_
              let error = `Cannot apply '${requestedAnnotationType}' to '${fieldName}':`
              if (frozen) {
                  error += `\nObject is frozen.`
              }
              if (sealed) {
                  error += `\nObject is sealed.`
              }
              if (!configurable) {
                  error += `\nproperty is not configurable.`
                  // Mention only if caused by us to avoid confusion
                  if (hasProp(adm.appliedAnnotations!, key)) {
                      error += `\nTo prevent accidental re-definition of a field by a subclass, `
                      error += `all annotated fields of non-plain objects (classes) are not configurable.`
                  }
              }
              die(error)
          }
      }
      */
      // Not annotated
      if ( !isOverride(annotation) && hasProp(adm.appliedAnnotations_, key)) {
        var fieldName = adm.name_ + "." + key.toString();
        var currentAnnotationType = adm.appliedAnnotations_[key].annotationType_;
        var requestedAnnotationType = annotation.annotationType_;
        die("Cannot apply '" + requestedAnnotationType + "' to '" + fieldName + "':" + ("\nThe field is already annotated with '" + currentAnnotationType + "'.") + "\nRe-annotating fields is not allowed." + "\nUse 'override' annotation for methods overridden by subclass.");
      }
    }

    // Bug in safari 9.* (or iOS 9 safari mobile). See #364
    var ENTRY_0 = /*#__PURE__*/createArrayEntryDescriptor(0);
    var safariPrototypeSetterInheritanceBug = /*#__PURE__*/function () {
      var v = false;
      var p = {};
      Object.defineProperty(p, "0", {
        set: function set() {
          v = true;
        }
      });
      /*#__PURE__*/Object.create(p)["0"] = 1;
      return v === false;
    }();
    /**
     * This array buffer contains two lists of properties, so that all arrays
     * can recycle their property definitions, which significantly improves performance of creating
     * properties on the fly.
     */
    var OBSERVABLE_ARRAY_BUFFER_SIZE = 0;
    // Typescript workaround to make sure ObservableArray extends Array
    var StubArray = function StubArray() {};
    function inherit(ctor, proto) {
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(ctor.prototype, proto);
      } else if (ctor.prototype.__proto__ !== undefined) {
        ctor.prototype.__proto__ = proto;
      } else {
        ctor.prototype = proto;
      }
    }
    inherit(StubArray, Array.prototype);
    // Weex proto freeze protection was here,
    // but it is unclear why the hack is need as MobX never changed the prototype
    // anyway, so removed it in V6
    var LegacyObservableArray = /*#__PURE__*/function (_StubArray, _Symbol$toStringTag, _Symbol$iterator) {
      _inheritsLoose(LegacyObservableArray, _StubArray);
      function LegacyObservableArray(initialValues, enhancer, name, owned) {
        var _this;
        if (name === void 0) {
          name =  "ObservableArray@" + getNextId() ;
        }
        if (owned === void 0) {
          owned = false;
        }
        _this = _StubArray.call(this) || this;
        initObservable(function () {
          var adm = new ObservableArrayAdministration(name, enhancer, owned, true);
          adm.proxy_ = _assertThisInitialized(_this);
          addHiddenFinalProp(_assertThisInitialized(_this), $mobx, adm);
          if (initialValues && initialValues.length) {
            // @ts-ignore
            _this.spliceWithArray(0, 0, initialValues);
          }
          if (safariPrototypeSetterInheritanceBug) {
            // Seems that Safari won't use numeric prototype setter untill any * numeric property is
            // defined on the instance. After that it works fine, even if this property is deleted.
            Object.defineProperty(_assertThisInitialized(_this), "0", ENTRY_0);
          }
        });
        return _this;
      }
      var _proto = LegacyObservableArray.prototype;
      _proto.concat = function concat() {
        this[$mobx].atom_.reportObserved();
        for (var _len = arguments.length, arrays = new Array(_len), _key = 0; _key < _len; _key++) {
          arrays[_key] = arguments[_key];
        }
        return Array.prototype.concat.apply(this.slice(),
        //@ts-ignore
        arrays.map(function (a) {
          return isObservableArray(a) ? a.slice() : a;
        }));
      };
      _proto[_Symbol$iterator] = function () {
        var self = this;
        var nextIndex = 0;
        return makeIterable({
          next: function next() {
            return nextIndex < self.length ? {
              value: self[nextIndex++],
              done: false
            } : {
              done: true,
              value: undefined
            };
          }
        });
      };
      _createClass(LegacyObservableArray, [{
        key: "length",
        get: function get() {
          return this[$mobx].getArrayLength_();
        },
        set: function set(newLength) {
          this[$mobx].setArrayLength_(newLength);
        }
      }, {
        key: _Symbol$toStringTag,
        get: function get() {
          return "Array";
        }
      }]);
      return LegacyObservableArray;
    }(StubArray, Symbol.toStringTag, Symbol.iterator);
    Object.entries(arrayExtensions).forEach(function (_ref) {
      var prop = _ref[0],
        fn = _ref[1];
      if (prop !== "concat") {
        addHiddenProp(LegacyObservableArray.prototype, prop, fn);
      }
    });
    function createArrayEntryDescriptor(index) {
      return {
        enumerable: false,
        configurable: true,
        get: function get() {
          return this[$mobx].get_(index);
        },
        set: function set(value) {
          this[$mobx].set_(index, value);
        }
      };
    }
    function createArrayBufferItem(index) {
      defineProperty(LegacyObservableArray.prototype, "" + index, createArrayEntryDescriptor(index));
    }
    function reserveArrayBuffer(max) {
      if (max > OBSERVABLE_ARRAY_BUFFER_SIZE) {
        for (var index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max + 100; index++) {
          createArrayBufferItem(index);
        }
        OBSERVABLE_ARRAY_BUFFER_SIZE = max;
      }
    }
    reserveArrayBuffer(1000);
    function createLegacyArray(initialValues, enhancer, name) {
      return new LegacyObservableArray(initialValues, enhancer, name);
    }

    function getAtom(thing, property) {
      if (typeof thing === "object" && thing !== null) {
        if (isObservableArray(thing)) {
          if (property !== undefined) {
            die(23);
          }
          return thing[$mobx].atom_;
        }
        if (isObservableSet(thing)) {
          return thing.atom_;
        }
        if (isObservableMap(thing)) {
          if (property === undefined) {
            return thing.keysAtom_;
          }
          var observable = thing.data_.get(property) || thing.hasMap_.get(property);
          if (!observable) {
            die(25, property, getDebugName(thing));
          }
          return observable;
        }
        if (isObservableObject(thing)) {
          if (!property) {
            return die(26);
          }
          var _observable = thing[$mobx].values_.get(property);
          if (!_observable) {
            die(27, property, getDebugName(thing));
          }
          return _observable;
        }
        if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
          return thing;
        }
      } else if (isFunction(thing)) {
        if (isReaction(thing[$mobx])) {
          // disposer function
          return thing[$mobx];
        }
      }
      die(28);
    }
    function getAdministration(thing, property) {
      if (!thing) {
        die(29);
      }
      if (property !== undefined) {
        return getAdministration(getAtom(thing, property));
      }
      if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
        return thing;
      }
      if (isObservableMap(thing) || isObservableSet(thing)) {
        return thing;
      }
      if (thing[$mobx]) {
        return thing[$mobx];
      }
      die(24, thing);
    }
    function getDebugName(thing, property) {
      var named;
      if (property !== undefined) {
        named = getAtom(thing, property);
      } else if (isAction(thing)) {
        return thing.name;
      } else if (isObservableObject(thing) || isObservableMap(thing) || isObservableSet(thing)) {
        named = getAdministration(thing);
      } else {
        // valid for arrays as well
        named = getAtom(thing);
      }
      return named.name_;
    }
    /**
     * Helper function for initializing observable structures, it applies:
     * 1. allowStateChanges so we don't violate enforceActions.
     * 2. untracked so we don't accidentaly subscribe to anything observable accessed during init in case the observable is created inside derivation.
     * 3. batch to avoid state version updates
     */
    function initObservable(cb) {
      var derivation = untrackedStart();
      var allowStateChanges = allowStateChangesStart(true);
      startBatch();
      try {
        return cb();
      } finally {
        endBatch();
        allowStateChangesEnd(allowStateChanges);
        untrackedEnd(derivation);
      }
    }

    var toString = objectPrototype.toString;
    function deepEqual(a, b, depth) {
      if (depth === void 0) {
        depth = -1;
      }
      return eq(a, b, depth);
    }
    // Copied from https://github.com/jashkenas/underscore/blob/5c237a7c682fb68fd5378203f0bf22dce1624854/underscore.js#L1186-L1289
    // Internal recursive comparison function for `isEqual`.
    function eq(a, b, depth, aStack, bStack) {
      // Identical objects are equal. `0 === -0`, but they aren't identical.
      // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
      if (a === b) {
        return a !== 0 || 1 / a === 1 / b;
      }
      // `null` or `undefined` only equal to itself (strict comparison).
      if (a == null || b == null) {
        return false;
      }
      // `NaN`s are equivalent, but non-reflexive.
      if (a !== a) {
        return b !== b;
      }
      // Exhaust primitive checks
      var type = typeof a;
      if (type !== "function" && type !== "object" && typeof b != "object") {
        return false;
      }
      // Compare `[[Class]]` names.
      var className = toString.call(a);
      if (className !== toString.call(b)) {
        return false;
      }
      switch (className) {
        // Strings, numbers, regular expressions, dates, and booleans are compared by value.
        case "[object RegExp]":
        // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
        case "[object String]":
          // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
          // equivalent to `new String("5")`.
          return "" + a === "" + b;
        case "[object Number]":
          // `NaN`s are equivalent, but non-reflexive.
          // Object(NaN) is equivalent to NaN.
          if (+a !== +a) {
            return +b !== +b;
          }
          // An `egal` comparison is performed for other numeric values.
          return +a === 0 ? 1 / +a === 1 / b : +a === +b;
        case "[object Date]":
        case "[object Boolean]":
          // Coerce dates and booleans to numeric primitive values. Dates are compared by their
          // millisecond representations. Note that invalid dates with millisecond representations
          // of `NaN` are not equivalent.
          return +a === +b;
        case "[object Symbol]":
          return typeof Symbol !== "undefined" && Symbol.valueOf.call(a) === Symbol.valueOf.call(b);
        case "[object Map]":
        case "[object Set]":
          // Maps and Sets are unwrapped to arrays of entry-pairs, adding an incidental level.
          // Hide this extra level by increasing the depth.
          if (depth >= 0) {
            depth++;
          }
          break;
      }
      // Unwrap any wrapped objects.
      a = unwrap(a);
      b = unwrap(b);
      var areArrays = className === "[object Array]";
      if (!areArrays) {
        if (typeof a != "object" || typeof b != "object") {
          return false;
        }
        // Objects with different constructors are not equivalent, but `Object`s or `Array`s
        // from different frames are.
        var aCtor = a.constructor,
          bCtor = b.constructor;
        if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor && isFunction(bCtor) && bCtor instanceof bCtor) && "constructor" in a && "constructor" in b) {
          return false;
        }
      }
      if (depth === 0) {
        return false;
      } else if (depth < 0) {
        depth = -1;
      }
      // Assume equality for cyclic structures. The algorithm for detecting cyclic
      // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
      // Initializing stack of traversed objects.
      // It's done here since we only need them for objects and arrays comparison.
      aStack = aStack || [];
      bStack = bStack || [];
      var length = aStack.length;
      while (length--) {
        // Linear search. Performance is inversely proportional to the number of
        // unique nested structures.
        if (aStack[length] === a) {
          return bStack[length] === b;
        }
      }
      // Add the first object to the stack of traversed objects.
      aStack.push(a);
      bStack.push(b);
      // Recursively compare objects and arrays.
      if (areArrays) {
        // Compare array lengths to determine if a deep comparison is necessary.
        length = a.length;
        if (length !== b.length) {
          return false;
        }
        // Deep compare the contents, ignoring non-numeric properties.
        while (length--) {
          if (!eq(a[length], b[length], depth - 1, aStack, bStack)) {
            return false;
          }
        }
      } else {
        // Deep compare objects.
        var keys = Object.keys(a);
        var key;
        length = keys.length;
        // Ensure that both objects contain the same number of properties before comparing deep equality.
        if (Object.keys(b).length !== length) {
          return false;
        }
        while (length--) {
          // Deep compare each member
          key = keys[length];
          if (!(hasProp(b, key) && eq(a[key], b[key], depth - 1, aStack, bStack))) {
            return false;
          }
        }
      }
      // Remove the first object from the stack of traversed objects.
      aStack.pop();
      bStack.pop();
      return true;
    }
    function unwrap(a) {
      if (isObservableArray(a)) {
        return a.slice();
      }
      if (isES6Map(a) || isObservableMap(a)) {
        return Array.from(a.entries());
      }
      if (isES6Set(a) || isObservableSet(a)) {
        return Array.from(a.entries());
      }
      return a;
    }

    function makeIterable(iterator) {
      iterator[Symbol.iterator] = getSelf;
      return iterator;
    }
    function getSelf() {
      return this;
    }

    function isAnnotation(thing) {
      return (
        // Can be function
        thing instanceof Object && typeof thing.annotationType_ === "string" && isFunction(thing.make_) && isFunction(thing.extend_)
      );
    }

    /**
     * (c) Michel Weststrate 2015 - 2020
     * MIT Licensed
     *
     * Welcome to the mobx sources! To get a global overview of how MobX internally works,
     * this is a good place to start:
     * https://medium.com/@mweststrate/becoming-fully-reactive-an-in-depth-explanation-of-mobservable-55995262a254#.xvbh6qd74
     *
     * Source folders:
     * ===============
     *
     * - api/     Most of the public static methods exposed by the module can be found here.
     * - core/    Implementation of the MobX algorithm; atoms, derivations, reactions, dependency trees, optimizations. Cool stuff can be found here.
     * - types/   All the magic that is need to have observable objects, arrays and values is in this folder. Including the modifiers like `asFlat`.
     * - utils/   Utility stuff.
     *
     */
    ["Symbol", "Map", "Set"].forEach(function (m) {
      var g = getGlobal();
      if (typeof g[m] === "undefined") {
        die("MobX requires global '" + m + "' to be available or polyfilled");
      }
    });
    if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
      // See: https://github.com/andykog/mobx-devtools/
      __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
        spy: spy,
        extras: {
          getDebugName: getDebugName
        },
        $mobx: $mobx
      });
    }

    exports.$mobx = $mobx;
    exports.FlowCancellationError = FlowCancellationError;
    exports.ObservableMap = ObservableMap;
    exports.ObservableSet = ObservableSet;
    exports.Reaction = Reaction;
    exports._allowStateChanges = allowStateChanges;
    exports._allowStateChangesInsideComputed = runInAction;
    exports._allowStateReadsEnd = allowStateReadsEnd;
    exports._allowStateReadsStart = allowStateReadsStart;
    exports._autoAction = autoAction;
    exports._endAction = _endAction;
    exports._getAdministration = getAdministration;
    exports._getGlobalState = getGlobalState;
    exports._interceptReads = interceptReads;
    exports._isComputingDerivation = isComputingDerivation;
    exports._resetGlobalState = resetGlobalState;
    exports._startAction = _startAction;
    exports.action = action;
    exports.autorun = autorun;
    exports.comparer = comparer;
    exports.computed = computed;
    exports.configure = configure;
    exports.createAtom = createAtom;
    exports.defineProperty = apiDefineProperty;
    exports.entries = entries;
    exports.extendObservable = extendObservable;
    exports.flow = flow;
    exports.flowResult = flowResult;
    exports.get = get;
    exports.getAtom = getAtom;
    exports.getDebugName = getDebugName;
    exports.getDependencyTree = getDependencyTree;
    exports.getObserverTree = getObserverTree;
    exports.has = has;
    exports.intercept = intercept;
    exports.isAction = isAction;
    exports.isBoxedObservable = isObservableValue;
    exports.isComputed = isComputed;
    exports.isComputedProp = isComputedProp;
    exports.isFlow = isFlow;
    exports.isFlowCancellationError = isFlowCancellationError;
    exports.isObservable = isObservable;
    exports.isObservableArray = isObservableArray;
    exports.isObservableMap = isObservableMap;
    exports.isObservableObject = isObservableObject;
    exports.isObservableProp = isObservableProp;
    exports.isObservableSet = isObservableSet;
    exports.keys = keys;
    exports.makeAutoObservable = makeAutoObservable;
    exports.makeObservable = makeObservable;
    exports.observable = observable;
    exports.observe = observe;
    exports.onBecomeObserved = onBecomeObserved;
    exports.onBecomeUnobserved = onBecomeUnobserved;
    exports.onReactionError = onReactionError;
    exports.override = override;
    exports.ownKeys = apiOwnKeys;
    exports.reaction = reaction;
    exports.remove = remove;
    exports.runInAction = runInAction;
    exports.set = set;
    exports.spy = spy;
    exports.toJS = toJS;
    exports.trace = trace;
    exports.transaction = transaction;
    exports.untracked = untracked;
    exports.values = values;
    exports.when = when;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=mobx.umd.development.js.map

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.MirageJS = global.MirageJS || {}, global.MirageJS.Server = {})));
})(this, (function (exports) { 'use strict';

  function ownKeys$1(object, enumerableOnly) {
    var keys = Object.keys(object);

    if (Object.getOwnPropertySymbols) {
      var symbols = Object.getOwnPropertySymbols(object);

      if (enumerableOnly) {
        symbols = symbols.filter(function (sym) {
          return Object.getOwnPropertyDescriptor(object, sym).enumerable;
        });
      }

      keys.push.apply(keys, symbols);
    }

    return keys;
  }

  function _objectSpread2(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};

      if (i % 2) {
        ownKeys$1(Object(source), true).forEach(function (key) {
          _defineProperty$1(target, key, source[key]);
        });
      } else if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
      } else {
        ownKeys$1(Object(source)).forEach(function (key) {
          Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
      }
    }

    return target;
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function (obj) {
        return typeof obj;
      };
    } else {
      _typeof = function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty$1(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (_isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError("Derived constructors may only return object or undefined");
    }

    return _assertThisInitialized(self);
  }

  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();

    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived),
          result;

      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;

        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }

      return _possibleConstructorReturn(this, result);
    };
  }

  function _slicedToArray(arr, i) {
    return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest();
  }

  function _toArray(arr) {
    return _arrayWithHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableRest();
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _arrayWithHoles(arr) {
    if (Array.isArray(arr)) return arr;
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter);
  }

  function _iterableToArrayLimit(arr, i) {
    var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"];

    if (_i == null) return;
    var _arr = [];
    var _n = true;
    var _d = false;

    var _s, _e;

    try {
      for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"] != null) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
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

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _nonIterableRest() {
    throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  var commonjsGlobal$1 = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var check = function (it) {
    return it && it.Math == Math && it;
  };

  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global_1 =
    // eslint-disable-next-line es/no-global-this -- safe
    check(typeof globalThis == 'object' && globalThis) ||
    check(typeof window == 'object' && window) ||
    // eslint-disable-next-line no-restricted-globals -- safe
    check(typeof self == 'object' && self) ||
    check(typeof commonjsGlobal$1 == 'object' && commonjsGlobal$1) ||
    // eslint-disable-next-line no-new-func -- fallback
    (function () { return this; })() || Function('return this')();

  var fails = function (exec) {
    try {
      return !!exec();
    } catch (error) {
      return true;
    }
  };

  // Detect IE8's incomplete defineProperty implementation
  var descriptors = !fails(function () {
    // eslint-disable-next-line es/no-object-defineproperty -- required for testing
    return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] != 7;
  });

  var $propertyIsEnumerable = {}.propertyIsEnumerable;
  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var getOwnPropertyDescriptor$3 = Object.getOwnPropertyDescriptor;

  // Nashorn ~ JDK8 bug
  var NASHORN_BUG = getOwnPropertyDescriptor$3 && !$propertyIsEnumerable.call({ 1: 2 }, 1);

  // `Object.prototype.propertyIsEnumerable` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
  var f$6 = NASHORN_BUG ? function propertyIsEnumerable(V) {
    var descriptor = getOwnPropertyDescriptor$3(this, V);
    return !!descriptor && descriptor.enumerable;
  } : $propertyIsEnumerable;

  var objectPropertyIsEnumerable = {
  	f: f$6
  };

  var createPropertyDescriptor = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };

  var toString$4 = {}.toString;

  var classofRaw = function (it) {
    return toString$4.call(it).slice(8, -1);
  };

  var split = ''.split;

  // fallback for non-array-like ES3 and non-enumerable old V8 strings
  var indexedObject = fails(function () {
    // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
    // eslint-disable-next-line no-prototype-builtins -- safe
    return !Object('z').propertyIsEnumerable(0);
  }) ? function (it) {
    return classofRaw(it) == 'String' ? split.call(it, '') : Object(it);
  } : Object;

  // `RequireObjectCoercible` abstract operation
  // https://tc39.es/ecma262/#sec-requireobjectcoercible
  var requireObjectCoercible = function (it) {
    if (it == undefined) throw TypeError("Can't call method on " + it);
    return it;
  };

  // toObject with fallback for non-array-like ES3 strings



  var toIndexedObject = function (it) {
    return indexedObject(requireObjectCoercible(it));
  };

  // `IsCallable` abstract operation
  // https://tc39.es/ecma262/#sec-iscallable
  var isCallable = function (argument) {
    return typeof argument === 'function';
  };

  var isObject$1 = function (it) {
    return typeof it === 'object' ? it !== null : isCallable(it);
  };

  var aFunction = function (argument) {
    return isCallable(argument) ? argument : undefined;
  };

  var getBuiltIn = function (namespace, method) {
    return arguments.length < 2 ? aFunction(global_1[namespace]) : global_1[namespace] && global_1[namespace][method];
  };

  var engineUserAgent = getBuiltIn('navigator', 'userAgent') || '';

  var process$3 = global_1.process;
  var Deno = global_1.Deno;
  var versions = process$3 && process$3.versions || Deno && Deno.version;
  var v8 = versions && versions.v8;
  var match, version;

  if (v8) {
    match = v8.split('.');
    version = match[0] < 4 ? 1 : match[0] + match[1];
  } else if (engineUserAgent) {
    match = engineUserAgent.match(/Edge\/(\d+)/);
    if (!match || match[1] >= 74) {
      match = engineUserAgent.match(/Chrome\/(\d+)/);
      if (match) version = match[1];
    }
  }

  var engineV8Version = version && +version;

  /* eslint-disable es/no-symbol -- required for testing */



  // eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
  var nativeSymbol = !!Object.getOwnPropertySymbols && !fails(function () {
    var symbol = Symbol();
    // Chrome 38 Symbol has incorrect toString conversion
    // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
    return !String(symbol) || !(Object(symbol) instanceof Symbol) ||
      // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
      !Symbol.sham && engineV8Version && engineV8Version < 41;
  });

  /* eslint-disable es/no-symbol -- required for testing */


  var useSymbolAsUid = nativeSymbol
    && !Symbol.sham
    && typeof Symbol.iterator == 'symbol';

  var isSymbol$1 = useSymbolAsUid ? function (it) {
    return typeof it == 'symbol';
  } : function (it) {
    var $Symbol = getBuiltIn('Symbol');
    return isCallable($Symbol) && Object(it) instanceof $Symbol;
  };

  var tryToString = function (argument) {
    try {
      return String(argument);
    } catch (error) {
      return 'Object';
    }
  };

  // `Assert: IsCallable(argument) is true`
  var aCallable = function (argument) {
    if (isCallable(argument)) return argument;
    throw TypeError(tryToString(argument) + ' is not a function');
  };

  // `GetMethod` abstract operation
  // https://tc39.es/ecma262/#sec-getmethod
  var getMethod = function (V, P) {
    var func = V[P];
    return func == null ? undefined : aCallable(func);
  };

  // `OrdinaryToPrimitive` abstract operation
  // https://tc39.es/ecma262/#sec-ordinarytoprimitive
  var ordinaryToPrimitive = function (input, pref) {
    var fn, val;
    if (pref === 'string' && isCallable(fn = input.toString) && !isObject$1(val = fn.call(input))) return val;
    if (isCallable(fn = input.valueOf) && !isObject$1(val = fn.call(input))) return val;
    if (pref !== 'string' && isCallable(fn = input.toString) && !isObject$1(val = fn.call(input))) return val;
    throw TypeError("Can't convert object to primitive value");
  };

  var setGlobal = function (key, value) {
    try {
      // eslint-disable-next-line es/no-object-defineproperty -- safe
      Object.defineProperty(global_1, key, { value: value, configurable: true, writable: true });
    } catch (error) {
      global_1[key] = value;
    } return value;
  };

  var SHARED = '__core-js_shared__';
  var store$1 = global_1[SHARED] || setGlobal(SHARED, {});

  var sharedStore = store$1;

  var shared = createCommonjsModule(function (module) {
  (module.exports = function (key, value) {
    return sharedStore[key] || (sharedStore[key] = value !== undefined ? value : {});
  })('versions', []).push({
    version: '3.18.1',
    mode: 'global',
    copyright: '© 2021 Denis Pushkarev (zloirock.ru)'
  });
  });

  // `ToObject` abstract operation
  // https://tc39.es/ecma262/#sec-toobject
  var toObject = function (argument) {
    return Object(requireObjectCoercible(argument));
  };

  var hasOwnProperty$h = {}.hasOwnProperty;

  var has$3 = Object.hasOwn || function hasOwn(it, key) {
    return hasOwnProperty$h.call(toObject(it), key);
  };

  var id = 0;
  var postfix = Math.random();

  var uid = function (key) {
    return 'Symbol(' + String(key === undefined ? '' : key) + ')_' + (++id + postfix).toString(36);
  };

  var WellKnownSymbolsStore = shared('wks');
  var Symbol$2 = global_1.Symbol;
  var createWellKnownSymbol = useSymbolAsUid ? Symbol$2 : Symbol$2 && Symbol$2.withoutSetter || uid;

  var wellKnownSymbol = function (name) {
    if (!has$3(WellKnownSymbolsStore, name) || !(nativeSymbol || typeof WellKnownSymbolsStore[name] == 'string')) {
      if (nativeSymbol && has$3(Symbol$2, name)) {
        WellKnownSymbolsStore[name] = Symbol$2[name];
      } else {
        WellKnownSymbolsStore[name] = createWellKnownSymbol('Symbol.' + name);
      }
    } return WellKnownSymbolsStore[name];
  };

  var TO_PRIMITIVE = wellKnownSymbol('toPrimitive');

  // `ToPrimitive` abstract operation
  // https://tc39.es/ecma262/#sec-toprimitive
  var toPrimitive = function (input, pref) {
    if (!isObject$1(input) || isSymbol$1(input)) return input;
    var exoticToPrim = getMethod(input, TO_PRIMITIVE);
    var result;
    if (exoticToPrim) {
      if (pref === undefined) pref = 'default';
      result = exoticToPrim.call(input, pref);
      if (!isObject$1(result) || isSymbol$1(result)) return result;
      throw TypeError("Can't convert object to primitive value");
    }
    if (pref === undefined) pref = 'number';
    return ordinaryToPrimitive(input, pref);
  };

  // `ToPropertyKey` abstract operation
  // https://tc39.es/ecma262/#sec-topropertykey
  var toPropertyKey = function (argument) {
    var key = toPrimitive(argument, 'string');
    return isSymbol$1(key) ? key : String(key);
  };

  var document$3 = global_1.document;
  // typeof document.createElement is 'object' in old IE
  var EXISTS$1 = isObject$1(document$3) && isObject$1(document$3.createElement);

  var documentCreateElement = function (it) {
    return EXISTS$1 ? document$3.createElement(it) : {};
  };

  // Thank's IE8 for his funny defineProperty
  var ie8DomDefine = !descriptors && !fails(function () {
    // eslint-disable-next-line es/no-object-defineproperty -- requied for testing
    return Object.defineProperty(documentCreateElement('div'), 'a', {
      get: function () { return 7; }
    }).a != 7;
  });

  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

  // `Object.getOwnPropertyDescriptor` method
  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
  var f$5 = descriptors ? $getOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
    O = toIndexedObject(O);
    P = toPropertyKey(P);
    if (ie8DomDefine) try {
      return $getOwnPropertyDescriptor(O, P);
    } catch (error) { /* empty */ }
    if (has$3(O, P)) return createPropertyDescriptor(!objectPropertyIsEnumerable.f.call(O, P), O[P]);
  };

  var objectGetOwnPropertyDescriptor = {
  	f: f$5
  };

  // `Assert: Type(argument) is Object`
  var anObject = function (argument) {
    if (isObject$1(argument)) return argument;
    throw TypeError(String(argument) + ' is not an object');
  };

  // eslint-disable-next-line es/no-object-defineproperty -- safe
  var $defineProperty = Object.defineProperty;

  // `Object.defineProperty` method
  // https://tc39.es/ecma262/#sec-object.defineproperty
  var f$4 = descriptors ? $defineProperty : function defineProperty(O, P, Attributes) {
    anObject(O);
    P = toPropertyKey(P);
    anObject(Attributes);
    if (ie8DomDefine) try {
      return $defineProperty(O, P, Attributes);
    } catch (error) { /* empty */ }
    if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };

  var objectDefineProperty = {
  	f: f$4
  };

  var createNonEnumerableProperty = descriptors ? function (object, key, value) {
    return objectDefineProperty.f(object, key, createPropertyDescriptor(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };

  var functionToString = Function.toString;

  // this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
  if (!isCallable(sharedStore.inspectSource)) {
    sharedStore.inspectSource = function (it) {
      return functionToString.call(it);
    };
  }

  var inspectSource = sharedStore.inspectSource;

  var WeakMap$2 = global_1.WeakMap;

  var nativeWeakMap = isCallable(WeakMap$2) && /native code/.test(inspectSource(WeakMap$2));

  var keys$1 = shared('keys');

  var sharedKey = function (key) {
    return keys$1[key] || (keys$1[key] = uid(key));
  };

  var hiddenKeys$1 = {};

  var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
  var WeakMap$1 = global_1.WeakMap;
  var set$2, get$1, has$2;

  var enforce = function (it) {
    return has$2(it) ? get$1(it) : set$2(it, {});
  };

  var getterFor = function (TYPE) {
    return function (it) {
      var state;
      if (!isObject$1(it) || (state = get$1(it)).type !== TYPE) {
        throw TypeError('Incompatible receiver, ' + TYPE + ' required');
      } return state;
    };
  };

  if (nativeWeakMap || sharedStore.state) {
    var store = sharedStore.state || (sharedStore.state = new WeakMap$1());
    var wmget = store.get;
    var wmhas = store.has;
    var wmset = store.set;
    set$2 = function (it, metadata) {
      if (wmhas.call(store, it)) throw new TypeError(OBJECT_ALREADY_INITIALIZED);
      metadata.facade = it;
      wmset.call(store, it, metadata);
      return metadata;
    };
    get$1 = function (it) {
      return wmget.call(store, it) || {};
    };
    has$2 = function (it) {
      return wmhas.call(store, it);
    };
  } else {
    var STATE = sharedKey('state');
    hiddenKeys$1[STATE] = true;
    set$2 = function (it, metadata) {
      if (has$3(it, STATE)) throw new TypeError(OBJECT_ALREADY_INITIALIZED);
      metadata.facade = it;
      createNonEnumerableProperty(it, STATE, metadata);
      return metadata;
    };
    get$1 = function (it) {
      return has$3(it, STATE) ? it[STATE] : {};
    };
    has$2 = function (it) {
      return has$3(it, STATE);
    };
  }

  var internalState = {
    set: set$2,
    get: get$1,
    has: has$2,
    enforce: enforce,
    getterFor: getterFor
  };

  var FunctionPrototype$1 = Function.prototype;
  // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
  var getDescriptor = descriptors && Object.getOwnPropertyDescriptor;

  var EXISTS = has$3(FunctionPrototype$1, 'name');
  // additional protection from minified / mangled / dropped function names
  var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
  var CONFIGURABLE = EXISTS && (!descriptors || (descriptors && getDescriptor(FunctionPrototype$1, 'name').configurable));

  var functionName = {
    EXISTS: EXISTS,
    PROPER: PROPER,
    CONFIGURABLE: CONFIGURABLE
  };

  var redefine = createCommonjsModule(function (module) {
  var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;

  var getInternalState = internalState.get;
  var enforceInternalState = internalState.enforce;
  var TEMPLATE = String(String).split('String');

  (module.exports = function (O, key, value, options) {
    var unsafe = options ? !!options.unsafe : false;
    var simple = options ? !!options.enumerable : false;
    var noTargetGet = options ? !!options.noTargetGet : false;
    var name = options && options.name !== undefined ? options.name : key;
    var state;
    if (isCallable(value)) {
      if (String(name).slice(0, 7) === 'Symbol(') {
        name = '[' + String(name).replace(/^Symbol\(([^)]*)\)/, '$1') + ']';
      }
      if (!has$3(value, 'name') || (CONFIGURABLE_FUNCTION_NAME && value.name !== name)) {
        createNonEnumerableProperty(value, 'name', name);
      }
      state = enforceInternalState(value);
      if (!state.source) {
        state.source = TEMPLATE.join(typeof name == 'string' ? name : '');
      }
    }
    if (O === global_1) {
      if (simple) O[key] = value;
      else setGlobal(key, value);
      return;
    } else if (!unsafe) {
      delete O[key];
    } else if (!noTargetGet && O[key]) {
      simple = true;
    }
    if (simple) O[key] = value;
    else createNonEnumerableProperty(O, key, value);
  // add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
  })(Function.prototype, 'toString', function toString() {
    return isCallable(this) && getInternalState(this).source || inspectSource(this);
  });
  });

  var ceil = Math.ceil;
  var floor$2 = Math.floor;

  // `ToInteger` abstract operation
  // https://tc39.es/ecma262/#sec-tointeger
  var toInteger$1 = function (argument) {
    return isNaN(argument = +argument) ? 0 : (argument > 0 ? floor$2 : ceil)(argument);
  };

  var min$5 = Math.min;

  // `ToLength` abstract operation
  // https://tc39.es/ecma262/#sec-tolength
  var toLength = function (argument) {
    return argument > 0 ? min$5(toInteger$1(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
  };

  var max$3 = Math.max;
  var min$4 = Math.min;

  // Helper for a popular repeating case of the spec:
  // Let integer be ? ToInteger(index).
  // If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
  var toAbsoluteIndex = function (index, length) {
    var integer = toInteger$1(index);
    return integer < 0 ? max$3(integer + length, 0) : min$4(integer, length);
  };

  // `Array.prototype.{ indexOf, includes }` methods implementation
  var createMethod$3 = function (IS_INCLUDES) {
    return function ($this, el, fromIndex) {
      var O = toIndexedObject($this);
      var length = toLength(O.length);
      var index = toAbsoluteIndex(fromIndex, length);
      var value;
      // Array#includes uses SameValueZero equality algorithm
      // eslint-disable-next-line no-self-compare -- NaN check
      if (IS_INCLUDES && el != el) while (length > index) {
        value = O[index++];
        // eslint-disable-next-line no-self-compare -- NaN check
        if (value != value) return true;
      // Array#indexOf ignores holes, Array#includes - not
      } else for (;length > index; index++) {
        if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
      } return !IS_INCLUDES && -1;
    };
  };

  var arrayIncludes$1 = {
    // `Array.prototype.includes` method
    // https://tc39.es/ecma262/#sec-array.prototype.includes
    includes: createMethod$3(true),
    // `Array.prototype.indexOf` method
    // https://tc39.es/ecma262/#sec-array.prototype.indexof
    indexOf: createMethod$3(false)
  };

  var indexOf = arrayIncludes$1.indexOf;


  var objectKeysInternal = function (object, names) {
    var O = toIndexedObject(object);
    var i = 0;
    var result = [];
    var key;
    for (key in O) !has$3(hiddenKeys$1, key) && has$3(O, key) && result.push(key);
    // Don't enum bug & hidden keys
    while (names.length > i) if (has$3(O, key = names[i++])) {
      ~indexOf(result, key) || result.push(key);
    }
    return result;
  };

  // IE8- don't enum bug keys
  var enumBugKeys = [
    'constructor',
    'hasOwnProperty',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toLocaleString',
    'toString',
    'valueOf'
  ];

  var hiddenKeys = enumBugKeys.concat('length', 'prototype');

  // `Object.getOwnPropertyNames` method
  // https://tc39.es/ecma262/#sec-object.getownpropertynames
  // eslint-disable-next-line es/no-object-getownpropertynames -- safe
  var f$3 = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return objectKeysInternal(O, hiddenKeys);
  };

  var objectGetOwnPropertyNames = {
  	f: f$3
  };

  // eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
  var f$2 = Object.getOwnPropertySymbols;

  var objectGetOwnPropertySymbols = {
  	f: f$2
  };

  // all object keys, includes non-enumerable and symbols
  var ownKeys = getBuiltIn('Reflect', 'ownKeys') || function ownKeys(it) {
    var keys = objectGetOwnPropertyNames.f(anObject(it));
    var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
    return getOwnPropertySymbols ? keys.concat(getOwnPropertySymbols(it)) : keys;
  };

  var copyConstructorProperties = function (target, source) {
    var keys = ownKeys(source);
    var defineProperty = objectDefineProperty.f;
    var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!has$3(target, key)) defineProperty(target, key, getOwnPropertyDescriptor(source, key));
    }
  };

  var replacement = /#|\.prototype\./;

  var isForced = function (feature, detection) {
    var value = data[normalize(feature)];
    return value == POLYFILL ? true
      : value == NATIVE ? false
      : isCallable(detection) ? fails(detection)
      : !!detection;
  };

  var normalize = isForced.normalize = function (string) {
    return String(string).replace(replacement, '.').toLowerCase();
  };

  var data = isForced.data = {};
  var NATIVE = isForced.NATIVE = 'N';
  var POLYFILL = isForced.POLYFILL = 'P';

  var isForced_1 = isForced;

  var getOwnPropertyDescriptor$2 = objectGetOwnPropertyDescriptor.f;






  /*
    options.target      - name of the target object
    options.global      - target is the global object
    options.stat        - export as static methods of target
    options.proto       - export as prototype methods of target
    options.real        - real prototype method for the `pure` version
    options.forced      - export even if the native feature is available
    options.bind        - bind methods to the target, required for the `pure` version
    options.wrap        - wrap constructors to preventing global pollution, required for the `pure` version
    options.unsafe      - use the simple assignment of property instead of delete + defineProperty
    options.sham        - add a flag to not completely full polyfills
    options.enumerable  - export as enumerable property
    options.noTargetGet - prevent calling a getter on target
    options.name        - the .name of the function if it does not match the key
  */
  var _export = function (options, source) {
    var TARGET = options.target;
    var GLOBAL = options.global;
    var STATIC = options.stat;
    var FORCED, target, key, targetProperty, sourceProperty, descriptor;
    if (GLOBAL) {
      target = global_1;
    } else if (STATIC) {
      target = global_1[TARGET] || setGlobal(TARGET, {});
    } else {
      target = (global_1[TARGET] || {}).prototype;
    }
    if (target) for (key in source) {
      sourceProperty = source[key];
      if (options.noTargetGet) {
        descriptor = getOwnPropertyDescriptor$2(target, key);
        targetProperty = descriptor && descriptor.value;
      } else targetProperty = target[key];
      FORCED = isForced_1(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
      // contained in target
      if (!FORCED && targetProperty !== undefined) {
        if (typeof sourceProperty === typeof targetProperty) continue;
        copyConstructorProperties(sourceProperty, targetProperty);
      }
      // add a flag to not completely full polyfills
      if (options.sham || (targetProperty && targetProperty.sham)) {
        createNonEnumerableProperty(sourceProperty, 'sham', true);
      }
      // extend global
      redefine(target, key, sourceProperty, options);
    }
  };

  // `Object.keys` method
  // https://tc39.es/ecma262/#sec-object.keys
  // eslint-disable-next-line es/no-object-keys -- safe
  var objectKeys = Object.keys || function keys(O) {
    return objectKeysInternal(O, enumBugKeys);
  };

  // eslint-disable-next-line es/no-object-assign -- safe
  var $assign = Object.assign;
  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
  var defineProperty$4 = Object.defineProperty;

  // `Object.assign` method
  // https://tc39.es/ecma262/#sec-object.assign
  var objectAssign = !$assign || fails(function () {
    // should have correct order of operations (Edge bug)
    if (descriptors && $assign({ b: 1 }, $assign(defineProperty$4({}, 'a', {
      enumerable: true,
      get: function () {
        defineProperty$4(this, 'b', {
          value: 3,
          enumerable: false
        });
      }
    }), { b: 2 })).b !== 1) return true;
    // should work with symbols and should have deterministic property order (V8 bug)
    var A = {};
    var B = {};
    // eslint-disable-next-line es/no-symbol -- safe
    var symbol = Symbol();
    var alphabet = 'abcdefghijklmnopqrst';
    A[symbol] = 7;
    alphabet.split('').forEach(function (chr) { B[chr] = chr; });
    return $assign({}, A)[symbol] != 7 || objectKeys($assign({}, B)).join('') != alphabet;
  }) ? function assign(target, source) { // eslint-disable-line no-unused-vars -- required for `.length`
    var T = toObject(target);
    var argumentsLength = arguments.length;
    var index = 1;
    var getOwnPropertySymbols = objectGetOwnPropertySymbols.f;
    var propertyIsEnumerable = objectPropertyIsEnumerable.f;
    while (argumentsLength > index) {
      var S = indexedObject(arguments[index++]);
      var keys = getOwnPropertySymbols ? objectKeys(S).concat(getOwnPropertySymbols(S)) : objectKeys(S);
      var length = keys.length;
      var j = 0;
      var key;
      while (length > j) {
        key = keys[j++];
        if (!descriptors || propertyIsEnumerable.call(S, key)) T[key] = S[key];
      }
    } return T;
  } : $assign;

  // `Object.assign` method
  // https://tc39.es/ecma262/#sec-object.assign
  // eslint-disable-next-line es/no-object-assign -- required for testing
  _export({ target: 'Object', stat: true, forced: Object.assign !== objectAssign }, {
    assign: objectAssign
  });

  // iterable DOM collections
  // flag - `iterable` interface - 'entries', 'keys', 'values', 'forEach' methods
  var domIterables = {
    CSSRuleList: 0,
    CSSStyleDeclaration: 0,
    CSSValueList: 0,
    ClientRectList: 0,
    DOMRectList: 0,
    DOMStringList: 0,
    DOMTokenList: 1,
    DataTransferItemList: 0,
    FileList: 0,
    HTMLAllCollection: 0,
    HTMLCollection: 0,
    HTMLFormElement: 0,
    HTMLSelectElement: 0,
    MediaList: 0,
    MimeTypeArray: 0,
    NamedNodeMap: 0,
    NodeList: 1,
    PaintRequestList: 0,
    Plugin: 0,
    PluginArray: 0,
    SVGLengthList: 0,
    SVGNumberList: 0,
    SVGPathSegList: 0,
    SVGPointList: 0,
    SVGStringList: 0,
    SVGTransformList: 0,
    SourceBufferList: 0,
    StyleSheetList: 0,
    TextTrackCueList: 0,
    TextTrackList: 0,
    TouchList: 0
  };

  // in old WebKit versions, `element.classList` is not an instance of global `DOMTokenList`


  var classList = documentCreateElement('span').classList;
  var DOMTokenListPrototype = classList && classList.constructor && classList.constructor.prototype;

  var domTokenListPrototype = DOMTokenListPrototype === Object.prototype ? undefined : DOMTokenListPrototype;

  // optional / simple context binding
  var functionBindContext = function (fn, that, length) {
    aCallable(fn);
    if (that === undefined) return fn;
    switch (length) {
      case 0: return function () {
        return fn.call(that);
      };
      case 1: return function (a) {
        return fn.call(that, a);
      };
      case 2: return function (a, b) {
        return fn.call(that, a, b);
      };
      case 3: return function (a, b, c) {
        return fn.call(that, a, b, c);
      };
    }
    return function (/* ...args */) {
      return fn.apply(that, arguments);
    };
  };

  // `IsArray` abstract operation
  // https://tc39.es/ecma262/#sec-isarray
  // eslint-disable-next-line es/no-array-isarray -- safe
  var isArray$3 = Array.isArray || function isArray(argument) {
    return classofRaw(argument) == 'Array';
  };

  var TO_STRING_TAG$3 = wellKnownSymbol('toStringTag');
  var test$1 = {};

  test$1[TO_STRING_TAG$3] = 'z';

  var toStringTagSupport = String(test$1) === '[object z]';

  var TO_STRING_TAG$2 = wellKnownSymbol('toStringTag');
  // ES3 wrong here
  var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) == 'Arguments';

  // fallback for IE11 Script Access Denied error
  var tryGet = function (it, key) {
    try {
      return it[key];
    } catch (error) { /* empty */ }
  };

  // getting tag from ES6+ `Object.prototype.toString`
  var classof = toStringTagSupport ? classofRaw : function (it) {
    var O, tag, result;
    return it === undefined ? 'Undefined' : it === null ? 'Null'
      // @@toStringTag case
      : typeof (tag = tryGet(O = Object(it), TO_STRING_TAG$2)) == 'string' ? tag
      // builtinTag case
      : CORRECT_ARGUMENTS ? classofRaw(O)
      // ES3 arguments fallback
      : (result = classofRaw(O)) == 'Object' && isCallable(O.callee) ? 'Arguments' : result;
  };

  var empty = [];
  var construct = getBuiltIn('Reflect', 'construct');
  var constructorRegExp = /^\s*(?:class|function)\b/;
  var exec = constructorRegExp.exec;
  var INCORRECT_TO_STRING = !constructorRegExp.exec(function () { /* empty */ });

  var isConstructorModern = function (argument) {
    if (!isCallable(argument)) return false;
    try {
      construct(Object, empty, argument);
      return true;
    } catch (error) {
      return false;
    }
  };

  var isConstructorLegacy = function (argument) {
    if (!isCallable(argument)) return false;
    switch (classof(argument)) {
      case 'AsyncFunction':
      case 'GeneratorFunction':
      case 'AsyncGeneratorFunction': return false;
      // we can't check .prototype since constructors produced by .bind haven't it
    } return INCORRECT_TO_STRING || !!exec.call(constructorRegExp, inspectSource(argument));
  };

  // `IsConstructor` abstract operation
  // https://tc39.es/ecma262/#sec-isconstructor
  var isConstructor = !construct || fails(function () {
    var called;
    return isConstructorModern(isConstructorModern.call)
      || !isConstructorModern(Object)
      || !isConstructorModern(function () { called = true; })
      || called;
  }) ? isConstructorLegacy : isConstructorModern;

  var SPECIES$6 = wellKnownSymbol('species');

  // a part of `ArraySpeciesCreate` abstract operation
  // https://tc39.es/ecma262/#sec-arrayspeciescreate
  var arraySpeciesConstructor = function (originalArray) {
    var C;
    if (isArray$3(originalArray)) {
      C = originalArray.constructor;
      // cross-realm fallback
      if (isConstructor(C) && (C === Array || isArray$3(C.prototype))) C = undefined;
      else if (isObject$1(C)) {
        C = C[SPECIES$6];
        if (C === null) C = undefined;
      }
    } return C === undefined ? Array : C;
  };

  // `ArraySpeciesCreate` abstract operation
  // https://tc39.es/ecma262/#sec-arrayspeciescreate
  var arraySpeciesCreate = function (originalArray, length) {
    return new (arraySpeciesConstructor(originalArray))(length === 0 ? 0 : length);
  };

  var push = [].push;

  // `Array.prototype.{ forEach, map, filter, some, every, find, findIndex, filterReject }` methods implementation
  var createMethod$2 = function (TYPE) {
    var IS_MAP = TYPE == 1;
    var IS_FILTER = TYPE == 2;
    var IS_SOME = TYPE == 3;
    var IS_EVERY = TYPE == 4;
    var IS_FIND_INDEX = TYPE == 6;
    var IS_FILTER_REJECT = TYPE == 7;
    var NO_HOLES = TYPE == 5 || IS_FIND_INDEX;
    return function ($this, callbackfn, that, specificCreate) {
      var O = toObject($this);
      var self = indexedObject(O);
      var boundFunction = functionBindContext(callbackfn, that, 3);
      var length = toLength(self.length);
      var index = 0;
      var create = specificCreate || arraySpeciesCreate;
      var target = IS_MAP ? create($this, length) : IS_FILTER || IS_FILTER_REJECT ? create($this, 0) : undefined;
      var value, result;
      for (;length > index; index++) if (NO_HOLES || index in self) {
        value = self[index];
        result = boundFunction(value, index, O);
        if (TYPE) {
          if (IS_MAP) target[index] = result; // map
          else if (result) switch (TYPE) {
            case 3: return true;              // some
            case 5: return value;             // find
            case 6: return index;             // findIndex
            case 2: push.call(target, value); // filter
          } else switch (TYPE) {
            case 4: return false;             // every
            case 7: push.call(target, value); // filterReject
          }
        }
      }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : target;
    };
  };

  var arrayIteration = {
    // `Array.prototype.forEach` method
    // https://tc39.es/ecma262/#sec-array.prototype.foreach
    forEach: createMethod$2(0),
    // `Array.prototype.map` method
    // https://tc39.es/ecma262/#sec-array.prototype.map
    map: createMethod$2(1),
    // `Array.prototype.filter` method
    // https://tc39.es/ecma262/#sec-array.prototype.filter
    filter: createMethod$2(2),
    // `Array.prototype.some` method
    // https://tc39.es/ecma262/#sec-array.prototype.some
    some: createMethod$2(3),
    // `Array.prototype.every` method
    // https://tc39.es/ecma262/#sec-array.prototype.every
    every: createMethod$2(4),
    // `Array.prototype.find` method
    // https://tc39.es/ecma262/#sec-array.prototype.find
    find: createMethod$2(5),
    // `Array.prototype.findIndex` method
    // https://tc39.es/ecma262/#sec-array.prototype.findIndex
    findIndex: createMethod$2(6),
    // `Array.prototype.filterReject` method
    // https://github.com/tc39/proposal-array-filtering
    filterReject: createMethod$2(7)
  };

  var arrayMethodIsStrict = function (METHOD_NAME, argument) {
    var method = [][METHOD_NAME];
    return !!method && fails(function () {
      // eslint-disable-next-line no-useless-call,no-throw-literal -- required for testing
      method.call(null, argument || function () { throw 1; }, 1);
    });
  };

  var $forEach = arrayIteration.forEach;


  var STRICT_METHOD$2 = arrayMethodIsStrict('forEach');

  // `Array.prototype.forEach` method implementation
  // https://tc39.es/ecma262/#sec-array.prototype.foreach
  var arrayForEach = !STRICT_METHOD$2 ? function forEach(callbackfn /* , thisArg */) {
    return $forEach(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
  // eslint-disable-next-line es/no-array-prototype-foreach -- safe
  } : [].forEach;

  var handlePrototype$1 = function (CollectionPrototype) {
    // some Chrome versions have non-configurable methods on DOMTokenList
    if (CollectionPrototype && CollectionPrototype.forEach !== arrayForEach) try {
      createNonEnumerableProperty(CollectionPrototype, 'forEach', arrayForEach);
    } catch (error) {
      CollectionPrototype.forEach = arrayForEach;
    }
  };

  for (var COLLECTION_NAME$1 in domIterables) {
    if (domIterables[COLLECTION_NAME$1]) {
      handlePrototype$1(global_1[COLLECTION_NAME$1] && global_1[COLLECTION_NAME$1].prototype);
    }
  }

  handlePrototype$1(domTokenListPrototype);

  var FAILS_ON_PRIMITIVES$1 = fails(function () { objectKeys(1); });

  // `Object.keys` method
  // https://tc39.es/ecma262/#sec-object.keys
  _export({ target: 'Object', stat: true, forced: FAILS_ON_PRIMITIVES$1 }, {
    keys: function keys(it) {
      return objectKeys(toObject(it));
    }
  });

  var SPECIES$5 = wellKnownSymbol('species');

  var arrayMethodHasSpeciesSupport = function (METHOD_NAME) {
    // We can't use this feature detection in V8 since it causes
    // deoptimization and serious performance degradation
    // https://github.com/zloirock/core-js/issues/677
    return engineV8Version >= 51 || !fails(function () {
      var array = [];
      var constructor = array.constructor = {};
      constructor[SPECIES$5] = function () {
        return { foo: 1 };
      };
      return array[METHOD_NAME](Boolean).foo !== 1;
    });
  };

  var $map = arrayIteration.map;


  var HAS_SPECIES_SUPPORT$3 = arrayMethodHasSpeciesSupport('map');

  // `Array.prototype.map` method
  // https://tc39.es/ecma262/#sec-array.prototype.map
  // with adding support of @@species
  _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$3 }, {
    map: function map(callbackfn /* , thisArg */) {
      return $map(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  var $filter = arrayIteration.filter;


  var HAS_SPECIES_SUPPORT$2 = arrayMethodHasSpeciesSupport('filter');

  // `Array.prototype.filter` method
  // https://tc39.es/ecma262/#sec-array.prototype.filter
  // with adding support of @@species
  _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$2 }, {
    filter: function filter(callbackfn /* , thisArg */) {
      return $filter(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof commonjsGlobal$1 == 'object' && commonjsGlobal$1 && commonjsGlobal$1.Object === Object && commonjsGlobal$1;

  var _freeGlobal = freeGlobal;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = _freeGlobal || freeSelf || Function('return this')();

  var _root = root;

  /** Built-in value references. */
  var Symbol$1 = _root.Symbol;

  var _Symbol = Symbol$1;

  /** Used for built-in method references. */
  var objectProto$i = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$g = objectProto$i.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString$1 = objectProto$i.toString;

  /** Built-in value references. */
  var symToStringTag$1 = _Symbol ? _Symbol.toStringTag : undefined;

  /**
   * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the raw `toStringTag`.
   */
  function getRawTag(value) {
    var isOwn = hasOwnProperty$g.call(value, symToStringTag$1),
        tag = value[symToStringTag$1];

    try {
      value[symToStringTag$1] = undefined;
      var unmasked = true;
    } catch (e) {}

    var result = nativeObjectToString$1.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag$1] = tag;
      } else {
        delete value[symToStringTag$1];
      }
    }
    return result;
  }

  var _getRawTag = getRawTag;

  /** Used for built-in method references. */
  var objectProto$h = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var nativeObjectToString = objectProto$h.toString;

  /**
   * Converts `value` to a string using `Object.prototype.toString`.
   *
   * @private
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   */
  function objectToString$1(value) {
    return nativeObjectToString.call(value);
  }

  var _objectToString = objectToString$1;

  /** `Object#toString` result references. */
  var nullTag = '[object Null]',
      undefinedTag = '[object Undefined]';

  /** Built-in value references. */
  var symToStringTag = _Symbol ? _Symbol.toStringTag : undefined;

  /**
   * The base implementation of `getTag` without fallbacks for buggy environments.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  function baseGetTag(value) {
    if (value == null) {
      return value === undefined ? undefinedTag : nullTag;
    }
    return (symToStringTag && symToStringTag in Object(value))
      ? _getRawTag(value)
      : _objectToString(value);
  }

  var _baseGetTag = baseGetTag;

  /**
   * Creates a unary function that invokes `func` with its argument transformed.
   *
   * @private
   * @param {Function} func The function to wrap.
   * @param {Function} transform The argument transform.
   * @returns {Function} Returns the new function.
   */
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }

  var _overArg = overArg;

  /** Built-in value references. */
  var getPrototype = _overArg(Object.getPrototypeOf, Object);

  var _getPrototype = getPrototype;

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return value != null && typeof value == 'object';
  }

  var isObjectLike_1 = isObjectLike;

  /** `Object#toString` result references. */
  var objectTag$4 = '[object Object]';

  /** Used for built-in method references. */
  var funcProto$2 = Function.prototype,
      objectProto$g = Object.prototype;

  /** Used to resolve the decompiled source of functions. */
  var funcToString$2 = funcProto$2.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty$f = objectProto$g.hasOwnProperty;

  /** Used to infer the `Object` constructor. */
  var objectCtorString = funcToString$2.call(Object);

  /**
   * Checks if `value` is a plain object, that is, an object created by the
   * `Object` constructor or one with a `[[Prototype]]` of `null`.
   *
   * @static
   * @memberOf _
   * @since 0.8.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a plain object, else `false`.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   * }
   *
   * _.isPlainObject(new Foo);
   * // => false
   *
   * _.isPlainObject([1, 2, 3]);
   * // => false
   *
   * _.isPlainObject({ 'x': 0, 'y': 0 });
   * // => true
   *
   * _.isPlainObject(Object.create(null));
   * // => true
   */
  function isPlainObject(value) {
    if (!isObjectLike_1(value) || _baseGetTag(value) != objectTag$4) {
      return false;
    }
    var proto = _getPrototype(value);
    if (proto === null) {
      return true;
    }
    var Ctor = hasOwnProperty$f.call(proto, 'constructor') && proto.constructor;
    return typeof Ctor == 'function' && Ctor instanceof Ctor &&
      funcToString$2.call(Ctor) == objectCtorString;
  }

  var isPlainObject_1 = isPlainObject;

  var isPlainObject$1 = isPlainObject_1;

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == 'object' || type == 'function');
  }

  var isObject_1 = isObject;

  /** `Object#toString` result references. */
  var asyncTag = '[object AsyncFunction]',
      funcTag$2 = '[object Function]',
      genTag$1 = '[object GeneratorFunction]',
      proxyTag = '[object Proxy]';

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    if (!isObject_1(value)) {
      return false;
    }
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 9 which returns 'object' for typed arrays and other constructors.
    var tag = _baseGetTag(value);
    return tag == funcTag$2 || tag == genTag$1 || tag == asyncTag || tag == proxyTag;
  }

  var isFunction_1 = isFunction;

  /** Used to detect overreaching core-js shims. */
  var coreJsData = _root['__core-js_shared__'];

  var _coreJsData = coreJsData;

  /** Used to detect methods masquerading as native. */
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(_coreJsData && _coreJsData.keys && _coreJsData.keys.IE_PROTO || '');
    return uid ? ('Symbol(src)_1.' + uid) : '';
  }());

  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */
  function isMasked(func) {
    return !!maskSrcKey && (maskSrcKey in func);
  }

  var _isMasked = isMasked;

  /** Used for built-in method references. */
  var funcProto$1 = Function.prototype;

  /** Used to resolve the decompiled source of functions. */
  var funcToString$1 = funcProto$1.toString;

  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to convert.
   * @returns {string} Returns the source code.
   */
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString$1.call(func);
      } catch (e) {}
      try {
        return (func + '');
      } catch (e) {}
    }
    return '';
  }

  var _toSource = toSource;

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Used for built-in method references. */
  var funcProto = Function.prototype,
      objectProto$f = Object.prototype;

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty$e = objectProto$f.hasOwnProperty;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    funcToString.call(hasOwnProperty$e).replace(reRegExpChar, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */
  function baseIsNative(value) {
    if (!isObject_1(value) || _isMasked(value)) {
      return false;
    }
    var pattern = isFunction_1(value) ? reIsNative : reIsHostCtor;
    return pattern.test(_toSource(value));
  }

  var _baseIsNative = baseIsNative;

  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }

  var _getValue = getValue;

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = _getValue(object, key);
    return _baseIsNative(value) ? value : undefined;
  }

  var _getNative = getNative;

  var defineProperty$3 = (function() {
    try {
      var func = _getNative(Object, 'defineProperty');
      func({}, '', {});
      return func;
    } catch (e) {}
  }());

  var _defineProperty = defineProperty$3;

  /**
   * The base implementation of `assignValue` and `assignMergeValue` without
   * value checks.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function baseAssignValue(object, key, value) {
    if (key == '__proto__' && _defineProperty) {
      _defineProperty(object, key, {
        'configurable': true,
        'enumerable': true,
        'value': value,
        'writable': true
      });
    } else {
      object[key] = value;
    }
  }

  var _baseAssignValue = baseAssignValue;

  /**
   * Creates a base function for methods like `_.forIn` and `_.forOwn`.
   *
   * @private
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseFor(fromRight) {
    return function(object, iteratee, keysFunc) {
      var index = -1,
          iterable = Object(object),
          props = keysFunc(object),
          length = props.length;

      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object;
    };
  }

  var _createBaseFor = createBaseFor;

  /**
   * The base implementation of `baseForOwn` which iterates over `object`
   * properties returned by `keysFunc` and invokes `iteratee` for each property.
   * Iteratee functions may exit iteration early by explicitly returning `false`.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @returns {Object} Returns `object`.
   */
  var baseFor = _createBaseFor();

  var _baseFor = baseFor;

  /**
   * The base implementation of `_.times` without support for iteratee shorthands
   * or max array length checks.
   *
   * @private
   * @param {number} n The number of times to invoke `iteratee`.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the array of results.
   */
  function baseTimes(n, iteratee) {
    var index = -1,
        result = Array(n);

    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }

  var _baseTimes = baseTimes;

  /** `Object#toString` result references. */
  var argsTag$3 = '[object Arguments]';

  /**
   * The base implementation of `_.isArguments`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   */
  function baseIsArguments(value) {
    return isObjectLike_1(value) && _baseGetTag(value) == argsTag$3;
  }

  var _baseIsArguments = baseIsArguments;

  /** Used for built-in method references. */
  var objectProto$e = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$d = objectProto$e.hasOwnProperty;

  /** Built-in value references. */
  var propertyIsEnumerable$1 = objectProto$e.propertyIsEnumerable;

  /**
   * Checks if `value` is likely an `arguments` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an `arguments` object,
   *  else `false`.
   * @example
   *
   * _.isArguments(function() { return arguments; }());
   * // => true
   *
   * _.isArguments([1, 2, 3]);
   * // => false
   */
  var isArguments = _baseIsArguments(function() { return arguments; }()) ? _baseIsArguments : function(value) {
    return isObjectLike_1(value) && hasOwnProperty$d.call(value, 'callee') &&
      !propertyIsEnumerable$1.call(value, 'callee');
  };

  var isArguments_1 = isArguments;

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray$2 = Array.isArray;

  var isArray_1 = isArray$2;

  /**
   * This method returns `false`.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {boolean} Returns `false`.
   * @example
   *
   * _.times(2, _.stubFalse);
   * // => [false, false]
   */
  function stubFalse() {
    return false;
  }

  var stubFalse_1 = stubFalse;

  var isBuffer_1 = createCommonjsModule(function (module, exports) {
  /** Detect free variable `exports`. */
  var freeExports = exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Built-in value references. */
  var Buffer = moduleExports ? _root.Buffer : undefined;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined;

  /**
   * Checks if `value` is a buffer.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
   * @example
   *
   * _.isBuffer(new Buffer(2));
   * // => true
   *
   * _.isBuffer(new Uint8Array(2));
   * // => false
   */
  var isBuffer = nativeIsBuffer || stubFalse_1;

  module.exports = isBuffer;
  });

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER$3 = 9007199254740991;

  /** Used to detect unsigned integer values. */
  var reIsUint = /^(?:0|[1-9]\d*)$/;

  /**
   * Checks if `value` is a valid array-like index.
   *
   * @private
   * @param {*} value The value to check.
   * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
   * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
   */
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER$3 : length;

    return !!length &&
      (type == 'number' ||
        (type != 'symbol' && reIsUint.test(value))) &&
          (value > -1 && value % 1 == 0 && value < length);
  }

  var _isIndex = isIndex;

  /** Used as references for various `Number` constants. */
  var MAX_SAFE_INTEGER$2 = 9007199254740991;

  /**
   * Checks if `value` is a valid array-like length.
   *
   * **Note:** This method is loosely based on
   * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
   * @example
   *
   * _.isLength(3);
   * // => true
   *
   * _.isLength(Number.MIN_VALUE);
   * // => false
   *
   * _.isLength(Infinity);
   * // => false
   *
   * _.isLength('3');
   * // => false
   */
  function isLength(value) {
    return typeof value == 'number' &&
      value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER$2;
  }

  var isLength_1 = isLength;

  /** `Object#toString` result references. */
  var argsTag$2 = '[object Arguments]',
      arrayTag$2 = '[object Array]',
      boolTag$3 = '[object Boolean]',
      dateTag$3 = '[object Date]',
      errorTag$2 = '[object Error]',
      funcTag$1 = '[object Function]',
      mapTag$6 = '[object Map]',
      numberTag$3 = '[object Number]',
      objectTag$3 = '[object Object]',
      regexpTag$3 = '[object RegExp]',
      setTag$6 = '[object Set]',
      stringTag$3 = '[object String]',
      weakMapTag$2 = '[object WeakMap]';

  var arrayBufferTag$3 = '[object ArrayBuffer]',
      dataViewTag$4 = '[object DataView]',
      float32Tag$2 = '[object Float32Array]',
      float64Tag$2 = '[object Float64Array]',
      int8Tag$2 = '[object Int8Array]',
      int16Tag$2 = '[object Int16Array]',
      int32Tag$2 = '[object Int32Array]',
      uint8Tag$2 = '[object Uint8Array]',
      uint8ClampedTag$2 = '[object Uint8ClampedArray]',
      uint16Tag$2 = '[object Uint16Array]',
      uint32Tag$2 = '[object Uint32Array]';

  /** Used to identify `toStringTag` values of typed arrays. */
  var typedArrayTags = {};
  typedArrayTags[float32Tag$2] = typedArrayTags[float64Tag$2] =
  typedArrayTags[int8Tag$2] = typedArrayTags[int16Tag$2] =
  typedArrayTags[int32Tag$2] = typedArrayTags[uint8Tag$2] =
  typedArrayTags[uint8ClampedTag$2] = typedArrayTags[uint16Tag$2] =
  typedArrayTags[uint32Tag$2] = true;
  typedArrayTags[argsTag$2] = typedArrayTags[arrayTag$2] =
  typedArrayTags[arrayBufferTag$3] = typedArrayTags[boolTag$3] =
  typedArrayTags[dataViewTag$4] = typedArrayTags[dateTag$3] =
  typedArrayTags[errorTag$2] = typedArrayTags[funcTag$1] =
  typedArrayTags[mapTag$6] = typedArrayTags[numberTag$3] =
  typedArrayTags[objectTag$3] = typedArrayTags[regexpTag$3] =
  typedArrayTags[setTag$6] = typedArrayTags[stringTag$3] =
  typedArrayTags[weakMapTag$2] = false;

  /**
   * The base implementation of `_.isTypedArray` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   */
  function baseIsTypedArray(value) {
    return isObjectLike_1(value) &&
      isLength_1(value.length) && !!typedArrayTags[_baseGetTag(value)];
  }

  var _baseIsTypedArray = baseIsTypedArray;

  /**
   * The base implementation of `_.unary` without support for storing metadata.
   *
   * @private
   * @param {Function} func The function to cap arguments for.
   * @returns {Function} Returns the new capped function.
   */
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }

  var _baseUnary = baseUnary;

  var _nodeUtil = createCommonjsModule(function (module, exports) {
  /** Detect free variable `exports`. */
  var freeExports = exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Detect free variable `process` from Node.js. */
  var freeProcess = moduleExports && _freeGlobal.process;

  /** Used to access faster Node.js helpers. */
  var nodeUtil = (function() {
    try {
      // Use `util.types` for Node.js 10+.
      var types = freeModule && freeModule.require && freeModule.require('util').types;

      if (types) {
        return types;
      }

      // Legacy `process.binding('util')` for Node.js < 10.
      return freeProcess && freeProcess.binding && freeProcess.binding('util');
    } catch (e) {}
  }());

  module.exports = nodeUtil;
  });

  /* Node.js helper references. */
  var nodeIsTypedArray = _nodeUtil && _nodeUtil.isTypedArray;

  /**
   * Checks if `value` is classified as a typed array.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
   * @example
   *
   * _.isTypedArray(new Uint8Array);
   * // => true
   *
   * _.isTypedArray([]);
   * // => false
   */
  var isTypedArray = nodeIsTypedArray ? _baseUnary(nodeIsTypedArray) : _baseIsTypedArray;

  var isTypedArray_1 = isTypedArray;

  /** Used for built-in method references. */
  var objectProto$d = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$c = objectProto$d.hasOwnProperty;

  /**
   * Creates an array of the enumerable property names of the array-like `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @param {boolean} inherited Specify returning inherited property names.
   * @returns {Array} Returns the array of property names.
   */
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray_1(value),
        isArg = !isArr && isArguments_1(value),
        isBuff = !isArr && !isArg && isBuffer_1(value),
        isType = !isArr && !isArg && !isBuff && isTypedArray_1(value),
        skipIndexes = isArr || isArg || isBuff || isType,
        result = skipIndexes ? _baseTimes(value.length, String) : [],
        length = result.length;

    for (var key in value) {
      if ((inherited || hasOwnProperty$c.call(value, key)) &&
          !(skipIndexes && (
             // Safari 9 has enumerable `arguments.length` in strict mode.
             key == 'length' ||
             // Node.js 0.10 has enumerable non-index properties on buffers.
             (isBuff && (key == 'offset' || key == 'parent')) ||
             // PhantomJS 2 has enumerable non-index properties on typed arrays.
             (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
             // Skip index properties.
             _isIndex(key, length)
          ))) {
        result.push(key);
      }
    }
    return result;
  }

  var _arrayLikeKeys = arrayLikeKeys;

  /** Used for built-in method references. */
  var objectProto$c = Object.prototype;

  /**
   * Checks if `value` is likely a prototype object.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
   */
  function isPrototype(value) {
    var Ctor = value && value.constructor,
        proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto$c;

    return value === proto;
  }

  var _isPrototype = isPrototype;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeKeys = _overArg(Object.keys, Object);

  var _nativeKeys = nativeKeys;

  /** Used for built-in method references. */
  var objectProto$b = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$b = objectProto$b.hasOwnProperty;

  /**
   * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeys(object) {
    if (!_isPrototype(object)) {
      return _nativeKeys(object);
    }
    var result = [];
    for (var key in Object(object)) {
      if (hasOwnProperty$b.call(object, key) && key != 'constructor') {
        result.push(key);
      }
    }
    return result;
  }

  var _baseKeys = baseKeys;

  /**
   * Checks if `value` is array-like. A value is considered array-like if it's
   * not a function and has a `value.length` that's an integer greater than or
   * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
   * @example
   *
   * _.isArrayLike([1, 2, 3]);
   * // => true
   *
   * _.isArrayLike(document.body.children);
   * // => true
   *
   * _.isArrayLike('abc');
   * // => true
   *
   * _.isArrayLike(_.noop);
   * // => false
   */
  function isArrayLike(value) {
    return value != null && isLength_1(value.length) && !isFunction_1(value);
  }

  var isArrayLike_1 = isArrayLike;

  /**
   * Creates an array of the own enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects. See the
   * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * for more details.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keys(new Foo);
   * // => ['a', 'b'] (iteration order is not guaranteed)
   *
   * _.keys('hi');
   * // => ['0', '1']
   */
  function keys(object) {
    return isArrayLike_1(object) ? _arrayLikeKeys(object) : _baseKeys(object);
  }

  var keys_1 = keys;

  /**
   * The base implementation of `_.forOwn` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Object} Returns `object`.
   */
  function baseForOwn(object, iteratee) {
    return object && _baseFor(object, iteratee, keys_1);
  }

  var _baseForOwn = baseForOwn;

  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */
  function listCacheClear() {
    this.__data__ = [];
    this.size = 0;
  }

  var _listCacheClear = listCacheClear;

  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }

  var eq_1 = eq;

  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq_1(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }

  var _assocIndexOf = assocIndexOf;

  /** Used for built-in method references. */
  var arrayProto = Array.prototype;

  /** Built-in value references. */
  var splice = arrayProto.splice;

  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function listCacheDelete(key) {
    var data = this.__data__,
        index = _assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    --this.size;
    return true;
  }

  var _listCacheDelete = listCacheDelete;

  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function listCacheGet(key) {
    var data = this.__data__,
        index = _assocIndexOf(data, key);

    return index < 0 ? undefined : data[index][1];
  }

  var _listCacheGet = listCacheGet;

  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function listCacheHas(key) {
    return _assocIndexOf(this.__data__, key) > -1;
  }

  var _listCacheHas = listCacheHas;

  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */
  function listCacheSet(key, value) {
    var data = this.__data__,
        index = _assocIndexOf(data, key);

    if (index < 0) {
      ++this.size;
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }

  var _listCacheSet = listCacheSet;

  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function ListCache(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `ListCache`.
  ListCache.prototype.clear = _listCacheClear;
  ListCache.prototype['delete'] = _listCacheDelete;
  ListCache.prototype.get = _listCacheGet;
  ListCache.prototype.has = _listCacheHas;
  ListCache.prototype.set = _listCacheSet;

  var _ListCache = ListCache;

  /**
   * Removes all key-value entries from the stack.
   *
   * @private
   * @name clear
   * @memberOf Stack
   */
  function stackClear() {
    this.__data__ = new _ListCache;
    this.size = 0;
  }

  var _stackClear = stackClear;

  /**
   * Removes `key` and its value from the stack.
   *
   * @private
   * @name delete
   * @memberOf Stack
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function stackDelete(key) {
    var data = this.__data__,
        result = data['delete'](key);

    this.size = data.size;
    return result;
  }

  var _stackDelete = stackDelete;

  /**
   * Gets the stack value for `key`.
   *
   * @private
   * @name get
   * @memberOf Stack
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function stackGet(key) {
    return this.__data__.get(key);
  }

  var _stackGet = stackGet;

  /**
   * Checks if a stack value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Stack
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function stackHas(key) {
    return this.__data__.has(key);
  }

  var _stackHas = stackHas;

  /* Built-in method references that are verified to be native. */
  var Map = _getNative(_root, 'Map');

  var _Map = Map;

  /* Built-in method references that are verified to be native. */
  var nativeCreate = _getNative(Object, 'create');

  var _nativeCreate = nativeCreate;

  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */
  function hashClear() {
    this.__data__ = _nativeCreate ? _nativeCreate(null) : {};
    this.size = 0;
  }

  var _hashClear = hashClear;

  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function hashDelete(key) {
    var result = this.has(key) && delete this.__data__[key];
    this.size -= result ? 1 : 0;
    return result;
  }

  var _hashDelete = hashDelete;

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED$2 = '__lodash_hash_undefined__';

  /** Used for built-in method references. */
  var objectProto$a = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$a = objectProto$a.hasOwnProperty;

  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function hashGet(key) {
    var data = this.__data__;
    if (_nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED$2 ? undefined : result;
    }
    return hasOwnProperty$a.call(data, key) ? data[key] : undefined;
  }

  var _hashGet = hashGet;

  /** Used for built-in method references. */
  var objectProto$9 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$9 = objectProto$9.hasOwnProperty;

  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function hashHas(key) {
    var data = this.__data__;
    return _nativeCreate ? (data[key] !== undefined) : hasOwnProperty$9.call(data, key);
  }

  var _hashHas = hashHas;

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED$1 = '__lodash_hash_undefined__';

  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */
  function hashSet(key, value) {
    var data = this.__data__;
    this.size += this.has(key) ? 0 : 1;
    data[key] = (_nativeCreate && value === undefined) ? HASH_UNDEFINED$1 : value;
    return this;
  }

  var _hashSet = hashSet;

  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Hash(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `Hash`.
  Hash.prototype.clear = _hashClear;
  Hash.prototype['delete'] = _hashDelete;
  Hash.prototype.get = _hashGet;
  Hash.prototype.has = _hashHas;
  Hash.prototype.set = _hashSet;

  var _Hash = Hash;

  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */
  function mapCacheClear() {
    this.size = 0;
    this.__data__ = {
      'hash': new _Hash,
      'map': new (_Map || _ListCache),
      'string': new _Hash
    };
  }

  var _mapCacheClear = mapCacheClear;

  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */
  function isKeyable(value) {
    var type = typeof value;
    return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
      ? (value !== '__proto__')
      : (value === null);
  }

  var _isKeyable = isKeyable;

  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */
  function getMapData(map, key) {
    var data = map.__data__;
    return _isKeyable(key)
      ? data[typeof key == 'string' ? 'string' : 'hash']
      : data.map;
  }

  var _getMapData = getMapData;

  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function mapCacheDelete(key) {
    var result = _getMapData(this, key)['delete'](key);
    this.size -= result ? 1 : 0;
    return result;
  }

  var _mapCacheDelete = mapCacheDelete;

  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function mapCacheGet(key) {
    return _getMapData(this, key).get(key);
  }

  var _mapCacheGet = mapCacheGet;

  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function mapCacheHas(key) {
    return _getMapData(this, key).has(key);
  }

  var _mapCacheHas = mapCacheHas;

  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */
  function mapCacheSet(key, value) {
    var data = _getMapData(this, key),
        size = data.size;

    data.set(key, value);
    this.size += data.size == size ? 0 : 1;
    return this;
  }

  var _mapCacheSet = mapCacheSet;

  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function MapCache(entries) {
    var index = -1,
        length = entries == null ? 0 : entries.length;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  // Add methods to `MapCache`.
  MapCache.prototype.clear = _mapCacheClear;
  MapCache.prototype['delete'] = _mapCacheDelete;
  MapCache.prototype.get = _mapCacheGet;
  MapCache.prototype.has = _mapCacheHas;
  MapCache.prototype.set = _mapCacheSet;

  var _MapCache = MapCache;

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE$1 = 200;

  /**
   * Sets the stack `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Stack
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the stack cache instance.
   */
  function stackSet(key, value) {
    var data = this.__data__;
    if (data instanceof _ListCache) {
      var pairs = data.__data__;
      if (!_Map || (pairs.length < LARGE_ARRAY_SIZE$1 - 1)) {
        pairs.push([key, value]);
        this.size = ++data.size;
        return this;
      }
      data = this.__data__ = new _MapCache(pairs);
    }
    data.set(key, value);
    this.size = data.size;
    return this;
  }

  var _stackSet = stackSet;

  /**
   * Creates a stack cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Stack(entries) {
    var data = this.__data__ = new _ListCache(entries);
    this.size = data.size;
  }

  // Add methods to `Stack`.
  Stack.prototype.clear = _stackClear;
  Stack.prototype['delete'] = _stackDelete;
  Stack.prototype.get = _stackGet;
  Stack.prototype.has = _stackHas;
  Stack.prototype.set = _stackSet;

  var _Stack = Stack;

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /**
   * Adds `value` to the array cache.
   *
   * @private
   * @name add
   * @memberOf SetCache
   * @alias push
   * @param {*} value The value to cache.
   * @returns {Object} Returns the cache instance.
   */
  function setCacheAdd(value) {
    this.__data__.set(value, HASH_UNDEFINED);
    return this;
  }

  var _setCacheAdd = setCacheAdd;

  /**
   * Checks if `value` is in the array cache.
   *
   * @private
   * @name has
   * @memberOf SetCache
   * @param {*} value The value to search for.
   * @returns {number} Returns `true` if `value` is found, else `false`.
   */
  function setCacheHas(value) {
    return this.__data__.has(value);
  }

  var _setCacheHas = setCacheHas;

  /**
   *
   * Creates an array cache object to store unique values.
   *
   * @private
   * @constructor
   * @param {Array} [values] The values to cache.
   */
  function SetCache(values) {
    var index = -1,
        length = values == null ? 0 : values.length;

    this.__data__ = new _MapCache;
    while (++index < length) {
      this.add(values[index]);
    }
  }

  // Add methods to `SetCache`.
  SetCache.prototype.add = SetCache.prototype.push = _setCacheAdd;
  SetCache.prototype.has = _setCacheHas;

  var _SetCache = SetCache;

  /**
   * A specialized version of `_.some` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {boolean} Returns `true` if any element passes the predicate check,
   *  else `false`.
   */
  function arraySome(array, predicate) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }

  var _arraySome = arraySome;

  /**
   * Checks if a `cache` value for `key` exists.
   *
   * @private
   * @param {Object} cache The cache to query.
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function cacheHas(cache, key) {
    return cache.has(key);
  }

  var _cacheHas = cacheHas;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG$5 = 1,
      COMPARE_UNORDERED_FLAG$3 = 2;

  /**
   * A specialized version of `baseIsEqualDeep` for arrays with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Array} array The array to compare.
   * @param {Array} other The other array to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `array` and `other` objects.
   * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
   */
  function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG$5,
        arrLength = array.length,
        othLength = other.length;

    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    // Check that cyclic values are equal.
    var arrStacked = stack.get(array);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array;
    }
    var index = -1,
        result = true,
        seen = (bitmask & COMPARE_UNORDERED_FLAG$3) ? new _SetCache : undefined;

    stack.set(array, other);
    stack.set(other, array);

    // Ignore non-index properties.
    while (++index < arrLength) {
      var arrValue = array[index],
          othValue = other[index];

      if (customizer) {
        var compared = isPartial
          ? customizer(othValue, arrValue, index, other, array, stack)
          : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== undefined) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      // Recursively compare arrays (susceptible to call stack limits).
      if (seen) {
        if (!_arraySome(other, function(othValue, othIndex) {
              if (!_cacheHas(seen, othIndex) &&
                  (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
                return seen.push(othIndex);
              }
            })) {
          result = false;
          break;
        }
      } else if (!(
            arrValue === othValue ||
              equalFunc(arrValue, othValue, bitmask, customizer, stack)
          )) {
        result = false;
        break;
      }
    }
    stack['delete'](array);
    stack['delete'](other);
    return result;
  }

  var _equalArrays = equalArrays;

  /** Built-in value references. */
  var Uint8Array$1 = _root.Uint8Array;

  var _Uint8Array = Uint8Array$1;

  /**
   * Converts `map` to its key-value pairs.
   *
   * @private
   * @param {Object} map The map to convert.
   * @returns {Array} Returns the key-value pairs.
   */
  function mapToArray(map) {
    var index = -1,
        result = Array(map.size);

    map.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }

  var _mapToArray = mapToArray;

  /**
   * Converts `set` to an array of its values.
   *
   * @private
   * @param {Object} set The set to convert.
   * @returns {Array} Returns the values.
   */
  function setToArray(set) {
    var index = -1,
        result = Array(set.size);

    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }

  var _setToArray = setToArray;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG$4 = 1,
      COMPARE_UNORDERED_FLAG$2 = 2;

  /** `Object#toString` result references. */
  var boolTag$2 = '[object Boolean]',
      dateTag$2 = '[object Date]',
      errorTag$1 = '[object Error]',
      mapTag$5 = '[object Map]',
      numberTag$2 = '[object Number]',
      regexpTag$2 = '[object RegExp]',
      setTag$5 = '[object Set]',
      stringTag$2 = '[object String]',
      symbolTag$3 = '[object Symbol]';

  var arrayBufferTag$2 = '[object ArrayBuffer]',
      dataViewTag$3 = '[object DataView]';

  /** Used to convert symbols to primitives and strings. */
  var symbolProto$2 = _Symbol ? _Symbol.prototype : undefined,
      symbolValueOf$1 = symbolProto$2 ? symbolProto$2.valueOf : undefined;

  /**
   * A specialized version of `baseIsEqualDeep` for comparing objects of
   * the same `toStringTag`.
   *
   * **Note:** This function only supports comparing values with tags of
   * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {string} tag The `toStringTag` of the objects to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag$3:
        if ((object.byteLength != other.byteLength) ||
            (object.byteOffset != other.byteOffset)) {
          return false;
        }
        object = object.buffer;
        other = other.buffer;

      case arrayBufferTag$2:
        if ((object.byteLength != other.byteLength) ||
            !equalFunc(new _Uint8Array(object), new _Uint8Array(other))) {
          return false;
        }
        return true;

      case boolTag$2:
      case dateTag$2:
      case numberTag$2:
        // Coerce booleans to `1` or `0` and dates to milliseconds.
        // Invalid dates are coerced to `NaN`.
        return eq_1(+object, +other);

      case errorTag$1:
        return object.name == other.name && object.message == other.message;

      case regexpTag$2:
      case stringTag$2:
        // Coerce regexes to strings and treat strings, primitives and objects,
        // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
        // for more details.
        return object == (other + '');

      case mapTag$5:
        var convert = _mapToArray;

      case setTag$5:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG$4;
        convert || (convert = _setToArray);

        if (object.size != other.size && !isPartial) {
          return false;
        }
        // Assume cyclic values are equal.
        var stacked = stack.get(object);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG$2;

        // Recursively compare objects (susceptible to call stack limits).
        stack.set(object, other);
        var result = _equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
        stack['delete'](object);
        return result;

      case symbolTag$3:
        if (symbolValueOf$1) {
          return symbolValueOf$1.call(object) == symbolValueOf$1.call(other);
        }
    }
    return false;
  }

  var _equalByTag = equalByTag;

  /**
   * Appends the elements of `values` to `array`.
   *
   * @private
   * @param {Array} array The array to modify.
   * @param {Array} values The values to append.
   * @returns {Array} Returns `array`.
   */
  function arrayPush$1(array, values) {
    var index = -1,
        length = values.length,
        offset = array.length;

    while (++index < length) {
      array[offset + index] = values[index];
    }
    return array;
  }

  var _arrayPush = arrayPush$1;

  /**
   * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
   * `keysFunc` and `symbolsFunc` to get the enumerable property names and
   * symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Function} keysFunc The function to get the keys of `object`.
   * @param {Function} symbolsFunc The function to get the symbols of `object`.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function baseGetAllKeys(object, keysFunc, symbolsFunc) {
    var result = keysFunc(object);
    return isArray_1(object) ? result : _arrayPush(result, symbolsFunc(object));
  }

  var _baseGetAllKeys = baseGetAllKeys;

  /**
   * A specialized version of `_.filter` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} predicate The function invoked per iteration.
   * @returns {Array} Returns the new filtered array.
   */
  function arrayFilter(array, predicate) {
    var index = -1,
        length = array == null ? 0 : array.length,
        resIndex = 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }

  var _arrayFilter = arrayFilter;

  /**
   * This method returns a new empty array.
   *
   * @static
   * @memberOf _
   * @since 4.13.0
   * @category Util
   * @returns {Array} Returns the new empty array.
   * @example
   *
   * var arrays = _.times(2, _.stubArray);
   *
   * console.log(arrays);
   * // => [[], []]
   *
   * console.log(arrays[0] === arrays[1]);
   * // => false
   */
  function stubArray() {
    return [];
  }

  var stubArray_1 = stubArray;

  /** Used for built-in method references. */
  var objectProto$8 = Object.prototype;

  /** Built-in value references. */
  var propertyIsEnumerable = objectProto$8.propertyIsEnumerable;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeGetSymbols$1 = Object.getOwnPropertySymbols;

  /**
   * Creates an array of the own enumerable symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of symbols.
   */
  var getSymbols = !nativeGetSymbols$1 ? stubArray_1 : function(object) {
    if (object == null) {
      return [];
    }
    object = Object(object);
    return _arrayFilter(nativeGetSymbols$1(object), function(symbol) {
      return propertyIsEnumerable.call(object, symbol);
    });
  };

  var _getSymbols = getSymbols;

  /**
   * Creates an array of own enumerable property names and symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function getAllKeys(object) {
    return _baseGetAllKeys(object, keys_1, _getSymbols);
  }

  var _getAllKeys = getAllKeys;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG$3 = 1;

  /** Used for built-in method references. */
  var objectProto$7 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$8 = objectProto$7.hasOwnProperty;

  /**
   * A specialized version of `baseIsEqualDeep` for objects with support for
   * partial deep comparisons.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} stack Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG$3,
        objProps = _getAllKeys(object),
        objLength = objProps.length,
        othProps = _getAllKeys(other),
        othLength = othProps.length;

    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty$8.call(other, key))) {
        return false;
      }
    }
    // Check that cyclic values are equal.
    var objStacked = stack.get(object);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object;
    }
    var result = true;
    stack.set(object, other);
    stack.set(other, object);

    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object[key],
          othValue = other[key];

      if (customizer) {
        var compared = isPartial
          ? customizer(othValue, objValue, key, other, object, stack)
          : customizer(objValue, othValue, key, object, other, stack);
      }
      // Recursively compare objects (susceptible to call stack limits).
      if (!(compared === undefined
            ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
            : compared
          )) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == 'constructor');
    }
    if (result && !skipCtor) {
      var objCtor = object.constructor,
          othCtor = other.constructor;

      // Non `Object` object instances with different constructors are not equal.
      if (objCtor != othCtor &&
          ('constructor' in object && 'constructor' in other) &&
          !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
            typeof othCtor == 'function' && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack['delete'](object);
    stack['delete'](other);
    return result;
  }

  var _equalObjects = equalObjects;

  /* Built-in method references that are verified to be native. */
  var DataView$1 = _getNative(_root, 'DataView');

  var _DataView = DataView$1;

  /* Built-in method references that are verified to be native. */
  var Promise$2 = _getNative(_root, 'Promise');

  var _Promise = Promise$2;

  /* Built-in method references that are verified to be native. */
  var Set$1 = _getNative(_root, 'Set');

  var _Set = Set$1;

  /* Built-in method references that are verified to be native. */
  var WeakMap = _getNative(_root, 'WeakMap');

  var _WeakMap = WeakMap;

  /** `Object#toString` result references. */
  var mapTag$4 = '[object Map]',
      objectTag$2 = '[object Object]',
      promiseTag = '[object Promise]',
      setTag$4 = '[object Set]',
      weakMapTag$1 = '[object WeakMap]';

  var dataViewTag$2 = '[object DataView]';

  /** Used to detect maps, sets, and weakmaps. */
  var dataViewCtorString = _toSource(_DataView),
      mapCtorString = _toSource(_Map),
      promiseCtorString = _toSource(_Promise),
      setCtorString = _toSource(_Set),
      weakMapCtorString = _toSource(_WeakMap);

  /**
   * Gets the `toStringTag` of `value`.
   *
   * @private
   * @param {*} value The value to query.
   * @returns {string} Returns the `toStringTag`.
   */
  var getTag = _baseGetTag;

  // Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
  if ((_DataView && getTag(new _DataView(new ArrayBuffer(1))) != dataViewTag$2) ||
      (_Map && getTag(new _Map) != mapTag$4) ||
      (_Promise && getTag(_Promise.resolve()) != promiseTag) ||
      (_Set && getTag(new _Set) != setTag$4) ||
      (_WeakMap && getTag(new _WeakMap) != weakMapTag$1)) {
    getTag = function(value) {
      var result = _baseGetTag(value),
          Ctor = result == objectTag$2 ? value.constructor : undefined,
          ctorString = Ctor ? _toSource(Ctor) : '';

      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString: return dataViewTag$2;
          case mapCtorString: return mapTag$4;
          case promiseCtorString: return promiseTag;
          case setCtorString: return setTag$4;
          case weakMapCtorString: return weakMapTag$1;
        }
      }
      return result;
    };
  }

  var _getTag = getTag;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG$2 = 1;

  /** `Object#toString` result references. */
  var argsTag$1 = '[object Arguments]',
      arrayTag$1 = '[object Array]',
      objectTag$1 = '[object Object]';

  /** Used for built-in method references. */
  var objectProto$6 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$7 = objectProto$6.hasOwnProperty;

  /**
   * A specialized version of `baseIsEqual` for arrays and objects which performs
   * deep comparisons and tracks traversed objects enabling objects with circular
   * references to be compared.
   *
   * @private
   * @param {Object} object The object to compare.
   * @param {Object} other The other object to compare.
   * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
   * @param {Function} customizer The function to customize comparisons.
   * @param {Function} equalFunc The function to determine equivalents of values.
   * @param {Object} [stack] Tracks traversed `object` and `other` objects.
   * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
   */
  function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray_1(object),
        othIsArr = isArray_1(other),
        objTag = objIsArr ? arrayTag$1 : _getTag(object),
        othTag = othIsArr ? arrayTag$1 : _getTag(other);

    objTag = objTag == argsTag$1 ? objectTag$1 : objTag;
    othTag = othTag == argsTag$1 ? objectTag$1 : othTag;

    var objIsObj = objTag == objectTag$1,
        othIsObj = othTag == objectTag$1,
        isSameTag = objTag == othTag;

    if (isSameTag && isBuffer_1(object)) {
      if (!isBuffer_1(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new _Stack);
      return (objIsArr || isTypedArray_1(object))
        ? _equalArrays(object, other, bitmask, customizer, equalFunc, stack)
        : _equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG$2)) {
      var objIsWrapped = objIsObj && hasOwnProperty$7.call(object, '__wrapped__'),
          othIsWrapped = othIsObj && hasOwnProperty$7.call(other, '__wrapped__');

      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object.value() : object,
            othUnwrapped = othIsWrapped ? other.value() : other;

        stack || (stack = new _Stack);
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new _Stack);
    return _equalObjects(object, other, bitmask, customizer, equalFunc, stack);
  }

  var _baseIsEqualDeep = baseIsEqualDeep;

  /**
   * The base implementation of `_.isEqual` which supports partial comparisons
   * and tracks traversed objects.
   *
   * @private
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @param {boolean} bitmask The bitmask flags.
   *  1 - Unordered comparison
   *  2 - Partial comparison
   * @param {Function} [customizer] The function to customize comparisons.
   * @param {Object} [stack] Tracks traversed `value` and `other` objects.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   */
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || (!isObjectLike_1(value) && !isObjectLike_1(other))) {
      return value !== value && other !== other;
    }
    return _baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
  }

  var _baseIsEqual = baseIsEqual;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG$1 = 1,
      COMPARE_UNORDERED_FLAG$1 = 2;

  /**
   * The base implementation of `_.isMatch` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The object to inspect.
   * @param {Object} source The object of property values to match.
   * @param {Array} matchData The property names, values, and compare flags to match.
   * @param {Function} [customizer] The function to customize comparisons.
   * @returns {boolean} Returns `true` if `object` is a match, else `false`.
   */
  function baseIsMatch(object, source, matchData, customizer) {
    var index = matchData.length,
        length = index,
        noCustomizer = !customizer;

    if (object == null) {
      return !length;
    }
    object = Object(object);
    while (index--) {
      var data = matchData[index];
      if ((noCustomizer && data[2])
            ? data[1] !== object[data[0]]
            : !(data[0] in object)
          ) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0],
          objValue = object[key],
          srcValue = data[1];

      if (noCustomizer && data[2]) {
        if (objValue === undefined && !(key in object)) {
          return false;
        }
      } else {
        var stack = new _Stack;
        if (customizer) {
          var result = customizer(objValue, srcValue, key, object, source, stack);
        }
        if (!(result === undefined
              ? _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG$1 | COMPARE_UNORDERED_FLAG$1, customizer, stack)
              : result
            )) {
          return false;
        }
      }
    }
    return true;
  }

  var _baseIsMatch = baseIsMatch;

  /**
   * Checks if `value` is suitable for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` if suitable for strict
   *  equality comparisons, else `false`.
   */
  function isStrictComparable(value) {
    return value === value && !isObject_1(value);
  }

  var _isStrictComparable = isStrictComparable;

  /**
   * Gets the property names, values, and compare flags of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the match data of `object`.
   */
  function getMatchData(object) {
    var result = keys_1(object),
        length = result.length;

    while (length--) {
      var key = result[length],
          value = object[key];

      result[length] = [key, value, _isStrictComparable(value)];
    }
    return result;
  }

  var _getMatchData = getMatchData;

  /**
   * A specialized version of `matchesProperty` for source values suitable
   * for strict equality comparisons, i.e. `===`.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function matchesStrictComparable(key, srcValue) {
    return function(object) {
      if (object == null) {
        return false;
      }
      return object[key] === srcValue &&
        (srcValue !== undefined || (key in Object(object)));
    };
  }

  var _matchesStrictComparable = matchesStrictComparable;

  /**
   * The base implementation of `_.matches` which doesn't clone `source`.
   *
   * @private
   * @param {Object} source The object of property values to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatches(source) {
    var matchData = _getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return _matchesStrictComparable(matchData[0][0], matchData[0][1]);
    }
    return function(object) {
      return object === source || _baseIsMatch(object, source, matchData);
    };
  }

  var _baseMatches = baseMatches;

  /** `Object#toString` result references. */
  var symbolTag$2 = '[object Symbol]';

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike_1(value) && _baseGetTag(value) == symbolTag$2);
  }

  var isSymbol_1 = isSymbol;

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/;

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    if (isArray_1(value)) {
      return false;
    }
    var type = typeof value;
    if (type == 'number' || type == 'symbol' || type == 'boolean' ||
        value == null || isSymbol_1(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
      (object != null && value in Object(object));
  }

  var _isKey = isKey;

  /** Error message constants. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `clear`, `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */
  function memoize(func, resolver) {
    if (typeof func != 'function' || (resolver != null && typeof resolver != 'function')) {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments,
          key = resolver ? resolver.apply(this, args) : args[0],
          cache = memoized.cache;

      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || _MapCache);
    return memoized;
  }

  // Expose `MapCache`.
  memoize.Cache = _MapCache;

  var memoize_1 = memoize;

  /** Used as the maximum memoize cache size. */
  var MAX_MEMOIZE_SIZE = 500;

  /**
   * A specialized version of `_.memoize` which clears the memoized function's
   * cache when it exceeds `MAX_MEMOIZE_SIZE`.
   *
   * @private
   * @param {Function} func The function to have its output memoized.
   * @returns {Function} Returns the new memoized function.
   */
  function memoizeCapped(func) {
    var result = memoize_1(func, function(key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });

    var cache = result.cache;
    return result;
  }

  var _memoizeCapped = memoizeCapped;

  /** Used to match property names within property paths. */
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /**
   * Converts `string` to a property path array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the property path array.
   */
  var stringToPath = _memoizeCapped(function(string) {
    var result = [];
    if (string.charCodeAt(0) === 46 /* . */) {
      result.push('');
    }
    string.replace(rePropName, function(match, number, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  });

  var _stringToPath = stringToPath;

  /**
   * A specialized version of `_.map` for arrays without support for iteratee
   * shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function arrayMap(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length,
        result = Array(length);

    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }

  var _arrayMap = arrayMap;

  /** Used as references for various `Number` constants. */
  var INFINITY$3 = 1 / 0;

  /** Used to convert symbols to primitives and strings. */
  var symbolProto$1 = _Symbol ? _Symbol.prototype : undefined,
      symbolToString = symbolProto$1 ? symbolProto$1.toString : undefined;

  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }
    if (isArray_1(value)) {
      // Recursively convert values (susceptible to call stack limits).
      return _arrayMap(value, baseToString) + '';
    }
    if (isSymbol_1(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY$3) ? '-0' : result;
  }

  var _baseToString = baseToString;

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {string} Returns the converted string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString$3(value) {
    return value == null ? '' : _baseToString(value);
  }

  var toString_1$1 = toString$3;

  /**
   * Casts `value` to a path array if it's not one.
   *
   * @private
   * @param {*} value The value to inspect.
   * @param {Object} [object] The object to query keys on.
   * @returns {Array} Returns the cast property path array.
   */
  function castPath(value, object) {
    if (isArray_1(value)) {
      return value;
    }
    return _isKey(value, object) ? [value] : _stringToPath(toString_1$1(value));
  }

  var _castPath = castPath;

  /** Used as references for various `Number` constants. */
  var INFINITY$2 = 1 / 0;

  /**
   * Converts `value` to a string key if it's not a string or symbol.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {string|symbol} Returns the key.
   */
  function toKey(value) {
    if (typeof value == 'string' || isSymbol_1(value)) {
      return value;
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY$2) ? '-0' : result;
  }

  var _toKey = toKey;

  /**
   * The base implementation of `_.get` without support for default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path) {
    path = _castPath(path, object);

    var index = 0,
        length = path.length;

    while (object != null && index < length) {
      object = object[_toKey(path[index++])];
    }
    return (index && index == length) ? object : undefined;
  }

  var _baseGet = baseGet;

  /**
   * Gets the value at `path` of `object`. If the resolved value is
   * `undefined`, the `defaultValue` is returned in its place.
   *
   * @static
   * @memberOf _
   * @since 3.7.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @param {*} [defaultValue] The value returned for `undefined` resolved values.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.get(object, 'a[0].b.c');
   * // => 3
   *
   * _.get(object, ['a', '0', 'b', 'c']);
   * // => 3
   *
   * _.get(object, 'a.b.c', 'default');
   * // => 'default'
   */
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : _baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }

  var get_1 = get;

  /**
   * The base implementation of `_.hasIn` without support for deep paths.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {Array|string} key The key to check.
   * @returns {boolean} Returns `true` if `key` exists, else `false`.
   */
  function baseHasIn(object, key) {
    return object != null && key in Object(object);
  }

  var _baseHasIn = baseHasIn;

  /**
   * Checks if `path` exists on `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @param {Function} hasFunc The function to check properties.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   */
  function hasPath(object, path, hasFunc) {
    path = _castPath(path, object);

    var index = -1,
        length = path.length,
        result = false;

    while (++index < length) {
      var key = _toKey(path[index]);
      if (!(result = object != null && hasFunc(object, key))) {
        break;
      }
      object = object[key];
    }
    if (result || ++index != length) {
      return result;
    }
    length = object == null ? 0 : object.length;
    return !!length && isLength_1(length) && _isIndex(key, length) &&
      (isArray_1(object) || isArguments_1(object));
  }

  var _hasPath = hasPath;

  /**
   * Checks if `path` is a direct or inherited property of `object`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   *
   * var object = _.create({ 'a': _.create({ 'b': 2 }) });
   *
   * _.hasIn(object, 'a');
   * // => true
   *
   * _.hasIn(object, 'a.b');
   * // => true
   *
   * _.hasIn(object, ['a', 'b']);
   * // => true
   *
   * _.hasIn(object, 'b');
   * // => false
   */
  function hasIn(object, path) {
    return object != null && _hasPath(object, path, _baseHasIn);
  }

  var hasIn_1 = hasIn;

  /** Used to compose bitmasks for value comparisons. */
  var COMPARE_PARTIAL_FLAG = 1,
      COMPARE_UNORDERED_FLAG = 2;

  /**
   * The base implementation of `_.matchesProperty` which doesn't clone `srcValue`.
   *
   * @private
   * @param {string} path The path of the property to get.
   * @param {*} srcValue The value to match.
   * @returns {Function} Returns the new spec function.
   */
  function baseMatchesProperty(path, srcValue) {
    if (_isKey(path) && _isStrictComparable(srcValue)) {
      return _matchesStrictComparable(_toKey(path), srcValue);
    }
    return function(object) {
      var objValue = get_1(object, path);
      return (objValue === undefined && objValue === srcValue)
        ? hasIn_1(object, path)
        : _baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
    };
  }

  var _baseMatchesProperty = baseMatchesProperty;

  /**
   * This method returns the first argument it receives.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Util
   * @param {*} value Any value.
   * @returns {*} Returns `value`.
   * @example
   *
   * var object = { 'a': 1 };
   *
   * console.log(_.identity(object) === object);
   * // => true
   */
  function identity(value) {
    return value;
  }

  var identity_1 = identity;

  /**
   * The base implementation of `_.property` without support for deep paths.
   *
   * @private
   * @param {string} key The key of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function baseProperty(key) {
    return function(object) {
      return object == null ? undefined : object[key];
    };
  }

  var _baseProperty = baseProperty;

  /**
   * A specialized version of `baseProperty` which supports deep paths.
   *
   * @private
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   */
  function basePropertyDeep(path) {
    return function(object) {
      return _baseGet(object, path);
    };
  }

  var _basePropertyDeep = basePropertyDeep;

  /**
   * Creates a function that returns the value at `path` of a given object.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {Array|string} path The path of the property to get.
   * @returns {Function} Returns the new accessor function.
   * @example
   *
   * var objects = [
   *   { 'a': { 'b': 2 } },
   *   { 'a': { 'b': 1 } }
   * ];
   *
   * _.map(objects, _.property('a.b'));
   * // => [2, 1]
   *
   * _.map(_.sortBy(objects, _.property(['a', 'b'])), 'a.b');
   * // => [1, 2]
   */
  function property$1(path) {
    return _isKey(path) ? _baseProperty(_toKey(path)) : _basePropertyDeep(path);
  }

  var property_1 = property$1;

  /**
   * The base implementation of `_.iteratee`.
   *
   * @private
   * @param {*} [value=_.identity] The value to convert to an iteratee.
   * @returns {Function} Returns the iteratee.
   */
  function baseIteratee(value) {
    // Don't store the `typeof` result in a variable to avoid a JIT bug in Safari 9.
    // See https://bugs.webkit.org/show_bug.cgi?id=156034 for more details.
    if (typeof value == 'function') {
      return value;
    }
    if (value == null) {
      return identity_1;
    }
    if (typeof value == 'object') {
      return isArray_1(value)
        ? _baseMatchesProperty(value[0], value[1])
        : _baseMatches(value);
    }
    return property_1(value);
  }

  var _baseIteratee = baseIteratee;

  /**
   * Creates an object with the same keys as `object` and values generated
   * by running each own enumerable string keyed property of `object` thru
   * `iteratee`. The iteratee is invoked with three arguments:
   * (value, key, object).
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Object
   * @param {Object} object The object to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Object} Returns the new mapped object.
   * @see _.mapKeys
   * @example
   *
   * var users = {
   *   'fred':    { 'user': 'fred',    'age': 40 },
   *   'pebbles': { 'user': 'pebbles', 'age': 1 }
   * };
   *
   * _.mapValues(users, function(o) { return o.age; });
   * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
   *
   * // The `_.property` iteratee shorthand.
   * _.mapValues(users, 'age');
   * // => { 'fred': 40, 'pebbles': 1 } (iteration order is not guaranteed)
   */
  function mapValues(object, iteratee) {
    var result = {};
    iteratee = _baseIteratee(iteratee);

    _baseForOwn(object, function(value, key, object) {
      _baseAssignValue(result, key, iteratee(value, key, object));
    });
    return result;
  }

  var mapValues_1 = mapValues;

  var createProperty = function (object, key, value) {
    var propertyKey = toPropertyKey(key);
    if (propertyKey in object) objectDefineProperty.f(object, propertyKey, createPropertyDescriptor(0, value));
    else object[propertyKey] = value;
  };

  var IS_CONCAT_SPREADABLE = wellKnownSymbol('isConcatSpreadable');
  var MAX_SAFE_INTEGER$1 = 0x1FFFFFFFFFFFFF;
  var MAXIMUM_ALLOWED_INDEX_EXCEEDED = 'Maximum allowed index exceeded';

  // We can't use this feature detection in V8 since it causes
  // deoptimization and serious performance degradation
  // https://github.com/zloirock/core-js/issues/679
  var IS_CONCAT_SPREADABLE_SUPPORT = engineV8Version >= 51 || !fails(function () {
    var array = [];
    array[IS_CONCAT_SPREADABLE] = false;
    return array.concat()[0] !== array;
  });

  var SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('concat');

  var isConcatSpreadable = function (O) {
    if (!isObject$1(O)) return false;
    var spreadable = O[IS_CONCAT_SPREADABLE];
    return spreadable !== undefined ? !!spreadable : isArray$3(O);
  };

  var FORCED$3 = !IS_CONCAT_SPREADABLE_SUPPORT || !SPECIES_SUPPORT;

  // `Array.prototype.concat` method
  // https://tc39.es/ecma262/#sec-array.prototype.concat
  // with adding support of @@isConcatSpreadable and @@species
  _export({ target: 'Array', proto: true, forced: FORCED$3 }, {
    // eslint-disable-next-line no-unused-vars -- required for `.length`
    concat: function concat(arg) {
      var O = toObject(this);
      var A = arraySpeciesCreate(O, 0);
      var n = 0;
      var i, k, length, len, E;
      for (i = -1, length = arguments.length; i < length; i++) {
        E = i === -1 ? O : arguments[i];
        if (isConcatSpreadable(E)) {
          len = toLength(E.length);
          if (n + len > MAX_SAFE_INTEGER$1) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
          for (k = 0; k < len; k++, n++) if (k in E) createProperty(A, n, E[k]);
        } else {
          if (n >= MAX_SAFE_INTEGER$1) throw TypeError(MAXIMUM_ALLOWED_INDEX_EXCEEDED);
          createProperty(A, n++, E);
        }
      }
      A.length = n;
      return A;
    }
  });

  /**
   * The base implementation of `_.findIndex` and `_.findLastIndex` without
   * support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} predicate The function invoked per iteration.
   * @param {number} fromIndex The index to search from.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseFindIndex(array, predicate, fromIndex, fromRight) {
    var length = array.length,
        index = fromIndex + (fromRight ? 1 : -1);

    while ((fromRight ? index-- : ++index < length)) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }

  var _baseFindIndex = baseFindIndex;

  /**
   * The base implementation of `_.isNaN` without support for number objects.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is `NaN`, else `false`.
   */
  function baseIsNaN(value) {
    return value !== value;
  }

  var _baseIsNaN = baseIsNaN;

  /**
   * A specialized version of `_.indexOf` which performs strict equality
   * comparisons of values, i.e. `===`.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function strictIndexOf(array, value, fromIndex) {
    var index = fromIndex - 1,
        length = array.length;

    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }

  var _strictIndexOf = strictIndexOf;

  /**
   * The base implementation of `_.indexOf` without `fromIndex` bounds checks.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} value The value to search for.
   * @param {number} fromIndex The index to search from.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function baseIndexOf(array, value, fromIndex) {
    return value === value
      ? _strictIndexOf(array, value, fromIndex)
      : _baseFindIndex(array, _baseIsNaN, fromIndex);
  }

  var _baseIndexOf = baseIndexOf;

  /**
   * A specialized version of `_.includes` for arrays without support for
   * specifying an index to search from.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludes(array, value) {
    var length = array == null ? 0 : array.length;
    return !!length && _baseIndexOf(array, value, 0) > -1;
  }

  var _arrayIncludes = arrayIncludes;

  /**
   * This function is like `arrayIncludes` except that it accepts a comparator.
   *
   * @private
   * @param {Array} [array] The array to inspect.
   * @param {*} target The value to search for.
   * @param {Function} comparator The comparator invoked per element.
   * @returns {boolean} Returns `true` if `target` is found, else `false`.
   */
  function arrayIncludesWith(array, value, comparator) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (comparator(value, array[index])) {
        return true;
      }
    }
    return false;
  }

  var _arrayIncludesWith = arrayIncludesWith;

  /**
   * This method returns `undefined`.
   *
   * @static
   * @memberOf _
   * @since 2.3.0
   * @category Util
   * @example
   *
   * _.times(2, _.noop);
   * // => [undefined, undefined]
   */
  function noop() {
    // No operation performed.
  }

  var noop_1 = noop;

  /** Used as references for various `Number` constants. */
  var INFINITY$1 = 1 / 0;

  /**
   * Creates a set object of `values`.
   *
   * @private
   * @param {Array} values The values to add to the set.
   * @returns {Object} Returns the new set.
   */
  var createSet = !(_Set && (1 / _setToArray(new _Set([,-0]))[1]) == INFINITY$1) ? noop_1 : function(values) {
    return new _Set(values);
  };

  var _createSet = createSet;

  /** Used as the size to enable large array optimizations. */
  var LARGE_ARRAY_SIZE = 200;

  /**
   * The base implementation of `_.uniqBy` without support for iteratee shorthands.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {Function} [iteratee] The iteratee invoked per element.
   * @param {Function} [comparator] The comparator invoked per element.
   * @returns {Array} Returns the new duplicate free array.
   */
  function baseUniq(array, iteratee, comparator) {
    var index = -1,
        includes = _arrayIncludes,
        length = array.length,
        isCommon = true,
        result = [],
        seen = result;

    if (comparator) {
      isCommon = false;
      includes = _arrayIncludesWith;
    }
    else if (length >= LARGE_ARRAY_SIZE) {
      var set = iteratee ? null : _createSet(array);
      if (set) {
        return _setToArray(set);
      }
      isCommon = false;
      includes = _cacheHas;
      seen = new _SetCache;
    }
    else {
      seen = iteratee ? [] : result;
    }
    outer:
    while (++index < length) {
      var value = array[index],
          computed = iteratee ? iteratee(value) : value;

      value = (comparator || value !== 0) ? value : 0;
      if (isCommon && computed === computed) {
        var seenIndex = seen.length;
        while (seenIndex--) {
          if (seen[seenIndex] === computed) {
            continue outer;
          }
        }
        if (iteratee) {
          seen.push(computed);
        }
        result.push(value);
      }
      else if (!includes(seen, computed, comparator)) {
        if (seen !== result) {
          seen.push(computed);
        }
        result.push(value);
      }
    }
    return result;
  }

  var _baseUniq = baseUniq;

  /**
   * Creates a duplicate-free version of an array, using
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons, in which only the first occurrence of each element
   * is kept. The order of result values is determined by the order they occur
   * in the array.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @returns {Array} Returns the new duplicate free array.
   * @example
   *
   * _.uniq([2, 1, 2]);
   * // => [2, 1]
   */
  function uniq(array) {
    return (array && array.length) ? _baseUniq(array) : [];
  }

  var uniq_1 = uniq;

  var uniq$1 = uniq_1;

  /** Built-in value references. */
  var spreadableSymbol = _Symbol ? _Symbol.isConcatSpreadable : undefined;

  /**
   * Checks if `value` is a flattenable `arguments` object or array.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is flattenable, else `false`.
   */
  function isFlattenable(value) {
    return isArray_1(value) || isArguments_1(value) ||
      !!(spreadableSymbol && value && value[spreadableSymbol]);
  }

  var _isFlattenable = isFlattenable;

  /**
   * The base implementation of `_.flatten` with support for restricting flattening.
   *
   * @private
   * @param {Array} array The array to flatten.
   * @param {number} depth The maximum recursion depth.
   * @param {boolean} [predicate=isFlattenable] The function invoked per iteration.
   * @param {boolean} [isStrict] Restrict to values that pass `predicate` checks.
   * @param {Array} [result=[]] The initial result value.
   * @returns {Array} Returns the new flattened array.
   */
  function baseFlatten(array, depth, predicate, isStrict, result) {
    var index = -1,
        length = array.length;

    predicate || (predicate = _isFlattenable);
    result || (result = []);

    while (++index < length) {
      var value = array[index];
      if (depth > 0 && predicate(value)) {
        if (depth > 1) {
          // Recursively flatten arrays (susceptible to call stack limits).
          baseFlatten(value, depth - 1, predicate, isStrict, result);
        } else {
          _arrayPush(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }

  var _baseFlatten = baseFlatten;

  /**
   * Flattens `array` a single level deep.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to flatten.
   * @returns {Array} Returns the new flattened array.
   * @example
   *
   * _.flatten([1, [2, [3, [4]], 5]]);
   * // => [1, 2, [3, [4]], 5]
   */
  function flatten(array) {
    var length = array == null ? 0 : array.length;
    return length ? _baseFlatten(array, 1) : [];
  }

  var flatten_1 = flatten;

  var flatten$1 = flatten_1;

  /**
    @hide
  */

  function referenceSort (edges) {
    var nodes = uniq$1(flatten$1(edges));
    var cursor = nodes.length;
    var sorted = new Array(cursor);
    var visited = {};
    var i = cursor;

    var visit = function visit(node, i, predecessors) {
      if (predecessors.indexOf(node) >= 0) {
        throw new Error("Cyclic dependency in properties ".concat(JSON.stringify(predecessors)));
      }

      if (visited[i]) {
        return;
      } else {
        visited[i] = true;
      }

      var outgoing = edges.filter(function (edge) {
        return edge && edge[0] === node;
      });
      i = outgoing.length;

      if (i) {
        var preds = predecessors.concat(node);

        do {
          var pair = outgoing[--i];
          var child = pair[1];

          if (child) {
            visit(child, nodes.indexOf(child), preds);
          }
        } while (i);
      }

      sorted[--cursor] = node;
    };

    while (i--) {
      if (!visited[i]) {
        visit(nodes[i], i, []);
      }
    }

    return sorted.reverse();
  }

  var Factory = function Factory() {
    this.build = function (sequence) {
      var _this = this;

      var object = {};
      var topLevelAttrs = Object.assign({}, this.attrs);
      delete topLevelAttrs.afterCreate;
      Object.keys(topLevelAttrs).forEach(function (attr) {
        if (Factory.isTrait.call(_this, attr)) {
          delete topLevelAttrs[attr];
        }
      });
      var keys = sortAttrs(topLevelAttrs, sequence);
      keys.forEach(function (key) {
        var buildAttrs, _buildSingleValue;

        buildAttrs = function buildAttrs(attrs) {
          return mapValues_1(attrs, _buildSingleValue);
        };

        _buildSingleValue = function buildSingleValue(value) {
          if (Array.isArray(value)) {
            return value.map(_buildSingleValue);
          } else if (isPlainObject$1(value)) {
            return buildAttrs(value);
          } else if (isFunction_1(value)) {
            return value.call(topLevelAttrs, sequence);
          } else {
            return value;
          }
        };

        var value = topLevelAttrs[key];

        if (isFunction_1(value)) {
          object[key] = value.call(object, sequence);
        } else {
          object[key] = _buildSingleValue(value);
        }
      });
      return object;
    };
  };

  Factory.extend = function (attrs) {
    // Merge the new attributes with existing ones. If conflict, new ones win.
    var newAttrs = Object.assign({}, this.attrs, attrs);

    var Subclass = function Subclass() {
      this.attrs = newAttrs;
      Factory.call(this);
    }; // Copy extend


    Subclass.extend = Factory.extend;
    Subclass.extractAfterCreateCallbacks = Factory.extractAfterCreateCallbacks;
    Subclass.isTrait = Factory.isTrait; // Store a reference on the class for future subclasses

    Subclass.attrs = newAttrs;
    return Subclass;
  };

  Factory.extractAfterCreateCallbacks = function () {
    var _this2 = this;

    var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        traits = _ref.traits;

    var afterCreateCallbacks = [];
    var attrs = this.attrs || {};
    var traitCandidates;

    if (attrs.afterCreate) {
      afterCreateCallbacks.push(attrs.afterCreate);
    }

    if (Array.isArray(traits)) {
      traitCandidates = traits;
    } else {
      traitCandidates = Object.keys(attrs);
    }

    traitCandidates.filter(function (attr) {
      return _this2.isTrait(attr) && attrs[attr].extension.afterCreate;
    }).forEach(function (attr) {
      afterCreateCallbacks.push(attrs[attr].extension.afterCreate);
    });
    return afterCreateCallbacks;
  };

  Factory.isTrait = function (attrName) {
    var attrs = this.attrs;
    return isPlainObject$1(attrs[attrName]) && attrs[attrName].__isTrait__ === true;
  };

  function sortAttrs(attrs, sequence) {
    var Temp = function Temp() {};

    var obj = new Temp();
    var refs = [];
    var property;
    Object.keys(attrs).forEach(function (key) {
      var value;
      Object.defineProperty(obj.constructor.prototype, key, {
        get: function get() {
          refs.push([property, key]);
          return value;
        },
        set: function set(newValue) {
          value = newValue;
        },
        enumerable: false,
        configurable: true
      });
    });
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];

      if (typeof value !== "function") {
        obj[key] = value;
      }
    });
    Object.keys(attrs).forEach(function (key) {
      var value = attrs[key];
      property = key;

      if (typeof value === "function") {
        obj[key] = value.call(obj, sequence);
      }

      refs.push([key]);
    });
    return referenceSort(refs);
  }
  /**
   * @hide
   */


  var Factory$1 = Factory;

  // `Object.prototype.toString` method implementation
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  var objectToString = toStringTagSupport ? {}.toString : function toString() {
    return '[object ' + classof(this) + ']';
  };

  // `Object.prototype.toString` method
  // https://tc39.es/ecma262/#sec-object.prototype.tostring
  if (!toStringTagSupport) {
    redefine(Object.prototype, 'toString', objectToString, { unsafe: true });
  }

  var toString_1 = function (argument) {
    if (classof(argument) === 'Symbol') throw TypeError('Cannot convert a Symbol value to a string');
    return String(argument);
  };

  // `RegExp.prototype.flags` getter implementation
  // https://tc39.es/ecma262/#sec-get-regexp.prototype.flags
  var regexpFlags = function () {
    var that = anObject(this);
    var result = '';
    if (that.global) result += 'g';
    if (that.ignoreCase) result += 'i';
    if (that.multiline) result += 'm';
    if (that.dotAll) result += 's';
    if (that.unicode) result += 'u';
    if (that.sticky) result += 'y';
    return result;
  };

  var PROPER_FUNCTION_NAME$2 = functionName.PROPER;






  var TO_STRING = 'toString';
  var RegExpPrototype$1 = RegExp.prototype;
  var nativeToString = RegExpPrototype$1[TO_STRING];

  var NOT_GENERIC = fails(function () { return nativeToString.call({ source: 'a', flags: 'b' }) != '/a/b'; });
  // FF44- RegExp#toString has a wrong name
  var INCORRECT_NAME = PROPER_FUNCTION_NAME$2 && nativeToString.name != TO_STRING;

  // `RegExp.prototype.toString` method
  // https://tc39.es/ecma262/#sec-regexp.prototype.tostring
  if (NOT_GENERIC || INCORRECT_NAME) {
    redefine(RegExp.prototype, TO_STRING, function toString() {
      var R = anObject(this);
      var p = toString_1(R.source);
      var rf = R.flags;
      var f = toString_1(rf === undefined && R instanceof RegExp && !('flags' in RegExpPrototype$1) ? regexpFlags.call(R) : rf);
      return '/' + p + '/' + f;
    }, { unsafe: true });
  }

  function isNumber(n) {
    return (+n).toString() === n.toString();
  }
  /**
    By default Mirage uses autoincrementing numbers starting with `1` as IDs for records. This can be customized by implementing one or more IdentityManagers for your application.

    An IdentityManager is a class that's responsible for generating unique identifiers. You can define a custom identity manager for your entire application, as well as on a per-model basis.

    A custom IdentityManager must implement these methods:

    - `fetch`, which must return an identifier not yet used
    - `set`, which is called with an `id` of a record being insert into Mirage's database
    - `reset`, which should reset database to initial state

    Check out the advanced guide on Mocking UUIDs to see a complete example of a custom IdentityManager.

    @class IdentityManager
    @constructor
    @public
  */


  var IdentityManager = /*#__PURE__*/function () {
    function IdentityManager() {
      _classCallCheck(this, IdentityManager);

      this._nextId = 1;
      this._ids = {};
    }
    /**
      @method get
      @hide
      @private
    */


    _createClass(IdentityManager, [{
      key: "get",
      value: function get() {
        return this._nextId;
      }
      /**
        Registers `uniqueIdentifier` as used.
         This method should throw is `uniqueIdentifier` has already been taken.
         @method set
        @param {String|Number} uniqueIdentifier
        @public
      */

    }, {
      key: "set",
      value: function set(uniqueIdentifier) {
        if (this._ids[uniqueIdentifier]) {
          throw new Error("Attempting to use the ID ".concat(uniqueIdentifier, ", but it's already been used"));
        }

        if (isNumber(uniqueIdentifier) && +uniqueIdentifier >= this._nextId) {
          this._nextId = +uniqueIdentifier + 1;
        }

        this._ids[uniqueIdentifier] = true;
      }
      /**
        @method inc
        @hide
        @private
      */

    }, {
      key: "inc",
      value: function inc() {
        var nextValue = this.get() + 1;
        this._nextId = nextValue;
        return nextValue;
      }
      /**
        Returns the next unique identifier.
         @method fetch
        @return {String} Unique identifier
        @public
      */

    }, {
      key: "fetch",
      value: function fetch() {
        var id = this.get();
        this._ids[id] = true;
        this.inc();
        return id.toString();
      }
      /**
        Resets the identity manager, marking all unique identifiers as available.
         @method reset
        @public
      */

    }, {
      key: "reset",
      value: function reset() {
        this._nextId = 1;
        this._ids = {};
      }
    }]);

    return IdentityManager;
  }();

  var IdentityManager$1 = IdentityManager;

  /**
    @hide
  */
  var association = function association() {
    var __isAssociation__ = true;

    for (var _len = arguments.length, traitsAndOverrides = new Array(_len), _key = 0; _key < _len; _key++) {
      traitsAndOverrides[_key] = arguments[_key];
    }

    return {
      __isAssociation__: __isAssociation__,
      traitsAndOverrides: traitsAndOverrides
    };
  };

  var association$1 = association;

  var trait = function trait(extension) {
    var __isTrait__ = true;
    return {
      extension: extension,
      __isTrait__: __isTrait__
    };
  };
  /**
    @hide
  */


  var trait$1 = trait;

  var warn = console.warn; // eslint-disable-line no-console

  /**
    You can use this class when you want more control over your route handlers response.

    Pass the `code`, `headers` and `data` into the constructor and return an instance from any route handler.

    ```js
    import { Response } from 'miragejs';

    this.get('/users', () => {
      return new Response(400, { some: 'header' }, { errors: [ 'name cannot be blank'] });
    });
    ```
  */

  var Response$1 = /*#__PURE__*/function () {
    function Response(code) {
      var headers = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var data = arguments.length > 2 ? arguments[2] : undefined;

      _classCallCheck(this, Response);

      this.code = code;
      this.headers = headers; // Default data for "undefined 204" responses to empty string (no content)

      if (code === 204) {
        if (data !== undefined && data !== "") {
          warn("Mirage: One of your route handlers is returning a custom\n          204 Response that has data, but this is a violation of the HTTP spec\n          and could lead to unexpected behavior. 204 responses should have no\n          content (an empty string) as their body.");
        } else {
          this.data = "";
        } // Default data for "empty untyped" responses to empty JSON object

      } else if ((data === undefined || data === "") && !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")) {
        this.data = {};
      } else {
        this.data = data;
      } // Default "untyped" responses to application/json


      if (code !== 204 && !Object.prototype.hasOwnProperty.call(this.headers, "Content-Type")) {
        this.headers["Content-Type"] = "application/json";
      }
    }

    _createClass(Response, [{
      key: "toRackResponse",
      value: function toRackResponse() {
        return [this.code, this.headers, this.data];
      }
    }]);

    return Response;
  }();

  var nativeJoin = [].join;

  var ES3_STRINGS = indexedObject != Object;
  var STRICT_METHOD$1 = arrayMethodIsStrict('join', ',');

  // `Array.prototype.join` method
  // https://tc39.es/ecma262/#sec-array.prototype.join
  _export({ target: 'Array', proto: true, forced: ES3_STRINGS || !STRICT_METHOD$1 }, {
    join: function join(separator) {
      return nativeJoin.call(toIndexedObject(this), separator === undefined ? ',' : separator);
    }
  });

  // babel-minify and Closure Compiler transpiles RegExp('a', 'y') -> /a/y and it causes SyntaxError
  var $RegExp$2 = global_1.RegExp;

  var UNSUPPORTED_Y$2 = fails(function () {
    var re = $RegExp$2('a', 'y');
    re.lastIndex = 2;
    return re.exec('abcd') != null;
  });

  var BROKEN_CARET = fails(function () {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=773687
    var re = $RegExp$2('^r', 'gy');
    re.lastIndex = 2;
    return re.exec('str') != null;
  });

  var regexpStickyHelpers = {
  	UNSUPPORTED_Y: UNSUPPORTED_Y$2,
  	BROKEN_CARET: BROKEN_CARET
  };

  // `Object.defineProperties` method
  // https://tc39.es/ecma262/#sec-object.defineproperties
  // eslint-disable-next-line es/no-object-defineproperties -- safe
  var objectDefineProperties = descriptors ? Object.defineProperties : function defineProperties(O, Properties) {
    anObject(O);
    var keys = objectKeys(Properties);
    var length = keys.length;
    var index = 0;
    var key;
    while (length > index) objectDefineProperty.f(O, key = keys[index++], Properties[key]);
    return O;
  };

  var html = getBuiltIn('document', 'documentElement');

  /* global ActiveXObject -- old IE, WSH */








  var GT = '>';
  var LT = '<';
  var PROTOTYPE = 'prototype';
  var SCRIPT = 'script';
  var IE_PROTO$1 = sharedKey('IE_PROTO');

  var EmptyConstructor = function () { /* empty */ };

  var scriptTag = function (content) {
    return LT + SCRIPT + GT + content + LT + '/' + SCRIPT + GT;
  };

  // Create object with fake `null` prototype: use ActiveX Object with cleared prototype
  var NullProtoObjectViaActiveX = function (activeXDocument) {
    activeXDocument.write(scriptTag(''));
    activeXDocument.close();
    var temp = activeXDocument.parentWindow.Object;
    activeXDocument = null; // avoid memory leak
    return temp;
  };

  // Create object with fake `null` prototype: use iframe Object with cleared prototype
  var NullProtoObjectViaIFrame = function () {
    // Thrash, waste and sodomy: IE GC bug
    var iframe = documentCreateElement('iframe');
    var JS = 'java' + SCRIPT + ':';
    var iframeDocument;
    iframe.style.display = 'none';
    html.appendChild(iframe);
    // https://github.com/zloirock/core-js/issues/475
    iframe.src = String(JS);
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(scriptTag('document.F=Object'));
    iframeDocument.close();
    return iframeDocument.F;
  };

  // Check for document.domain and active x support
  // No need to use active x approach when document.domain is not set
  // see https://github.com/es-shims/es5-shim/issues/150
  // variation of https://github.com/kitcambridge/es5-shim/commit/4f738ac066346
  // avoid IE GC bug
  var activeXDocument;
  var NullProtoObject = function () {
    try {
      activeXDocument = new ActiveXObject('htmlfile');
    } catch (error) { /* ignore */ }
    NullProtoObject = typeof document != 'undefined'
      ? document.domain && activeXDocument
        ? NullProtoObjectViaActiveX(activeXDocument) // old IE
        : NullProtoObjectViaIFrame()
      : NullProtoObjectViaActiveX(activeXDocument); // WSH
    var length = enumBugKeys.length;
    while (length--) delete NullProtoObject[PROTOTYPE][enumBugKeys[length]];
    return NullProtoObject();
  };

  hiddenKeys$1[IE_PROTO$1] = true;

  // `Object.create` method
  // https://tc39.es/ecma262/#sec-object.create
  var objectCreate$1 = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      EmptyConstructor[PROTOTYPE] = anObject(O);
      result = new EmptyConstructor();
      EmptyConstructor[PROTOTYPE] = null;
      // add "__proto__" for Object.getPrototypeOf polyfill
      result[IE_PROTO$1] = O;
    } else result = NullProtoObject();
    return Properties === undefined ? result : objectDefineProperties(result, Properties);
  };

  // babel-minify and Closure Compiler transpiles RegExp('.', 's') -> /./s and it causes SyntaxError
  var $RegExp$1 = global_1.RegExp;

  var regexpUnsupportedDotAll = fails(function () {
    var re = $RegExp$1('.', 's');
    return !(re.dotAll && re.exec('\n') && re.flags === 's');
  });

  // babel-minify and Closure Compiler transpiles RegExp('(?<a>b)', 'g') -> /(?<a>b)/g and it causes SyntaxError
  var $RegExp = global_1.RegExp;

  var regexpUnsupportedNcg = fails(function () {
    var re = $RegExp('(?<a>b)', 'g');
    return re.exec('b').groups.a !== 'b' ||
      'b'.replace(re, '$<a>c') !== 'bc';
  });

  /* eslint-disable regexp/no-empty-capturing-group, regexp/no-empty-group, regexp/no-lazy-ends -- testing */
  /* eslint-disable regexp/no-useless-quantifier -- testing */





  var getInternalState$3 = internalState.get;



  var nativeExec = RegExp.prototype.exec;
  var nativeReplace = shared('native-string-replace', String.prototype.replace);

  var patchedExec = nativeExec;

  var UPDATES_LAST_INDEX_WRONG = (function () {
    var re1 = /a/;
    var re2 = /b*/g;
    nativeExec.call(re1, 'a');
    nativeExec.call(re2, 'a');
    return re1.lastIndex !== 0 || re2.lastIndex !== 0;
  })();

  var UNSUPPORTED_Y$1 = regexpStickyHelpers.UNSUPPORTED_Y || regexpStickyHelpers.BROKEN_CARET;

  // nonparticipating capturing group, copied from es5-shim's String#split patch.
  var NPCG_INCLUDED = /()??/.exec('')[1] !== undefined;

  var PATCH = UPDATES_LAST_INDEX_WRONG || NPCG_INCLUDED || UNSUPPORTED_Y$1 || regexpUnsupportedDotAll || regexpUnsupportedNcg;

  if (PATCH) {
    // eslint-disable-next-line max-statements -- TODO
    patchedExec = function exec(string) {
      var re = this;
      var state = getInternalState$3(re);
      var str = toString_1(string);
      var raw = state.raw;
      var result, reCopy, lastIndex, match, i, object, group;

      if (raw) {
        raw.lastIndex = re.lastIndex;
        result = patchedExec.call(raw, str);
        re.lastIndex = raw.lastIndex;
        return result;
      }

      var groups = state.groups;
      var sticky = UNSUPPORTED_Y$1 && re.sticky;
      var flags = regexpFlags.call(re);
      var source = re.source;
      var charsAdded = 0;
      var strCopy = str;

      if (sticky) {
        flags = flags.replace('y', '');
        if (flags.indexOf('g') === -1) {
          flags += 'g';
        }

        strCopy = str.slice(re.lastIndex);
        // Support anchored sticky behavior.
        if (re.lastIndex > 0 && (!re.multiline || re.multiline && str.charAt(re.lastIndex - 1) !== '\n')) {
          source = '(?: ' + source + ')';
          strCopy = ' ' + strCopy;
          charsAdded++;
        }
        // ^(? + rx + ) is needed, in combination with some str slicing, to
        // simulate the 'y' flag.
        reCopy = new RegExp('^(?:' + source + ')', flags);
      }

      if (NPCG_INCLUDED) {
        reCopy = new RegExp('^' + source + '$(?!\\s)', flags);
      }
      if (UPDATES_LAST_INDEX_WRONG) lastIndex = re.lastIndex;

      match = nativeExec.call(sticky ? reCopy : re, strCopy);

      if (sticky) {
        if (match) {
          match.input = match.input.slice(charsAdded);
          match[0] = match[0].slice(charsAdded);
          match.index = re.lastIndex;
          re.lastIndex += match[0].length;
        } else re.lastIndex = 0;
      } else if (UPDATES_LAST_INDEX_WRONG && match) {
        re.lastIndex = re.global ? match.index + match[0].length : lastIndex;
      }
      if (NPCG_INCLUDED && match && match.length > 1) {
        // Fix browsers whose `exec` methods don't consistently return `undefined`
        // for NPCG, like IE8. NOTE: This doesn' work for /(.?)?/
        nativeReplace.call(match[0], reCopy, function () {
          for (i = 1; i < arguments.length - 2; i++) {
            if (arguments[i] === undefined) match[i] = undefined;
          }
        });
      }

      if (match && groups) {
        match.groups = object = objectCreate$1(null);
        for (i = 0; i < groups.length; i++) {
          group = groups[i];
          object[group[0]] = match[group[1]];
        }
      }

      return match;
    };
  }

  var regexpExec = patchedExec;

  // `RegExp.prototype.exec` method
  // https://tc39.es/ecma262/#sec-regexp.prototype.exec
  _export({ target: 'RegExp', proto: true, forced: /./.exec !== regexpExec }, {
    exec: regexpExec
  });

  // TODO: Remove from `core-js@4` since it's moved to entry points







  var SPECIES$4 = wellKnownSymbol('species');
  var RegExpPrototype = RegExp.prototype;

  var fixRegexpWellKnownSymbolLogic = function (KEY, exec, FORCED, SHAM) {
    var SYMBOL = wellKnownSymbol(KEY);

    var DELEGATES_TO_SYMBOL = !fails(function () {
      // String methods call symbol-named RegEp methods
      var O = {};
      O[SYMBOL] = function () { return 7; };
      return ''[KEY](O) != 7;
    });

    var DELEGATES_TO_EXEC = DELEGATES_TO_SYMBOL && !fails(function () {
      // Symbol-named RegExp methods call .exec
      var execCalled = false;
      var re = /a/;

      if (KEY === 'split') {
        // We can't use real regex here since it causes deoptimization
        // and serious performance degradation in V8
        // https://github.com/zloirock/core-js/issues/306
        re = {};
        // RegExp[@@split] doesn't call the regex's exec method, but first creates
        // a new one. We need to return the patched regex when creating the new one.
        re.constructor = {};
        re.constructor[SPECIES$4] = function () { return re; };
        re.flags = '';
        re[SYMBOL] = /./[SYMBOL];
      }

      re.exec = function () { execCalled = true; return null; };

      re[SYMBOL]('');
      return !execCalled;
    });

    if (
      !DELEGATES_TO_SYMBOL ||
      !DELEGATES_TO_EXEC ||
      FORCED
    ) {
      var nativeRegExpMethod = /./[SYMBOL];
      var methods = exec(SYMBOL, ''[KEY], function (nativeMethod, regexp, str, arg2, forceStringMethod) {
        var $exec = regexp.exec;
        if ($exec === regexpExec || $exec === RegExpPrototype.exec) {
          if (DELEGATES_TO_SYMBOL && !forceStringMethod) {
            // The native String method already delegates to @@method (this
            // polyfilled function), leasing to infinite recursion.
            // We avoid it by directly calling the native @@method method.
            return { done: true, value: nativeRegExpMethod.call(regexp, str, arg2) };
          }
          return { done: true, value: nativeMethod.call(str, regexp, arg2) };
        }
        return { done: false };
      });

      redefine(String.prototype, KEY, methods[0]);
      redefine(RegExpPrototype, SYMBOL, methods[1]);
    }

    if (SHAM) createNonEnumerableProperty(RegExpPrototype[SYMBOL], 'sham', true);
  };

  var MATCH$1 = wellKnownSymbol('match');

  // `IsRegExp` abstract operation
  // https://tc39.es/ecma262/#sec-isregexp
  var isRegexp = function (it) {
    var isRegExp;
    return isObject$1(it) && ((isRegExp = it[MATCH$1]) !== undefined ? !!isRegExp : classofRaw(it) == 'RegExp');
  };

  // `Assert: IsConstructor(argument) is true`
  var aConstructor = function (argument) {
    if (isConstructor(argument)) return argument;
    throw TypeError(tryToString(argument) + ' is not a constructor');
  };

  var SPECIES$3 = wellKnownSymbol('species');

  // `SpeciesConstructor` abstract operation
  // https://tc39.es/ecma262/#sec-speciesconstructor
  var speciesConstructor = function (O, defaultConstructor) {
    var C = anObject(O).constructor;
    var S;
    return C === undefined || (S = anObject(C)[SPECIES$3]) == undefined ? defaultConstructor : aConstructor(S);
  };

  // `String.prototype.codePointAt` methods implementation
  var createMethod$1 = function (CONVERT_TO_STRING) {
    return function ($this, pos) {
      var S = toString_1(requireObjectCoercible($this));
      var position = toInteger$1(pos);
      var size = S.length;
      var first, second;
      if (position < 0 || position >= size) return CONVERT_TO_STRING ? '' : undefined;
      first = S.charCodeAt(position);
      return first < 0xD800 || first > 0xDBFF || position + 1 === size
        || (second = S.charCodeAt(position + 1)) < 0xDC00 || second > 0xDFFF
          ? CONVERT_TO_STRING ? S.charAt(position) : first
          : CONVERT_TO_STRING ? S.slice(position, position + 2) : (first - 0xD800 << 10) + (second - 0xDC00) + 0x10000;
    };
  };

  var stringMultibyte = {
    // `String.prototype.codePointAt` method
    // https://tc39.es/ecma262/#sec-string.prototype.codepointat
    codeAt: createMethod$1(false),
    // `String.prototype.at` method
    // https://github.com/mathiasbynens/String.prototype.at
    charAt: createMethod$1(true)
  };

  var charAt$1 = stringMultibyte.charAt;

  // `AdvanceStringIndex` abstract operation
  // https://tc39.es/ecma262/#sec-advancestringindex
  var advanceStringIndex = function (S, index, unicode) {
    return index + (unicode ? charAt$1(S, index).length : 1);
  };

  // `RegExpExec` abstract operation
  // https://tc39.es/ecma262/#sec-regexpexec
  var regexpExecAbstract = function (R, S) {
    var exec = R.exec;
    if (isCallable(exec)) {
      var result = exec.call(R, S);
      if (result !== null) anObject(result);
      return result;
    }
    if (classofRaw(R) === 'RegExp') return regexpExec.call(R, S);
    throw TypeError('RegExp#exec called on incompatible receiver');
  };

  var UNSUPPORTED_Y = regexpStickyHelpers.UNSUPPORTED_Y;
  var arrayPush = [].push;
  var min$3 = Math.min;
  var MAX_UINT32 = 0xFFFFFFFF;

  // Chrome 51 has a buggy "split" implementation when RegExp#exec !== nativeExec
  // Weex JS has frozen built-in prototypes, so use try / catch wrapper
  var SPLIT_WORKS_WITH_OVERWRITTEN_EXEC = !fails(function () {
    // eslint-disable-next-line regexp/no-empty-group -- required for testing
    var re = /(?:)/;
    var originalExec = re.exec;
    re.exec = function () { return originalExec.apply(this, arguments); };
    var result = 'ab'.split(re);
    return result.length !== 2 || result[0] !== 'a' || result[1] !== 'b';
  });

  // @@split logic
  fixRegexpWellKnownSymbolLogic('split', function (SPLIT, nativeSplit, maybeCallNative) {
    var internalSplit;
    if (
      'abbc'.split(/(b)*/)[1] == 'c' ||
      // eslint-disable-next-line regexp/no-empty-group -- required for testing
      'test'.split(/(?:)/, -1).length != 4 ||
      'ab'.split(/(?:ab)*/).length != 2 ||
      '.'.split(/(.?)(.?)/).length != 4 ||
      // eslint-disable-next-line regexp/no-empty-capturing-group, regexp/no-empty-group -- required for testing
      '.'.split(/()()/).length > 1 ||
      ''.split(/.?/).length
    ) {
      // based on es5-shim implementation, need to rework it
      internalSplit = function (separator, limit) {
        var string = toString_1(requireObjectCoercible(this));
        var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
        if (lim === 0) return [];
        if (separator === undefined) return [string];
        // If `separator` is not a regex, use native split
        if (!isRegexp(separator)) {
          return nativeSplit.call(string, separator, lim);
        }
        var output = [];
        var flags = (separator.ignoreCase ? 'i' : '') +
                    (separator.multiline ? 'm' : '') +
                    (separator.unicode ? 'u' : '') +
                    (separator.sticky ? 'y' : '');
        var lastLastIndex = 0;
        // Make `global` and avoid `lastIndex` issues by working with a copy
        var separatorCopy = new RegExp(separator.source, flags + 'g');
        var match, lastIndex, lastLength;
        while (match = regexpExec.call(separatorCopy, string)) {
          lastIndex = separatorCopy.lastIndex;
          if (lastIndex > lastLastIndex) {
            output.push(string.slice(lastLastIndex, match.index));
            if (match.length > 1 && match.index < string.length) arrayPush.apply(output, match.slice(1));
            lastLength = match[0].length;
            lastLastIndex = lastIndex;
            if (output.length >= lim) break;
          }
          if (separatorCopy.lastIndex === match.index) separatorCopy.lastIndex++; // Avoid an infinite loop
        }
        if (lastLastIndex === string.length) {
          if (lastLength || !separatorCopy.test('')) output.push('');
        } else output.push(string.slice(lastLastIndex));
        return output.length > lim ? output.slice(0, lim) : output;
      };
    // Chakra, V8
    } else if ('0'.split(undefined, 0).length) {
      internalSplit = function (separator, limit) {
        return separator === undefined && limit === 0 ? [] : nativeSplit.call(this, separator, limit);
      };
    } else internalSplit = nativeSplit;

    return [
      // `String.prototype.split` method
      // https://tc39.es/ecma262/#sec-string.prototype.split
      function split(separator, limit) {
        var O = requireObjectCoercible(this);
        var splitter = separator == undefined ? undefined : getMethod(separator, SPLIT);
        return splitter
          ? splitter.call(separator, O, limit)
          : internalSplit.call(toString_1(O), separator, limit);
      },
      // `RegExp.prototype[@@split]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@split
      //
      // NOTE: This cannot be properly polyfilled in engines that don't support
      // the 'y' flag.
      function (string, limit) {
        var rx = anObject(this);
        var S = toString_1(string);
        var res = maybeCallNative(internalSplit, rx, S, limit, internalSplit !== nativeSplit);

        if (res.done) return res.value;

        var C = speciesConstructor(rx, RegExp);

        var unicodeMatching = rx.unicode;
        var flags = (rx.ignoreCase ? 'i' : '') +
                    (rx.multiline ? 'm' : '') +
                    (rx.unicode ? 'u' : '') +
                    (UNSUPPORTED_Y ? 'g' : 'y');

        // ^(? + rx + ) is needed, in combination with some S slicing, to
        // simulate the 'y' flag.
        var splitter = new C(UNSUPPORTED_Y ? '^(?:' + rx.source + ')' : rx, flags);
        var lim = limit === undefined ? MAX_UINT32 : limit >>> 0;
        if (lim === 0) return [];
        if (S.length === 0) return regexpExecAbstract(splitter, S) === null ? [S] : [];
        var p = 0;
        var q = 0;
        var A = [];
        while (q < S.length) {
          splitter.lastIndex = UNSUPPORTED_Y ? 0 : q;
          var z = regexpExecAbstract(splitter, UNSUPPORTED_Y ? S.slice(q) : S);
          var e;
          if (
            z === null ||
            (e = min$3(toLength(splitter.lastIndex + (UNSUPPORTED_Y ? q : 0)), S.length)) === p
          ) {
            q = advanceStringIndex(S, q, unicodeMatching);
          } else {
            A.push(S.slice(p, q));
            if (A.length === lim) return A;
            for (var i = 1; i <= z.length - 1; i++) {
              A.push(z[i]);
              if (A.length === lim) return A;
            }
            q = p = e;
          }
        }
        A.push(S.slice(p));
        return A;
      }
    ];
  }, !SPLIT_WORKS_WITH_OVERWRITTEN_EXEC, UNSUPPORTED_Y);

  var toString$2 = Object.prototype.toString;

  function isFunc(obj) {
    return toString$2.call(obj) === "[object Function]";
  }

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function icPart(str) {
    return str.split("").map(function (c) {
      return "(?:" + c.toUpperCase() + "|" + c.toLowerCase() + ")";
    }).join("");
  }

  function remove(arr, elem) {
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i] === elem) {
        Array.prototype.splice.call(arr, i, 1);
      }
    }
  }

  function hasProp(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  var instances = {};

  var Inflector = function () {
    createClass(Inflector, null, [{
      key: "getInstance",
      value: function getInstance(locale) {
        instances[locale] = instances[locale] || new Inflector();
        return instances[locale];
      }
    }]);

    function Inflector() {
      classCallCheck(this, Inflector);

      this.plurals = [];
      this.singulars = [];
      this.uncountables = [];
      this.humans = [];
      this.acronyms = {};
      this.acronymRegex = /(?=a)b/;
    }

    createClass(Inflector, [{
      key: "acronym",
      value: function acronym(word) {
        this.acronyms[word.toLowerCase()] = word;

        var values = [];

        for (var key in this.acronyms) {
          if (hasProp(this.acronyms, key)) {
            values.push(this.acronyms[key]);
          }
        }

        this.acronymRegex = new RegExp(values.join("|"));
      }
    }, {
      key: "plural",
      value: function plural(rule, replacement) {
        if (typeof rule === "string") {
          remove(this.uncountables, rule);
        }

        remove(this.uncountables, replacement);
        this.plurals.unshift([rule, replacement]);
      }
    }, {
      key: "singular",
      value: function singular(rule, replacement) {
        if (typeof rule === "string") {
          remove(this.uncountables, rule);
        }

        remove(this.uncountables, replacement);
        this.singulars.unshift([rule, replacement]);
      }
    }, {
      key: "irregular",
      value: function irregular(singular, plural) {
        remove(this.uncountables, singular);
        remove(this.uncountables, plural);

        var s0 = singular[0];
        var sRest = singular.substr(1);

        var p0 = plural[0];
        var pRest = plural.substr(1);

        if (s0.toUpperCase() === p0.toUpperCase()) {
          this.plural(new RegExp("(" + s0 + ")" + sRest + "$", "i"), "$1" + pRest);
          this.plural(new RegExp("(" + p0 + ")" + pRest + "$", "i"), "$1" + pRest);

          this.singular(new RegExp("(" + s0 + ")" + sRest + "$", "i"), "$1" + sRest);
          this.singular(new RegExp("(" + p0 + ")" + pRest + "$", "i"), "$1" + sRest);
        } else {
          var sRestIC = icPart(sRest);
          var pRestIC = icPart(pRest);

          this.plural(new RegExp(s0.toUpperCase() + sRestIC + "$"), p0.toUpperCase() + pRest);
          this.plural(new RegExp(s0.toLowerCase() + sRestIC + "$"), p0.toLowerCase() + pRest);
          this.plural(new RegExp(p0.toUpperCase() + pRestIC + "$"), p0.toUpperCase() + pRest);
          this.plural(new RegExp(p0.toLowerCase() + pRestIC + "$"), p0.toLowerCase() + pRest);

          this.singular(new RegExp(s0.toUpperCase() + sRestIC + "$"), s0.toUpperCase() + sRest);
          this.singular(new RegExp(s0.toLowerCase() + sRestIC + "$"), s0.toLowerCase() + sRest);
          this.singular(new RegExp(p0.toUpperCase() + pRestIC + "$"), s0.toUpperCase() + sRest);
          this.singular(new RegExp(p0.toLowerCase() + pRestIC + "$"), s0.toLowerCase() + sRest);
        }
      }
    }, {
      key: "uncountable",
      value: function uncountable() {
        for (var _len = arguments.length, words = Array(_len), _key = 0; _key < _len; _key++) {
          words[_key] = arguments[_key];
        }

        this.uncountables = this.uncountables.concat(words);
      }
    }, {
      key: "human",
      value: function human(rule, replacement) {
        this.humans.unshift([rule, replacement]);
      }
    }, {
      key: "clear",
      value: function clear() {
        var scope = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "all";

        if (scope === "all") {
          this.plurals = [];
          this.singulars = [];
          this.uncountables = [];
          this.humans = [];
        } else {
          this[scope] = [];
        }
      }
    }]);
    return Inflector;
  }();

  function en(inflector) {
    inflector.plural(/$/, "s");
    inflector.plural(/s$/i, "s");
    inflector.plural(/^(ax|test)is$/i, "$1es");
    inflector.plural(/(octop|vir)us$/i, "$1i");
    inflector.plural(/(octop|vir)i$/i, "$1i");
    inflector.plural(/(alias|status)$/i, "$1es");
    inflector.plural(/(bu)s$/i, "$1ses");
    inflector.plural(/(buffal|tomat)o$/i, "$1oes");
    inflector.plural(/([ti])um$/i, "$1a");
    inflector.plural(/([ti])a$/i, "$1a");
    inflector.plural(/sis$/i, "ses");
    inflector.plural(/(?:([^f])fe|([lr])f)$/i, "$1$2ves");
    inflector.plural(/(hive)$/i, "$1s");
    inflector.plural(/([^aeiouy]|qu)y$/i, "$1ies");
    inflector.plural(/(x|ch|ss|sh)$/i, "$1es");
    inflector.plural(/(matr|vert|ind)(?:ix|ex)$/i, "$1ices");
    inflector.plural(/^(m|l)ouse$/i, "$1ice");
    inflector.plural(/^(m|l)ice$/i, "$1ice");
    inflector.plural(/^(ox)$/i, "$1en");
    inflector.plural(/^(oxen)$/i, "$1");
    inflector.plural(/(quiz)$/i, "$1zes");

    inflector.singular(/s$/i, "");
    inflector.singular(/(ss)$/i, "$1");
    inflector.singular(/(n)ews$/i, "$1ews");
    inflector.singular(/([ti])a$/i, "$1um");
    inflector.singular(/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(sis|ses)$/i, "$1sis");
    inflector.singular(/(^analy)(sis|ses)$/i, "$1sis");
    inflector.singular(/([^f])ves$/i, "$1fe");
    inflector.singular(/(hive)s$/i, "$1");
    inflector.singular(/(tive)s$/i, "$1");
    inflector.singular(/([lr])ves$/i, "$1f");
    inflector.singular(/([^aeiouy]|qu)ies$/i, "$1y");
    inflector.singular(/(s)eries$/i, "$1eries");
    inflector.singular(/(m)ovies$/i, "$1ovie");
    inflector.singular(/(x|ch|ss|sh)es$/i, "$1");
    inflector.singular(/^(m|l)ice$/i, "$1ouse");
    inflector.singular(/(bus)(es)?$/i, "$1");
    inflector.singular(/(o)es$/i, "$1");
    inflector.singular(/(shoe)s$/i, "$1");
    inflector.singular(/(cris|test)(is|es)$/i, "$1is");
    inflector.singular(/^(a)x[ie]s$/i, "$1xis");
    inflector.singular(/(octop|vir)(us|i)$/i, "$1us");
    inflector.singular(/(alias|status)(es)?$/i, "$1");
    inflector.singular(/^(ox)en/i, "$1");
    inflector.singular(/(vert|ind)ices$/i, "$1ex");
    inflector.singular(/(matr)ices$/i, "$1ix");
    inflector.singular(/(quiz)zes$/i, "$1");
    inflector.singular(/(database)s$/i, "$1");

    inflector.irregular("person", "people");
    inflector.irregular("man", "men");
    inflector.irregular("child", "children");
    inflector.irregular("sex", "sexes");
    inflector.irregular("move", "moves");
    inflector.irregular("zombie", "zombies");

    inflector.uncountable("equipment", "information", "rice", "money", "species", "series", "fish", "sheep", "jeans", "police");
  }

  var defaults$1 = {
    en: en
  };

  function inflections(locale, fn) {
    if (isFunc(locale)) {
      fn = locale;
      locale = null;
    }

    locale = locale || "en";

    if (fn) {
      fn(Inflector.getInstance(locale));
    } else {
      return Inflector.getInstance(locale);
    }
  }

  for (var locale in defaults$1) {
    inflections(locale, defaults$1[locale]);
  }

  function applyInflections(word, rules) {
    var result = "" + word,
        rule,
        regex,
        replacement;

    if (result.length === 0) {
      return result;
    } else {
      var match = result.toLowerCase().match(/\b\w+$/);

      if (match && inflections().uncountables.indexOf(match[0]) > -1) {
        return result;
      } else {
        for (var i = 0, ii = rules.length; i < ii; i++) {
          rule = rules[i];

          regex = rule[0];
          replacement = rule[1];

          if (result.match(regex)) {
            result = result.replace(regex, replacement);
            break;
          }
        }

        return result;
      }
    }
  }

  function pluralize(word) {
    var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "en";

    return applyInflections(word, inflections(locale).plurals);
  }

  function singularize(word) {
    var locale = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "en";

    return applyInflections(word, inflections(locale).singulars);
  }

  function capitalize$1(str) {
    var result = str === null || str === undefined ? "" : String(str);
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  function camelize$1(term, uppercaseFirstLetter) {
    if (uppercaseFirstLetter === null || uppercaseFirstLetter === undefined) {
      uppercaseFirstLetter = true;
    }

    var result = "" + term;

    if (uppercaseFirstLetter) {
      result = result.replace(/^[a-z\d]*/, function (a) {
        return inflections().acronyms[a] || capitalize$1(a);
      });
    } else {
      result = result.replace(new RegExp("^(?:" + inflections().acronymRegex.source + "(?=\\b|[A-Z_])|\\w)"), function (a) {
        return a.toLowerCase();
      });
    }

    result = result.replace(/(?:_|(\/))([a-z\d]*)/gi, function (match, a, b, idx, string) {
      a || (a = "");
      return "" + a + (inflections().acronyms[b] || capitalize$1(b));
    });

    return result;
  }

  function underscore$1(camelCasedWord) {
    var result = "" + camelCasedWord;

    result = result.replace(new RegExp("(?:([A-Za-z\\d])|^)(" + inflections().acronymRegex.source + ")(?=\\b|[^a-z])", "g"), function (match, $1, $2) {
      return "" + ($1 || "") + ($1 ? "_" : "") + $2.toLowerCase();
    });

    result = result.replace(/([A-Z\d]+)([A-Z][a-z])/g, "$1_$2");
    result = result.replace(/([a-z\d])([A-Z])/g, "$1_$2");
    result = result.replace(/-/g, "_");

    return result.toLowerCase();
  }

  function dasherize$1(underscoredWord) {
    return underscoredWord.replace(/_/g, "-");
  }

  // prettier-ignore
  var DEFAULT_APPROXIMATIONS = {
    'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A', 'Æ': 'AE',
    'Ç': 'C', 'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E', 'Ì': 'I', 'Í': 'I',
    'Î': 'I', 'Ï': 'I', 'Ð': 'D', 'Ñ': 'N', 'Ò': 'O', 'Ó': 'O', 'Ô': 'O',
    'Õ': 'O', 'Ö': 'O', '×': 'x', 'Ø': 'O', 'Ù': 'U', 'Ú': 'U', 'Û': 'U',
    'Ü': 'U', 'Ý': 'Y', 'Þ': 'Th', 'ß': 'ss', 'à': 'a', 'á': 'a', 'â': 'a',
    'ã': 'a', 'ä': 'a', 'å': 'a', 'æ': 'ae', 'ç': 'c', 'è': 'e', 'é': 'e',
    'ê': 'e', 'ë': 'e', 'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i', 'ð': 'd',
    'ñ': 'n', 'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
    'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u', 'ý': 'y', 'þ': 'th', 'ÿ': 'y',
    'Ā': 'A', 'ā': 'a', 'Ă': 'A', 'ă': 'a', 'Ą': 'A', 'ą': 'a', 'Ć': 'C',
    'ć': 'c', 'Ĉ': 'C', 'ĉ': 'c', 'Ċ': 'C', 'ċ': 'c', 'Č': 'C', 'č': 'c',
    'Ď': 'D', 'ď': 'd', 'Đ': 'D', 'đ': 'd', 'Ē': 'E', 'ē': 'e', 'Ĕ': 'E',
    'ĕ': 'e', 'Ė': 'E', 'ė': 'e', 'Ę': 'E', 'ę': 'e', 'Ě': 'E', 'ě': 'e',
    'Ĝ': 'G', 'ĝ': 'g', 'Ğ': 'G', 'ğ': 'g', 'Ġ': 'G', 'ġ': 'g', 'Ģ': 'G',
    'ģ': 'g', 'Ĥ': 'H', 'ĥ': 'h', 'Ħ': 'H', 'ħ': 'h', 'Ĩ': 'I', 'ĩ': 'i',
    'Ī': 'I', 'ī': 'i', 'Ĭ': 'I', 'ĭ': 'i', 'Į': 'I', 'į': 'i', 'İ': 'I',
    'ı': 'i', 'Ĳ': 'IJ', 'ĳ': 'ij', 'Ĵ': 'J', 'ĵ': 'j', 'Ķ': 'K', 'ķ': 'k',
    'ĸ': 'k', 'Ĺ': 'L', 'ĺ': 'l', 'Ļ': 'L', 'ļ': 'l', 'Ľ': 'L', 'ľ': 'l',
    'Ŀ': 'L', 'ŀ': 'l', 'Ł': 'L', 'ł': 'l', 'Ń': 'N', 'ń': 'n', 'Ņ': 'N',
    'ņ': 'n', 'Ň': 'N', 'ň': 'n', 'ŉ': '\'n', 'Ŋ': 'NG', 'ŋ': 'ng',
    'Ō': 'O', 'ō': 'o', 'Ŏ': 'O', 'ŏ': 'o', 'Ő': 'O', 'ő': 'o', 'Œ': 'OE',
    'œ': 'oe', 'Ŕ': 'R', 'ŕ': 'r', 'Ŗ': 'R', 'ŗ': 'r', 'Ř': 'R', 'ř': 'r',
    'Ś': 'S', 'ś': 's', 'Ŝ': 'S', 'ŝ': 's', 'Ş': 'S', 'ş': 's', 'Š': 'S',
    'š': 's', 'Ţ': 'T', 'ţ': 't', 'Ť': 'T', 'ť': 't', 'Ŧ': 'T', 'ŧ': 't',
    'Ũ': 'U', 'ũ': 'u', 'Ū': 'U', 'ū': 'u', 'Ŭ': 'U', 'ŭ': 'u', 'Ů': 'U',
    'ů': 'u', 'Ű': 'U', 'ű': 'u', 'Ų': 'U', 'ų': 'u', 'Ŵ': 'W', 'ŵ': 'w',
    'Ŷ': 'Y', 'ŷ': 'y', 'Ÿ': 'Y', 'Ź': 'Z', 'ź': 'z', 'Ż': 'Z', 'ż': 'z',
    'Ž': 'Z', 'ž': 'z',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'E',
    'Ж': 'ZH', 'З': 'Z', 'И': 'I', 'Й': 'J', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'KH', 'Ц': 'C', 'Ч': 'CH', 'Ш': 'SH', 'Щ': 'SHCH',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'YU', 'Я': 'YA',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'j', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  var DEFAULT_REPLACEMENT_CHAR = "?";

  var instances$1 = {};

  (function () {
    createClass(Transliterator, null, [{
      key: 'getInstance',
      value: function getInstance(locale) {
        instances$1[locale] = instances$1[locale] || new Transliterator();
        return instances$1[locale];
      }
    }]);

    function Transliterator() {
      classCallCheck(this, Transliterator);

      this.approximations = {};

      for (var char in DEFAULT_APPROXIMATIONS) {
        this.approximate(char, DEFAULT_APPROXIMATIONS[char]);
      }
    }

    createClass(Transliterator, [{
      key: 'approximate',
      value: function approximate(char, replacement) {
        this.approximations[char] = replacement;
      }
    }, {
      key: 'transliterate',
      value: function transliterate(string, replacement) {
        var _this = this;

        return string.replace(/[^\u0000-\u007f]/g, function (c) {
          return _this.approximations[c] || replacement || DEFAULT_REPLACEMENT_CHAR;
        });
      }
    }]);
    return Transliterator;
  })();

  /**
   * The base implementation of `_.slice` without an iteratee call guard.
   *
   * @private
   * @param {Array} array The array to slice.
   * @param {number} [start=0] The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the slice of `array`.
   */
  function baseSlice(array, start, end) {
    var index = -1,
        length = array.length;

    if (start < 0) {
      start = -start > length ? 0 : (length + start);
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : ((end - start) >>> 0);
    start >>>= 0;

    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }

  var _baseSlice = baseSlice;

  /**
   * Casts `array` to a slice if it's needed.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {number} start The start position.
   * @param {number} [end=array.length] The end position.
   * @returns {Array} Returns the cast slice.
   */
  function castSlice(array, start, end) {
    var length = array.length;
    end = end === undefined ? length : end;
    return (!start && end >= length) ? array : _baseSlice(array, start, end);
  }

  var _castSlice = castSlice;

  /** Used to compose unicode character classes. */
  var rsAstralRange$1 = '\\ud800-\\udfff',
      rsComboMarksRange$1 = '\\u0300-\\u036f',
      reComboHalfMarksRange$1 = '\\ufe20-\\ufe2f',
      rsComboSymbolsRange$1 = '\\u20d0-\\u20ff',
      rsComboRange$1 = rsComboMarksRange$1 + reComboHalfMarksRange$1 + rsComboSymbolsRange$1,
      rsVarRange$1 = '\\ufe0e\\ufe0f';

  /** Used to compose unicode capture groups. */
  var rsZWJ$1 = '\\u200d';

  /** Used to detect strings with [zero-width joiners or code points from the astral planes](http://eev.ee/blog/2015/09/12/dark-corners-of-unicode/). */
  var reHasUnicode = RegExp('[' + rsZWJ$1 + rsAstralRange$1  + rsComboRange$1 + rsVarRange$1 + ']');

  /**
   * Checks if `string` contains Unicode symbols.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {boolean} Returns `true` if a symbol is found, else `false`.
   */
  function hasUnicode(string) {
    return reHasUnicode.test(string);
  }

  var _hasUnicode = hasUnicode;

  /**
   * Converts an ASCII `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function asciiToArray(string) {
    return string.split('');
  }

  var _asciiToArray = asciiToArray;

  /** Used to compose unicode character classes. */
  var rsAstralRange = '\\ud800-\\udfff',
      rsComboMarksRange = '\\u0300-\\u036f',
      reComboHalfMarksRange = '\\ufe20-\\ufe2f',
      rsComboSymbolsRange = '\\u20d0-\\u20ff',
      rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange,
      rsVarRange = '\\ufe0e\\ufe0f';

  /** Used to compose unicode capture groups. */
  var rsAstral = '[' + rsAstralRange + ']',
      rsCombo = '[' + rsComboRange + ']',
      rsFitz = '\\ud83c[\\udffb-\\udfff]',
      rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')',
      rsNonAstral = '[^' + rsAstralRange + ']',
      rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}',
      rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]',
      rsZWJ = '\\u200d';

  /** Used to compose unicode regexes. */
  var reOptMod = rsModifier + '?',
      rsOptVar = '[' + rsVarRange + ']?',
      rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*',
      rsSeq = rsOptVar + reOptMod + rsOptJoin,
      rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';

  /** Used to match [string symbols](https://mathiasbynens.be/notes/javascript-unicode). */
  var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

  /**
   * Converts a Unicode `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function unicodeToArray(string) {
    return string.match(reUnicode) || [];
  }

  var _unicodeToArray = unicodeToArray;

  /**
   * Converts `string` to an array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the converted array.
   */
  function stringToArray(string) {
    return _hasUnicode(string)
      ? _unicodeToArray(string)
      : _asciiToArray(string);
  }

  var _stringToArray = stringToArray;

  /**
   * Creates a function like `_.lowerFirst`.
   *
   * @private
   * @param {string} methodName The name of the `String` case method to use.
   * @returns {Function} Returns the new case function.
   */
  function createCaseFirst(methodName) {
    return function(string) {
      string = toString_1$1(string);

      var strSymbols = _hasUnicode(string)
        ? _stringToArray(string)
        : undefined;

      var chr = strSymbols
        ? strSymbols[0]
        : string.charAt(0);

      var trailing = strSymbols
        ? _castSlice(strSymbols, 1).join('')
        : string.slice(1);

      return chr[methodName]() + trailing;
    };
  }

  var _createCaseFirst = createCaseFirst;

  /**
   * Converts the first character of `string` to lower case.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category String
   * @param {string} [string=''] The string to convert.
   * @returns {string} Returns the converted string.
   * @example
   *
   * _.lowerFirst('Fred');
   * // => 'fred'
   *
   * _.lowerFirst('FRED');
   * // => 'fRED'
   */
  var lowerFirst = _createCaseFirst('toLowerCase');

  var lowerFirst_1 = lowerFirst;

  var camelizeCache = {};
  var dasherizeCache = {};
  var underscoreCache = {};
  var capitalizeCache = {};
  /**
   * @param {String} word
   * @hide
   */

  function camelize(word) {
    if (typeof camelizeCache[word] !== "string") {
      var camelizedWord = camelize$1(underscore(word), false);
      /*
       The `ember-inflector` package's version of camelize lower-cases the first
       word after a slash, e.g.
            camelize('my-things/nice-watch'); // 'myThings/niceWatch'
        The `inflected` package doesn't, so we make that change here to not break
       existing functionality. (This affects the name of the schema collections.)
      */


      var camelized = camelizedWord.split("/").map(lowerFirst_1).join("/");
      camelizeCache[word] = camelized;
    }

    return camelizeCache[word];
  }
  /**
   * @param {String} word
   * @hide
   */

  function dasherize(word) {
    if (typeof dasherizeCache[word] !== "string") {
      var dasherized = dasherize$1(underscore(word));

      dasherizeCache[word] = dasherized;
    }

    return dasherizeCache[word];
  }
  function underscore(word) {
    if (typeof underscoreCache[word] !== "string") {
      var underscored = underscore$1(word);

      underscoreCache[word] = underscored;
    }

    return underscoreCache[word];
  }
  function capitalize(word) {
    if (typeof capitalizeCache[word] !== "string") {
      var capitalized = capitalize$1(word);

      capitalizeCache[word] = capitalized;
    }

    return capitalizeCache[word];
  }

  /**
    @hide
  */

  function isAssociation (object) {
    return isPlainObject$1(object) && object.__isAssociation__ === true;
  }

  var floor$1 = Math.floor;
  var replace = ''.replace;
  var SUBSTITUTION_SYMBOLS = /\$([$&'`]|\d{1,2}|<[^>]*>)/g;
  var SUBSTITUTION_SYMBOLS_NO_NAMED = /\$([$&'`]|\d{1,2})/g;

  // `GetSubstitution` abstract operation
  // https://tc39.es/ecma262/#sec-getsubstitution
  var getSubstitution = function (matched, str, position, captures, namedCaptures, replacement) {
    var tailPos = position + matched.length;
    var m = captures.length;
    var symbols = SUBSTITUTION_SYMBOLS_NO_NAMED;
    if (namedCaptures !== undefined) {
      namedCaptures = toObject(namedCaptures);
      symbols = SUBSTITUTION_SYMBOLS;
    }
    return replace.call(replacement, symbols, function (match, ch) {
      var capture;
      switch (ch.charAt(0)) {
        case '$': return '$';
        case '&': return matched;
        case '`': return str.slice(0, position);
        case "'": return str.slice(tailPos);
        case '<':
          capture = namedCaptures[ch.slice(1, -1)];
          break;
        default: // \d\d?
          var n = +ch;
          if (n === 0) return match;
          if (n > m) {
            var f = floor$1(n / 10);
            if (f === 0) return match;
            if (f <= m) return captures[f - 1] === undefined ? ch.charAt(1) : captures[f - 1] + ch.charAt(1);
            return match;
          }
          capture = captures[n - 1];
      }
      return capture === undefined ? '' : capture;
    });
  };

  var REPLACE = wellKnownSymbol('replace');
  var max$2 = Math.max;
  var min$2 = Math.min;

  var maybeToString = function (it) {
    return it === undefined ? it : String(it);
  };

  // IE <= 11 replaces $0 with the whole match, as if it was $&
  // https://stackoverflow.com/questions/6024666/getting-ie-to-replace-a-regex-with-the-literal-string-0
  var REPLACE_KEEPS_$0 = (function () {
    // eslint-disable-next-line regexp/prefer-escape-replacement-dollar-char -- required for testing
    return 'a'.replace(/./, '$0') === '$0';
  })();

  // Safari <= 13.0.3(?) substitutes nth capture where n>m with an empty string
  var REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE = (function () {
    if (/./[REPLACE]) {
      return /./[REPLACE]('a', '$0') === '';
    }
    return false;
  })();

  var REPLACE_SUPPORTS_NAMED_GROUPS = !fails(function () {
    var re = /./;
    re.exec = function () {
      var result = [];
      result.groups = { a: '7' };
      return result;
    };
    // eslint-disable-next-line regexp/no-useless-dollar-replacements -- false positive
    return ''.replace(re, '$<a>') !== '7';
  });

  // @@replace logic
  fixRegexpWellKnownSymbolLogic('replace', function (_, nativeReplace, maybeCallNative) {
    var UNSAFE_SUBSTITUTE = REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE ? '$' : '$0';

    return [
      // `String.prototype.replace` method
      // https://tc39.es/ecma262/#sec-string.prototype.replace
      function replace(searchValue, replaceValue) {
        var O = requireObjectCoercible(this);
        var replacer = searchValue == undefined ? undefined : getMethod(searchValue, REPLACE);
        return replacer
          ? replacer.call(searchValue, O, replaceValue)
          : nativeReplace.call(toString_1(O), searchValue, replaceValue);
      },
      // `RegExp.prototype[@@replace]` method
      // https://tc39.es/ecma262/#sec-regexp.prototype-@@replace
      function (string, replaceValue) {
        var rx = anObject(this);
        var S = toString_1(string);

        if (
          typeof replaceValue === 'string' &&
          replaceValue.indexOf(UNSAFE_SUBSTITUTE) === -1 &&
          replaceValue.indexOf('$<') === -1
        ) {
          var res = maybeCallNative(nativeReplace, rx, S, replaceValue);
          if (res.done) return res.value;
        }

        var functionalReplace = isCallable(replaceValue);
        if (!functionalReplace) replaceValue = toString_1(replaceValue);

        var global = rx.global;
        if (global) {
          var fullUnicode = rx.unicode;
          rx.lastIndex = 0;
        }
        var results = [];
        while (true) {
          var result = regexpExecAbstract(rx, S);
          if (result === null) break;

          results.push(result);
          if (!global) break;

          var matchStr = toString_1(result[0]);
          if (matchStr === '') rx.lastIndex = advanceStringIndex(S, toLength(rx.lastIndex), fullUnicode);
        }

        var accumulatedResult = '';
        var nextSourcePosition = 0;
        for (var i = 0; i < results.length; i++) {
          result = results[i];

          var matched = toString_1(result[0]);
          var position = max$2(min$2(toInteger$1(result.index), S.length), 0);
          var captures = [];
          // NOTE: This is equivalent to
          //   captures = result.slice(1).map(maybeToString)
          // but for some reason `nativeSlice.call(result, 1, result.length)` (called in
          // the slice polyfill when slicing native arrays) "doesn't work" in safari 9 and
          // causes a crash (https://pastebin.com/N21QzeQA) when trying to debug it.
          for (var j = 1; j < result.length; j++) captures.push(maybeToString(result[j]));
          var namedCaptures = result.groups;
          if (functionalReplace) {
            var replacerArgs = [matched].concat(captures, position, S);
            if (namedCaptures !== undefined) replacerArgs.push(namedCaptures);
            var replacement = toString_1(replaceValue.apply(undefined, replacerArgs));
          } else {
            replacement = getSubstitution(matched, S, position, captures, namedCaptures, replaceValue);
          }
          if (position >= nextSourcePosition) {
            accumulatedResult += S.slice(nextSourcePosition, position) + replacement;
            nextSourcePosition = position + matched.length;
          }
        }
        return accumulatedResult + S.slice(nextSourcePosition);
      }
    ];
  }, !REPLACE_SUPPORTS_NAMED_GROUPS || !REPLACE_KEEPS_$0 || REGEXP_REPLACE_SUBSTITUTES_UNDEFINED_CAPTURE);

  /* eslint no-console: 0 */
  var errorProps = ["description", "fileName", "lineNumber", "message", "name", "number", "stack"];
  /**
    @hide
  */

  function assert(bool, text) {
    if (typeof bool === "string" && !text) {
      // console.error(`Mirage: ${bool}`);
      throw new MirageError(bool);
    }

    if (!bool) {
      // console.error(`Mirage: ${text}`);
      throw new MirageError(text.replace(/^ +/gm, "") || "Assertion failed");
    }
  }
  /**
    @public
    @hide
    Copied from ember-metal/error
  */

  function MirageError(message, stack) {
    var tmp = Error(message);

    if (stack) {
      tmp.stack = stack;
    }

    for (var idx = 0; idx < errorProps.length; idx++) {
      var prop = errorProps[idx];

      if (["description", "message", "stack"].indexOf(prop) > -1) {
        this[prop] = "Mirage: ".concat(tmp[prop]);
      } else {
        this[prop] = tmp[prop];
      }
    }
  }
  MirageError.prototype = Object.create(Error.prototype);

  var FUNCTION_NAME_EXISTS = functionName.EXISTS;
  var defineProperty$2 = objectDefineProperty.f;

  var FunctionPrototype = Function.prototype;
  var FunctionPrototypeToString = FunctionPrototype.toString;
  var nameRE = /^\s*function ([^ (]*)/;
  var NAME = 'name';

  // Function instances `.name` property
  // https://tc39.es/ecma262/#sec-function-instances-name
  if (descriptors && !FUNCTION_NAME_EXISTS) {
    defineProperty$2(FunctionPrototype, NAME, {
      configurable: true,
      get: function () {
        try {
          return FunctionPrototypeToString.call(this).match(nameRE)[1];
        } catch (error) {
          return '';
        }
      }
    });
  }

  var UNSCOPABLES = wellKnownSymbol('unscopables');
  var ArrayPrototype$1 = Array.prototype;

  // Array.prototype[@@unscopables]
  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  if (ArrayPrototype$1[UNSCOPABLES] == undefined) {
    objectDefineProperty.f(ArrayPrototype$1, UNSCOPABLES, {
      configurable: true,
      value: objectCreate$1(null)
    });
  }

  // add a key to Array.prototype[@@unscopables]
  var addToUnscopables = function (key) {
    ArrayPrototype$1[UNSCOPABLES][key] = true;
  };

  var $find = arrayIteration.find;


  var FIND = 'find';
  var SKIPS_HOLES = true;

  // Shouldn't skip holes
  if (FIND in []) Array(1)[FIND](function () { SKIPS_HOLES = false; });

  // `Array.prototype.find` method
  // https://tc39.es/ecma262/#sec-array.prototype.find
  _export({ target: 'Array', proto: true, forced: SKIPS_HOLES }, {
    find: function find(callbackfn /* , that = undefined */) {
      return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables(FIND);

  /**
    Associations represent relationships between your Models.

    The `hasMany` and `belongsTo` helpers are how you actually define relationships:
    
    ```js
    import { createServer, Model, hasMany, belongsTo }

    createServer({
      models: {
        user: Model.extend({
          comments: hasMany()
        }),
        comments: Model.extend({
          user: belongsTo()
        })
      }
    })
    ```

    View [the Relationships](https://miragejs.com/docs/main-concepts/relationships/) guide to learn more about setting up relationships.

    Each usage of the helper registers an Association (either a `HasMany` association or `BelongsTo` association) with your server's `Schema`. You can access these associations using either the `schema.associationsFor()` method, or the `associations` property on individual model instances.

    You can then introspect the associations to do things like dynamically build up your JSON response in your serializers.

    @class Association
    @constructor
    @public
  */

  var Association = /*#__PURE__*/function () {
    function Association(modelName, opts) {
      _classCallCheck(this, Association);

      /**
        The modelName of the associated model.
         For example, given this configuration
        
        ```js
        createServer({
          models: {
            user: Model,
            comment: Model.extend({
              user: belongsTo()
            })
          }
        })
        ```
         the association's `modelName` would be `user`.
         Note that an association's `modelName` and the `name` can be different. This is because Mirage supports multiple relationships of the same type:
         ```js
        createServer({
          models: {
            user: Model,
            comment: Model.extend({
              author: belongsTo('user'),
              reviewer: belongsTo('user')
            })
          }
        })
        ```
         For both these relationships, the `modelName` is `user`, but the first association has a `name` of `author` while the second has a `name` of `reviewer`.
         @property
        @type {String}
        @public
      */
      this.modelName = undefined; // hack to add ESDOC info. Any better way?

      if (_typeof(modelName) === "object") {
        // Received opts only
        this.modelName = undefined;
        this.opts = modelName;
      } else {
        // The modelName of the association. (Might not be passed in - set later
        // by schema).
        this.modelName = modelName ? dasherize(modelName) : "";
        this.opts = opts || {};
      }
      /**
        The name of the association, which comes from the property name that was used to define it.
         For example, given this server definition
        
        ```js
        createServer({
          models: {
            user: Model,
            comment: Model.extend({
              author: belongsTo('user')
            })
          }
        })
        ```
         the association's `name` would be `author`.
        
        The name is used by Mirage to define foreign keys on the model (`comment.authorId` in this case), among other things.
         @property
        @type {String}
        @public
      */


      this.name = ""; // The modelName that owns this association

      this.ownerModelName = "";
    }
    /**
       A setter for schema, since we don't have a reference at constuction time.
        @method setSchema
       @public
       @hide
    */


    _createClass(Association, [{
      key: "setSchema",
      value: function setSchema(schema) {
        this.schema = schema;
      }
      /**
         Returns a Boolean that's true if the association is self-referential, i.e. if a model has an association with itself.
          For example, given
          ```js
         createServer({
           models: {
             user: Model.extend({
               friends: hasMany('user')
             })
           }
         })
         ```
          then
          ```js
         server.schema.associationsFor('user').friends.isReflexive // true
         ```
          @method isReflexive
         @return {Boolean}
         @public
      */

    }, {
      key: "isReflexive",
      value: function isReflexive() {
        var isExplicitReflexive = !!(this.modelName === this.ownerModelName && this.opts.inverse);
        var isImplicitReflexive = !!(this.opts.inverse === undefined && this.ownerModelName === this.modelName);
        return isExplicitReflexive || isImplicitReflexive;
      }
      /**
         Returns a Boolean that's true if the association is polymorphic:
          For example, given
          ```js
         createServer({
           models: {
             comment: Model.extend({
               commentable: belongsTo({ polymorphic: true })
             })
           }
         })
         ```
          then
          ```js
         server.schema.associationsFor('comment').commentable.isPolymorphic // true
         ```
          Check out [the guides on polymorphic associations](https://miragejs.com/docs/main-concepts/relationships/#polymorphic) to learn more.
          @accessor isPolymorphic
         @type {Boolean}
         @public
      */

    }, {
      key: "isPolymorphic",
      get: function get() {
        return this.opts.polymorphic;
      }
      /**
        Returns either the string `"hasMany"` or `"belongsTo"`, based on the association type.
      
        @accessor
        @type {String}
        @public
       */

    }, {
      key: "type",
      get: function get() {
        throw new Error("Subclasses of Association must implement a getter for type");
      }
      /**
        Returns the name used for the association's foreign key.
         ```js
        let server = createServer({
          models: {
            user: Model,
            post: Model.extend({
              fineAuthor: belongsTo("user"),
              comments: hasMany()
            }),
            comment: Model
          }
        });
         let associations = server.associationsFor('post')
         associations.fineAuthor.foreignKey // fineAuthorId
        associations.comments.foreignKey // commentIds
        ```
      
        @accessor
        @type {String}
        @public
       */

    }, {
      key: "foreignKey",
      get: function get() {
        return this.getForeignKey();
      }
      /**
        @hide
      */

    }, {
      key: "identifier",
      get: function get() {
        throw new Error("Subclasses of Association must implement a getter for identifier");
      }
    }]);

    return Association;
  }();

  var identifierCache$1 = {};
  /**
   * The belongsTo association adds a fk to the owner of the association
   *
   * @class BelongsTo
   * @extends Association
   * @constructor
   * @public
   * @hide
   */

  var BelongsTo = /*#__PURE__*/function (_Association) {
    _inherits(BelongsTo, _Association);

    var _super = _createSuper(BelongsTo);

    function BelongsTo() {
      _classCallCheck(this, BelongsTo);

      return _super.apply(this, arguments);
    }

    _createClass(BelongsTo, [{
      key: "identifier",
      get: function get() {
        if (typeof identifierCache$1[this.name] !== "string") {
          var identifier = "".concat(camelize(this.name), "Id");
          identifierCache$1[this.name] = identifier;
        }

        return identifierCache$1[this.name];
      }
    }, {
      key: "type",
      get: function get() {
        return "belongsTo";
      }
      /**
       * @method getForeignKeyArray
       * @return {Array} Array of camelized name of the model owning the association
       * and foreign key for the association
       * @public
       */

    }, {
      key: "getForeignKeyArray",
      value: function getForeignKeyArray() {
        return [camelize(this.ownerModelName), this.getForeignKey()];
      }
      /**
       * @method getForeignKey
       * @return {String} Foreign key for the association
       * @public
       */

    }, {
      key: "getForeignKey",
      value: function getForeignKey() {
        // we reuse identifierCache because it's the same logic as get identifier
        if (typeof identifierCache$1[this.name] !== "string") {
          var foreignKey = "".concat(camelize(this.name), "Id");
          identifierCache$1[this.name] = foreignKey;
        }

        return identifierCache$1[this.name];
      }
      /**
       * Registers belongs-to association defined by given key on given model,
       * defines getters / setters for associated parent and associated parent's id,
       * adds methods for creating unsaved parent record and creating a saved one
       *
       * @method addMethodsToModelClass
       * @param {Function} ModelClass
       * @param {String} key the named key for the association
       * @public
       */

    }, {
      key: "addMethodsToModelClass",
      value: function addMethodsToModelClass(ModelClass, key) {
        var modelPrototype = ModelClass.prototype;
        var association = this;
        var foreignKey = this.getForeignKey();

        var associationHash = _defineProperty$1({}, key, this);

        modelPrototype.belongsToAssociations = Object.assign(modelPrototype.belongsToAssociations, associationHash); // update belongsToAssociationFks

        Object.keys(modelPrototype.belongsToAssociations).forEach(function (key) {
          var value = modelPrototype.belongsToAssociations[key];
          modelPrototype.belongsToAssociationFks[value.getForeignKey()] = value;
        }); // Add to target's dependent associations array

        this.schema.addDependentAssociation(this, this.modelName); // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
        // Or we could use a single data structure to store this information?

        modelPrototype.associationKeys.add(key);
        modelPrototype.associationIdKeys.add(foreignKey);
        Object.defineProperty(modelPrototype, foreignKey, {
          /*
            object.parentId
              - returns the associated parent's id
          */
          get: function get() {
            this._tempAssociations = this._tempAssociations || {};
            var tempParent = this._tempAssociations[key];
            var id;

            if (tempParent === null) {
              id = null;
            } else {
              if (association.isPolymorphic) {
                if (tempParent) {
                  id = {
                    id: tempParent.id,
                    type: tempParent.modelName
                  };
                } else {
                  id = this.attrs[foreignKey];
                }
              } else {
                if (tempParent) {
                  id = tempParent.id;
                } else {
                  id = this.attrs[foreignKey];
                }
              }
            }

            return id;
          },

          /*
            object.parentId = (parentId)
              - sets the associated parent via id
          */
          set: function set(id) {
            var tempParent;

            if (id === null) {
              tempParent = null;
            } else if (id !== undefined) {
              if (association.isPolymorphic) {
                assert(_typeof(id) === "object", "You're setting an ID on the polymorphic association '".concat(association.name, "' but you didn't pass in an object. Polymorphic IDs need to be in the form { type, id }."));
                tempParent = association.schema[association.schema.toCollectionName(id.type)].find(id.id);
              } else {
                tempParent = association.schema[association.schema.toCollectionName(association.modelName)].find(id);
                assert(tempParent, "Couldn't find ".concat(association.modelName, " with id = ").concat(id));
              }
            }

            this[key] = tempParent;
          }
        });
        Object.defineProperty(modelPrototype, key, {
          /*
            object.parent
              - returns the associated parent
          */
          get: function get() {
            this._tempAssociations = this._tempAssociations || {};
            var tempParent = this._tempAssociations[key];
            var foreignKeyId = this[foreignKey];
            var model = null;

            if (tempParent) {
              model = tempParent;
            } else if (foreignKeyId !== null) {
              if (association.isPolymorphic) {
                model = association.schema[association.schema.toCollectionName(foreignKeyId.type)].find(foreignKeyId.id);
              } else {
                model = association.schema[association.schema.toCollectionName(association.modelName)].find(foreignKeyId);
              }
            }

            return model;
          },

          /*
            object.parent = (parentModel)
              - sets the associated parent via model
             I want to jot some notes about hasInverseFor. There used to be an
            association.inverse() check, but adding polymorphic associations
            complicated this. `comment.commentable`, you can't easily check for an
            inverse since `comments: hasMany()` could be on any model.
             Instead of making it very complex and looking for an inverse on the
            association in isoaltion, it was much simpler to ask the model being
            passed in if it had an inverse for the setting model and with its
            association.
          */
          set: function set(model) {
            this._tempAssociations = this._tempAssociations || {};
            this._tempAssociations[key] = model;

            if (model && model.hasInverseFor(association)) {
              var inverse = model.inverseFor(association);
              model.associate(this, inverse);
            }
          }
        });
        /*
          object.newParent
            - creates a new unsaved associated parent
           TODO: document polymorphic
        */

        modelPrototype["new".concat(capitalize(key))] = function () {
          var modelName, attrs;

          if (association.isPolymorphic) {
            modelName = arguments.length <= 0 ? undefined : arguments[0];
            attrs = arguments.length <= 1 ? undefined : arguments[1];
          } else {
            modelName = association.modelName;
            attrs = arguments.length <= 0 ? undefined : arguments[0];
          }

          var parent = association.schema[association.schema.toCollectionName(modelName)].new(attrs);
          this[key] = parent;
          return parent;
        };
        /*
          object.createParent
            - creates a new saved associated parent, and immediately persists both models
           TODO: document polymorphic
        */


        modelPrototype["create".concat(capitalize(key))] = function () {
          var modelName, attrs;

          if (association.isPolymorphic) {
            modelName = arguments.length <= 0 ? undefined : arguments[0];
            attrs = arguments.length <= 1 ? undefined : arguments[1];
          } else {
            modelName = association.modelName;
            attrs = arguments.length <= 0 ? undefined : arguments[0];
          }

          var parent = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
          this[key] = parent;
          this.save();
          return parent.reload();
        };
      }
      /**
       *
       *
       * @public
       */

    }, {
      key: "disassociateAllDependentsFromTarget",
      value: function disassociateAllDependentsFromTarget(model) {
        var _this = this;

        var owner = this.ownerModelName;
        var fk;

        if (this.isPolymorphic) {
          fk = {
            type: model.modelName,
            id: model.id
          };
        } else {
          fk = model.id;
        }

        var dependents = this.schema[this.schema.toCollectionName(owner)].where(function (potentialOwner) {
          var id = potentialOwner[_this.getForeignKey()];

          if (!id) {
            return false;
          }

          if (_typeof(id) === "object") {
            return id.type === fk.type && id.id === fk.id;
          } else {
            return id === fk;
          }
        });
        dependents.models.forEach(function (dependent) {
          dependent.disassociate(model, _this);
          dependent.save();
        });
      }
    }]);

    return BelongsTo;
  }(Association);

  var HAS_SPECIES_SUPPORT$1 = arrayMethodHasSpeciesSupport('splice');

  var max$1 = Math.max;
  var min$1 = Math.min;
  var MAX_SAFE_INTEGER = 0x1FFFFFFFFFFFFF;
  var MAXIMUM_ALLOWED_LENGTH_EXCEEDED = 'Maximum allowed length exceeded';

  // `Array.prototype.splice` method
  // https://tc39.es/ecma262/#sec-array.prototype.splice
  // with adding support of @@species
  _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT$1 }, {
    splice: function splice(start, deleteCount /* , ...items */) {
      var O = toObject(this);
      var len = toLength(O.length);
      var actualStart = toAbsoluteIndex(start, len);
      var argumentsLength = arguments.length;
      var insertCount, actualDeleteCount, A, k, from, to;
      if (argumentsLength === 0) {
        insertCount = actualDeleteCount = 0;
      } else if (argumentsLength === 1) {
        insertCount = 0;
        actualDeleteCount = len - actualStart;
      } else {
        insertCount = argumentsLength - 2;
        actualDeleteCount = min$1(max$1(toInteger$1(deleteCount), 0), len - actualStart);
      }
      if (len + insertCount - actualDeleteCount > MAX_SAFE_INTEGER) {
        throw TypeError(MAXIMUM_ALLOWED_LENGTH_EXCEEDED);
      }
      A = arraySpeciesCreate(O, actualDeleteCount);
      for (k = 0; k < actualDeleteCount; k++) {
        from = actualStart + k;
        if (from in O) createProperty(A, k, O[from]);
      }
      A.length = actualDeleteCount;
      if (insertCount < actualDeleteCount) {
        for (k = actualStart; k < len - actualDeleteCount; k++) {
          from = k + actualDeleteCount;
          to = k + insertCount;
          if (from in O) O[to] = O[from];
          else delete O[to];
        }
        for (k = len; k > len - actualDeleteCount + insertCount; k--) delete O[k - 1];
      } else if (insertCount > actualDeleteCount) {
        for (k = len - actualDeleteCount; k > actualStart; k--) {
          from = k + actualDeleteCount - 1;
          to = k + insertCount - 1;
          if (from in O) O[to] = O[from];
          else delete O[to];
        }
      }
      for (k = 0; k < insertCount; k++) {
        O[k + actualStart] = arguments[k + 2];
      }
      O.length = len - actualDeleteCount + insertCount;
      return A;
    }
  });

  /**
   * Performs a deep comparison between two values to determine if they are
   * equivalent.
   *
   * **Note:** This method supports comparing arrays, array buffers, booleans,
   * date objects, error objects, maps, numbers, `Object` objects, regexes,
   * sets, strings, symbols, and typed arrays. `Object` objects are compared
   * by their own, not inherited, enumerable properties. Functions and DOM
   * nodes are compared by strict equality, i.e. `===`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.isEqual(object, other);
   * // => true
   *
   * object === other;
   * // => false
   */
  function isEqual(value, other) {
    return _baseIsEqual(value, other);
  }

  var isEqual_1 = isEqual;

  /**
   * Creates a `baseEach` or `baseEachRight` function.
   *
   * @private
   * @param {Function} eachFunc The function to iterate over a collection.
   * @param {boolean} [fromRight] Specify iterating from right to left.
   * @returns {Function} Returns the new base function.
   */
  function createBaseEach(eachFunc, fromRight) {
    return function(collection, iteratee) {
      if (collection == null) {
        return collection;
      }
      if (!isArrayLike_1(collection)) {
        return eachFunc(collection, iteratee);
      }
      var length = collection.length,
          index = fromRight ? length : -1,
          iterable = Object(collection);

      while ((fromRight ? index-- : ++index < length)) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection;
    };
  }

  var _createBaseEach = createBaseEach;

  /**
   * The base implementation of `_.forEach` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array|Object} Returns `collection`.
   */
  var baseEach = _createBaseEach(_baseForOwn);

  var _baseEach = baseEach;

  /**
   * The base implementation of `_.map` without support for iteratee shorthands.
   *
   * @private
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   */
  function baseMap(collection, iteratee) {
    var index = -1,
        result = isArrayLike_1(collection) ? Array(collection.length) : [];

    _baseEach(collection, function(value, key, collection) {
      result[++index] = iteratee(value, key, collection);
    });
    return result;
  }

  var _baseMap = baseMap;

  /**
   * Creates an array of values by running each element in `collection` thru
   * `iteratee`. The iteratee is invoked with three arguments:
   * (value, index|key, collection).
   *
   * Many lodash methods are guarded to work as iteratees for methods like
   * `_.every`, `_.filter`, `_.map`, `_.mapValues`, `_.reject`, and `_.some`.
   *
   * The guarded methods are:
   * `ary`, `chunk`, `curry`, `curryRight`, `drop`, `dropRight`, `every`,
   * `fill`, `invert`, `parseInt`, `random`, `range`, `rangeRight`, `repeat`,
   * `sampleSize`, `slice`, `some`, `sortBy`, `split`, `take`, `takeRight`,
   * `template`, `trim`, `trimEnd`, `trimStart`, and `words`
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Array} Returns the new mapped array.
   * @example
   *
   * function square(n) {
   *   return n * n;
   * }
   *
   * _.map([4, 8], square);
   * // => [16, 64]
   *
   * _.map({ 'a': 4, 'b': 8 }, square);
   * // => [16, 64] (iteration order is not guaranteed)
   *
   * var users = [
   *   { 'user': 'barney' },
   *   { 'user': 'fred' }
   * ];
   *
   * // The `_.property` iteratee shorthand.
   * _.map(users, 'user');
   * // => ['barney', 'fred']
   */
  function map$1(collection, iteratee) {
    var func = isArray_1(collection) ? _arrayMap : _baseMap;
    return func(collection, _baseIteratee(iteratee));
  }

  var map_1 = map$1;

  function duplicate(data) {
    if (Array.isArray(data)) {
      return data.map(duplicate);
    } else {
      return Object.assign({}, data);
    }
  }
  /**
    Mirage's `Db` has many `DbCollections`, which are equivalent to tables from traditional databases. They store specific types of data, for example `users` and `posts`.

    `DbCollections` have names, like `users`, which you use to access the collection from the `Db` object.

    Suppose you had a `user` model defined, and the following data had been inserted into your database (either through factories or fixtures):

    ```js
    export default [
      { id: 1, name: 'Zelda' },
      { id: 2, name: 'Link' }
    ];
    ```

    Then `db.contacts` would return this array.

    @class DbCollection
    @constructor
    @public
   */


  var DbCollection = /*#__PURE__*/function () {
    function DbCollection(name, initialData, IdentityManager) {
      _classCallCheck(this, DbCollection);

      this.name = name;
      this._records = [];
      this.identityManager = new IdentityManager();

      if (initialData) {
        this.insert(initialData);
      }
    }
    /**
     * Returns a copy of the data, to prevent inadvertent data manipulation.
     * @method all
     * @public
     * @hide
     */


    _createClass(DbCollection, [{
      key: "all",
      value: function all() {
        return duplicate(this._records);
      }
      /**
        Inserts `data` into the collection. `data` can be a single object
        or an array of objects. Returns the inserted record.
         ```js
        // Insert a single record
        let link = db.users.insert({ name: 'Link', age: 173 });
         link;  // { id: 1, name: 'Link', age: 173 }
         // Insert an array
        let users = db.users.insert([
          { name: 'Zelda', age: 142 },
          { name: 'Epona', age: 58 },
        ]);
         users;  // [ { id: 2, name: 'Zelda', age: 142 }, { id: 3, name: 'Epona', age: 58 } ]
        ```
         @method insert
        @param data
        @public
       */

    }, {
      key: "insert",
      value: function insert(data) {
        var _this = this;

        if (!Array.isArray(data)) {
          return this._insertRecord(data);
        } else {
          return map_1(data, function (attrs) {
            return _this._insertRecord(attrs);
          });
        }
      }
      /**
        Returns a single record from the `collection` if `ids` is a single
        id, or an array of records if `ids` is an array of ids. Note
        each id can be an int or a string, but integer ids as strings
        (e.g. the string “1”) will be treated as integers.
         ```js
        // Given users = [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]
         db.users.find(1);      // {id: 1, name: 'Link'}
        db.users.find([1, 2]); // [{id: 1, name: 'Link'}, {id: 2, name: 'Zelda'}]
        ```
         @method find
        @param ids
        @public
       */

    }, {
      key: "find",
      value: function find(ids) {
        if (Array.isArray(ids)) {
          var records = this._findRecords(ids).filter(Boolean).map(duplicate); // Return a copy


          return records;
        } else {
          var record = this._findRecord(ids);

          if (!record) {
            return null;
          } // Return a copy


          return duplicate(record);
        }
      }
      /**
        Returns the first model from `collection` that matches the
        key-value pairs in the `query` object. Note that a string
        comparison is used. `query` is a POJO.
         ```js
        // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]
        db.users.findBy({ name: 'Link' }); // { id: 1, name: 'Link' }
        ```
         @method find
        @param query
        @public
       */

    }, {
      key: "findBy",
      value: function findBy(query) {
        var record = this._findRecordBy(query);

        if (!record) {
          return null;
        } // Return a copy


        return duplicate(record);
      }
      /**
        Returns an array of models from `collection` that match the
        key-value pairs in the `query` object. Note that a string
        comparison is used. `query` is a POJO.
         ```js
        // Given users = [ { id: 1, name: 'Link' }, { id: 2, name: 'Zelda' } ]
         db.users.where({ name: 'Zelda' }); // [ { id: 2, name: 'Zelda' } ]
        ```
         @method where
        @param query
        @public
       */

    }, {
      key: "where",
      value: function where(query) {
        return this._findRecordsWhere(query).map(duplicate);
      }
      /**
        Finds the first record matching the provided _query_ in
        `collection`, or creates a new record using a merge of the
        `query` and optional `attributesForCreate`.
         Often times you may have a pattern like the following in your API stub:
         ```js
        // Given users = [
        //   { id: 1, name: 'Link' },
        //   { id: 2, name: 'Zelda' }
        // ]
         // Create Link if he doesn't yet exist
        let records = db.users.where({ name: 'Link' });
        let record;
         if (records.length > 0) {
          record = records[0];
        } else {
          record = db.users.insert({ name: 'Link' });
        }
        ```
         You can now replace this with the following:
         ```js
        let record = db.users.firstOrCreate({ name: 'Link' });
        ```
         An extended example using *attributesForCreate*:
         ```js
        let record = db.users.firstOrCreate({ name: 'Link' }, { evil: false });
        ```
         @method firstOrCreate
        @param query
        @param attributesForCreate
        @public
       */

    }, {
      key: "firstOrCreate",
      value: function firstOrCreate(query) {
        var attributesForCreate = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var queryResult = this.where(query);

        var _queryResult = _slicedToArray(queryResult, 1),
            record = _queryResult[0];

        if (record) {
          return record;
        } else {
          var mergedAttributes = Object.assign(attributesForCreate, query);
          var createdRecord = this.insert(mergedAttributes);
          return createdRecord;
        }
      }
      /**
        Updates one or more records in the collection.
         If *attrs* is the only arg present, updates all records in the collection according to the key-value pairs in *attrs*.
         If *target* is present, restricts updates to those that match *target*. If *target* is a number or string, finds a single record whose id is *target* to update. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and updates their *attrs*.
         Returns the updated record or records.
         ```js
        // Given users = [
        //   {id: 1, name: 'Link'},
        //   {id: 2, name: 'Zelda'}
        // ]
         db.users.update({name: 'Ganon'}); // db.users = [{id: 1, name: 'Ganon'}, {id: 2, name: 'Ganon'}]
        db.users.update(1, {name: 'Young Link'}); // db.users = [{id: 1, name: 'Young Link'}, {id: 2, name: 'Zelda'}]
        db.users.update({name: 'Link'}, {name: 'Epona'}); // db.users = [{id: 1, name: 'Epona'}, {id: 2, name: 'Zelda'}]
        ```
         @method update
        @param target
        @param attrs
        @public
       */

    }, {
      key: "update",
      value: function update(target, attrs) {
        var _this2 = this;

        var records;

        if (typeof attrs === "undefined") {
          attrs = target;
          var changedRecords = [];

          this._records.forEach(function (record) {
            var oldRecord = Object.assign({}, record);

            _this2._updateRecord(record, attrs);

            if (!isEqual_1(oldRecord, record)) {
              changedRecords.push(record);
            }
          });

          return changedRecords;
        } else if (typeof target === "number" || typeof target === "string") {
          var id = target;

          var record = this._findRecord(id);

          this._updateRecord(record, attrs);

          return record;
        } else if (Array.isArray(target)) {
          var ids = target;
          records = this._findRecords(ids);
          records.forEach(function (record) {
            _this2._updateRecord(record, attrs);
          });
          return records;
        } else if (_typeof(target) === "object") {
          var query = target;
          records = this._findRecordsWhere(query);
          records.forEach(function (record) {
            _this2._updateRecord(record, attrs);
          });
          return records;
        }
      }
      /**
        Removes one or more records in *collection*.
         If *target* is undefined, removes all records. If *target* is a number or string, removes a single record using *target* as id. If *target* is a POJO, queries *collection* for records that match the key-value pairs in *target*, and removes them from the collection.
         ```js
        // Given users = [
        //   {id: 1, name: 'Link'},
        //   {id: 2, name: 'Zelda'}
        // ]
         db.users.remove(); // db.users = []
        db.users.remove(1); // db.users = [{id: 2, name: 'Zelda'}]
        db.users.remove({name: 'Zelda'}); // db.users = [{id: 1, name: 'Link'}]
        ```
         @method remove
        @param target
        @public
       */

    }, {
      key: "remove",
      value: function remove(target) {
        var _this3 = this;

        var records;

        if (typeof target === "undefined") {
          this._records = [];
          this.identityManager.reset();
        } else if (typeof target === "number" || typeof target === "string") {
          var record = this._findRecord(target);

          var index = this._records.indexOf(record);

          this._records.splice(index, 1);
        } else if (Array.isArray(target)) {
          records = this._findRecords(target);
          records.forEach(function (record) {
            var index = _this3._records.indexOf(record);

            _this3._records.splice(index, 1);
          });
        } else if (_typeof(target) === "object") {
          records = this._findRecordsWhere(target);
          records.forEach(function (record) {
            var index = _this3._records.indexOf(record);

            _this3._records.splice(index, 1);
          });
        }
      }
      /*
        Private methods.
         These return the actual db objects, whereas the public
        API query methods return copies.
      */

      /**
        @method _findRecord
        @param id
        @private
        @hide
       */

    }, {
      key: "_findRecord",
      value: function _findRecord(id) {
        id = id.toString();
        return this._records.find(function (obj) {
          return obj.id === id;
        });
      }
      /**
        @method _findRecordBy
        @param query
        @private
        @hide
       */

    }, {
      key: "_findRecordBy",
      value: function _findRecordBy(query) {
        return this._findRecordsWhere(query)[0];
      }
      /**
        @method _findRecords
        @param ids
        @private
        @hide
       */

    }, {
      key: "_findRecords",
      value: function _findRecords(ids) {
        return ids.map(this._findRecord, this);
      }
      /**
        @method _findRecordsWhere
        @param query
        @private
        @hide
       */

    }, {
      key: "_findRecordsWhere",
      value: function _findRecordsWhere(query) {
        var records = this._records;

        function defaultQueryFunction(record) {
          var keys = Object.keys(query);
          return keys.every(function (key) {
            return String(record[key]) === String(query[key]);
          });
        }

        var queryFunction = _typeof(query) === "object" ? defaultQueryFunction : query;
        return records.filter(queryFunction);
      }
      /**
        @method _insertRecord
        @param data
        @private
        @hide
       */

    }, {
      key: "_insertRecord",
      value: function _insertRecord(data) {
        var attrs = duplicate(data);

        if (attrs && (attrs.id === undefined || attrs.id === null)) {
          attrs.id = this.identityManager.fetch(attrs);
        } else {
          attrs.id = attrs.id.toString();
          this.identityManager.set(attrs.id);
        }

        this._records.push(attrs);

        return duplicate(attrs);
      }
      /**
        @method _updateRecord
        @param record
        @param attrs
        @private
        @hide
       */

    }, {
      key: "_updateRecord",
      value: function _updateRecord(record, attrs) {
        var targetId = attrs && Object.prototype.hasOwnProperty.call(attrs, "id") ? attrs.id.toString() : null;
        var currentId = record.id;

        if (targetId && currentId !== targetId) {
          throw new Error("Updating the ID of a record is not permitted");
        }

        for (var attr in attrs) {
          if (attr === "id") {
            continue;
          }

          record[attr] = attrs[attr];
        }
      }
    }]);

    return DbCollection;
  }();

  var DbCollection$1 = DbCollection;

  /**
   * A specialized version of `_.forEach` for arrays without support for
   * iteratee shorthands.
   *
   * @private
   * @param {Array} [array] The array to iterate over.
   * @param {Function} iteratee The function invoked per iteration.
   * @returns {Array} Returns `array`.
   */
  function arrayEach(array, iteratee) {
    var index = -1,
        length = array == null ? 0 : array.length;

    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  var _arrayEach = arrayEach;

  /** Used for built-in method references. */
  var objectProto$5 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$6 = objectProto$5.hasOwnProperty;

  /**
   * Assigns `value` to `key` of `object` if the existing value is not equivalent
   * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * for equality comparisons.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {string} key The key of the property to assign.
   * @param {*} value The value to assign.
   */
  function assignValue(object, key, value) {
    var objValue = object[key];
    if (!(hasOwnProperty$6.call(object, key) && eq_1(objValue, value)) ||
        (value === undefined && !(key in object))) {
      _baseAssignValue(object, key, value);
    }
  }

  var _assignValue = assignValue;

  /**
   * Copies properties of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy properties from.
   * @param {Array} props The property identifiers to copy.
   * @param {Object} [object={}] The object to copy properties to.
   * @param {Function} [customizer] The function to customize copied values.
   * @returns {Object} Returns `object`.
   */
  function copyObject(source, props, object, customizer) {
    var isNew = !object;
    object || (object = {});

    var index = -1,
        length = props.length;

    while (++index < length) {
      var key = props[index];

      var newValue = customizer
        ? customizer(object[key], source[key], key, object, source)
        : undefined;

      if (newValue === undefined) {
        newValue = source[key];
      }
      if (isNew) {
        _baseAssignValue(object, key, newValue);
      } else {
        _assignValue(object, key, newValue);
      }
    }
    return object;
  }

  var _copyObject = copyObject;

  /**
   * The base implementation of `_.assign` without support for multiple sources
   * or `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssign(object, source) {
    return object && _copyObject(source, keys_1(source), object);
  }

  var _baseAssign = baseAssign;

  /**
   * This function is like
   * [`Object.keys`](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
   * except that it includes inherited enumerable properties.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function nativeKeysIn(object) {
    var result = [];
    if (object != null) {
      for (var key in Object(object)) {
        result.push(key);
      }
    }
    return result;
  }

  var _nativeKeysIn = nativeKeysIn;

  /** Used for built-in method references. */
  var objectProto$4 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$5 = objectProto$4.hasOwnProperty;

  /**
   * The base implementation of `_.keysIn` which doesn't treat sparse arrays as dense.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   */
  function baseKeysIn(object) {
    if (!isObject_1(object)) {
      return _nativeKeysIn(object);
    }
    var isProto = _isPrototype(object),
        result = [];

    for (var key in object) {
      if (!(key == 'constructor' && (isProto || !hasOwnProperty$5.call(object, key)))) {
        result.push(key);
      }
    }
    return result;
  }

  var _baseKeysIn = baseKeysIn;

  /**
   * Creates an array of the own and inherited enumerable property names of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @memberOf _
   * @since 3.0.0
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.keysIn(new Foo);
   * // => ['a', 'b', 'c'] (iteration order is not guaranteed)
   */
  function keysIn(object) {
    return isArrayLike_1(object) ? _arrayLikeKeys(object, true) : _baseKeysIn(object);
  }

  var keysIn_1 = keysIn;

  /**
   * The base implementation of `_.assignIn` without support for multiple sources
   * or `customizer` functions.
   *
   * @private
   * @param {Object} object The destination object.
   * @param {Object} source The source object.
   * @returns {Object} Returns `object`.
   */
  function baseAssignIn(object, source) {
    return object && _copyObject(source, keysIn_1(source), object);
  }

  var _baseAssignIn = baseAssignIn;

  var _cloneBuffer = createCommonjsModule(function (module, exports) {
  /** Detect free variable `exports`. */
  var freeExports = exports && !exports.nodeType && exports;

  /** Detect free variable `module`. */
  var freeModule = freeExports && 'object' == 'object' && module && !module.nodeType && module;

  /** Detect the popular CommonJS extension `module.exports`. */
  var moduleExports = freeModule && freeModule.exports === freeExports;

  /** Built-in value references. */
  var Buffer = moduleExports ? _root.Buffer : undefined,
      allocUnsafe = Buffer ? Buffer.allocUnsafe : undefined;

  /**
   * Creates a clone of  `buffer`.
   *
   * @private
   * @param {Buffer} buffer The buffer to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Buffer} Returns the cloned buffer.
   */
  function cloneBuffer(buffer, isDeep) {
    if (isDeep) {
      return buffer.slice();
    }
    var length = buffer.length,
        result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);

    buffer.copy(result);
    return result;
  }

  module.exports = cloneBuffer;
  });

  /**
   * Copies the values of `source` to `array`.
   *
   * @private
   * @param {Array} source The array to copy values from.
   * @param {Array} [array=[]] The array to copy values to.
   * @returns {Array} Returns `array`.
   */
  function copyArray(source, array) {
    var index = -1,
        length = source.length;

    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }

  var _copyArray = copyArray;

  /**
   * Copies own symbols of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy symbols from.
   * @param {Object} [object={}] The object to copy symbols to.
   * @returns {Object} Returns `object`.
   */
  function copySymbols(source, object) {
    return _copyObject(source, _getSymbols(source), object);
  }

  var _copySymbols = copySymbols;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeGetSymbols = Object.getOwnPropertySymbols;

  /**
   * Creates an array of the own and inherited enumerable symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of symbols.
   */
  var getSymbolsIn = !nativeGetSymbols ? stubArray_1 : function(object) {
    var result = [];
    while (object) {
      _arrayPush(result, _getSymbols(object));
      object = _getPrototype(object);
    }
    return result;
  };

  var _getSymbolsIn = getSymbolsIn;

  /**
   * Copies own and inherited symbols of `source` to `object`.
   *
   * @private
   * @param {Object} source The object to copy symbols from.
   * @param {Object} [object={}] The object to copy symbols to.
   * @returns {Object} Returns `object`.
   */
  function copySymbolsIn(source, object) {
    return _copyObject(source, _getSymbolsIn(source), object);
  }

  var _copySymbolsIn = copySymbolsIn;

  /**
   * Creates an array of own and inherited enumerable property names and
   * symbols of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property names and symbols.
   */
  function getAllKeysIn(object) {
    return _baseGetAllKeys(object, keysIn_1, _getSymbolsIn);
  }

  var _getAllKeysIn = getAllKeysIn;

  /** Used for built-in method references. */
  var objectProto$3 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$4 = objectProto$3.hasOwnProperty;

  /**
   * Initializes an array clone.
   *
   * @private
   * @param {Array} array The array to clone.
   * @returns {Array} Returns the initialized clone.
   */
  function initCloneArray(array) {
    var length = array.length,
        result = new array.constructor(length);

    // Add properties assigned by `RegExp#exec`.
    if (length && typeof array[0] == 'string' && hasOwnProperty$4.call(array, 'index')) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }

  var _initCloneArray = initCloneArray;

  /**
   * Creates a clone of `arrayBuffer`.
   *
   * @private
   * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
   * @returns {ArrayBuffer} Returns the cloned array buffer.
   */
  function cloneArrayBuffer(arrayBuffer) {
    var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
    new _Uint8Array(result).set(new _Uint8Array(arrayBuffer));
    return result;
  }

  var _cloneArrayBuffer = cloneArrayBuffer;

  /**
   * Creates a clone of `dataView`.
   *
   * @private
   * @param {Object} dataView The data view to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the cloned data view.
   */
  function cloneDataView(dataView, isDeep) {
    var buffer = isDeep ? _cloneArrayBuffer(dataView.buffer) : dataView.buffer;
    return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
  }

  var _cloneDataView = cloneDataView;

  /** Used to match `RegExp` flags from their coerced string values. */
  var reFlags = /\w*$/;

  /**
   * Creates a clone of `regexp`.
   *
   * @private
   * @param {Object} regexp The regexp to clone.
   * @returns {Object} Returns the cloned regexp.
   */
  function cloneRegExp(regexp) {
    var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
    result.lastIndex = regexp.lastIndex;
    return result;
  }

  var _cloneRegExp = cloneRegExp;

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = _Symbol ? _Symbol.prototype : undefined,
      symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

  /**
   * Creates a clone of the `symbol` object.
   *
   * @private
   * @param {Object} symbol The symbol object to clone.
   * @returns {Object} Returns the cloned symbol object.
   */
  function cloneSymbol(symbol) {
    return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
  }

  var _cloneSymbol = cloneSymbol;

  /**
   * Creates a clone of `typedArray`.
   *
   * @private
   * @param {Object} typedArray The typed array to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the cloned typed array.
   */
  function cloneTypedArray(typedArray, isDeep) {
    var buffer = isDeep ? _cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
    return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
  }

  var _cloneTypedArray = cloneTypedArray;

  /** `Object#toString` result references. */
  var boolTag$1 = '[object Boolean]',
      dateTag$1 = '[object Date]',
      mapTag$3 = '[object Map]',
      numberTag$1 = '[object Number]',
      regexpTag$1 = '[object RegExp]',
      setTag$3 = '[object Set]',
      stringTag$1 = '[object String]',
      symbolTag$1 = '[object Symbol]';

  var arrayBufferTag$1 = '[object ArrayBuffer]',
      dataViewTag$1 = '[object DataView]',
      float32Tag$1 = '[object Float32Array]',
      float64Tag$1 = '[object Float64Array]',
      int8Tag$1 = '[object Int8Array]',
      int16Tag$1 = '[object Int16Array]',
      int32Tag$1 = '[object Int32Array]',
      uint8Tag$1 = '[object Uint8Array]',
      uint8ClampedTag$1 = '[object Uint8ClampedArray]',
      uint16Tag$1 = '[object Uint16Array]',
      uint32Tag$1 = '[object Uint32Array]';

  /**
   * Initializes an object clone based on its `toStringTag`.
   *
   * **Note:** This function only supports cloning values with tags of
   * `Boolean`, `Date`, `Error`, `Map`, `Number`, `RegExp`, `Set`, or `String`.
   *
   * @private
   * @param {Object} object The object to clone.
   * @param {string} tag The `toStringTag` of the object to clone.
   * @param {boolean} [isDeep] Specify a deep clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneByTag(object, tag, isDeep) {
    var Ctor = object.constructor;
    switch (tag) {
      case arrayBufferTag$1:
        return _cloneArrayBuffer(object);

      case boolTag$1:
      case dateTag$1:
        return new Ctor(+object);

      case dataViewTag$1:
        return _cloneDataView(object, isDeep);

      case float32Tag$1: case float64Tag$1:
      case int8Tag$1: case int16Tag$1: case int32Tag$1:
      case uint8Tag$1: case uint8ClampedTag$1: case uint16Tag$1: case uint32Tag$1:
        return _cloneTypedArray(object, isDeep);

      case mapTag$3:
        return new Ctor;

      case numberTag$1:
      case stringTag$1:
        return new Ctor(object);

      case regexpTag$1:
        return _cloneRegExp(object);

      case setTag$3:
        return new Ctor;

      case symbolTag$1:
        return _cloneSymbol(object);
    }
  }

  var _initCloneByTag = initCloneByTag;

  /** Built-in value references. */
  var objectCreate = Object.create;

  /**
   * The base implementation of `_.create` without support for assigning
   * properties to the created object.
   *
   * @private
   * @param {Object} proto The object to inherit from.
   * @returns {Object} Returns the new object.
   */
  var baseCreate = (function() {
    function object() {}
    return function(proto) {
      if (!isObject_1(proto)) {
        return {};
      }
      if (objectCreate) {
        return objectCreate(proto);
      }
      object.prototype = proto;
      var result = new object;
      object.prototype = undefined;
      return result;
    };
  }());

  var _baseCreate = baseCreate;

  /**
   * Initializes an object clone.
   *
   * @private
   * @param {Object} object The object to clone.
   * @returns {Object} Returns the initialized clone.
   */
  function initCloneObject(object) {
    return (typeof object.constructor == 'function' && !_isPrototype(object))
      ? _baseCreate(_getPrototype(object))
      : {};
  }

  var _initCloneObject = initCloneObject;

  /** `Object#toString` result references. */
  var mapTag$2 = '[object Map]';

  /**
   * The base implementation of `_.isMap` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a map, else `false`.
   */
  function baseIsMap(value) {
    return isObjectLike_1(value) && _getTag(value) == mapTag$2;
  }

  var _baseIsMap = baseIsMap;

  /* Node.js helper references. */
  var nodeIsMap = _nodeUtil && _nodeUtil.isMap;

  /**
   * Checks if `value` is classified as a `Map` object.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a map, else `false`.
   * @example
   *
   * _.isMap(new Map);
   * // => true
   *
   * _.isMap(new WeakMap);
   * // => false
   */
  var isMap = nodeIsMap ? _baseUnary(nodeIsMap) : _baseIsMap;

  var isMap_1 = isMap;

  /** `Object#toString` result references. */
  var setTag$2 = '[object Set]';

  /**
   * The base implementation of `_.isSet` without Node.js optimizations.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a set, else `false`.
   */
  function baseIsSet(value) {
    return isObjectLike_1(value) && _getTag(value) == setTag$2;
  }

  var _baseIsSet = baseIsSet;

  /* Node.js helper references. */
  var nodeIsSet = _nodeUtil && _nodeUtil.isSet;

  /**
   * Checks if `value` is classified as a `Set` object.
   *
   * @static
   * @memberOf _
   * @since 4.3.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a set, else `false`.
   * @example
   *
   * _.isSet(new Set);
   * // => true
   *
   * _.isSet(new WeakSet);
   * // => false
   */
  var isSet = nodeIsSet ? _baseUnary(nodeIsSet) : _baseIsSet;

  var isSet_1 = isSet;

  /** Used to compose bitmasks for cloning. */
  var CLONE_DEEP_FLAG$1 = 1,
      CLONE_FLAT_FLAG = 2,
      CLONE_SYMBOLS_FLAG$1 = 4;

  /** `Object#toString` result references. */
  var argsTag = '[object Arguments]',
      arrayTag = '[object Array]',
      boolTag = '[object Boolean]',
      dateTag = '[object Date]',
      errorTag = '[object Error]',
      funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      mapTag$1 = '[object Map]',
      numberTag = '[object Number]',
      objectTag = '[object Object]',
      regexpTag = '[object RegExp]',
      setTag$1 = '[object Set]',
      stringTag = '[object String]',
      symbolTag = '[object Symbol]',
      weakMapTag = '[object WeakMap]';

  var arrayBufferTag = '[object ArrayBuffer]',
      dataViewTag = '[object DataView]',
      float32Tag = '[object Float32Array]',
      float64Tag = '[object Float64Array]',
      int8Tag = '[object Int8Array]',
      int16Tag = '[object Int16Array]',
      int32Tag = '[object Int32Array]',
      uint8Tag = '[object Uint8Array]',
      uint8ClampedTag = '[object Uint8ClampedArray]',
      uint16Tag = '[object Uint16Array]',
      uint32Tag = '[object Uint32Array]';

  /** Used to identify `toStringTag` values supported by `_.clone`. */
  var cloneableTags = {};
  cloneableTags[argsTag] = cloneableTags[arrayTag] =
  cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
  cloneableTags[boolTag] = cloneableTags[dateTag] =
  cloneableTags[float32Tag] = cloneableTags[float64Tag] =
  cloneableTags[int8Tag] = cloneableTags[int16Tag] =
  cloneableTags[int32Tag] = cloneableTags[mapTag$1] =
  cloneableTags[numberTag] = cloneableTags[objectTag] =
  cloneableTags[regexpTag] = cloneableTags[setTag$1] =
  cloneableTags[stringTag] = cloneableTags[symbolTag] =
  cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
  cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
  cloneableTags[errorTag] = cloneableTags[funcTag] =
  cloneableTags[weakMapTag] = false;

  /**
   * The base implementation of `_.clone` and `_.cloneDeep` which tracks
   * traversed objects.
   *
   * @private
   * @param {*} value The value to clone.
   * @param {boolean} bitmask The bitmask flags.
   *  1 - Deep clone
   *  2 - Flatten inherited properties
   *  4 - Clone symbols
   * @param {Function} [customizer] The function to customize cloning.
   * @param {string} [key] The key of `value`.
   * @param {Object} [object] The parent object of `value`.
   * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
   * @returns {*} Returns the cloned value.
   */
  function baseClone(value, bitmask, customizer, key, object, stack) {
    var result,
        isDeep = bitmask & CLONE_DEEP_FLAG$1,
        isFlat = bitmask & CLONE_FLAT_FLAG,
        isFull = bitmask & CLONE_SYMBOLS_FLAG$1;

    if (customizer) {
      result = object ? customizer(value, key, object, stack) : customizer(value);
    }
    if (result !== undefined) {
      return result;
    }
    if (!isObject_1(value)) {
      return value;
    }
    var isArr = isArray_1(value);
    if (isArr) {
      result = _initCloneArray(value);
      if (!isDeep) {
        return _copyArray(value, result);
      }
    } else {
      var tag = _getTag(value),
          isFunc = tag == funcTag || tag == genTag;

      if (isBuffer_1(value)) {
        return _cloneBuffer(value, isDeep);
      }
      if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
        result = (isFlat || isFunc) ? {} : _initCloneObject(value);
        if (!isDeep) {
          return isFlat
            ? _copySymbolsIn(value, _baseAssignIn(result, value))
            : _copySymbols(value, _baseAssign(result, value));
        }
      } else {
        if (!cloneableTags[tag]) {
          return object ? value : {};
        }
        result = _initCloneByTag(value, tag, isDeep);
      }
    }
    // Check for circular references and return its corresponding clone.
    stack || (stack = new _Stack);
    var stacked = stack.get(value);
    if (stacked) {
      return stacked;
    }
    stack.set(value, result);

    if (isSet_1(value)) {
      value.forEach(function(subValue) {
        result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
      });
    } else if (isMap_1(value)) {
      value.forEach(function(subValue, key) {
        result.set(key, baseClone(subValue, bitmask, customizer, key, value, stack));
      });
    }

    var keysFunc = isFull
      ? (isFlat ? _getAllKeysIn : _getAllKeys)
      : (isFlat ? keysIn_1 : keys_1);

    var props = isArr ? undefined : keysFunc(value);
    _arrayEach(props || value, function(subValue, key) {
      if (props) {
        key = subValue;
        subValue = value[key];
      }
      // Recursively populate clone (susceptible to call stack limits).
      _assignValue(result, key, baseClone(subValue, bitmask, customizer, key, value, stack));
    });
    return result;
  }

  var _baseClone = baseClone;

  /** Used to compose bitmasks for cloning. */
  var CLONE_DEEP_FLAG = 1,
      CLONE_SYMBOLS_FLAG = 4;

  /**
   * This method is like `_.clone` except that it recursively clones `value`.
   *
   * @static
   * @memberOf _
   * @since 1.0.0
   * @category Lang
   * @param {*} value The value to recursively clone.
   * @returns {*} Returns the deep cloned value.
   * @see _.clone
   * @example
   *
   * var objects = [{ 'a': 1 }, { 'b': 2 }];
   *
   * var deep = _.cloneDeep(objects);
   * console.log(deep[0] === objects[0]);
   * // => false
   */
  function cloneDeep(value) {
    return _baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
  }

  var cloneDeep_1 = cloneDeep;

  /**
    Your Mirage server has a database which you can interact with in your route handlers. You’ll typically use models to interact with your database data, but you can always reach into the db directly in the event you want more control.

    Access the db from your route handlers via `schema.db`.

    You can access individual DbCollections by using `schema.db.name`:

    ```js
    schema.db.users  // would return, e.g., [ { id: 1, name: 'Yehuda' }, { id: 2, name: 'Tom '} ]
    ```

    @class Db
    @constructor
    @public
   */

  var Db = /*#__PURE__*/function () {
    function Db(initialData, identityManagers) {
      _classCallCheck(this, Db);

      this._collections = [];
      this.registerIdentityManagers(identityManagers);

      if (initialData) {
        this.loadData(initialData);
      }
    }
    /**
      Loads an object of data into Mirage's database.
       The keys of the object correspond to the DbCollections, and the values are arrays of records.
       ```js
      server.db.loadData({
        users: [
          { name: 'Yehuda' },
          { name: 'Tom' }
        ]
      });
      ```
       As with `db.collection.insert`, IDs will automatically be created for records that don't have them.
       @method loadData
      @param {Object} data - Data to load
      @public
     */


    _createClass(Db, [{
      key: "loadData",
      value: function loadData(data) {
        for (var key in data) {
          this.createCollection(key, cloneDeep_1(data[key]));
        }
      }
      /**
       Logs out the contents of the Db.
        ```js
       server.db.dump() // { users: [ name: 'Yehuda', ...
       ```
        @method dump
       @public
       */

    }, {
      key: "dump",
      value: function dump() {
        return this._collections.reduce(function (data, collection) {
          data[collection.name] = collection.all();
          return data;
        }, {});
      }
      /**
        Add an empty collection named _name_ to your database. Typically you won’t need to do this yourself, since collections are automatically created for any models you have defined.
         @method createCollection
        @param name
        @param initialData (optional)
        @public
       */

    }, {
      key: "createCollection",
      value: function createCollection(name, initialData) {
        if (!this[name]) {
          var _IdentityManager = this.identityManagerFor(name);

          var newCollection = new DbCollection$1(name, initialData, _IdentityManager); // Public API has a convenient array interface. It comes at the cost of
          // returning a copy of all records to avoid accidental mutations.

          Object.defineProperty(this, name, {
            get: function get() {
              var recordsCopy = newCollection.all();
              ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
                recordsCopy[method] = function () {
                  return newCollection[method].apply(newCollection, arguments);
                };
              });
              return recordsCopy;
            }
          }); // Private API does not have the array interface. This means internally, only
          // db-collection methods can be used. This is so records aren't copied redundantly
          // internally, which leads to accidental O(n^2) operations (e.g., createList).

          Object.defineProperty(this, "_".concat(name), {
            get: function get() {
              var recordsCopy = [];
              ["insert", "find", "findBy", "where", "update", "remove", "firstOrCreate"].forEach(function (method) {
                recordsCopy[method] = function () {
                  return newCollection[method].apply(newCollection, arguments);
                };
              });
              return recordsCopy;
            }
          });

          this._collections.push(newCollection);
        } else if (initialData) {
          this[name].insert(initialData);
        }

        return this;
      }
      /**
        @method createCollections
        @param ...collections
        @public
        @hide
       */

    }, {
      key: "createCollections",
      value: function createCollections() {
        var _this = this;

        for (var _len = arguments.length, collections = new Array(_len), _key = 0; _key < _len; _key++) {
          collections[_key] = arguments[_key];
        }

        collections.forEach(function (c) {
          return _this.createCollection(c);
        });
      }
      /**
        Removes all data from Mirage's database.
         @method emptyData
        @public
       */

    }, {
      key: "emptyData",
      value: function emptyData() {
        this._collections.forEach(function (c) {
          return c.remove();
        });
      }
      /**
        @method identityManagerFor
        @param name
        @public
        @hide
       */

    }, {
      key: "identityManagerFor",
      value: function identityManagerFor(name) {
        return this._identityManagers[this._container.inflector.singularize(name)] || this._identityManagers.application || IdentityManager$1;
      }
      /**
        @method registerIdentityManagers
        @public
        @hide
       */

    }, {
      key: "registerIdentityManagers",
      value: function registerIdentityManagers(identityManagers) {
        this._identityManagers = identityManagers || {};
      }
    }]);

    return Db;
  }();

  var Db$1 = Db;

  var HAS_SPECIES_SUPPORT = arrayMethodHasSpeciesSupport('slice');

  var SPECIES$2 = wellKnownSymbol('species');
  var nativeSlice = [].slice;
  var max = Math.max;

  // `Array.prototype.slice` method
  // https://tc39.es/ecma262/#sec-array.prototype.slice
  // fallback for not array-like ES3 strings and DOM objects
  _export({ target: 'Array', proto: true, forced: !HAS_SPECIES_SUPPORT }, {
    slice: function slice(start, end) {
      var O = toIndexedObject(this);
      var length = toLength(O.length);
      var k = toAbsoluteIndex(start, length);
      var fin = toAbsoluteIndex(end === undefined ? length : end, length);
      // inline `ArraySpeciesCreate` for usage native `Array#slice` where it's possible
      var Constructor, result, n;
      if (isArray$3(O)) {
        Constructor = O.constructor;
        // cross-realm fallback
        if (isConstructor(Constructor) && (Constructor === Array || isArray$3(Constructor.prototype))) {
          Constructor = undefined;
        } else if (isObject$1(Constructor)) {
          Constructor = Constructor[SPECIES$2];
          if (Constructor === null) Constructor = undefined;
        }
        if (Constructor === Array || Constructor === undefined) {
          return nativeSlice.call(O, k, fin);
        }
      }
      result = new (Constructor === undefined ? Array : Constructor)(max(fin - k, 0));
      for (n = 0; k < fin; k++, n++) if (k in O) createProperty(result, n, O[k]);
      result.length = n;
      return result;
    }
  });

  var nativePromiseConstructor = global_1.Promise;

  var redefineAll = function (target, src, options) {
    for (var key in src) redefine(target, key, src[key], options);
    return target;
  };

  var aPossiblePrototype = function (argument) {
    if (typeof argument === 'object' || isCallable(argument)) return argument;
    throw TypeError("Can't set " + String(argument) + ' as a prototype');
  };

  /* eslint-disable no-proto -- safe */



  // `Object.setPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.setprototypeof
  // Works with __proto__ only. Old v8 can't work with null proto objects.
  // eslint-disable-next-line es/no-object-setprototypeof -- safe
  var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
    var CORRECT_SETTER = false;
    var test = {};
    var setter;
    try {
      // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
      setter = Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').set;
      setter.call(test, []);
      CORRECT_SETTER = test instanceof Array;
    } catch (error) { /* empty */ }
    return function setPrototypeOf(O, proto) {
      anObject(O);
      aPossiblePrototype(proto);
      if (CORRECT_SETTER) setter.call(O, proto);
      else O.__proto__ = proto;
      return O;
    };
  }() : undefined);

  var defineProperty$1 = objectDefineProperty.f;



  var TO_STRING_TAG$1 = wellKnownSymbol('toStringTag');

  var setToStringTag = function (it, TAG, STATIC) {
    if (it && !has$3(it = STATIC ? it : it.prototype, TO_STRING_TAG$1)) {
      defineProperty$1(it, TO_STRING_TAG$1, { configurable: true, value: TAG });
    }
  };

  var SPECIES$1 = wellKnownSymbol('species');

  var setSpecies = function (CONSTRUCTOR_NAME) {
    var Constructor = getBuiltIn(CONSTRUCTOR_NAME);
    var defineProperty = objectDefineProperty.f;

    if (descriptors && Constructor && !Constructor[SPECIES$1]) {
      defineProperty(Constructor, SPECIES$1, {
        configurable: true,
        get: function () { return this; }
      });
    }
  };

  var anInstance = function (it, Constructor, name) {
    if (it instanceof Constructor) return it;
    throw TypeError('Incorrect ' + (name ? name + ' ' : '') + 'invocation');
  };

  var iterators = {};

  var ITERATOR$5 = wellKnownSymbol('iterator');
  var ArrayPrototype = Array.prototype;

  // check on default Array iterator
  var isArrayIteratorMethod = function (it) {
    return it !== undefined && (iterators.Array === it || ArrayPrototype[ITERATOR$5] === it);
  };

  var ITERATOR$4 = wellKnownSymbol('iterator');

  var getIteratorMethod = function (it) {
    if (it != undefined) return getMethod(it, ITERATOR$4)
      || getMethod(it, '@@iterator')
      || iterators[classof(it)];
  };

  var getIterator = function (argument, usingIterator) {
    var iteratorMethod = arguments.length < 2 ? getIteratorMethod(argument) : usingIterator;
    if (aCallable(iteratorMethod)) return anObject(iteratorMethod.call(argument));
    throw TypeError(String(argument) + ' is not iterable');
  };

  var iteratorClose = function (iterator, kind, value) {
    var innerResult, innerError;
    anObject(iterator);
    try {
      innerResult = getMethod(iterator, 'return');
      if (!innerResult) {
        if (kind === 'throw') throw value;
        return value;
      }
      innerResult = innerResult.call(iterator);
    } catch (error) {
      innerError = true;
      innerResult = error;
    }
    if (kind === 'throw') throw value;
    if (innerError) throw innerResult;
    anObject(innerResult);
    return value;
  };

  var Result = function (stopped, result) {
    this.stopped = stopped;
    this.result = result;
  };

  var iterate = function (iterable, unboundFunction, options) {
    var that = options && options.that;
    var AS_ENTRIES = !!(options && options.AS_ENTRIES);
    var IS_ITERATOR = !!(options && options.IS_ITERATOR);
    var INTERRUPTED = !!(options && options.INTERRUPTED);
    var fn = functionBindContext(unboundFunction, that, 1 + AS_ENTRIES + INTERRUPTED);
    var iterator, iterFn, index, length, result, next, step;

    var stop = function (condition) {
      if (iterator) iteratorClose(iterator, 'normal', condition);
      return new Result(true, condition);
    };

    var callFn = function (value) {
      if (AS_ENTRIES) {
        anObject(value);
        return INTERRUPTED ? fn(value[0], value[1], stop) : fn(value[0], value[1]);
      } return INTERRUPTED ? fn(value, stop) : fn(value);
    };

    if (IS_ITERATOR) {
      iterator = iterable;
    } else {
      iterFn = getIteratorMethod(iterable);
      if (!iterFn) throw TypeError(String(iterable) + ' is not iterable');
      // optimisation for array iterators
      if (isArrayIteratorMethod(iterFn)) {
        for (index = 0, length = toLength(iterable.length); length > index; index++) {
          result = callFn(iterable[index]);
          if (result && result instanceof Result) return result;
        } return new Result(false);
      }
      iterator = getIterator(iterable, iterFn);
    }

    next = iterator.next;
    while (!(step = next.call(iterator)).done) {
      try {
        result = callFn(step.value);
      } catch (error) {
        iteratorClose(iterator, 'throw', error);
      }
      if (typeof result == 'object' && result && result instanceof Result) return result;
    } return new Result(false);
  };

  var ITERATOR$3 = wellKnownSymbol('iterator');
  var SAFE_CLOSING = false;

  try {
    var called = 0;
    var iteratorWithReturn = {
      next: function () {
        return { done: !!called++ };
      },
      'return': function () {
        SAFE_CLOSING = true;
      }
    };
    iteratorWithReturn[ITERATOR$3] = function () {
      return this;
    };
    // eslint-disable-next-line es/no-array-from, no-throw-literal -- required for testing
    Array.from(iteratorWithReturn, function () { throw 2; });
  } catch (error) { /* empty */ }

  var checkCorrectnessOfIteration = function (exec, SKIP_CLOSING) {
    if (!SKIP_CLOSING && !SAFE_CLOSING) return false;
    var ITERATION_SUPPORT = false;
    try {
      var object = {};
      object[ITERATOR$3] = function () {
        return {
          next: function () {
            return { done: ITERATION_SUPPORT = true };
          }
        };
      };
      exec(object);
    } catch (error) { /* empty */ }
    return ITERATION_SUPPORT;
  };

  var engineIsIos = /(?:ipad|iphone|ipod).*applewebkit/i.test(engineUserAgent);

  var engineIsNode = classofRaw(global_1.process) == 'process';

  var set$1 = global_1.setImmediate;
  var clear = global_1.clearImmediate;
  var process$2 = global_1.process;
  var MessageChannel = global_1.MessageChannel;
  var Dispatch = global_1.Dispatch;
  var counter = 0;
  var queue = {};
  var ONREADYSTATECHANGE = 'onreadystatechange';
  var location, defer, channel, port;

  try {
    // Deno throws a ReferenceError on `location` access without `--location` flag
    location = global_1.location;
  } catch (error) { /* empty */ }

  var run = function (id) {
    // eslint-disable-next-line no-prototype-builtins -- safe
    if (queue.hasOwnProperty(id)) {
      var fn = queue[id];
      delete queue[id];
      fn();
    }
  };

  var runner = function (id) {
    return function () {
      run(id);
    };
  };

  var listener = function (event) {
    run(event.data);
  };

  var post = function (id) {
    // old engines have not location.origin
    global_1.postMessage(String(id), location.protocol + '//' + location.host);
  };

  // Node.js 0.9+ & IE10+ has setImmediate, otherwise:
  if (!set$1 || !clear) {
    set$1 = function setImmediate(fn) {
      var args = [];
      var argumentsLength = arguments.length;
      var i = 1;
      while (argumentsLength > i) args.push(arguments[i++]);
      queue[++counter] = function () {
        // eslint-disable-next-line no-new-func -- spec requirement
        (isCallable(fn) ? fn : Function(fn)).apply(undefined, args);
      };
      defer(counter);
      return counter;
    };
    clear = function clearImmediate(id) {
      delete queue[id];
    };
    // Node.js 0.8-
    if (engineIsNode) {
      defer = function (id) {
        process$2.nextTick(runner(id));
      };
    // Sphere (JS game engine) Dispatch API
    } else if (Dispatch && Dispatch.now) {
      defer = function (id) {
        Dispatch.now(runner(id));
      };
    // Browsers with MessageChannel, includes WebWorkers
    // except iOS - https://github.com/zloirock/core-js/issues/624
    } else if (MessageChannel && !engineIsIos) {
      channel = new MessageChannel();
      port = channel.port2;
      channel.port1.onmessage = listener;
      defer = functionBindContext(port.postMessage, port, 1);
    // Browsers with postMessage, skip WebWorkers
    // IE8 has postMessage, but it's sync & typeof its postMessage is 'object'
    } else if (
      global_1.addEventListener &&
      isCallable(global_1.postMessage) &&
      !global_1.importScripts &&
      location && location.protocol !== 'file:' &&
      !fails(post)
    ) {
      defer = post;
      global_1.addEventListener('message', listener, false);
    // IE8-
    } else if (ONREADYSTATECHANGE in documentCreateElement('script')) {
      defer = function (id) {
        html.appendChild(documentCreateElement('script'))[ONREADYSTATECHANGE] = function () {
          html.removeChild(this);
          run(id);
        };
      };
    // Rest old browsers
    } else {
      defer = function (id) {
        setTimeout(runner(id), 0);
      };
    }
  }

  var task$1 = {
    set: set$1,
    clear: clear
  };

  var engineIsIosPebble = /ipad|iphone|ipod/i.test(engineUserAgent) && global_1.Pebble !== undefined;

  var engineIsWebosWebkit = /web0s(?!.*chrome)/i.test(engineUserAgent);

  var getOwnPropertyDescriptor$1 = objectGetOwnPropertyDescriptor.f;
  var macrotask = task$1.set;





  var MutationObserver = global_1.MutationObserver || global_1.WebKitMutationObserver;
  var document$2 = global_1.document;
  var process$1 = global_1.process;
  var Promise$1 = global_1.Promise;
  // Node.js 11 shows ExperimentalWarning on getting `queueMicrotask`
  var queueMicrotaskDescriptor = getOwnPropertyDescriptor$1(global_1, 'queueMicrotask');
  var queueMicrotask = queueMicrotaskDescriptor && queueMicrotaskDescriptor.value;

  var flush, head, last$1, notify$1, toggle, node, promise, then;

  // modern engines have queueMicrotask method
  if (!queueMicrotask) {
    flush = function () {
      var parent, fn;
      if (engineIsNode && (parent = process$1.domain)) parent.exit();
      while (head) {
        fn = head.fn;
        head = head.next;
        try {
          fn();
        } catch (error) {
          if (head) notify$1();
          else last$1 = undefined;
          throw error;
        }
      } last$1 = undefined;
      if (parent) parent.enter();
    };

    // browsers with MutationObserver, except iOS - https://github.com/zloirock/core-js/issues/339
    // also except WebOS Webkit https://github.com/zloirock/core-js/issues/898
    if (!engineIsIos && !engineIsNode && !engineIsWebosWebkit && MutationObserver && document$2) {
      toggle = true;
      node = document$2.createTextNode('');
      new MutationObserver(flush).observe(node, { characterData: true });
      notify$1 = function () {
        node.data = toggle = !toggle;
      };
    // environments with maybe non-completely correct, but existent Promise
    } else if (!engineIsIosPebble && Promise$1 && Promise$1.resolve) {
      // Promise.resolve without an argument throws an error in LG WebOS 2
      promise = Promise$1.resolve(undefined);
      // workaround of WebKit ~ iOS Safari 10.1 bug
      promise.constructor = Promise$1;
      then = promise.then;
      notify$1 = function () {
        then.call(promise, flush);
      };
    // Node.js without promises
    } else if (engineIsNode) {
      notify$1 = function () {
        process$1.nextTick(flush);
      };
    // for other environments - macrotask based on:
    // - setImmediate
    // - MessageChannel
    // - window.postMessag
    // - onreadystatechange
    // - setTimeout
    } else {
      notify$1 = function () {
        // strange IE + webpack dev server bug - use .call(global)
        macrotask.call(global_1, flush);
      };
    }
  }

  var microtask = queueMicrotask || function (fn) {
    var task = { fn: fn, next: undefined };
    if (last$1) last$1.next = task;
    if (!head) {
      head = task;
      notify$1();
    } last$1 = task;
  };

  var PromiseCapability = function (C) {
    var resolve, reject;
    this.promise = new C(function ($$resolve, $$reject) {
      if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
      resolve = $$resolve;
      reject = $$reject;
    });
    this.resolve = aCallable(resolve);
    this.reject = aCallable(reject);
  };

  // `NewPromiseCapability` abstract operation
  // https://tc39.es/ecma262/#sec-newpromisecapability
  var f$1 = function (C) {
    return new PromiseCapability(C);
  };

  var newPromiseCapability$1 = {
  	f: f$1
  };

  var promiseResolve = function (C, x) {
    anObject(C);
    if (isObject$1(x) && x.constructor === C) return x;
    var promiseCapability = newPromiseCapability$1.f(C);
    var resolve = promiseCapability.resolve;
    resolve(x);
    return promiseCapability.promise;
  };

  var hostReportErrors = function (a, b) {
    var console = global_1.console;
    if (console && console.error) {
      arguments.length === 1 ? console.error(a) : console.error(a, b);
    }
  };

  var perform = function (exec) {
    try {
      return { error: false, value: exec() };
    } catch (error) {
      return { error: true, value: error };
    }
  };

  var engineIsBrowser = typeof window == 'object';

  var task = task$1.set;












  var SPECIES = wellKnownSymbol('species');
  var PROMISE = 'Promise';
  var getInternalState$2 = internalState.get;
  var setInternalState$3 = internalState.set;
  var getInternalPromiseState = internalState.getterFor(PROMISE);
  var NativePromisePrototype = nativePromiseConstructor && nativePromiseConstructor.prototype;
  var PromiseConstructor = nativePromiseConstructor;
  var PromiseConstructorPrototype = NativePromisePrototype;
  var TypeError$1 = global_1.TypeError;
  var document$1 = global_1.document;
  var process = global_1.process;
  var newPromiseCapability = newPromiseCapability$1.f;
  var newGenericPromiseCapability = newPromiseCapability;
  var DISPATCH_EVENT = !!(document$1 && document$1.createEvent && global_1.dispatchEvent);
  var NATIVE_REJECTION_EVENT = isCallable(global_1.PromiseRejectionEvent);
  var UNHANDLED_REJECTION = 'unhandledrejection';
  var REJECTION_HANDLED = 'rejectionhandled';
  var PENDING = 0;
  var FULFILLED = 1;
  var REJECTED = 2;
  var HANDLED = 1;
  var UNHANDLED = 2;
  var SUBCLASSING = false;
  var Internal, OwnPromiseCapability, PromiseWrapper, nativeThen;

  var FORCED$2 = isForced_1(PROMISE, function () {
    var PROMISE_CONSTRUCTOR_SOURCE = inspectSource(PromiseConstructor);
    var GLOBAL_CORE_JS_PROMISE = PROMISE_CONSTRUCTOR_SOURCE !== String(PromiseConstructor);
    // V8 6.6 (Node 10 and Chrome 66) have a bug with resolving custom thenables
    // https://bugs.chromium.org/p/chromium/issues/detail?id=830565
    // We can't detect it synchronously, so just check versions
    if (!GLOBAL_CORE_JS_PROMISE && engineV8Version === 66) return true;
    // We can't use @@species feature detection in V8 since it causes
    // deoptimization and performance degradation
    // https://github.com/zloirock/core-js/issues/679
    if (engineV8Version >= 51 && /native code/.test(PROMISE_CONSTRUCTOR_SOURCE)) return false;
    // Detect correctness of subclassing with @@species support
    var promise = new PromiseConstructor(function (resolve) { resolve(1); });
    var FakePromise = function (exec) {
      exec(function () { /* empty */ }, function () { /* empty */ });
    };
    var constructor = promise.constructor = {};
    constructor[SPECIES] = FakePromise;
    SUBCLASSING = promise.then(function () { /* empty */ }) instanceof FakePromise;
    if (!SUBCLASSING) return true;
    // Unhandled rejections tracking support, NodeJS Promise without it fails @@species test
    return !GLOBAL_CORE_JS_PROMISE && engineIsBrowser && !NATIVE_REJECTION_EVENT;
  });

  var INCORRECT_ITERATION = FORCED$2 || !checkCorrectnessOfIteration(function (iterable) {
    PromiseConstructor.all(iterable)['catch'](function () { /* empty */ });
  });

  // helpers
  var isThenable = function (it) {
    var then;
    return isObject$1(it) && isCallable(then = it.then) ? then : false;
  };

  var notify = function (state, isReject) {
    if (state.notified) return;
    state.notified = true;
    var chain = state.reactions;
    microtask(function () {
      var value = state.value;
      var ok = state.state == FULFILLED;
      var index = 0;
      // variable length - can't use forEach
      while (chain.length > index) {
        var reaction = chain[index++];
        var handler = ok ? reaction.ok : reaction.fail;
        var resolve = reaction.resolve;
        var reject = reaction.reject;
        var domain = reaction.domain;
        var result, then, exited;
        try {
          if (handler) {
            if (!ok) {
              if (state.rejection === UNHANDLED) onHandleUnhandled(state);
              state.rejection = HANDLED;
            }
            if (handler === true) result = value;
            else {
              if (domain) domain.enter();
              result = handler(value); // can throw
              if (domain) {
                domain.exit();
                exited = true;
              }
            }
            if (result === reaction.promise) {
              reject(TypeError$1('Promise-chain cycle'));
            } else if (then = isThenable(result)) {
              then.call(result, resolve, reject);
            } else resolve(result);
          } else reject(value);
        } catch (error) {
          if (domain && !exited) domain.exit();
          reject(error);
        }
      }
      state.reactions = [];
      state.notified = false;
      if (isReject && !state.rejection) onUnhandled(state);
    });
  };

  var dispatchEvent = function (name, promise, reason) {
    var event, handler;
    if (DISPATCH_EVENT) {
      event = document$1.createEvent('Event');
      event.promise = promise;
      event.reason = reason;
      event.initEvent(name, false, true);
      global_1.dispatchEvent(event);
    } else event = { promise: promise, reason: reason };
    if (!NATIVE_REJECTION_EVENT && (handler = global_1['on' + name])) handler(event);
    else if (name === UNHANDLED_REJECTION) hostReportErrors('Unhandled promise rejection', reason);
  };

  var onUnhandled = function (state) {
    task.call(global_1, function () {
      var promise = state.facade;
      var value = state.value;
      var IS_UNHANDLED = isUnhandled(state);
      var result;
      if (IS_UNHANDLED) {
        result = perform(function () {
          if (engineIsNode) {
            process.emit('unhandledRejection', value, promise);
          } else dispatchEvent(UNHANDLED_REJECTION, promise, value);
        });
        // Browsers should not trigger `rejectionHandled` event if it was handled here, NodeJS - should
        state.rejection = engineIsNode || isUnhandled(state) ? UNHANDLED : HANDLED;
        if (result.error) throw result.value;
      }
    });
  };

  var isUnhandled = function (state) {
    return state.rejection !== HANDLED && !state.parent;
  };

  var onHandleUnhandled = function (state) {
    task.call(global_1, function () {
      var promise = state.facade;
      if (engineIsNode) {
        process.emit('rejectionHandled', promise);
      } else dispatchEvent(REJECTION_HANDLED, promise, state.value);
    });
  };

  var bind = function (fn, state, unwrap) {
    return function (value) {
      fn(state, value, unwrap);
    };
  };

  var internalReject = function (state, value, unwrap) {
    if (state.done) return;
    state.done = true;
    if (unwrap) state = unwrap;
    state.value = value;
    state.state = REJECTED;
    notify(state, true);
  };

  var internalResolve = function (state, value, unwrap) {
    if (state.done) return;
    state.done = true;
    if (unwrap) state = unwrap;
    try {
      if (state.facade === value) throw TypeError$1("Promise can't be resolved itself");
      var then = isThenable(value);
      if (then) {
        microtask(function () {
          var wrapper = { done: false };
          try {
            then.call(value,
              bind(internalResolve, wrapper, state),
              bind(internalReject, wrapper, state)
            );
          } catch (error) {
            internalReject(wrapper, error, state);
          }
        });
      } else {
        state.value = value;
        state.state = FULFILLED;
        notify(state, false);
      }
    } catch (error) {
      internalReject({ done: false }, error, state);
    }
  };

  // constructor polyfill
  if (FORCED$2) {
    // 25.4.3.1 Promise(executor)
    PromiseConstructor = function Promise(executor) {
      anInstance(this, PromiseConstructor, PROMISE);
      aCallable(executor);
      Internal.call(this);
      var state = getInternalState$2(this);
      try {
        executor(bind(internalResolve, state), bind(internalReject, state));
      } catch (error) {
        internalReject(state, error);
      }
    };
    PromiseConstructorPrototype = PromiseConstructor.prototype;
    // eslint-disable-next-line no-unused-vars -- required for `.length`
    Internal = function Promise(executor) {
      setInternalState$3(this, {
        type: PROMISE,
        done: false,
        notified: false,
        parent: false,
        reactions: [],
        rejection: false,
        state: PENDING,
        value: undefined
      });
    };
    Internal.prototype = redefineAll(PromiseConstructorPrototype, {
      // `Promise.prototype.then` method
      // https://tc39.es/ecma262/#sec-promise.prototype.then
      then: function then(onFulfilled, onRejected) {
        var state = getInternalPromiseState(this);
        var reaction = newPromiseCapability(speciesConstructor(this, PromiseConstructor));
        reaction.ok = isCallable(onFulfilled) ? onFulfilled : true;
        reaction.fail = isCallable(onRejected) && onRejected;
        reaction.domain = engineIsNode ? process.domain : undefined;
        state.parent = true;
        state.reactions.push(reaction);
        if (state.state != PENDING) notify(state, false);
        return reaction.promise;
      },
      // `Promise.prototype.catch` method
      // https://tc39.es/ecma262/#sec-promise.prototype.catch
      'catch': function (onRejected) {
        return this.then(undefined, onRejected);
      }
    });
    OwnPromiseCapability = function () {
      var promise = new Internal();
      var state = getInternalState$2(promise);
      this.promise = promise;
      this.resolve = bind(internalResolve, state);
      this.reject = bind(internalReject, state);
    };
    newPromiseCapability$1.f = newPromiseCapability = function (C) {
      return C === PromiseConstructor || C === PromiseWrapper
        ? new OwnPromiseCapability(C)
        : newGenericPromiseCapability(C);
    };

    if (isCallable(nativePromiseConstructor) && NativePromisePrototype !== Object.prototype) {
      nativeThen = NativePromisePrototype.then;

      if (!SUBCLASSING) {
        // make `Promise#then` return a polyfilled `Promise` for native promise-based APIs
        redefine(NativePromisePrototype, 'then', function then(onFulfilled, onRejected) {
          var that = this;
          return new PromiseConstructor(function (resolve, reject) {
            nativeThen.call(that, resolve, reject);
          }).then(onFulfilled, onRejected);
        // https://github.com/zloirock/core-js/issues/640
        }, { unsafe: true });

        // makes sure that native promise-based APIs `Promise#catch` properly works with patched `Promise#then`
        redefine(NativePromisePrototype, 'catch', PromiseConstructorPrototype['catch'], { unsafe: true });
      }

      // make `.constructor === Promise` work for native promise-based APIs
      try {
        delete NativePromisePrototype.constructor;
      } catch (error) { /* empty */ }

      // make `instanceof Promise` work for native promise-based APIs
      if (objectSetPrototypeOf) {
        objectSetPrototypeOf(NativePromisePrototype, PromiseConstructorPrototype);
      }
    }
  }

  _export({ global: true, wrap: true, forced: FORCED$2 }, {
    Promise: PromiseConstructor
  });

  setToStringTag(PromiseConstructor, PROMISE, false);
  setSpecies(PROMISE);

  PromiseWrapper = getBuiltIn(PROMISE);

  // statics
  _export({ target: PROMISE, stat: true, forced: FORCED$2 }, {
    // `Promise.reject` method
    // https://tc39.es/ecma262/#sec-promise.reject
    reject: function reject(r) {
      var capability = newPromiseCapability(this);
      capability.reject.call(undefined, r);
      return capability.promise;
    }
  });

  _export({ target: PROMISE, stat: true, forced: FORCED$2 }, {
    // `Promise.resolve` method
    // https://tc39.es/ecma262/#sec-promise.resolve
    resolve: function resolve(x) {
      return promiseResolve(this, x);
    }
  });

  _export({ target: PROMISE, stat: true, forced: INCORRECT_ITERATION }, {
    // `Promise.all` method
    // https://tc39.es/ecma262/#sec-promise.all
    all: function all(iterable) {
      var C = this;
      var capability = newPromiseCapability(C);
      var resolve = capability.resolve;
      var reject = capability.reject;
      var result = perform(function () {
        var $promiseResolve = aCallable(C.resolve);
        var values = [];
        var counter = 0;
        var remaining = 1;
        iterate(iterable, function (promise) {
          var index = counter++;
          var alreadyCalled = false;
          values.push(undefined);
          remaining++;
          $promiseResolve.call(C, promise).then(function (value) {
            if (alreadyCalled) return;
            alreadyCalled = true;
            values[index] = value;
            --remaining || resolve(values);
          }, reject);
        });
        --remaining || resolve(values);
      });
      if (result.error) reject(result.value);
      return capability.promise;
    },
    // `Promise.race` method
    // https://tc39.es/ecma262/#sec-promise.race
    race: function race(iterable) {
      var C = this;
      var capability = newPromiseCapability(C);
      var reject = capability.reject;
      var result = perform(function () {
        var $promiseResolve = aCallable(C.resolve);
        iterate(iterable, function (promise) {
          $promiseResolve.call(C, promise).then(capability.resolve, reject);
        });
      });
      if (result.error) reject(result.value);
      return capability.promise;
    }
  });

  // TODO: use something more complex like timsort?
  var floor = Math.floor;

  var mergeSort = function (array, comparefn) {
    var length = array.length;
    var middle = floor(length / 2);
    return length < 8 ? insertionSort(array, comparefn) : merge(
      mergeSort(array.slice(0, middle), comparefn),
      mergeSort(array.slice(middle), comparefn),
      comparefn
    );
  };

  var insertionSort = function (array, comparefn) {
    var length = array.length;
    var i = 1;
    var element, j;

    while (i < length) {
      j = i;
      element = array[i];
      while (j && comparefn(array[j - 1], element) > 0) {
        array[j] = array[--j];
      }
      if (j !== i++) array[j] = element;
    } return array;
  };

  var merge = function (left, right, comparefn) {
    var llength = left.length;
    var rlength = right.length;
    var lindex = 0;
    var rindex = 0;
    var result = [];

    while (lindex < llength || rindex < rlength) {
      if (lindex < llength && rindex < rlength) {
        result.push(comparefn(left[lindex], right[rindex]) <= 0 ? left[lindex++] : right[rindex++]);
      } else {
        result.push(lindex < llength ? left[lindex++] : right[rindex++]);
      }
    } return result;
  };

  var arraySort = mergeSort;

  var firefox = engineUserAgent.match(/firefox\/(\d+)/i);

  var engineFfVersion = !!firefox && +firefox[1];

  var engineIsIeOrEdge = /MSIE|Trident/.test(engineUserAgent);

  var webkit = engineUserAgent.match(/AppleWebKit\/(\d+)\./);

  var engineWebkitVersion = !!webkit && +webkit[1];

  var test = [];
  var nativeSort = test.sort;

  // IE8-
  var FAILS_ON_UNDEFINED = fails(function () {
    test.sort(undefined);
  });
  // V8 bug
  var FAILS_ON_NULL = fails(function () {
    test.sort(null);
  });
  // Old WebKit
  var STRICT_METHOD = arrayMethodIsStrict('sort');

  var STABLE_SORT = !fails(function () {
    // feature detection can be too slow, so check engines versions
    if (engineV8Version) return engineV8Version < 70;
    if (engineFfVersion && engineFfVersion > 3) return;
    if (engineIsIeOrEdge) return true;
    if (engineWebkitVersion) return engineWebkitVersion < 603;

    var result = '';
    var code, chr, value, index;

    // generate an array with more 512 elements (Chakra and old V8 fails only in this case)
    for (code = 65; code < 76; code++) {
      chr = String.fromCharCode(code);

      switch (code) {
        case 66: case 69: case 70: case 72: value = 3; break;
        case 68: case 71: value = 4; break;
        default: value = 2;
      }

      for (index = 0; index < 47; index++) {
        test.push({ k: chr + index, v: value });
      }
    }

    test.sort(function (a, b) { return b.v - a.v; });

    for (index = 0; index < test.length; index++) {
      chr = test[index].k.charAt(0);
      if (result.charAt(result.length - 1) !== chr) result += chr;
    }

    return result !== 'DGBEFHACIJK';
  });

  var FORCED$1 = FAILS_ON_UNDEFINED || !FAILS_ON_NULL || !STRICT_METHOD || !STABLE_SORT;

  var getSortCompare = function (comparefn) {
    return function (x, y) {
      if (y === undefined) return -1;
      if (x === undefined) return 1;
      if (comparefn !== undefined) return +comparefn(x, y) || 0;
      return toString_1(x) > toString_1(y) ? 1 : -1;
    };
  };

  // `Array.prototype.sort` method
  // https://tc39.es/ecma262/#sec-array.prototype.sort
  _export({ target: 'Array', proto: true, forced: FORCED$1 }, {
    sort: function sort(comparefn) {
      if (comparefn !== undefined) aCallable(comparefn);

      var array = toObject(this);

      if (STABLE_SORT) return comparefn === undefined ? nativeSort.call(array) : nativeSort.call(array, comparefn);

      var items = [];
      var arrayLength = toLength(array.length);
      var itemsLength, index;

      for (index = 0; index < arrayLength; index++) {
        if (index in array) items.push(array[index]);
      }

      items = arraySort(items, getSortCompare(comparefn));
      itemsLength = items.length;
      index = 0;

      while (index < itemsLength) array[index] = items[index++];
      while (index < arrayLength) delete array[index++];

      return array;
    }
  });

  /**
   * A faster alternative to `Function#apply`, this function invokes `func`
   * with the `this` binding of `thisArg` and the arguments of `args`.
   *
   * @private
   * @param {Function} func The function to invoke.
   * @param {*} thisArg The `this` binding of `func`.
   * @param {Array} args The arguments to invoke `func` with.
   * @returns {*} Returns the result of `func`.
   */
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0: return func.call(thisArg);
      case 1: return func.call(thisArg, args[0]);
      case 2: return func.call(thisArg, args[0], args[1]);
      case 3: return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }

  var _apply = apply;

  /**
   * Gets the last element of `array`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to query.
   * @returns {*} Returns the last element of `array`.
   * @example
   *
   * _.last([1, 2, 3]);
   * // => 3
   */
  function last(array) {
    var length = array == null ? 0 : array.length;
    return length ? array[length - 1] : undefined;
  }

  var last_1 = last;

  /**
   * Gets the parent value at `path` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} path The path to get the parent value of.
   * @returns {*} Returns the parent value.
   */
  function parent(object, path) {
    return path.length < 2 ? object : _baseGet(object, _baseSlice(path, 0, -1));
  }

  var _parent = parent;

  /**
   * The base implementation of `_.invoke` without support for individual
   * method arguments.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the method to invoke.
   * @param {Array} args The arguments to invoke the method with.
   * @returns {*} Returns the result of the invoked method.
   */
  function baseInvoke(object, path, args) {
    path = _castPath(path, object);
    object = _parent(object, path);
    var func = object == null ? object : object[_toKey(last_1(path))];
    return func == null ? undefined : _apply(func, object, args);
  }

  var _baseInvoke = baseInvoke;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax$1 = Math.max;

  /**
   * A specialized version of `baseRest` which transforms the rest array.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @param {Function} transform The rest array transform.
   * @returns {Function} Returns the new function.
   */
  function overRest(func, start, transform) {
    start = nativeMax$1(start === undefined ? (func.length - 1) : start, 0);
    return function() {
      var args = arguments,
          index = -1,
          length = nativeMax$1(args.length - start, 0),
          array = Array(length);

      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = transform(array);
      return _apply(func, this, otherArgs);
    };
  }

  var _overRest = overRest;

  /**
   * Creates a function that returns `value`.
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Util
   * @param {*} value The value to return from the new function.
   * @returns {Function} Returns the new constant function.
   * @example
   *
   * var objects = _.times(2, _.constant({ 'a': 1 }));
   *
   * console.log(objects);
   * // => [{ 'a': 1 }, { 'a': 1 }]
   *
   * console.log(objects[0] === objects[1]);
   * // => true
   */
  function constant(value) {
    return function() {
      return value;
    };
  }

  var constant_1 = constant;

  /**
   * The base implementation of `setToString` without support for hot loop shorting.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var baseSetToString = !_defineProperty ? identity_1 : function(func, string) {
    return _defineProperty(func, 'toString', {
      'configurable': true,
      'enumerable': false,
      'value': constant_1(string),
      'writable': true
    });
  };

  var _baseSetToString = baseSetToString;

  /** Used to detect hot functions by number of calls within a span of milliseconds. */
  var HOT_COUNT = 800,
      HOT_SPAN = 16;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeNow = Date.now;

  /**
   * Creates a function that'll short out and invoke `identity` instead
   * of `func` when it's called `HOT_COUNT` or more times in `HOT_SPAN`
   * milliseconds.
   *
   * @private
   * @param {Function} func The function to restrict.
   * @returns {Function} Returns the new shortable function.
   */
  function shortOut(func) {
    var count = 0,
        lastCalled = 0;

    return function() {
      var stamp = nativeNow(),
          remaining = HOT_SPAN - (stamp - lastCalled);

      lastCalled = stamp;
      if (remaining > 0) {
        if (++count >= HOT_COUNT) {
          return arguments[0];
        }
      } else {
        count = 0;
      }
      return func.apply(undefined, arguments);
    };
  }

  var _shortOut = shortOut;

  /**
   * Sets the `toString` method of `func` to return `string`.
   *
   * @private
   * @param {Function} func The function to modify.
   * @param {Function} string The `toString` result.
   * @returns {Function} Returns `func`.
   */
  var setToString = _shortOut(_baseSetToString);

  var _setToString = setToString;

  /**
   * The base implementation of `_.rest` which doesn't validate or coerce arguments.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @param {number} [start=func.length-1] The start position of the rest parameter.
   * @returns {Function} Returns the new function.
   */
  function baseRest(func, start) {
    return _setToString(_overRest(func, start, identity_1), func + '');
  }

  var _baseRest = baseRest;

  /**
   * Invokes the method at `path` of each element in `collection`, returning
   * an array of the results of each invoked method. Any additional arguments
   * are provided to each invoked method. If `path` is a function, it's invoked
   * for, and `this` bound to, each element in `collection`.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Collection
   * @param {Array|Object} collection The collection to iterate over.
   * @param {Array|Function|string} path The path of the method to invoke or
   *  the function invoked per iteration.
   * @param {...*} [args] The arguments to invoke each method with.
   * @returns {Array} Returns the array of results.
   * @example
   *
   * _.invokeMap([[5, 1, 7], [3, 2, 1]], 'sort');
   * // => [[1, 5, 7], [1, 2, 3]]
   *
   * _.invokeMap([123, 456], String.prototype.split, '');
   * // => [['1', '2', '3'], ['4', '5', '6']]
   */
  var invokeMap = _baseRest(function(collection, path, args) {
    var index = -1,
        isFunc = typeof path == 'function',
        result = isArrayLike_1(collection) ? Array(collection.length) : [];

    _baseEach(collection, function(value) {
      result[++index] = isFunc ? _apply(path, value, args) : _baseInvoke(value, path, args);
    });
    return result;
  });

  var invokeMap_1 = invokeMap;

  /**
    Collections represent arrays of models. They are returned by a hasMany association, or by one of the ModelClass query methods:

    ```js
    let posts = user.blogPosts;
    let posts = schema.blogPosts.all();
    let posts = schema.blogPosts.find([1, 2, 4]);
    let posts = schema.blogPosts.where({ published: true });
    ```

    Note that there is also a `PolymorphicCollection` class that is identical to `Collection`, except it can contain a heterogeneous array of models. Thus, it has no `modelName` property. This lets serializers and other parts of the system interact with it differently.

    @class Collection
    @constructor
    @public
  */

  var Collection = /*#__PURE__*/function () {
    function Collection(modelName) {
      var models = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

      _classCallCheck(this, Collection);

      assert(modelName && typeof modelName === "string", "You must pass a `modelName` into a Collection");
      /**
        The dasherized model name this Collection represents.
         ```js
        let posts = user.blogPosts;
         posts.modelName; // "blog-post"
        ```
         The model name is separate from the actual models, since Collections can be empty.
         @property modelName
        @type {String}
        @public
      */

      this.modelName = modelName;
      /**
        The underlying plain JavaScript array of Models in this Collection.
         ```js
        posts.models // [ post:1, post:2, ... ]
        ```
         While Collections have many array-ish methods like `filter` and `sort`, it
        can be useful to work with the plain array if you want to work with methods
        like `map`, or use the `[]` accessor.
         For example, in testing you might want to assert against a model from the
        collection:
         ```js
        let newPost = user.posts.models[0].title;
         assert.equal(newPost, "My first post");
        ```
         @property models
        @type {Array}
        @public
      */

      this.models = models;
    }
    /**
      The number of models in the collection.
       ```js
      user.posts.length; // 2
      ```
       @property length
      @type {Integer}
      @public
    */


    _createClass(Collection, [{
      key: "length",
      get: function get() {
        return this.models.length;
      }
      /**
         Updates each model in the collection, and immediately persists all changes to the db.
          ```js
         let posts = user.blogPosts;
          posts.update('published', true); // the db was updated for all posts
         ```
          @method update
         @param key
         @param val
         @return this
         @public
       */

    }, {
      key: "update",
      value: function update() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        invokeMap_1.apply(void 0, [this.models, "update"].concat(args));
        return this;
      }
      /**
         Saves all models in the collection.
          ```js
         let posts = user.blogPosts;
          posts.models[0].published = true;
          posts.save(); // all posts saved to db
         ```
          @method save
         @return this
         @public
       */

    }, {
      key: "save",
      value: function save() {
        invokeMap_1(this.models, "save");
        return this;
      }
      /**
        Reloads each model in the collection.
         ```js
        let posts = author.blogPosts;
         // ...
         posts.reload(); // reloads data for each post from the db
        ```
         @method reload
        @return this
        @public
      */

    }, {
      key: "reload",
      value: function reload() {
        invokeMap_1(this.models, "reload");
        return this;
      }
      /**
        Destroys the db record for all models in the collection.
         ```js
        let posts = user.blogPosts;
         posts.destroy(); // all posts removed from db
        ```
         @method destroy
        @return this
        @public
      */

    }, {
      key: "destroy",
      value: function destroy() {
        invokeMap_1(this.models, "destroy");
        return this;
      }
      /**
        Adds a model to this collection.
         ```js
        posts.length; // 1
         posts.add(newPost);
         posts.length; // 2
        ```
         @method add
        @param {Model} model
        @return this
        @public
      */

    }, {
      key: "add",
      value: function add(model) {
        this.models.push(model);
        return this;
      }
      /**
        Removes a model from this collection.
         ```js
        posts.length; // 5
         let firstPost = posts.models[0];
        posts.remove(firstPost);
        posts.save();
         posts.length; // 4
        ```
         @method remove
        @param {Model} model
        @return this
        @public
      */

    }, {
      key: "remove",
      value: function remove(model) {
        var match = this.models.find(function (m) {
          return m.toString() === model.toString();
        });

        if (match) {
          var i = this.models.indexOf(match);
          this.models.splice(i, 1);
        }

        return this;
      }
      /**
        Checks if the Collection includes the given model.
         ```js
        posts.includes(newPost);
        ```
         Works by checking if the given model name and id exists in the Collection,
        making it a bit more flexible than strict object equality.
         ```js
        let post = server.create('post');
        let programming = server.create('tag', { text: 'Programming' });
         visit(`/posts/${post.id}`);
        click('.tag-selector');
        click('.tag:contains(Programming)');
         post.reload();
        assert.ok(post.tags.includes(programming));
        ```
         @method includes
        @return {Boolean}
        @public
      */

    }, {
      key: "includes",
      value: function includes(model) {
        return this.models.some(function (m) {
          return m.toString() === model.toString();
        });
      }
      /**
        Returns a new Collection with its models filtered according to the provided [callback function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter).
         ```js
        let publishedPosts = user.posts.filter(post => post.isPublished);
        ```
        @method filter
        @param {Function} f
        @return {Collection}
        @public
      */

    }, {
      key: "filter",
      value: function filter(f) {
        var filteredModels = this.models.filter(f);
        return new Collection(this.modelName, filteredModels);
      }
      /**
         Returns a new Collection with its models sorted according to the provided [compare function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters).
          ```js
         let postsByTitleAsc = user.posts.sort((a, b) => a.title > b.title ? 1 : -1 );
         ```
          @method sort
         @param {Function} f
         @return {Collection}
         @public
       */

    }, {
      key: "sort",
      value: function sort(f) {
        var sortedModels = this.models.concat().sort(f);
        return new Collection(this.modelName, sortedModels);
      }
      /**
        Returns a new Collection with a subset of its models selected from `begin` to `end`.
         ```js
        let firstThreePosts = user.posts.slice(0, 3);
        ```
         @method slice
        @param {Integer} begin
        @param {Integer} end
        @return {Collection}
        @public
      */

    }, {
      key: "slice",
      value: function slice() {
        var _this$models;

        var slicedModels = (_this$models = this.models).slice.apply(_this$models, arguments);

        return new Collection(this.modelName, slicedModels);
      }
      /**
        Modifies the Collection by merging the models from another collection.
         ```js
        user.posts.mergeCollection(newPosts);
        user.posts.save();
        ```
         @method mergeCollection
        @param {Collection} collection
        @return this
        @public
       */

    }, {
      key: "mergeCollection",
      value: function mergeCollection(collection) {
        this.models = this.models.concat(collection.models);
        return this;
      }
      /**
         Simple string representation of the collection and id.
          ```js
         user.posts.toString(); // collection:post(post:1,post:4)
         ```
          @method toString
         @return {String}
         @public
       */

    }, {
      key: "toString",
      value: function toString() {
        return "collection:".concat(this.modelName, "(").concat(this.models.map(function (m) {
          return m.id;
        }).join(","), ")");
      }
    }]);

    return Collection;
  }();

  /**
   * An array of models, returned from one of the schema query
   * methods (all, find, where). Knows how to update and destroy its models.
   *
   * Identical to Collection except it can contain a heterogeneous array of
   * models. Thus, it has no `modelName` property. This lets serializers and
   * other parts of the system interact with it differently.
   *
   * @class PolymorphicCollection
   * @constructor
   * @public
   * @hide
   */

  var PolymorphicCollection = /*#__PURE__*/function () {
    function PolymorphicCollection() {
      var models = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

      _classCallCheck(this, PolymorphicCollection);

      this.models = models;
    }
    /**
     * Number of models in the collection.
     *
     * @property length
     * @type Number
     * @public
     */


    _createClass(PolymorphicCollection, [{
      key: "length",
      get: function get() {
        return this.models.length;
      }
      /**
       * Updates each model in the collection (persisting immediately to the db).
       * @method update
       * @param key
       * @param val
       * @return this
       * @public
       */

    }, {
      key: "update",
      value: function update() {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        invokeMap_1.apply(void 0, [this.models, "update"].concat(args));
        return this;
      }
      /**
       * Destroys the db record for all models in the collection.
       * @method destroy
       * @return this
       * @public
       */

    }, {
      key: "destroy",
      value: function destroy() {
        invokeMap_1(this.models, "destroy");
        return this;
      }
      /**
       * Saves all models in the collection.
       * @method save
       * @return this
       * @public
       */

    }, {
      key: "save",
      value: function save() {
        invokeMap_1(this.models, "save");
        return this;
      }
      /**
       * Reloads each model in the collection.
       * @method reload
       * @return this
       * @public
       */

    }, {
      key: "reload",
      value: function reload() {
        invokeMap_1(this.models, "reload");
        return this;
      }
      /**
       * Adds a model to this collection
       *
       * @method add
       * @return this
       * @public
       */

    }, {
      key: "add",
      value: function add(model) {
        this.models.push(model);
        return this;
      }
      /**
       * Removes a model to this collection
       *
       * @method remove
       * @return this
       * @public
       */

    }, {
      key: "remove",
      value: function remove(model) {
        var match = this.models.find(function (m) {
          return isEqual_1(m.attrs, model.attrs);
        });

        if (match) {
          var i = this.models.indexOf(match);
          this.models.splice(i, 1);
        }

        return this;
      }
      /**
       * Checks if the collection includes the model
       *
       * @method includes
       * @return boolean
       * @public
       */

    }, {
      key: "includes",
      value: function includes(model) {
        return this.models.some(function (m) {
          return isEqual_1(m.attrs, model.attrs);
        });
      }
      /**
       * @method filter
       * @param f
       * @return {Collection}
       * @public
       */

    }, {
      key: "filter",
      value: function filter(f) {
        var filteredModels = this.models.filter(f);
        return new PolymorphicCollection(filteredModels);
      }
      /**
       * @method sort
       * @param f
       * @return {Collection}
       * @public
       */

    }, {
      key: "sort",
      value: function sort(f) {
        var sortedModels = this.models.concat().sort(f);
        return new PolymorphicCollection(sortedModels);
      }
      /**
       * @method slice
       * @param {Integer} begin
       * @param {Integer} end
       * @return {Collection}
       * @public
       */

    }, {
      key: "slice",
      value: function slice() {
        var _this$models;

        var slicedModels = (_this$models = this.models).slice.apply(_this$models, arguments);

        return new PolymorphicCollection(slicedModels);
      }
      /**
       * @method mergeCollection
       * @param collection
       * @return this
       * @public
       */

    }, {
      key: "mergeCollection",
      value: function mergeCollection(collection) {
        this.models = this.models.concat(collection.models);
        return this;
      }
      /**
       * Simple string representation of the collection and id.
       * @method toString
       * @return {String}
       * @public
       */

    }, {
      key: "toString",
      value: function toString() {
        return "collection:".concat(this.modelName, "(").concat(this.models.map(function (m) {
          return m.id;
        }).join(","), ")");
      }
    }]);

    return PolymorphicCollection;
  }();

  /**
   * Creates an array with all falsey values removed. The values `false`, `null`,
   * `0`, `""`, `undefined`, and `NaN` are falsey.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Array
   * @param {Array} array The array to compact.
   * @returns {Array} Returns the new array of filtered values.
   * @example
   *
   * _.compact([0, 1, false, 2, '', 3]);
   * // => [1, 2, 3]
   */
  function compact(array) {
    var index = -1,
        length = array == null ? 0 : array.length,
        resIndex = 0,
        result = [];

    while (++index < length) {
      var value = array[index];
      if (value) {
        result[resIndex++] = value;
      }
    }
    return result;
  }

  var compact_1 = compact;

  var identifierCache = {};
  /**
   * @class HasMany
   * @extends Association
   * @constructor
   * @public
   * @hide
   */

  var HasMany = /*#__PURE__*/function (_Association) {
    _inherits(HasMany, _Association);

    var _super = _createSuper(HasMany);

    function HasMany() {
      _classCallCheck(this, HasMany);

      return _super.apply(this, arguments);
    }

    _createClass(HasMany, [{
      key: "identifier",
      get: function get() {
        if (typeof identifierCache[this.name] !== "string") {
          var identifier = "".concat(camelize(this._container.inflector.singularize(this.name)), "Ids");
          identifierCache[this.name] = identifier;
        }

        return identifierCache[this.name];
      }
    }, {
      key: "type",
      get: function get() {
        return "hasMany";
      }
      /**
       * @method getForeignKeyArray
       * @return {Array} Array of camelized model name of associated objects
       * and foreign key for the object owning the association
       * @public
       */

    }, {
      key: "getForeignKeyArray",
      value: function getForeignKeyArray() {
        return [camelize(this.ownerModelName), this.getForeignKey()];
      }
      /**
       * @method getForeignKey
       * @return {String} Foreign key for the object owning the association
       * @public
       */

    }, {
      key: "getForeignKey",
      value: function getForeignKey() {
        // we reuse identifierCache because it's the same logic as get identifier
        if (typeof identifierCache[this.name] !== "string") {
          var foreignKey = "".concat(this._container.inflector.singularize(camelize(this.name)), "Ids");
          identifierCache[this.name] = foreignKey;
        }

        return identifierCache[this.name];
      }
      /**
       * Registers has-many association defined by given key on given model,
       * defines getters / setters for associated records and associated records' ids,
       * adds methods for creating unsaved child records and creating saved ones
       *
       * @method addMethodsToModelClass
       * @param {Function} ModelClass
       * @param {String} key
       * @public
       */

    }, {
      key: "addMethodsToModelClass",
      value: function addMethodsToModelClass(ModelClass, key) {
        var modelPrototype = ModelClass.prototype;
        var association = this;
        var foreignKey = this.getForeignKey();

        var associationHash = _defineProperty$1({}, key, this);

        modelPrototype.hasManyAssociations = Object.assign(modelPrototype.hasManyAssociations, associationHash); // update hasManyAssociationFks

        Object.keys(modelPrototype.hasManyAssociations).forEach(function (key) {
          var value = modelPrototype.hasManyAssociations[key];
          modelPrototype.hasManyAssociationFks[value.getForeignKey()] = value;
        }); // Add to target's dependent associations array

        this.schema.addDependentAssociation(this, this.modelName); // TODO: look how this is used. Are these necessary, seems like they could be gotten from the above?
        // Or we could use a single data structure to store this information?

        modelPrototype.associationKeys.add(key);
        modelPrototype.associationIdKeys.add(foreignKey);
        Object.defineProperty(modelPrototype, foreignKey, {
          /*
            object.childrenIds
              - returns an array of the associated children's ids
          */
          get: function get() {
            this._tempAssociations = this._tempAssociations || {};
            var tempChildren = this._tempAssociations[key];
            var ids = [];

            if (tempChildren) {
              if (association.isPolymorphic) {
                ids = tempChildren.models.map(function (model) {
                  return {
                    type: model.modelName,
                    id: model.id
                  };
                });
              } else {
                ids = tempChildren.models.map(function (model) {
                  return model.id;
                });
              }
            } else {
              ids = this.attrs[foreignKey] || [];
            }

            return ids;
          },

          /*
            object.childrenIds = ([childrenIds...])
              - sets the associated children (via id)
          */
          set: function set(ids) {
            var tempChildren;

            if (ids === null) {
              tempChildren = [];
            } else if (ids !== undefined) {
              assert(Array.isArray(ids), "You must pass an array in when setting ".concat(foreignKey, " on ").concat(this));

              if (association.isPolymorphic) {
                assert(ids.every(function (el) {
                  return _typeof(el) === "object" && _typeof(el.type) !== undefined && _typeof(el.id) !== undefined;
                }), "You must pass in an array of polymorphic identifiers (objects of shape { type, id }) when setting ".concat(foreignKey, " on ").concat(this));
                var models = ids.map(function (_ref) {
                  var type = _ref.type,
                      id = _ref.id;
                  return association.schema[association.schema.toCollectionName(type)].find(id);
                });
                tempChildren = new PolymorphicCollection(models);
              } else {
                tempChildren = association.schema[association.schema.toCollectionName(association.modelName)].find(ids);
              }
            }

            this[key] = tempChildren;
          }
        });
        Object.defineProperty(modelPrototype, key, {
          /*
            object.children
              - returns an array of associated children
          */
          get: function get() {
            this._tempAssociations = this._tempAssociations || {};
            var collection = null;

            if (this._tempAssociations[key]) {
              collection = this._tempAssociations[key];
            } else {
              if (association.isPolymorphic) {
                if (this[foreignKey]) {
                  var polymorphicIds = this[foreignKey];
                  var models = polymorphicIds.map(function (_ref2) {
                    var type = _ref2.type,
                        id = _ref2.id;
                    return association.schema[association.schema.toCollectionName(type)].find(id);
                  });
                  collection = new PolymorphicCollection(models);
                } else {
                  collection = new PolymorphicCollection(association.modelName);
                }
              } else {
                if (this[foreignKey]) {
                  collection = association.schema[association.schema.toCollectionName(association.modelName)].find(this[foreignKey]);
                } else {
                  collection = new Collection(association.modelName);
                }
              }

              this._tempAssociations[key] = collection;
            }

            return collection;
          },

          /*
            object.children = [model1, model2, ...]
              - sets the associated children (via array of models or Collection)
          */
          set: function set(models) {
            var _this = this;

            if (models instanceof Collection || models instanceof PolymorphicCollection) {
              models = models.models;
            }

            models = models ? compact_1(models) : [];
            this._tempAssociations = this._tempAssociations || {};
            var collection;

            if (association.isPolymorphic) {
              collection = new PolymorphicCollection(models);
            } else {
              collection = new Collection(association.modelName, models);
            }

            this._tempAssociations[key] = collection;
            models.forEach(function (model) {
              if (model.hasInverseFor(association)) {
                var inverse = model.inverseFor(association);
                model.associate(_this, inverse);
              }
            });
          }
        });
        /*
          object.newChild
            - creates a new unsaved associated child
        */

        modelPrototype["new".concat(capitalize(camelize(this._container.inflector.singularize(association.name))))] = function () {
          var modelName, attrs;

          if (association.isPolymorphic) {
            modelName = arguments.length <= 0 ? undefined : arguments[0];
            attrs = arguments.length <= 1 ? undefined : arguments[1];
          } else {
            modelName = association.modelName;
            attrs = arguments.length <= 0 ? undefined : arguments[0];
          }

          var child = association.schema[association.schema.toCollectionName(modelName)].new(attrs);
          var children = this[key].models;
          children.push(child);
          this[key] = children;
          return child;
        };
        /*
          object.createChild
            - creates a new saved associated child, and immediately persists both models
           TODO: forgot why this[key].add(child) doesn't work, most likely
          because these external APIs trigger saving cascades. Should probably
          have an internal method like this[key]._add.
        */


        modelPrototype["create".concat(capitalize(camelize(this._container.inflector.singularize(association.name))))] = function () {
          var modelName, attrs;

          if (association.isPolymorphic) {
            modelName = arguments.length <= 0 ? undefined : arguments[0];
            attrs = arguments.length <= 1 ? undefined : arguments[1];
          } else {
            modelName = association.modelName;
            attrs = arguments.length <= 0 ? undefined : arguments[0];
          }

          var child = association.schema[association.schema.toCollectionName(modelName)].create(attrs);
          var children = this[key].models;
          children.push(child);
          this[key] = children;
          this.save();
          return child.reload();
        };
      }
      /**
       *
       *
       * @public
       */

    }, {
      key: "disassociateAllDependentsFromTarget",
      value: function disassociateAllDependentsFromTarget(model) {
        var _this2 = this;

        var owner = this.ownerModelName;
        var fk;

        if (this.isPolymorphic) {
          fk = {
            type: model.modelName,
            id: model.id
          };
        } else {
          fk = model.id;
        }

        var dependents = this.schema[this.schema.toCollectionName(owner)].where(function (potentialOwner) {
          var currentIds = potentialOwner[_this2.getForeignKey()]; // Need this check because currentIds could be null


          return currentIds && currentIds.find(function (id) {
            if (_typeof(id) === "object") {
              return id.type === fk.type && id.id === fk.id;
            } else {
              return id === fk;
            }
          });
        });
        dependents.models.forEach(function (dependent) {
          dependent.disassociate(model, _this2);
          dependent.save();
        });
      }
    }]);

    return HasMany;
  }(Association);

  var pathModelClassCache = {};
  /**
    @hide
  */

  var BaseRouteHandler = /*#__PURE__*/function () {
    function BaseRouteHandler() {
      _classCallCheck(this, BaseRouteHandler);
    }

    _createClass(BaseRouteHandler, [{
      key: "getModelClassFromPath",
      value: function getModelClassFromPath(fullPath) {
        if (!fullPath) {
          return;
        }

        if (typeof pathModelClassCache[fullPath] !== "string") {
          var path = fullPath.split("/");
          var lastPath;

          for (var i = path.length - 1; i >= 0; i--) {
            var segment = path[i];

            if (segment.length && segment[0] !== ":") {
              lastPath = segment;
              break;
            }
          }

          pathModelClassCache[fullPath] = dasherize(camelize(this._container.inflector.singularize(lastPath)));
        }

        return pathModelClassCache[fullPath];
      }
    }, {
      key: "_getIdForRequest",
      value: function _getIdForRequest(request, jsonApiDoc) {
        var id;

        if (request && request.params && request.params.id) {
          id = request.params.id;
        } else if (jsonApiDoc && jsonApiDoc.data && jsonApiDoc.data.id) {
          id = jsonApiDoc.data.id;
        }

        return id;
      }
    }, {
      key: "_getJsonApiDocForRequest",
      value: function _getJsonApiDocForRequest(request, modelName) {
        var body;

        if (request && request.requestBody) {
          body = JSON.parse(request.requestBody);
        }

        return this.serializerOrRegistry.normalize(body, modelName);
      }
    }, {
      key: "_getAttrsForRequest",
      value: function _getAttrsForRequest(request, modelName) {
        var _this = this;

        var json = this._getJsonApiDocForRequest(request, modelName);

        var id = this._getIdForRequest(request, json);

        var attrs = {};
        assert(json.data && (json.data.attributes || json.data.type || json.data.relationships), "You're using a shorthand or #normalizedRequestAttrs, but your serializer's normalize function did not return a valid JSON:API document. Consult the docs for the normalize hook on the Serializer class.");

        if (json.data.attributes) {
          attrs = Object.keys(json.data.attributes).reduce(function (sum, key) {
            sum[camelize(key)] = json.data.attributes[key];
            return sum;
          }, {});
        }

        if (json.data.relationships) {
          Object.keys(json.data.relationships).forEach(function (relationshipName) {
            var relationship = json.data.relationships[relationshipName];

            var modelClass = _this.schema.modelClassFor(modelName);

            var association = modelClass.associationFor(camelize(relationshipName));
            var valueForRelationship;
            assert(association, "You're passing the relationship '".concat(relationshipName, "' to the '").concat(modelName, "' model via a ").concat(request.method, " to '").concat(request.url, "', but you did not define the '").concat(relationshipName, "' association on the '").concat(modelName, "' model."));

            if (association.isPolymorphic) {
              valueForRelationship = relationship.data;
            } else if (association instanceof HasMany) {
              valueForRelationship = relationship.data && relationship.data.map(function (rel) {
                return rel.id;
              });
            } else {
              valueForRelationship = relationship.data && relationship.data.id;
            }

            attrs[association.identifier] = valueForRelationship;
          }, {});
        }

        if (id) {
          attrs.id = id;
        }

        return attrs;
      }
    }, {
      key: "_getAttrsForFormRequest",
      value: function _getAttrsForFormRequest(_ref) {
        var requestBody = _ref.requestBody;
        var attrs;
        var urlEncodedParts = [];
        assert(requestBody && typeof requestBody === "string", "You're using the helper method #normalizedFormData, but the request body is empty or not a valid url encoded string.");
        urlEncodedParts = requestBody.split("&");
        attrs = urlEncodedParts.reduce(function (a, urlEncodedPart) {
          var _urlEncodedPart$split = urlEncodedPart.split("="),
              _urlEncodedPart$split2 = _slicedToArray(_urlEncodedPart$split, 2),
              key = _urlEncodedPart$split2[0],
              value = _urlEncodedPart$split2[1];

          a[key] = decodeURIComponent(value.replace(/\+/g, " "));
          return a;
        }, {});
        return attrs;
      }
    }]);

    return BaseRouteHandler;
  }();

  /**
   * @hide
   */

  var FunctionRouteHandler = /*#__PURE__*/function (_BaseRouteHandler) {
    _inherits(FunctionRouteHandler, _BaseRouteHandler);

    var _super = _createSuper(FunctionRouteHandler);

    function FunctionRouteHandler(schema, serializerOrRegistry, userFunction, path, server) {
      var _this;

      _classCallCheck(this, FunctionRouteHandler);

      _this = _super.call(this, server);
      _this.schema = schema;
      _this.serializerOrRegistry = serializerOrRegistry;
      _this.userFunction = userFunction;
      _this.path = path;
      return _this;
    }

    _createClass(FunctionRouteHandler, [{
      key: "handle",
      value: function handle(request) {
        return this.userFunction(this.schema, request);
      }
    }, {
      key: "setRequest",
      value: function setRequest(request) {
        this.request = request;
      }
    }, {
      key: "serialize",
      value: function serialize(response, serializerType) {
        var serializer;

        if (serializerType) {
          serializer = this.serializerOrRegistry.serializerFor(serializerType, {
            explicit: true
          });
        } else {
          serializer = this.serializerOrRegistry;
        }

        return serializer.serialize(response, this.request);
      }
    }, {
      key: "normalizedRequestAttrs",
      value: function normalizedRequestAttrs() {
        var modelName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
        var path = this.path,
            request = this.request,
            requestHeaders = this.request.requestHeaders;
        var attrs;
        var lowerCaseHeaders = {};

        for (var header in requestHeaders) {
          lowerCaseHeaders[header.toLowerCase()] = requestHeaders[header];
        }

        if (/x-www-form-urlencoded/.test(lowerCaseHeaders["content-type"])) {
          attrs = this._getAttrsForFormRequest(request);
        } else {
          if (modelName) {
            assert(dasherize(modelName) === modelName, "You called normalizedRequestAttrs('".concat(modelName, "'), but normalizedRequestAttrs was intended to be used with the dasherized version of the model type. Please change this to normalizedRequestAttrs('").concat(dasherize(modelName), "')."));
          } else {
            modelName = this.getModelClassFromPath(path);
          }

          assert(this.schema.hasModelForModelName(modelName), "You're using a shorthand or the #normalizedRequestAttrs helper but the detected model of '".concat(modelName, "' does not exist. You might need to pass in the correct modelName as the first argument to #normalizedRequestAttrs."));
          attrs = this._getAttrsForRequest(request, modelName);
        }

        return attrs;
      }
    }]);

    return FunctionRouteHandler;
  }(BaseRouteHandler);

  /**
   * @hide
   */
  var ObjectRouteHandler = /*#__PURE__*/function () {
    function ObjectRouteHandler(schema, serializerOrRegistry, object) {
      _classCallCheck(this, ObjectRouteHandler);

      this.schema = schema;
      this.serializerOrRegistry = serializerOrRegistry;
      this.object = object;
    }

    _createClass(ObjectRouteHandler, [{
      key: "handle",
      value: function handle() {
        return this.object;
      }
    }]);

    return ObjectRouteHandler;
  }();

  /**
    @hide
  */

  var BaseShorthandRouteHandler = /*#__PURE__*/function (_BaseRouteHandler) {
    _inherits(BaseShorthandRouteHandler, _BaseRouteHandler);

    var _super = _createSuper(BaseShorthandRouteHandler);

    function BaseShorthandRouteHandler(schema, serializerOrRegistry, shorthand, path) {
      var _this;

      var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

      _classCallCheck(this, BaseShorthandRouteHandler);

      _this = _super.call(this);
      shorthand = shorthand || _this.getModelClassFromPath(path);
      _this.schema = schema;
      _this.serializerOrRegistry = serializerOrRegistry;
      _this.shorthand = shorthand;
      _this.options = options;
      var type = Array.isArray(shorthand) ? "array" : _typeof(shorthand);

      if (type === "string") {
        var modelClass = _this.schema[_this.schema.toCollectionName(shorthand)];

        _this.handle = function (request) {
          return _this.handleStringShorthand(request, modelClass);
        };
      } else if (type === "array") {
        var modelClasses = shorthand.map(function (modelName) {
          return _this.schema[_this.schema.toCollectionName(modelName)];
        });

        _this.handle = function (request) {
          return _this.handleArrayShorthand(request, modelClasses);
        };
      }

      return _this;
    } // handleStringShorthand() {
    //
    // }
    //
    // handleArrayShorthand() {
    //
    // }


    return BaseShorthandRouteHandler;
  }(BaseRouteHandler);

  /**
   * @hide
   */

  var GetShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
    _inherits(GetShorthandRouteHandler, _BaseShorthandRouteHa);

    var _super = _createSuper(GetShorthandRouteHandler);

    function GetShorthandRouteHandler() {
      _classCallCheck(this, GetShorthandRouteHandler);

      return _super.apply(this, arguments);
    }

    _createClass(GetShorthandRouteHandler, [{
      key: "handleStringShorthand",
      value:
      /*
        Retrieve a model/collection from the db.
         Examples:
          this.get('/contacts', 'contact');
          this.get('/contacts/:id', 'contact');
      */
      function handleStringShorthand(request, modelClass) {
        var modelName = this.shorthand;
        var camelizedModelName = camelize(modelName);
        assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

        var id = this._getIdForRequest(request);

        if (id) {
          var model = modelClass.find(id);

          if (!model) {
            return new Response$1(404);
          } else {
            return model;
          }
        } else if (this.options.coalesce) {
          var ids = this.serializerOrRegistry.getCoalescedIds(request, camelizedModelName);

          if (ids) {
            return modelClass.find(ids);
          }
        }

        return modelClass.all();
      }
      /*
        Retrieve an array of collections from the db.
         Ex: this.get('/home', ['contacts', 'pictures']);
      */

    }, {
      key: "handleArrayShorthand",
      value: function handleArrayShorthand(request, modelClasses) {
        var keys = this.shorthand;

        var id = this._getIdForRequest(request);
        /*
        If the first key is singular and we have an id param in
        the request, we're dealing with the version of the shorthand
        that has a parent model and several has-many relationships.
        We throw an error, because the serializer is the appropriate
        place for this now.
        */


        assert(!id || this._container.inflector.singularize(keys[0]) !== keys[0], "It looks like you're using the \"Single record with\n      related records\" version of the array shorthand, in addition to opting\n      in to the model layer. This shorthand was made when there was no\n      serializer layer. Now that you're using models, please ensure your\n      relationships are defined, and create a serializer for the parent\n      model, adding the relationships there.");
        return modelClasses.map(function (modelClass) {
          return modelClass.all();
        });
      }
    }]);

    return GetShorthandRouteHandler;
  }(BaseShorthandRouteHandler);

  /**
   * @hide
   */

  var PostShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
    _inherits(PostShorthandRouteHandler, _BaseShorthandRouteHa);

    var _super = _createSuper(PostShorthandRouteHandler);

    function PostShorthandRouteHandler() {
      _classCallCheck(this, PostShorthandRouteHandler);

      return _super.apply(this, arguments);
    }

    _createClass(PostShorthandRouteHandler, [{
      key: "handleStringShorthand",
      value:
      /*
        Push a new model of type *camelizedModelName* to the db.
         For example, this will push a 'user':
          this.post('/contacts', 'user');
      */
      function handleStringShorthand(request, modelClass) {
        var modelName = this.shorthand;
        var camelizedModelName = camelize(modelName);
        assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

        var attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

        return modelClass.create(attrs);
      }
    }]);

    return PostShorthandRouteHandler;
  }(BaseShorthandRouteHandler);

  /**
   * @hide
   */

  var PutShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
    _inherits(PutShorthandRouteHandler, _BaseShorthandRouteHa);

    var _super = _createSuper(PutShorthandRouteHandler);

    function PutShorthandRouteHandler() {
      _classCallCheck(this, PutShorthandRouteHandler);

      return _super.apply(this, arguments);
    }

    _createClass(PutShorthandRouteHandler, [{
      key: "handleStringShorthand",
      value:
      /*
        Update an object from the db, specifying the type.
           this.put('/contacts/:id', 'user');
      */
      function handleStringShorthand(request, modelClass) {
        var modelName = this.shorthand;
        var camelizedModelName = camelize(modelName);
        assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

        var id = this._getIdForRequest(request);

        var model = modelClass.find(id);

        if (!model) {
          return new Response$1(404);
        }

        var attrs = this._getAttrsForRequest(request, modelClass.camelizedModelName);

        return model.update(attrs);
      }
    }]);

    return PutShorthandRouteHandler;
  }(BaseShorthandRouteHandler);

  /**
   * @hide
   */

  var DeleteShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
    _inherits(DeleteShorthandRouteHandler, _BaseShorthandRouteHa);

    var _super = _createSuper(DeleteShorthandRouteHandler);

    function DeleteShorthandRouteHandler() {
      _classCallCheck(this, DeleteShorthandRouteHandler);

      return _super.apply(this, arguments);
    }

    _createClass(DeleteShorthandRouteHandler, [{
      key: "handleStringShorthand",
      value:
      /*
        Remove the model from the db of type *camelizedModelName*.
         This would remove the user with id :id:
          Ex: this.del('/contacts/:id', 'user');
      */
      function handleStringShorthand(request, modelClass) {
        var modelName = this.shorthand;
        var camelizedModelName = camelize(modelName);
        assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

        var id = this._getIdForRequest(request);

        var model = modelClass.find(id);

        if (!model) {
          return new Response$1(404);
        }

        model.destroy();
      }
      /*
        Remove the model and child related models from the db.
         This would remove the contact with id `:id`, as well
        as this contact's addresses and phone numbers.
          Ex: this.del('/contacts/:id', ['contact', 'addresses', 'numbers');
      */

    }, {
      key: "handleArrayShorthand",
      value: function handleArrayShorthand(request, modelClasses) {
        var _this = this;

        var id = this._getIdForRequest(request);

        var parent = modelClasses[0].find(id);
        var childTypes = modelClasses.slice(1).map(function (modelClass) {
          return _this._container.inflector.pluralize(modelClass.camelizedModelName);
        }); // Delete related children

        childTypes.forEach(function (type) {
          return parent[type].destroy();
        });
        parent.destroy();
      }
    }]);

    return DeleteShorthandRouteHandler;
  }(BaseShorthandRouteHandler);

  /**
   * @hide
   */

  var HeadShorthandRouteHandler = /*#__PURE__*/function (_BaseShorthandRouteHa) {
    _inherits(HeadShorthandRouteHandler, _BaseShorthandRouteHa);

    var _super = _createSuper(HeadShorthandRouteHandler);

    function HeadShorthandRouteHandler() {
      _classCallCheck(this, HeadShorthandRouteHandler);

      return _super.apply(this, arguments);
    }

    _createClass(HeadShorthandRouteHandler, [{
      key: "handleStringShorthand",
      value:
      /*
        Retrieve a model/collection from the db.
         Examples:
          this.head('/contacts', 'contact');
          this.head('/contacts/:id', 'contact');
      */
      function handleStringShorthand(request, modelClass) {
        var modelName = this.shorthand;
        var camelizedModelName = camelize(modelName);
        assert(modelClass, "The route handler for ".concat(request.url, " is trying to access the ").concat(camelizedModelName, " model, but that model doesn't exist."));

        var id = this._getIdForRequest(request);

        if (id) {
          var model = modelClass.find(id);

          if (!model) {
            return new Response$1(404);
          } else {
            return new Response$1(204);
          }
        } else if (this.options.coalesce && request.queryParams && request.queryParams.ids) {
          var _model = modelClass.find(request.queryParams.ids);

          if (!_model) {
            return new Response$1(404);
          } else {
            return new Response$1(204);
          }
        } else {
          return new Response$1(204);
        }
      }
    }]);

    return HeadShorthandRouteHandler;
  }(BaseShorthandRouteHandler);

  var DEFAULT_CODES = {
    get: 200,
    put: 204,
    post: 201,
    delete: 204
  };

  function createHandler(_ref) {
    var verb = _ref.verb,
        schema = _ref.schema,
        serializerOrRegistry = _ref.serializerOrRegistry,
        path = _ref.path,
        rawHandler = _ref.rawHandler,
        options = _ref.options,
        middleware = _ref.middleware;
    var handler;
    var args = [schema, serializerOrRegistry, rawHandler, path, options, middleware];

    var type = _typeof(rawHandler);

    if (type === "function") {
      handler = _construct(FunctionRouteHandler, args);
    } else if (type === "object" && rawHandler) {
      handler = _construct(ObjectRouteHandler, args);
    } else if (verb === "get") {
      handler = _construct(GetShorthandRouteHandler, args);
    } else if (verb === "post") {
      handler = _construct(PostShorthandRouteHandler, args);
    } else if (verb === "put" || verb === "patch") {
      handler = _construct(PutShorthandRouteHandler, args);
    } else if (verb === "delete") {
      handler = _construct(DeleteShorthandRouteHandler, args);
    } else if (verb === "head") {
      handler = _construct(HeadShorthandRouteHandler, args);
    }

    return handler;
  }
  /**
   * @hide
   */


  var RouteHandler = /*#__PURE__*/function () {
    function RouteHandler(_ref2) {
      var schema = _ref2.schema,
          verb = _ref2.verb,
          rawHandler = _ref2.rawHandler,
          customizedCode = _ref2.customizedCode,
          options = _ref2.options,
          path = _ref2.path,
          serializerOrRegistry = _ref2.serializerOrRegistry,
          middleware = _ref2.middleware;

      _classCallCheck(this, RouteHandler);

      this.verb = verb;
      this.customizedCode = customizedCode;
      this.serializerOrRegistry = serializerOrRegistry;
      this.middleware = middleware || [];
      this.handler = createHandler({
        verb: verb,
        schema: schema,
        path: path,
        serializerOrRegistry: serializerOrRegistry,
        rawHandler: rawHandler,
        options: options
      });
    }

    _createClass(RouteHandler, [{
      key: "handle",
      value: function handle(request) {
        var _this = this;

        return this._getMirageResponseForRequest(request, this.middleware).then(function (mirageResponse) {
          return _this.serialize(mirageResponse, request);
        }).then(function (serializedMirageResponse) {
          return serializedMirageResponse.toRackResponse();
        });
      }
    }, {
      key: "_getMirageResponseForRequest",
      value: function _getMirageResponseForRequest(request) {
        var _this2 = this;

        var middleware = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
        var result;

        try {
          /*
           We need to do this for the #serialize convenience method. Probably is
           a better way.
          */
          if (this.handler instanceof FunctionRouteHandler) {
            this.handler.setRequest(request);
          }

          result = this.handleWithMiddleware(request, [].concat(_toConsumableArray(middleware), [function (_, req) {
            return _this2.handler.handle(req);
          }]));
        } catch (e) {
          if (e instanceof MirageError) {
            result = new Response$1(500, {}, e);
          } else {
            var message = e.message || e;
            result = new Response$1(500, {}, {
              message: message,
              stack: "Mirage: Your ".concat(request.method, " handler for the url ").concat(request.url, " threw an error:\n\n").concat(e.stack || e)
            });
          }
        }

        return this._toMirageResponse(result);
      }
    }, {
      key: "handleWithMiddleware",
      value: function handleWithMiddleware(request, middleware) {
        var _this3 = this;

        var _middleware = _toArray(middleware),
            current = _middleware[0],
            remaining = _middleware.slice(1);

        return current(this.schema, request, function () {
          var req = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : request;
          return _this3.handleWithMiddleware(req, remaining);
        });
      }
    }, {
      key: "_toMirageResponse",
      value: function _toMirageResponse(result) {
        var _this4 = this;

        var mirageResponse;
        return new Promise(function (resolve, reject) {
          Promise.resolve(result).then(function (response) {
            if (response instanceof Response$1) {
              mirageResponse = result;
            } else {
              var code = _this4._getCodeForResponse(response);

              mirageResponse = new Response$1(code, {}, response);
            }

            resolve(mirageResponse);
          }).catch(reject);
        });
      }
    }, {
      key: "_getCodeForResponse",
      value: function _getCodeForResponse(response) {
        var code;

        if (this.customizedCode) {
          code = this.customizedCode;
        } else {
          code = DEFAULT_CODES[this.verb]; // Returning any data for a 204 is invalid

          if (code === 204 && response !== undefined && response !== "") {
            code = 200;
          }
        }

        return code;
      }
    }, {
      key: "serialize",
      value: function serialize(mirageResponse, request) {
        mirageResponse.data = this.serializerOrRegistry.serialize(mirageResponse.data, request);
        return mirageResponse;
      }
    }]);

    return RouteHandler;
  }();

  var $includes = arrayIncludes$1.includes;


  // `Array.prototype.includes` method
  // https://tc39.es/ecma262/#sec-array.prototype.includes
  _export({ target: 'Array', proto: true }, {
    includes: function includes(el /* , fromIndex = 0 */) {
      return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables('includes');

  var notARegexp = function (it) {
    if (isRegexp(it)) {
      throw TypeError("The method doesn't accept regular expressions");
    } return it;
  };

  var MATCH = wellKnownSymbol('match');

  var correctIsRegexpLogic = function (METHOD_NAME) {
    var regexp = /./;
    try {
      '/./'[METHOD_NAME](regexp);
    } catch (error1) {
      try {
        regexp[MATCH] = false;
        return '/./'[METHOD_NAME](regexp);
      } catch (error2) { /* empty */ }
    } return false;
  };

  // `String.prototype.includes` method
  // https://tc39.es/ecma262/#sec-string.prototype.includes
  _export({ target: 'String', proto: true, forced: !correctIsRegexpLogic('includes') }, {
    includes: function includes(searchString /* , position = 0 */) {
      return !!~toString_1(requireObjectCoercible(this))
        .indexOf(toString_1(notARegexp(searchString)), arguments.length > 1 ? arguments[1] : undefined);
    }
  });

  var nativeGetOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;


  var FAILS_ON_PRIMITIVES = fails(function () { nativeGetOwnPropertyDescriptor(1); });
  var FORCED = !descriptors || FAILS_ON_PRIMITIVES;

  // `Object.getOwnPropertyDescriptor` method
  // https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
  _export({ target: 'Object', stat: true, forced: FORCED, sham: !descriptors }, {
    getOwnPropertyDescriptor: function getOwnPropertyDescriptor(it, key) {
      return nativeGetOwnPropertyDescriptor(toIndexedObject(it), key);
    }
  });

  var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;







  // eslint-disable-next-line es/no-string-prototype-endswith -- safe
  var $endsWith = ''.endsWith;
  var min = Math.min;

  var CORRECT_IS_REGEXP_LOGIC = correctIsRegexpLogic('endsWith');
  // https://github.com/zloirock/core-js/pull/702
  var MDN_POLYFILL_BUG = !CORRECT_IS_REGEXP_LOGIC && !!function () {
    var descriptor = getOwnPropertyDescriptor(String.prototype, 'endsWith');
    return descriptor && !descriptor.writable;
  }();

  // `String.prototype.endsWith` method
  // https://tc39.es/ecma262/#sec-string.prototype.endswith
  _export({ target: 'String', proto: true, forced: !MDN_POLYFILL_BUG && !CORRECT_IS_REGEXP_LOGIC }, {
    endsWith: function endsWith(searchString /* , endPosition = @length */) {
      var that = toString_1(requireObjectCoercible(this));
      notARegexp(searchString);
      var endPosition = arguments.length > 1 ? arguments[1] : undefined;
      var len = toLength(that.length);
      var end = endPosition === undefined ? len : min(toLength(endPosition), len);
      var search = toString_1(searchString);
      return $endsWith
        ? $endsWith.call(that, search, end)
        : that.slice(end - search.length, end) === search;
    }
  });

  /** Used for built-in method references. */
  var objectProto$2 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$3 = objectProto$2.hasOwnProperty;

  /**
   * The base implementation of `_.has` without support for deep paths.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {Array|string} key The key to check.
   * @returns {boolean} Returns `true` if `key` exists, else `false`.
   */
  function baseHas(object, key) {
    return object != null && hasOwnProperty$3.call(object, key);
  }

  var _baseHas = baseHas;

  /**
   * Checks if `path` is a direct property of `object`.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path to check.
   * @returns {boolean} Returns `true` if `path` exists, else `false`.
   * @example
   *
   * var object = { 'a': { 'b': 2 } };
   * var other = _.create({ 'a': _.create({ 'b': 2 }) });
   *
   * _.has(object, 'a');
   * // => true
   *
   * _.has(object, 'a.b');
   * // => true
   *
   * _.has(object, ['a', 'b']);
   * // => true
   *
   * _.has(other, 'a');
   * // => false
   */
  function has$1(object, path) {
    return object != null && _hasPath(object, path, _baseHas);
  }

  var has_1 = has$1;

  /**
    @hide
  */

  function extend(protoProps, staticProps) {
    var Child = /*#__PURE__*/function (_this) {
      _inherits(Child, _this);

      var _super = _createSuper(Child);

      function Child() {
        var _this2;

        _classCallCheck(this, Child);

        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        _this2 = _super.call.apply(_super, [this].concat(args)); // The constructor function for the new subclass is optionally defined by you
        // in your `extend` definition

        if (protoProps && has_1(protoProps, "constructor")) {
          var _protoProps$construct;

          (_protoProps$construct = protoProps.constructor).call.apply(_protoProps$construct, [_assertThisInitialized(_this2)].concat(args));
        }

        return _this2;
      }

      return Child;
    }(this); // Add static properties to the constructor function, if supplied.


    Object.assign(Child, this, staticProps); // Add prototype properties (instance properties) to the subclass,
    // if supplied.

    if (protoProps) {
      Object.assign(Child.prototype, protoProps);
    }

    return Child;
  }

  /**
   * The base implementation of `_.values` and `_.valuesIn` which creates an
   * array of `object` property values corresponding to the property names
   * of `props`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array} props The property names to get values for.
   * @returns {Object} Returns the array of property values.
   */
  function baseValues(object, props) {
    return _arrayMap(props, function(key) {
      return object[key];
    });
  }

  var _baseValues = baseValues;

  /**
   * Creates an array of the own enumerable string keyed property values of `object`.
   *
   * **Note:** Non-object values are coerced to objects.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The object to query.
   * @returns {Array} Returns the array of property values.
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.values(new Foo);
   * // => [1, 2] (iteration order is not guaranteed)
   *
   * _.values('hi');
   * // => ['h', 'i']
   */
  function values(object) {
    return object == null ? [] : _baseValues(object, keys_1(object));
  }

  var values_1 = values;

  /**
    Models wrap your database, and allow you to define relationships.

    **Class vs. instance methods**

    The methods documented below apply to _instances_ of models, but you'll typically use the `Schema` to access the model _class_, which can be used to find or create instances.

    You can find the Class methods documented under the `Schema` API docs.

    **Accessing properties and relationships**

    You can access properites (fields) and relationships directly off of models.

    ```js
    user.name;    // 'Sam'
    user.team;    // Team model
    user.teamId;  // Team id (foreign key)
    ```

    Mirage Models are schemaless in their attributes, but their relationship schema is known.

    For example,

    ```js
    let user = schema.users.create();
    user.attrs  // { }
    user.name   // undefined

    let user = schema.users.create({ name: 'Sam' });
    user.attrs  // { name: 'Sam' }
    user.name   // 'Sam'
    ```

    However, if a `user` has a `posts` relationships defined,

    ```js
    let user = schema.users.create();
    user.posts  // returns an empty Posts Collection
    ```

    @class Model
    @constructor
    @public
   */

  var Model = /*#__PURE__*/function () {
    // TODO: schema and modelName now set statically at registration, need to remove

    /*
      Notes:
     - We need to pass in modelName, because models are created with
      .extend and anonymous functions, so you cannot use
      reflection to find the name of the constructor.
    */
    function Model(schema, modelName, attrs, fks) {
      var _this = this;

      _classCallCheck(this, Model);

      assert(schema, "A model requires a schema");
      assert(modelName, "A model requires a modelName");
      this._schema = schema;
      this.modelName = modelName;
      this.fks = fks || [];
      /**
        Returns the attributes of your model.
         ```js
        let post = schema.blogPosts.find(1);
        post.attrs; // {id: 1, title: 'Lorem Ipsum', publishedAt: '2012-01-01 10:00:00'}
        ```
         Note that you can also access individual attributes directly off a model, e.g. `post.title`.
         @property attrs
        @public
      */

      this.attrs = {};
      attrs = attrs || {}; // Ensure fks are there

      this.fks.forEach(function (fk) {
        _this.attrs[fk] = attrs[fk] !== undefined ? attrs[fk] : null;
      });
      Object.keys(attrs).forEach(function (name) {
        var value = attrs[name];

        _this._validateAttr(name, value);

        _this._setupAttr(name, value);

        _this._setupRelationship(name, value);
      });
      return this;
    }
    /**
      Create or saves the model.
       ```js
      let post = blogPosts.new({ title: 'Lorem ipsum' });
      post.id; // null
       post.save();
      post.id; // 1
       post.title = 'Hipster ipsum'; // db has not been updated
      post.save();                  // ...now the db is updated
      ```
       @method save
      @return this
      @public
     */


    _createClass(Model, [{
      key: "save",
      value: function save() {
        var collection = this._schema.toInternalCollectionName(this.modelName);

        if (this.isNew()) {
          // Update the attrs with the db response
          this.attrs = this._schema.db[collection].insert(this.attrs); // Ensure the id getter/setter is set

          this._definePlainAttribute("id");
        } else {
          this._schema.isSaving[this.toString()] = true;

          this._schema.db[collection].update(this.attrs.id, this.attrs);
        }

        this._saveAssociations();

        this._schema.isSaving[this.toString()] = false;
        return this;
      }
      /**
        Updates the record in the db.
         ```js
        let author = authors.find(1);
        let followers = users.find([1, 2]);
        let post = blogPosts.find(1);
        post.update('title', 'Hipster ipsum'); // the db was updated
        post.update({
          title: 'Lorem ipsum',
          created_at: 'before it was cool'
        });
        post.update({ author });
        post.update({ followers });
        ```
         @method update
        @param {String} key
        @param {any} val
        @return this
        @public
       */

    }, {
      key: "update",
      value: function update(key, val) {
        var attrs;

        if (key == null) {
          return this;
        }

        if (_typeof(key) === "object") {
          attrs = key;
        } else {
          (attrs = {})[key] = val;
        }

        Object.keys(attrs).forEach(function (attr) {
          if (!this.associationKeys.has(attr) && !this.associationIdKeys.has(attr)) {
            this._definePlainAttribute(attr);
          }

          this[attr] = attrs[attr];
        }, this);
        this.save();
        return this;
      }
      /**
        Destroys the db record.
         ```js
        let post = blogPosts.find(1);
        post.destroy(); // removed from the db
        ```
         @method destroy
        @public
       */

    }, {
      key: "destroy",
      value: function destroy() {
        if (this.isSaved()) {
          this._disassociateFromDependents();

          var collection = this._schema.toInternalCollectionName(this.modelName);

          this._schema.db[collection].remove(this.attrs.id);
        }
      }
      /**
        Boolean, true if the model has not been persisted yet to the db.
         ```js
        let post = blogPosts.new({title: 'Lorem ipsum'});
        post.isNew(); // true
        post.id;      // null
         post.save();  // true
        post.isNew(); // false
        post.id;      // 1
        ```
         @method isNew
        @return {Boolean}
        @public
       */

    }, {
      key: "isNew",
      value: function isNew() {
        var hasDbRecord = false;
        var hasId = this.attrs.id !== undefined && this.attrs.id !== null;

        if (hasId) {
          var collectionName = this._schema.toInternalCollectionName(this.modelName);

          var record = this._schema.db[collectionName].find(this.attrs.id);

          if (record) {
            hasDbRecord = true;
          }
        }

        return !hasDbRecord;
      }
      /**
        Boolean, opposite of `isNew`
         @method isSaved
        @return {Boolean}
        @public
       */

    }, {
      key: "isSaved",
      value: function isSaved() {
        return !this.isNew();
      }
      /**
        Reload a model's data from the database.
         ```js
        let post = blogPosts.find(1);
        post.attrs;     // {id: 1, title: 'Lorem ipsum'}
         post.title = 'Hipster ipsum';
        post.title;     // 'Hipster ipsum';
         post.reload();  // true
        post.title;     // 'Lorem ipsum'
        ```
         @method reload
        @return this
        @public
       */

    }, {
      key: "reload",
      value: function reload() {
        if (this.id) {
          var collection = this._schema.toInternalCollectionName(this.modelName);

          var attrs = this._schema.db[collection].find(this.id);

          Object.keys(attrs).filter(function (attr) {
            return attr !== "id";
          }).forEach(function (attr) {
            this.attrs[attr] = attrs[attr];
          }, this);
        } // Clear temp associations


        this._tempAssociations = {};
        return this;
      }
    }, {
      key: "toJSON",
      value: function toJSON() {
        return _objectSpread2({}, this.attrs);
      }
      /**
        Returns a hash of this model's associations.
         ```js
        let server = createServer({
          models: {
            user: Model,
            post: Model.extend({
              user: belongsTo(),
              comments: hasMany()
            }),
            comment: Model
          },
           seeds(server) {
            let peter = server.create("user", { name: "Peter" });
            server.create("post", { user: peter });
          }
        });
         let post = server.schema.posts.find(1)
        post.associations
         // {
        //   user: BelongsToAssociation,
        //   comments: HasManyAssociation
        // }
        ```
         Check out the docs on the Association class to see what fields are available for each association.
         @method associations
        @type {Object}
        @public
       */

    }, {
      key: "associations",
      get: function get() {
        return this._schema.associationsFor(this.modelName);
      }
      /**
        Returns the association for the given key
         @method associationFor
        @param key
        @public
        @hide
       */

    }, {
      key: "associationFor",
      value: function associationFor(key) {
        return this.associations[key];
      }
      /**
        Returns this model's inverse association for the given
        model-type-association pair, if it exists.
         Example:
              post: Model.extend({
               comments: hasMany()
             }),
             comments: Model.extend({
               post: belongsTo()
             })
          post.inversefor(commentsPostAssociation) would return the
         `post.comments` association object.
          Originally we had association.inverse() but that became impossible with
         the addition of polymorphic models. Consider the following:
              post: Model.extend({
               comments: hasMany()
             }),
             picture: Model.extend({
               comments: hasMany()
             }),
             comments: Model.extend({
               commentable: belongsTo({ polymorphic: true })
             })
          `commentable.inverse()` is ambiguous - does it return
         `post.comments` or `picture.comments`? Instead we need to ask each model
         if it has an inverse for a given association. post.inverseFor(commentable)
         is no longer ambiguous.
         @method hasInverseFor
        @param {String} modelName The model name of the class we're scanning
        @param {ORM/Association} association
        @return {ORM/Association}
        @public
        @hide
       */

    }, {
      key: "inverseFor",
      value: function inverseFor(association) {
        return this._explicitInverseFor(association) || this._implicitInverseFor(association);
      }
      /**
        Finds the inverse for an association that explicity defines it's inverse
         @private
        @hide
      */

    }, {
      key: "_explicitInverseFor",
      value: function _explicitInverseFor(association) {
        this._checkForMultipleExplicitInverses(association);

        var associations = this._schema.associationsFor(this.modelName);

        var inverse = association.opts.inverse;
        var candidate = inverse ? associations[inverse] : null;
        var matchingPolymorphic = candidate && candidate.isPolymorphic;
        var matchingInverse = candidate && candidate.modelName === association.ownerModelName;
        var candidateInverse = candidate && candidate.opts.inverse;

        if (candidateInverse && candidate.opts.inverse !== association.name) {
          assert(false, "You specified an inverse of ".concat(inverse, " for ").concat(association.name, ", but it does not match ").concat(candidate.modelName, " ").concat(candidate.name, "'s inverse"));
        }

        return matchingPolymorphic || matchingInverse ? candidate : null;
      }
      /**
        Ensures multiple explicit inverses don't exist on the current model
        for the given association.
         TODO: move this to compile-time check
         @private
        @hide
      */

    }, {
      key: "_checkForMultipleExplicitInverses",
      value: function _checkForMultipleExplicitInverses(association) {
        var associations = this._schema.associationsFor(this.modelName);

        var matchingExplicitInverses = Object.keys(associations).filter(function (key) {
          var candidate = associations[key];
          var modelMatches = association.ownerModelName === candidate.modelName;
          var inverseKeyMatches = association.name === candidate.opts.inverse;
          return modelMatches && inverseKeyMatches;
        });
        assert(matchingExplicitInverses.length <= 1, "The ".concat(this.modelName, " model has defined multiple explicit inverse associations for the ").concat(association.ownerModelName, ".").concat(association.name, " association."));
      }
      /**
        Finds if there is an inverse for an association that does not
        explicitly define one.
         @private
        @hide
      */

    }, {
      key: "_implicitInverseFor",
      value: function _implicitInverseFor(association) {
        var _this2 = this;

        var associations = this._schema.associationsFor(this.modelName);

        var modelName = association.ownerModelName;
        return values_1(associations).filter(function (candidate) {
          return candidate.modelName === modelName;
        }).reduce(function (inverse, candidate) {
          var candidateInverse = candidate.opts.inverse;
          var candidateIsImplicitInverse = candidateInverse === undefined;
          var candidateIsExplicitInverse = candidateInverse === association.name;
          var candidateMatches = candidateIsImplicitInverse || candidateIsExplicitInverse;

          if (candidateMatches) {
            // Need to move this check to compile-time init
            assert(!inverse, "The ".concat(_this2.modelName, " model has multiple possible inverse associations for the ").concat(association.ownerModelName, ".").concat(association.name, " association."));
            inverse = candidate;
          }

          return inverse;
        }, null);
      }
      /**
        Returns whether this model has an inverse association for the given
        model-type-association pair.
         @method hasInverseFor
        @param {String} modelName
        @param {ORM/Association} association
        @return {Boolean}
        @public
        @hide
       */

    }, {
      key: "hasInverseFor",
      value: function hasInverseFor(association) {
        return !!this.inverseFor(association);
      }
      /**
        Used to check if models match each other. If models are saved, we check model type
        and id, since they could have other non-persisted properties that are different.
         @public
        @hide
      */

    }, {
      key: "alreadyAssociatedWith",
      value: function alreadyAssociatedWith(model, association) {
        var associatedModelOrCollection = this[association.name];

        if (associatedModelOrCollection && model) {
          if (associatedModelOrCollection instanceof Model) {
            if (associatedModelOrCollection.isSaved() && model.isSaved()) {
              return associatedModelOrCollection.toString() === model.toString();
            } else {
              return associatedModelOrCollection === model;
            }
          } else {
            return associatedModelOrCollection.includes(model);
          }
        }
      }
    }, {
      key: "associate",
      value: function associate(model, association) {
        if (this.alreadyAssociatedWith(model, association)) {
          return;
        }

        var name = association.name;

        if (association instanceof HasMany) {
          if (!this[name].includes(model)) {
            this[name].add(model);
          }
        } else {
          this[name] = model;
        }
      }
    }, {
      key: "disassociate",
      value: function disassociate(model, association) {
        var fk = association.getForeignKey();

        if (association instanceof HasMany) {
          var i;

          if (association.isPolymorphic) {
            var found = this[fk].find(function (_ref) {
              var type = _ref.type,
                  id = _ref.id;
              return type === model.modelName && id === model.id;
            });
            i = found && this[fk].indexOf(found);
          } else {
            i = this[fk].map(function (key) {
              return key.toString();
            }).indexOf(model.id.toString());
          }

          if (i > -1) {
            this.attrs[fk].splice(i, 1);
          }
        } else {
          this.attrs[fk] = null;
        }
      }
      /**
        @hide
      */

    }, {
      key: "isSaving",
      get: function get() {
        return this._schema.isSaving[this.toString()];
      } // Private

      /**
        model.attrs represents the persistable attributes, i.e. your db
        table fields.
        @method _setupAttr
        @param attr
        @param value
        @private
        @hide
       */

    }, {
      key: "_setupAttr",
      value: function _setupAttr(attr, value) {
        var isAssociation = this.associationKeys.has(attr) || this.associationIdKeys.has(attr);

        if (!isAssociation) {
          this.attrs[attr] = value; // define plain getter/setters for non-association keys

          this._definePlainAttribute(attr);
        }
      }
      /**
        Define getter/setter for a plain attribute
        @method _definePlainAttribute
        @param attr
        @private
        @hide
       */

    }, {
      key: "_definePlainAttribute",
      value: function _definePlainAttribute(attr) {
        // Ensure the property hasn't already been defined
        var existingProperty = Object.getOwnPropertyDescriptor(this, attr);

        if (existingProperty && existingProperty.get) {
          return;
        } // Ensure the attribute is on the attrs hash


        if (!Object.prototype.hasOwnProperty.call(this.attrs, attr)) {
          this.attrs[attr] = null;
        } // Define the getter/setter


        Object.defineProperty(this, attr, {
          get: function get() {
            return this.attrs[attr];
          },
          set: function set(val) {
            this.attrs[attr] = val;
          }
        });
      }
      /**
        Foreign keys get set on attrs directly (to avoid potential recursion), but
        model references use the setter.
       *
        We validate foreign keys during instantiation.
       *
        @method _setupRelationship
        @param attr
        @param value
        @private
        @hide
       */

    }, {
      key: "_setupRelationship",
      value: function _setupRelationship(attr, value) {
        var isFk = this.associationIdKeys.has(attr) || this.fks.includes(attr);
        var isAssociation = this.associationKeys.has(attr);

        if (isFk) {
          if (value !== undefined && value !== null) {
            this._validateForeignKeyExistsInDatabase(attr, value);
          }

          this.attrs[attr] = value;
        }

        if (isAssociation) {
          this[attr] = value;
        }
      }
      /**
        @method _validateAttr
        @private
        @hide
       */

    }, {
      key: "_validateAttr",
      value: function _validateAttr(key, value) {
        // Verify attr passed in for associations is actually an association
        {
          if (this.associationKeys.has(key)) {
            var association = this.associationFor(key);
            var isNull = value === null;

            if (association instanceof HasMany) {
              var isCollection = value instanceof Collection || value instanceof PolymorphicCollection;
              var isArrayOfModels = Array.isArray(value) && value.every(function (item) {
                return item instanceof Model;
              });
              assert(isCollection || isArrayOfModels || isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a HasMany relationship. You must pass in a Collection, PolymorphicCollection, array of Models, or null."));
            } else if (association instanceof BelongsTo) {
              assert(value instanceof Model || isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a BelongsTo relationship. You must pass in a Model or null."));
            }
          }
        } // Verify attrs passed in for association foreign keys are actually fks

        {
          if (this.associationIdKeys.has(key)) {
            if (key.endsWith("Ids")) {
              var isArray = Array.isArray(value);

              var _isNull = value === null;

              assert(isArray || _isNull, "You're trying to create a ".concat(this.modelName, " model and you passed in \"").concat(value, "\" under the ").concat(key, " key, but that key is a foreign key for a HasMany relationship. You must pass in an array of ids or null."));
            }
          }
        } // Verify no undefined associations are passed in

        {
          var isModelOrCollection = value instanceof Model || value instanceof Collection || value instanceof PolymorphicCollection;

          var _isArrayOfModels = Array.isArray(value) && value.length && value.every(function (item) {
            return item instanceof Model;
          });

          if (isModelOrCollection || _isArrayOfModels) {
            var modelOrCollection = value;
            assert(this.associationKeys.has(key), "You're trying to create a ".concat(this.modelName, " model and you passed in a ").concat(modelOrCollection.toString(), " under the ").concat(key, " key, but you haven't defined that key as an association on your model."));
          }
        }
      }
      /**
        Originally we validated this via association.setId method, but it triggered
        recursion. That method is designed for updating an existing model's ID so
        this method is needed during instantiation.
       *
        @method _validateForeignKeyExistsInDatabase
        @private
        @hide
       */

    }, {
      key: "_validateForeignKeyExistsInDatabase",
      value: function _validateForeignKeyExistsInDatabase(foreignKeyName, foreignKeys) {
        var _this3 = this;

        if (Array.isArray(foreignKeys)) {
          var association = this.hasManyAssociationFks[foreignKeyName];
          var found;

          if (association.isPolymorphic) {
            found = foreignKeys.map(function (_ref2) {
              var type = _ref2.type,
                  id = _ref2.id;
              return _this3._schema.db[_this3._schema.toInternalCollectionName(type)].find(id);
            });
            found = compact_1(found);
          } else {
            found = this._schema.db[this._schema.toInternalCollectionName(association.modelName)].find(foreignKeys);
          }

          var foreignKeyLabel = association.isPolymorphic ? foreignKeys.map(function (fk) {
            return "".concat(fk.type, ":").concat(fk.id);
          }).join(",") : foreignKeys;
          assert(found.length === foreignKeys.length, "You're instantiating a ".concat(this.modelName, " that has a ").concat(foreignKeyName, " of ").concat(foreignKeyLabel, ", but some of those records don't exist in the database."));
        } else {
          var _association = this.belongsToAssociationFks[foreignKeyName];

          var _found;

          if (_association.isPolymorphic) {
            _found = this._schema.db[this._schema.toInternalCollectionName(foreignKeys.type)].find(foreignKeys.id);
          } else {
            _found = this._schema.db[this._schema.toInternalCollectionName(_association.modelName)].find(foreignKeys);
          }

          var _foreignKeyLabel = _association.isPolymorphic ? "".concat(foreignKeys.type, ":").concat(foreignKeys.id) : foreignKeys;

          assert(_found, "You're instantiating a ".concat(this.modelName, " that has a ").concat(foreignKeyName, " of ").concat(_foreignKeyLabel, ", but that record doesn't exist in the database."));
        }
      }
      /**
        Update associated children when saving a collection
       *
        @method _saveAssociations
        @private
        @hide
       */

    }, {
      key: "_saveAssociations",
      value: function _saveAssociations() {
        this._saveBelongsToAssociations();

        this._saveHasManyAssociations();
      }
    }, {
      key: "_saveBelongsToAssociations",
      value: function _saveBelongsToAssociations() {
        var _this4 = this;

        values_1(this.belongsToAssociations).forEach(function (association) {
          _this4._disassociateFromOldInverses(association);

          _this4._saveNewAssociates(association);

          _this4._associateWithNewInverses(association);
        });
      }
    }, {
      key: "_saveHasManyAssociations",
      value: function _saveHasManyAssociations() {
        var _this5 = this;

        values_1(this.hasManyAssociations).forEach(function (association) {
          _this5._disassociateFromOldInverses(association);

          _this5._saveNewAssociates(association);

          _this5._associateWithNewInverses(association);
        });
      }
    }, {
      key: "_disassociateFromOldInverses",
      value: function _disassociateFromOldInverses(association) {
        if (association instanceof HasMany) {
          this._disassociateFromHasManyInverses(association);
        } else if (association instanceof BelongsTo) {
          this._disassociateFromBelongsToInverse(association);
        }
      } // Disassociate currently persisted models that are no longer associated

    }, {
      key: "_disassociateFromHasManyInverses",
      value: function _disassociateFromHasManyInverses(association) {
        var _this6 = this;

        var fk = association.getForeignKey();
        var tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
        var associateIds = this.attrs[fk];

        if (tempAssociation && associateIds) {
          var models;

          if (association.isPolymorphic) {
            models = associateIds.map(function (_ref3) {
              var type = _ref3.type,
                  id = _ref3.id;
              return _this6._schema[_this6._schema.toCollectionName(type)].find(id);
            });
          } else {
            // TODO: prob should initialize hasMany fks with []
            models = this._schema[this._schema.toCollectionName(association.modelName)].find(associateIds || []).models;
          }

          models.filter(function (associate) {
            return (// filter out models that are already being saved
              !associate.isSaving && // filter out models that will still be associated
              !tempAssociation.includes(associate) && associate.hasInverseFor(association)
            );
          }).forEach(function (associate) {
            var inverse = associate.inverseFor(association);
            associate.disassociate(_this6, inverse);
            associate.save();
          });
        }
      }
      /*
        Disassociate currently persisted models that are no longer associated.
         Example:
           post: Model.extend({
            comments: hasMany()
          }),
           comment: Model.extend({
            post: belongsTo()
          })
         Assume `this` is comment:1. When saving, if comment:1 is no longer
        associated with post:1, we need to remove comment:1 from post:1.comments.
        In this example `association` would be `comment.post`.
      */

    }, {
      key: "_disassociateFromBelongsToInverse",
      value: function _disassociateFromBelongsToInverse(association) {
        var fk = association.getForeignKey();
        var tempAssociation = this._tempAssociations && this._tempAssociations[association.name];
        var associateId = this.attrs[fk];

        if (tempAssociation !== undefined && associateId) {
          var associate;

          if (association.isPolymorphic) {
            associate = this._schema[this._schema.toCollectionName(associateId.type)].find(associateId.id);
          } else {
            associate = this._schema[this._schema.toCollectionName(association.modelName)].find(associateId);
          }

          if (associate.hasInverseFor(association)) {
            var inverse = associate.inverseFor(association);
            associate.disassociate(this, inverse);

            associate._updateInDb(associate.attrs);
          }
        }
      } // Find all other models that depend on me and update their foreign keys

    }, {
      key: "_disassociateFromDependents",
      value: function _disassociateFromDependents() {
        var _this7 = this;

        this._schema.dependentAssociationsFor(this.modelName).forEach(function (association) {
          association.disassociateAllDependentsFromTarget(_this7);
        });
      }
    }, {
      key: "_saveNewAssociates",
      value: function _saveNewAssociates(association) {
        var fk = association.getForeignKey();
        var tempAssociate = this._tempAssociations && this._tempAssociations[association.name];

        if (tempAssociate !== undefined) {
          this.__isSavingNewChildren = true;
          delete this._tempAssociations[association.name];

          if (tempAssociate instanceof Collection) {
            tempAssociate.models.filter(function (model) {
              return !model.isSaving;
            }).forEach(function (child) {
              child.save();
            });

            this._updateInDb(_defineProperty$1({}, fk, tempAssociate.models.map(function (child) {
              return child.id;
            })));
          } else if (tempAssociate instanceof PolymorphicCollection) {
            tempAssociate.models.filter(function (model) {
              return !model.isSaving;
            }).forEach(function (child) {
              child.save();
            });

            this._updateInDb(_defineProperty$1({}, fk, tempAssociate.models.map(function (child) {
              return {
                type: child.modelName,
                id: child.id
              };
            })));
          } else {
            // Clearing the association
            if (tempAssociate === null) {
              this._updateInDb(_defineProperty$1({}, fk, null)); // Self-referential

            } else if (this.equals(tempAssociate)) {
              this._updateInDb(_defineProperty$1({}, fk, this.id)); // Non-self-referential

            } else if (!tempAssociate.isSaving) {
              // Save the tempAssociate and update the local reference
              tempAssociate.save();

              this._syncTempAssociations(tempAssociate);

              var fkValue;

              if (association.isPolymorphic) {
                fkValue = {
                  id: tempAssociate.id,
                  type: tempAssociate.modelName
                };
              } else {
                fkValue = tempAssociate.id;
              }

              this._updateInDb(_defineProperty$1({}, fk, fkValue));
            }
          }

          this.__isSavingNewChildren = false;
        }
      }
      /*
        Step 3 in saving associations.
         Example:
           // initial state
          post.author = steinbeck;
           // new state
          post.author = twain;
            1. Disassociate from old inverse (remove post from steinbeck.posts)
           2. Save new associates (if twain.isNew, save twain)
        -> 3. Associate with new inverse (add post to twain.posts)
      */

    }, {
      key: "_associateWithNewInverses",
      value: function _associateWithNewInverses(association) {
        var _this8 = this;

        if (!this.__isSavingNewChildren) {
          var modelOrCollection = this[association.name];

          if (modelOrCollection instanceof Model) {
            this._associateModelWithInverse(modelOrCollection, association);
          } else if (modelOrCollection instanceof Collection || modelOrCollection instanceof PolymorphicCollection) {
            modelOrCollection.models.forEach(function (model) {
              _this8._associateModelWithInverse(model, association);
            });
          }

          delete this._tempAssociations[association.name];
        }
      }
    }, {
      key: "_associateModelWithInverse",
      value: function _associateModelWithInverse(model, association) {
        var _this9 = this;

        if (model.hasInverseFor(association)) {
          var inverse = model.inverseFor(association);
          var inverseFk = inverse.getForeignKey();
          var ownerId = this.id;

          if (inverse instanceof BelongsTo) {
            var newId;

            if (inverse.isPolymorphic) {
              newId = {
                type: this.modelName,
                id: ownerId
              };
            } else {
              newId = ownerId;
            }

            this._schema.db[this._schema.toInternalCollectionName(model.modelName)].update(model.id, _defineProperty$1({}, inverseFk, newId));
          } else {
            var inverseCollection = this._schema.db[this._schema.toInternalCollectionName(model.modelName)];

            var currentIdsForInverse = inverseCollection.find(model.id)[inverse.getForeignKey()] || [];
            var newIdsForInverse = Object.assign([], currentIdsForInverse);

            var _newId, alreadyAssociatedWith;

            if (inverse.isPolymorphic) {
              _newId = {
                type: this.modelName,
                id: ownerId
              };
              alreadyAssociatedWith = newIdsForInverse.some(function (key) {
                return key.type == _this9.modelName && key.id == ownerId;
              });
            } else {
              _newId = ownerId;
              alreadyAssociatedWith = newIdsForInverse.includes(ownerId);
            }

            if (!alreadyAssociatedWith) {
              newIdsForInverse.push(_newId);
            }

            inverseCollection.update(model.id, _defineProperty$1({}, inverseFk, newIdsForInverse));
          }
        }
      } // Used to update data directly, since #save and #update can retrigger saves,
      // which can cause cycles with associations.

    }, {
      key: "_updateInDb",
      value: function _updateInDb(attrs) {
        this.attrs = this._schema.db[this._schema.toInternalCollectionName(this.modelName)].update(this.attrs.id, attrs);
      }
      /*
      Super gnarly: after we save this tempAssociate, we we need to through
      all other tempAssociates for a reference to this same model, and
      update it. Otherwise those other references are stale, which could
      cause a bug when they are subsequently saved.
       This only works for belongsTo right now, should add hasMany logic to it.
       See issue #1613: https://github.com/samselikoff/ember-cli-mirage/pull/1613
      */

    }, {
      key: "_syncTempAssociations",
      value: function _syncTempAssociations(tempAssociate) {
        var _this10 = this;

        Object.keys(this._tempAssociations).forEach(function (key) {
          if (_this10._tempAssociations[key] && _this10._tempAssociations[key].toString() === tempAssociate.toString()) {
            _this10._tempAssociations[key] = tempAssociate;
          }
        });
      }
      /**
        Simple string representation of the model and id.
         ```js
        let post = blogPosts.find(1);
        post.toString(); // "model:blogPost:1"
        ```
         @method toString
        @return {String}
        @public
      */

    }, {
      key: "toString",
      value: function toString() {
        var idLabel = this.id ? "(".concat(this.id, ")") : "";
        return "model:".concat(this.modelName).concat(idLabel);
      }
      /**
        Checks the equality of this model and the passed-in model
       *
        @method equals
        @return boolean
        @public
        @hide
       */

    }, {
      key: "equals",
      value: function equals(model) {
        return this.toString() === model.toString();
      }
    }]);

    return Model;
  }();

  Model.extend = extend;

  Model.findBelongsToAssociation = function (associationType) {
    return this.prototype.belongsToAssociations[associationType];
  };

  var Model$1 = Model;

  /** `Object#toString` result references. */
  var mapTag = '[object Map]',
      setTag = '[object Set]';

  /** Used for built-in method references. */
  var objectProto$1 = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$2 = objectProto$1.hasOwnProperty;

  /**
   * Checks if `value` is an empty object, collection, map, or set.
   *
   * Objects are considered empty if they have no own enumerable string keyed
   * properties.
   *
   * Array-like values such as `arguments` objects, arrays, buffers, strings, or
   * jQuery-like collections are considered empty if they have a `length` of `0`.
   * Similarly, maps and sets are considered empty if they have a `size` of `0`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is empty, else `false`.
   * @example
   *
   * _.isEmpty(null);
   * // => true
   *
   * _.isEmpty(true);
   * // => true
   *
   * _.isEmpty(1);
   * // => true
   *
   * _.isEmpty([1, 2, 3]);
   * // => false
   *
   * _.isEmpty({ 'a': 1 });
   * // => false
   */
  function isEmpty(value) {
    if (value == null) {
      return true;
    }
    if (isArrayLike_1(value) &&
        (isArray_1(value) || typeof value == 'string' || typeof value.splice == 'function' ||
          isBuffer_1(value) || isTypedArray_1(value) || isArguments_1(value))) {
      return !value.length;
    }
    var tag = _getTag(value);
    if (tag == mapTag || tag == setTag) {
      return !value.size;
    }
    if (_isPrototype(value)) {
      return !_baseKeys(value).length;
    }
    for (var key in value) {
      if (hasOwnProperty$2.call(value, key)) {
        return false;
      }
    }
    return true;
  }

  var isEmpty_1 = isEmpty;

  /**
   * This method is like `_.uniq` except that it accepts `iteratee` which is
   * invoked for each element in `array` to generate the criterion by which
   * uniqueness is computed. The order of result values is determined by the
   * order they occur in the array. The iteratee is invoked with one argument:
   * (value).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @param {Function} [iteratee=_.identity] The iteratee invoked per element.
   * @returns {Array} Returns the new duplicate free array.
   * @example
   *
   * _.uniqBy([2.1, 1.2, 2.3], Math.floor);
   * // => [2.1, 1.2]
   *
   * // The `_.property` iteratee shorthand.
   * _.uniqBy([{ 'x': 1 }, { 'x': 2 }, { 'x': 1 }], 'x');
   * // => [{ 'x': 1 }, { 'x': 2 }]
   */
  function uniqBy(array, iteratee) {
    return (array && array.length) ? _baseUniq(array, _baseIteratee(iteratee)) : [];
  }

  var uniqBy_1 = uniqBy;

  /**
    Serializers are responsible for formatting your route handler's response.

    The application serializer will apply to every response. To make specific customizations, define per-model serializers.

    ```js
    import { createServer, RestSerializer } from 'miragejs';

    createServer({
      serializers: {
        application: RestSerializer,
        user: RestSerializer.extend({
          // user-specific customizations
        })
      }
    })
    ```

    Any Model or Collection returned from a route handler will pass through the serializer layer. Highest priority will be given to a model-specific serializer, then the application serializer, then the default serializer.

    Mirage ships with three named serializers:

    - **JSONAPISerializer**, to simulate JSON:API compliant API servers:

      ```js
      import { createServer, JSONAPISerializer } from 'miragejs';

      createServer({
        serializers: {
          application: JSONAPISerializer
        }
      })
      ```

    - **ActiveModelSerializer**, to mock Rails APIs that use AMS-style responses:

      ```js
      import { createServer, ActiveModelSerializer } from 'miragejs';

      createServer({
        serializers: {
          application: ActiveModelSerializer
        }
      })
      ```

    - **RestSerializer**, a good starting point for many generic REST APIs:

      ```js
      import { createServer, RestSerializer } from 'miragejs';

      createServer({
        serializers: {
          application: RestSerializer
        }
      })
      ```

    Additionally, Mirage has a basic Serializer class which you can customize using the hooks documented below:

    ```js
    import { createServer, Serializer } from 'miragejs';

    createServer({
      serializers: {
        application: Serializer
      }
    })
    ```

    When writing model-specific serializers, remember to extend from your application serializer so shared logic is used by your model-specific classes:

    ```js
    import { createServer, Serializer } from 'miragejs';

    const ApplicationSerializer = Serializer.extend()

    createServer({
      serializers: {
        application: ApplicationSerializer,
        blogPost: ApplicationSerializer.extend({
          include: ['comments']
        })
      }
    })
    ```

    @class Serializer
    @constructor
    @public
  */

  var Serializer = /*#__PURE__*/function () {
    function Serializer(registry, type) {
      var _this = this;

      var request = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      _classCallCheck(this, Serializer);

      this.registry = registry;
      this.type = type;
      this.request = request;
      /**
        Use this property on a model serializer to whitelist attributes that will be used in your JSON payload.
         For example, if you had a `blog-post` model in your database that looked like
         ```
        {
          id: 1,
          title: 'Lorem ipsum',
          createdAt: '2014-01-01 10:00:00',
          updatedAt: '2014-01-03 11:42:12'
        }
        ```
         and you just wanted `id` and `title`, you could write
         ```js
        Serializer.extend({
          attrs: ['id', 'title']
        });
        ```
         and the payload would look like
         ```
        {
          id: 1,
          title: 'Lorem ipsum'
        }
        ```
         @property attrs
        @public
      */

      this.attrs = this.attrs || undefined; // this is just here so I can add the doc comment. Better way?

      /**
        Use this property on a model serializer to specify related models you'd like to include in your JSON payload. (These can be considered default server-side includes.)
         For example, if you had an `author` with many `blog-post`s and you wanted to sideload these, specify so in the `include` key:
         ```js
        createServer({
          models: {
            author: Model.extend({
              blogPosts: hasMany()
            })
          },
          serializers: {
            author: Serializer.extend({
              include: ['blogPosts']
            });
          }
        })
        ```
         Now a response to a request for an author would look like this:
         ```
        GET /authors/1
         {
          author: {
            id: 1,
            name: 'Link',
            blogPostIds: [1, 2]
          },
          blogPosts: [
            {id: 1, authorId: 1, title: 'Lorem'},
            {id: 2, authorId: 1, title: 'Ipsum'}
          ]
        }
        ```
         You can also define `include` as a function so it can be determined dynamically.
        
        For example, you could conditionally include a relationship based on an `include` query parameter:
         ```js
        // Include blog posts for a GET to /authors/1?include=blogPosts
        
        Serializer.extend({
          include: function(request) {
            if (request.queryParams.include === "blogPosts") {
              return ['blogPosts'];
            } else {
              return [];
            }
          }
        });
        ```
         **Query param includes for JSONAPISerializer**
         The JSONAPISerializer supports the use of `include` query parameter to return compound documents out of the box.
         For example, if your app makes the following request
         ```
        GET /api/authors?include=blogPosts
        ```
         the `JSONAPISerializer` will inspect the query params of the request, see that the blogPosts relationship is present, and then proceed as if this relationship was specified directly in the include: [] array on the serializer itself.
         Note that, in accordance with the spec, Mirage gives precedence to an ?include query param over a default include: [] array that you might have specified directly on the serializer. Default includes will still be in effect, however, if a request does not have an ?include query param.
         Also note that default includes specified with the `include: []` array can only take a single model; they cannot take dot-separated paths to nested relationships.
         If you'd like to set a default dot-separated (nested) include path for a resource, you have to do it at the route level by setting a default value for `request.queryParams`:
         ```js
        this.get('/users', function(schema, request) => {
          request.queryParams = request.queryParams || {};
          if (!request.queryParams.include) {
            request.queryParams.include = 'blog-posts.comments';
          }
           // rest of route handler logic
        });
        ```
         @property include
        @public
      */

      this.include = this.include || []; // this is just here so I can add the doc comment. Better way?

      /**
        Set whether your JSON response should have a root key in it.
         *Doesn't apply to JSONAPISerializer.*
         Defaults to true, so a request for an author looks like:
         ```
        GET /authors/1
         {
          author: {
            id: 1,
            name: 'Link'
          }
        }
        ```
         Setting `root` to false disables this:
         ```js
        Serializer.extend({
          root: false
        });
        ```
         Now the response looks like:
         ```
        GET /authors/1
         {
          id: 1,
          name: 'Link'
        }
        ```
         @property root
        @public
      */

      this.root = this.root || undefined; // this is just here so I can add the doc comment. Better way?

      /**
        Set whether related models should be embedded or sideloaded.
         *Doesn't apply to JSONAPISerializer.*
         By default this false, so relationships are sideloaded:
         ```
        GET /authors/1
         {
          author: {
            id: 1,
            name: 'Link',
            blogPostIds: [1, 2]
          },
          blogPosts: [
            { id: 1, authorId: 1, title: 'Lorem' },
            { id: 2, authorId: 1, title: 'Ipsum' }
          ]
        }
        ```
         Setting `embed` to true will embed all related records:
         ```js
        Serializer.extend({
          embed: true
        });
        ```
         Now the response looks like:
         ```
        GET /authors/1
         {
          author: {
            id: 1,
            name: 'Link',
            blogPosts: [
              { id: 1, authorId: 1, title: 'Lorem' },
              { id: 2, authorId: 1, title: 'Ipsum' }
            ]
          }
        }
        ```
         You can also define `embed` as a function so it can be determined dynamically.
      */

      this.embed = this.embed || undefined; // this is just here so I can add the doc comment. Better way?

      this._embedFn = isFunction_1(this.embed) ? this.embed : function () {
        return !!_this.embed;
      };
      /**
        Use this to define how your serializer handles serializing relationship keys. It can take one of three values:
         - `included`, which is the default, will serialize the ids of a relationship if that relationship is included (sideloaded) along with the model or collection in the response
        - `always` will always serialize the ids of all relationships for the model or collection in the response
        - `never` will never serialize the ids of relationships for the model or collection in the response
         @property serializeIds
        @public
      */

      this.serializeIds = this.serializeIds || undefined; // this is just here so I can add the doc comment. Better way?

      /**
        Primary Key name of the model
         Defaults to 'id', so a request for an author looks like:
         ```
        GET /authors/1
         {
          author: {
            id: 1,
            name: 'Link'
          }
        }
        ```
         Setting `primaryKey` to 'authorId changes this:
         ```js
        Serializer.extend({
          primaryKey: 'authorId'
        });
        ```
         Now the response looks like:
         ```
        GET /authors/1
         {
          author: {
            authorId: 1,
            name: 'Link'
          }
        }
        ```
         @property primaryKey
        @public
      */

      this.primaryKey = this.primaryKey || undefined; // this is just here so I can add the doc comment. Better way?
    }
    /**
      Override this method to implement your own custom serialize function. *response* is whatever was returned from your route handler, and *request* is the Pretender request object.
       Returns a plain JavaScript object or array, which Mirage uses as the response data to your app's XHR request.
       You can also override this method, call super, and manipulate the data before Mirage responds with it. This is a great place to add metadata, or for one-off operations that don't fit neatly into any of Mirage's other abstractions:
       ```js
      serialize(object, request) {
        // This is how to call super, as Mirage borrows [Backbone's implementation of extend](http://backbonejs.org/#Model-extend)
        let json = Serializer.prototype.serialize.apply(this, arguments);
         // Add metadata, sort parts of the response, etc.
         return json;
      }
      ```
       @param primaryResource
      @param request
      @return { Object } the json response
     */


    _createClass(Serializer, [{
      key: "serialize",
      value: function serialize(primaryResource
      /* , request */
      ) {
        this.primaryResource = primaryResource;
        return this.buildPayload(primaryResource);
      }
      /**
        This method is used by the POST and PUT shorthands. These shorthands expect a valid JSON:API document as part of the request, so that they know how to create or update the appropriate resouce. The *normalize* method allows you to transform your request body into a JSON:API document, which lets you take advantage of the shorthands when you otherwise may not be able to.
         Note that this method is a noop if you're using JSON:API already, since request payloads sent along with POST and PUT requests will already be in the correct format.
         Take a look at the included `ActiveModelSerializer`'s normalize method for an example.
         @method normalize
        @param json
        @public
       */

    }, {
      key: "normalize",
      value: function normalize(json) {
        return json;
      }
    }, {
      key: "buildPayload",
      value: function buildPayload(primaryResource, toInclude, didSerialize, json) {
        if (!primaryResource && isEmpty_1(toInclude)) {
          return json;
        } else if (primaryResource) {
          var _this$getHashForPrima = this.getHashForPrimaryResource(primaryResource),
              _this$getHashForPrima2 = _slicedToArray(_this$getHashForPrima, 2),
              resourceHash = _this$getHashForPrima2[0],
              newIncludes = _this$getHashForPrima2[1];

          var newDidSerialize = this.isCollection(primaryResource) ? primaryResource.models : [primaryResource];
          return this.buildPayload(undefined, newIncludes, newDidSerialize, resourceHash);
        } else {
          var nextIncludedResource = toInclude.shift();

          var _this$getHashForInclu = this.getHashForIncludedResource(nextIncludedResource),
              _this$getHashForInclu2 = _slicedToArray(_this$getHashForInclu, 2),
              _resourceHash = _this$getHashForInclu2[0],
              _newIncludes = _this$getHashForInclu2[1];

          var newToInclude = _newIncludes.filter(function (resource) {
            return !didSerialize.map(function (m) {
              return m.toString();
            }).includes(resource.toString());
          }).concat(toInclude);

          var _newDidSerialize = (this.isCollection(nextIncludedResource) ? nextIncludedResource.models : [nextIncludedResource]).concat(didSerialize);

          var newJson = this.mergePayloads(json, _resourceHash);
          return this.buildPayload(undefined, newToInclude, _newDidSerialize, newJson);
        }
      }
    }, {
      key: "getHashForPrimaryResource",
      value: function getHashForPrimaryResource(resource) {
        var _this$getHashForResou = this.getHashForResource(resource),
            _this$getHashForResou2 = _slicedToArray(_this$getHashForResou, 2),
            hash = _this$getHashForResou2[0],
            addToIncludes = _this$getHashForResou2[1];

        var hashWithRoot;

        if (this.root) {
          assert(!(resource instanceof PolymorphicCollection), "The base Serializer class cannot serialize a top-level PolymorphicCollection when root is true, since PolymorphicCollections have no type.");
          var serializer = this.serializerFor(resource.modelName);
          var rootKey = serializer.keyForResource(resource);
          hashWithRoot = _defineProperty$1({}, rootKey, hash);
        } else {
          hashWithRoot = hash;
        }

        return [hashWithRoot, addToIncludes];
      }
    }, {
      key: "getHashForIncludedResource",
      value: function getHashForIncludedResource(resource) {
        var hashWithRoot, addToIncludes;

        if (resource instanceof PolymorphicCollection) {
          hashWithRoot = {};
          addToIncludes = resource.models;
        } else {
          var serializer = this.serializerFor(resource.modelName);

          var _serializer$getHashFo = serializer.getHashForResource(resource),
              _serializer$getHashFo2 = _slicedToArray(_serializer$getHashFo, 2),
              hash = _serializer$getHashFo2[0],
              newModels = _serializer$getHashFo2[1]; // Included resources always have a root, and are always pushed to an array.


          var rootKey = serializer.keyForRelationship(resource.modelName);
          hashWithRoot = Array.isArray(hash) ? _defineProperty$1({}, rootKey, hash) : _defineProperty$1({}, rootKey, [hash]);
          addToIncludes = newModels;
        }

        return [hashWithRoot, addToIncludes];
      }
    }, {
      key: "getHashForResource",
      value: function getHashForResource(resource) {
        var _this2 = this;

        var removeForeignKeys = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        var didSerialize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        var lookupSerializer = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
        var serializer = this;
        var hash; // PolymorphicCollection lacks a modelName, but is dealt with in the map
        // by looking up the serializer on a per-model basis

        if (lookupSerializer && resource.modelName) {
          serializer = this.serializerFor(resource.modelName);
        }

        if (this.isModel(resource)) {
          hash = serializer._hashForModel(resource, removeForeignKeys, didSerialize);
        } else {
          hash = resource.models.map(function (m) {
            var modelSerializer = serializer;

            if (!modelSerializer) {
              // Can't get here if lookupSerializer is false, so look it up
              modelSerializer = _this2.serializerFor(m.modelName);
            }

            return modelSerializer._hashForModel(m, removeForeignKeys, didSerialize);
          });
        }

        var addToIncludes = uniqBy_1(compact_1(flatten$1(serializer.getKeysForIncluded().map(function (key) {
          if (_this2.isCollection(resource)) {
            return resource.models.map(function (m) {
              return m[key];
            });
          } else {
            return resource[key];
          }
        }))), function (m) {
          return m.toString();
        });
        return [hash, addToIncludes];
      }
      /*
        Merges new resource hash into json. If json already has root key,
        pushes value of resourceHash onto that key.
         For example,
             json = {
              post: { id: 1, title: 'Lorem Ipsum', comment_ids: [1, 3] },
              comments: [
                { id: 1, text: 'foo' }
              ]
            };
             resourceHash = {
              comments: [
                { id: 2, text: 'bar' }
              ]
            };
         would yield
             {
              post: { id: 1, title: 'Lorem Ipsum', comment_ids: [1, 3] },
              comments: [
                { id: 1, text: 'foo' },
                { id: 2, text: 'bar' }
              ]
            };
       */

    }, {
      key: "mergePayloads",
      value: function mergePayloads(json, resourceHash) {
        var newJson;

        var _Object$keys = Object.keys(resourceHash),
            _Object$keys2 = _slicedToArray(_Object$keys, 1),
            resourceHashKey = _Object$keys2[0];

        if (json[resourceHashKey]) {
          newJson = json;
          newJson[resourceHashKey] = json[resourceHashKey].concat(resourceHash[resourceHashKey]);
        } else {
          newJson = Object.assign(json, resourceHash);
        }

        return newJson;
      }
    }, {
      key: "keyForResource",
      value: function keyForResource(resource) {
        var modelName = resource.modelName;
        return this.isModel(resource) ? this.keyForModel(modelName) : this.keyForCollection(modelName);
      }
      /**
        Used to define a custom key when serializing a primary model of modelName *modelName*. For example, the default Serializer will return something like the following:
         ```
        GET /blogPosts/1
         {
          blogPost: {
            id: 1,
            title: 'Lorem ipsum'
          }
        }
        ```
         If your API uses hyphenated keys, you could overwrite `keyForModel`:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForModel(modelName) {
            return hyphenate(modelName);
          }
        });
        ```
         Now the response will look like
         ```
        {
          'blog-post': {
            id: 1,
            title: 'Lorem ipsum'
          }
        }
        ```
         @method keyForModel
        @param modelName
        @public
       */

    }, {
      key: "keyForModel",
      value: function keyForModel(modelName) {
        return camelize(modelName);
      }
      /**
        Used to customize the key when serializing a primary collection. By default this pluralizes the return value of `keyForModel`.
         For example, by default the following request may look like:
         ```
        GET /blogPosts
         {
          blogPosts: [
            {
              id: 1,
              title: 'Lorem ipsum'
            },
            ...
          ]
        }
        ```
         If your API hyphenates keys, you could overwrite `keyForCollection`:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForCollection(modelName) {
            return this._container.inflector.pluralize(dasherize(modelName));
          }
        });
        ```
         Now the response would look like:
         ```
        {
          'blog-posts': [
            {
              id: 1,
              title: 'Lorem ipsum'
            },
            ...
          ]
        }
        ```
         @method keyForCollection
        @param modelName
        @public
       */

    }, {
      key: "keyForCollection",
      value: function keyForCollection(modelName) {
        return this._container.inflector.pluralize(this.keyForModel(modelName));
      }
    }, {
      key: "_hashForModel",
      value: function _hashForModel(model, removeForeignKeys) {
        var _this3 = this;

        var didSerialize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

        var attrs = this._attrsForModel(model);

        if (removeForeignKeys) {
          model.fks.forEach(function (fk) {
            delete attrs[fk];
          });
        }

        if (this.embed) {
          var newDidSerialize = Object.assign({}, didSerialize);
          newDidSerialize[model.modelName] = newDidSerialize[model.modelName] || {};
          newDidSerialize[model.modelName][model.id] = true;
          this.getKeysForEmbedded().forEach(function (key) {
            var associatedResource = model[key];

            if (associatedResource && !get_1(newDidSerialize, "".concat(associatedResource.modelName, ".").concat(associatedResource.id))) {
              var _this3$getHashForReso = _this3.getHashForResource(associatedResource, true, newDidSerialize, true),
                  _this3$getHashForReso2 = _slicedToArray(_this3$getHashForReso, 1),
                  associatedResourceHash = _this3$getHashForReso2[0];

              var formattedKey = _this3.keyForEmbeddedRelationship(key);

              attrs[formattedKey] = associatedResourceHash;

              if (_this3.isModel(associatedResource)) {
                var fk = "".concat(camelize(key), "Id");
                delete attrs[fk];
              }
            }
          });
        }

        return this._maybeAddAssociationIds(model, attrs);
      }
      /**
        @method _attrsForModel
        @param model
        @private
        @hide
       */

    }, {
      key: "_attrsForModel",
      value: function _attrsForModel(model) {
        var attrs = {};

        if (this.attrs) {
          attrs = this.attrs.reduce(function (memo, attr) {
            memo[attr] = model[attr];
            return memo;
          }, {});
        } else {
          attrs = Object.assign(attrs, model.attrs);
        } // Remove fks


        model.fks.forEach(function (key) {
          return delete attrs[key];
        });
        return this._formatAttributeKeys(attrs);
      }
      /**
        @method _maybeAddAssociationIds
        @param model
        @param attrs
        @private
        @hide
       */

    }, {
      key: "_maybeAddAssociationIds",
      value: function _maybeAddAssociationIds(model, attrs) {
        var _this4 = this;

        var newHash = Object.assign({}, attrs);

        if (this.serializeIds === "always") {
          _toConsumableArray(model.associationKeys).filter(function (key) {
            return !_this4._embedFn(key);
          }).forEach(function (key) {
            var resource = model[key];
            var association = model.associationFor(key);

            if (_this4.isCollection(resource)) {
              var formattedKey = _this4.keyForRelationshipIds(key);

              newHash[formattedKey] = model["".concat(_this4._container.inflector.singularize(key), "Ids")];
            } else if (_this4.isModel(resource) && association.isPolymorphic) {
              var formattedTypeKey = _this4.keyForPolymorphicForeignKeyType(key);

              var formattedIdKey = _this4.keyForPolymorphicForeignKeyId(key);

              newHash[formattedTypeKey] = model["".concat(key, "Id")].type;
              newHash[formattedIdKey] = model["".concat(key, "Id")].id;
            } else if (resource) {
              var _formattedKey = _this4.keyForForeignKey(key);

              newHash[_formattedKey] = model["".concat(key, "Id")];
            }
          });
        } else if (this.serializeIds === "included") {
          this.getKeysForIncluded().forEach(function (key) {
            var resource = model[key];
            var association = model.associationFor(key);

            if (_this4.isCollection(resource)) {
              var formattedKey = _this4.keyForRelationshipIds(key);

              newHash[formattedKey] = model["".concat(_this4._container.inflector.singularize(key), "Ids")];
            } else if (_this4.isModel(resource) && association.isPolymorphic) {
              var formattedTypeKey = _this4.keyForPolymorphicForeignKeyType(key);

              var formattedIdKey = _this4.keyForPolymorphicForeignKeyId(key);

              newHash[formattedTypeKey] = model["".concat(key, "Id")].type;
              newHash[formattedIdKey] = model["".concat(key, "Id")].id;
            } else if (_this4.isModel(resource)) {
              var _formattedKey2 = _this4.keyForForeignKey(key);

              newHash[_formattedKey2] = model["".concat(key, "Id")];
            }
          });
        }

        return newHash;
      }
      /**
        Used to customize how a model's attribute is formatted in your JSON payload.
         By default, model attributes are camelCase:
         ```
        GET /authors/1
         {
          author: {
            firstName: 'Link',
            lastName: 'The WoodElf'
          }
        }
        ```
         If your API expects snake case, you could write the following:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForAttribute(attr) {
            return underscore(attr);
          }
        });
        ```
         Now the response would look like:
         ```
        {
          author: {
            first_name: 'Link',
            last_name: 'The WoodElf'
          }
        }
        ```
         @method keyForAttribute
        @param attr
        @public
       */

    }, {
      key: "keyForAttribute",
      value: function keyForAttribute(attr) {
        if (attr === "id") {
          return this.keyForId();
        }

        return attr;
      }
      /**
        Use this hook to format the key for collections related to this model. *modelName* is the named parameter for the relationship.
         For example, if you're serializing an `author` that
        sideloads many `blogPosts`, the default response will look like:
         ```
        {
          author: {...},
          blogPosts: [...]
        }
        ```
         Overwrite `keyForRelationship` to format this key:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForRelationship(modelName) {
            return underscore(modelName);
          }
        });
        ```
         Now the response will look like this:
         ```
        {
          author: {...},
          blog_posts: [...]
        }
        ```
         @method keyForRelationship
        @param modelName
        @public
       */

    }, {
      key: "keyForRelationship",
      value: function keyForRelationship(modelName) {
        return camelize(this._container.inflector.pluralize(modelName));
      }
      /**
        Like `keyForRelationship`, but for embedded relationships.
         @method keyForEmbeddedRelationship
        @param attributeName
        @public
       */

    }, {
      key: "keyForEmbeddedRelationship",
      value: function keyForEmbeddedRelationship(attributeName) {
        return camelize(attributeName);
      }
      /**
        Use this hook to format the key for the IDS of a `hasMany` relationship
        in this model's JSON representation.
         For example, if you're serializing an `author` that
        sideloads many `blogPosts`, by default your `author` JSON would include a `blogPostIds` key:
         ```
        {
          author: {
            id: 1,
            blogPostIds: [1, 2, 3]
          },
          blogPosts: [...]
        }
        ```
         Overwrite `keyForRelationshipIds` to format this key:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForRelationshipIds(relationship) {
            return underscore(relationship) + '_ids';
          }
        });
        ```
         Now the response will look like:
         ```
        {
          author: {
            id: 1,
            blog_post_ids: [1, 2, 3]
          },
          blogPosts: [...]
        }
        ```
         @method keyForRelationshipIds
        @param modelName
        @public
       */

    }, {
      key: "keyForRelationshipIds",
      value: function keyForRelationshipIds(relationshipName) {
        return "".concat(this._container.inflector.singularize(camelize(relationshipName)), "Ids");
      }
      /**
        Like `keyForRelationshipIds`, but for `belongsTo` relationships.
         For example, if you're serializing a `blogPost` that sideloads one `author`,
        your `blogPost` JSON would include a `authorId` key:
         ```
        {
          blogPost: {
            id: 1,
            authorId: 1
          },
          author: ...
        }
        ```
         Overwrite `keyForForeignKey` to format this key:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForForeignKey(relationshipName) {
            return underscore(relationshipName) + '_id';
          }
        });
        ```
         Now the response will look like:
         ```js
        {
          blogPost: {
            id: 1,
            author_id: 1
          },
          author: ...
        }
        ```
         @method keyForForeignKey
        @param relationshipName
        @public
       */

    }, {
      key: "keyForForeignKey",
      value: function keyForForeignKey(relationshipName) {
        return "".concat(camelize(relationshipName), "Id");
      }
      /**
        Polymorphic relationships are represented with type-id pairs.
         Given the following model
         ```js
        Model.extend({
          commentable: belongsTo({ polymorphic: true })
        });
        ```
         the default Serializer would produce
         ```js
        {
          comment: {
            id: 1,
            commentableType: 'post',
            commentableId: '1'
          }
        }
        ```
         This hook controls how the `id` field (`commentableId` in the above example)
        is serialized. By default it camelizes the relationship and adds `Id` as a suffix.
         @method keyForPolymorphicForeignKeyId
        @param {String} relationshipName
        @return {String}
        @public
      */

    }, {
      key: "keyForPolymorphicForeignKeyId",
      value: function keyForPolymorphicForeignKeyId(relationshipName) {
        return "".concat(camelize(relationshipName), "Id");
      }
      /**
        Polymorphic relationships are represented with type-id pairs.
         Given the following model
         ```js
        Model.extend({
          commentable: belongsTo({ polymorphic: true })
        });
        ```
         the default Serializer would produce
         ```js
        {
          comment: {
            id: 1,
            commentableType: 'post',
            commentableId: '1'
          }
        }
        ```
         This hook controls how the `type` field (`commentableType` in the above example)
        is serialized. By default it camelizes the relationship and adds `Type` as a suffix.
         @method keyForPolymorphicForeignKeyType
        @param {String} relationshipName
        @return {String}
        @public
      */

    }, {
      key: "keyForPolymorphicForeignKeyType",
      value: function keyForPolymorphicForeignKeyType(relationshipName) {
        return "".concat(camelize(relationshipName), "Type");
      }
      /**
        @method isModel
        @param object
        @return {Boolean}
        @public
        @hide
       */

    }, {
      key: "isModel",
      value: function isModel(object) {
        return object instanceof Model$1;
      }
      /**
        @method isCollection
        @param object
        @return {Boolean}
        @public
        @hide
       */

    }, {
      key: "isCollection",
      value: function isCollection(object) {
        return object instanceof Collection || object instanceof PolymorphicCollection;
      }
      /**
        @method isModelOrCollection
        @param object
        @return {Boolean}
        @public
        @hide
       */

    }, {
      key: "isModelOrCollection",
      value: function isModelOrCollection(object) {
        return this.isModel(object) || this.isCollection(object);
      }
      /**
        @method serializerFor
        @param type
        @public
        @hide
       */

    }, {
      key: "serializerFor",
      value: function serializerFor(type) {
        return this.registry.serializerFor(type);
      }
    }, {
      key: "getAssociationKeys",
      value: function getAssociationKeys() {
        return isFunction_1(this.include) ? this.include(this.request, this.primaryResource) : this.include;
      }
    }, {
      key: "getKeysForEmbedded",
      value: function getKeysForEmbedded() {
        var _this5 = this;

        return this.getAssociationKeys().filter(function (k) {
          return _this5._embedFn(k);
        });
      }
    }, {
      key: "getKeysForIncluded",
      value: function getKeysForIncluded() {
        var _this6 = this;

        return this.getAssociationKeys().filter(function (k) {
          return !_this6._embedFn(k);
        });
      }
      /**
        A reference to the schema instance.
         Useful to reference registered schema information, for example in a Serializer's include hook to include all a resource's associations:
         ```js
        Serializer.extend({
          include(request, resource) {
            return Object.keys(this.schema.associationsFor(resource.modelName));
          }
        })
        ```
         @property
        @type {Object}
        @public
      */

    }, {
      key: "schema",
      get: function get() {
        return this.registry.schema;
      }
      /**
        Used to customize how a model's primary key is formatted in your JSON payload.
         By default, this is 'id'
         ```
        GET /authors/1
         {
          author: {
            id: '1',
            firstName: 'Link',
            lastName: 'The WoodElf'
          }
        }
        ```
         If your API expects a different primary key, you could write the following:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          keyForId() {
            return 'authorId';
          }
        });
        ```
         Now the response would look like:
         ```
        {
          author: {
            authorId: '1',
            firstName: 'Link',
            lastName: 'The WoodElf'
          }
        }
        ```
         See the property `primaryKey` for a shorthand way of doing this on a model serializer
         @method keyForId
        @public
       */

    }, {
      key: "keyForId",
      value: function keyForId() {
        return this.primaryKey;
      }
      /**
        Used to customize how a model's primary key value is formatted in your JSON payload.
         By default, the primary key is a string
         ```
        GET /authors/1
         {
          author: {
            id: '1',
            firstName: 'Link',
            lastName: 'The WoodElf'
          }
        }
        ```
         If your API expects a integers, you could write the following:
         ```js
        // serializers/application.js
        export default Serializer.extend({
          valueForId(value) {
            return parseInt(value);
          }
        });
        ```
         Now the response would look like:
         ```
        {
          author: {
            authorId: 1,
            firstName: 'Link',
            lastName: 'The WoodElf'
          }
        }
        ```
         @method valueForId
        @param value
        @public
       */

    }, {
      key: "valueForId",
      value: function valueForId(value) {
        return value;
      }
      /**
        @method _formatAttributeKeys
        @param attrs
        @private
        @hide
       */

    }, {
      key: "_formatAttributeKeys",
      value: function _formatAttributeKeys(attrs) {
        var formattedAttrs = {};

        for (var key in attrs) {
          var formattedValue = attrs[key];

          if (key === "id") {
            formattedValue = this.valueForId(formattedValue);
          }

          var formattedKey = this.keyForAttribute(key);
          formattedAttrs[formattedKey] = formattedValue;
        }

        return formattedAttrs;
      }
    }, {
      key: "getCoalescedIds",
      value: function getCoalescedIds() {}
    }]);

    return Serializer;
  }(); // Defaults


  Serializer.prototype.include = [];
  Serializer.prototype.root = true;
  Serializer.prototype.embed = false;
  Serializer.prototype.primaryKey = "id";
  Serializer.prototype.serializeIds = "included"; // can be 'included', 'always', or 'never'

  Serializer.extend = extend;
  var Serializer$1 = Serializer;

  // a string of all valid unicode whitespaces
  var whitespaces = '\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002' +
    '\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';

  var whitespace$1 = '[' + whitespaces + ']';
  var ltrim = RegExp('^' + whitespace$1 + whitespace$1 + '*');
  var rtrim = RegExp(whitespace$1 + whitespace$1 + '*$');

  // `String.prototype.{ trim, trimStart, trimEnd, trimLeft, trimRight }` methods implementation
  var createMethod = function (TYPE) {
    return function ($this) {
      var string = toString_1(requireObjectCoercible($this));
      if (TYPE & 1) string = string.replace(ltrim, '');
      if (TYPE & 2) string = string.replace(rtrim, '');
      return string;
    };
  };

  var stringTrim = {
    // `String.prototype.{ trimLeft, trimStart }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimstart
    start: createMethod(1),
    // `String.prototype.{ trimRight, trimEnd }` methods
    // https://tc39.es/ecma262/#sec-string.prototype.trimend
    end: createMethod(2),
    // `String.prototype.trim` method
    // https://tc39.es/ecma262/#sec-string.prototype.trim
    trim: createMethod(3)
  };

  var PROPER_FUNCTION_NAME$1 = functionName.PROPER;



  var non = '\u200B\u0085\u180E';

  // check that a method works with the correct list
  // of whitespaces and has a correct name
  var stringTrimForced = function (METHOD_NAME) {
    return fails(function () {
      return !!whitespaces[METHOD_NAME]()
        || non[METHOD_NAME]() !== non
        || (PROPER_FUNCTION_NAME$1 && whitespaces[METHOD_NAME].name !== METHOD_NAME);
    });
  };

  var $trim = stringTrim.trim;


  // `String.prototype.trim` method
  // https://tc39.es/ecma262/#sec-string.prototype.trim
  _export({ target: 'String', proto: true, forced: stringTrimForced('trim') }, {
    trim: function trim() {
      return $trim(this);
    }
  });

  /**
    The JSONAPISerializer. Subclass of Serializer.

    @class JSONAPISerializer
    @constructor
    @public
   */

  var JSONAPISerializer = /*#__PURE__*/function (_Serializer) {
    _inherits(JSONAPISerializer, _Serializer);

    var _super = _createSuper(JSONAPISerializer);

    function JSONAPISerializer() {
      var _this;

      _classCallCheck(this, JSONAPISerializer);

      _this = _super.apply(this, arguments);
      /**
        By default, JSON:API's linkage data is only added for relationships that are being included in the current request.
         That means given an `author` model with a `posts` relationship, a GET request to /authors/1 would return a JSON:API document with an empty `relationships` hash:
         ```js
        {
          data: {
            type: 'authors',
            id: '1',
            attributes: { ... }
          }
        }
        ```
         but a request to GET /authors/1?include=posts would have linkage data added (in addition to the included resources):
         ```js
        {
          data: {
            type: 'authors',
            id: '1',
            attributes: { ... },
            relationships: {
              data: [
                { type: 'posts', id: '1' },
                { type: 'posts', id: '2' },
                { type: 'posts', id: '3' }
              ]
            }
          },
          included: [ ... ]
        }
        ```
         To add the linkage data for all relationships, you could set `alwaysIncludeLinkageData` to `true`:
         ```js
        JSONAPISerializer.extend({
          alwaysIncludeLinkageData: true
        });
        ```
         Then, a GET to /authors/1 would respond with
         ```js
        {
          data: {
            type: 'authors',
            id: '1',
            attributes: { ... },
            relationships: {
              posts: {
                data: [
                  { type: 'posts', id: '1' },
                  { type: 'posts', id: '2' },
                  { type: 'posts', id: '3' }
                ]
              }
            }
          }
        }
        ```
         even though the related `posts` are not included in the same document.
         You can also use the `links` method (on the Serializer base class) to add relationship links (which will always be added regardless of the relationship is being included document), or you could use `shouldIncludeLinkageData` for more granular control.
         For more background on the behavior of this API, see [this blog post](http://www.ember-cli-mirage.com/blog/changing-mirages-default-linkage-data-behavior-1475).
         @property alwaysIncludeLinkageData
        @type {Boolean}
        @public
      */

      _this.alwaysIncludeLinkageData = _this.alwaysIncludeLinkageData || undefined; // this is just here so I can add the doc comment. Better way?

      return _this;
    } // Don't think this is used?


    _createClass(JSONAPISerializer, [{
      key: "keyForModel",
      value: function keyForModel(modelName) {
        return dasherize(modelName);
      } // Don't think this is used?

    }, {
      key: "keyForCollection",
      value: function keyForCollection(modelName) {
        return dasherize(modelName);
      }
      /**
        Used to customize the key for an attribute. By default, compound attribute names are dasherized.
         For example, the JSON:API document for a `post` model with a `commentCount` attribute would be:
         ```js
        {
          data: {
            id: 1,
            type: 'posts',
            attributes: {
              'comment-count': 28
            }
          }
        }
        ```
         @method keyForAttribute
        @param {String} attr
        @return {String}
        @public
      */

    }, {
      key: "keyForAttribute",
      value: function keyForAttribute(attr) {
        return dasherize(attr);
      }
      /**
        Used to customize the key for a relationships. By default, compound relationship names are dasherized.
         For example, the JSON:API document for an `author` model with a `blogPosts` relationship would be:
         ```js
        {
          data: {
            id: 1,
            type: 'author',
            attributes: {
              ...
            },
            relationships: {
              'blog-posts': {
                ...
              }
            }
          }
        }
        ```
         @method keyForRelationship
        @param {String} key
        @return {String}
        @public
      */

    }, {
      key: "keyForRelationship",
      value: function keyForRelationship(key) {
        return dasherize(key);
      }
      /**
        Use this hook to add top-level `links` data to JSON:API resource objects. The argument is the model being serialized.
         ```js
        // serializers/author.js
        import { JSONAPISerializer } from 'miragejs';
         export default JSONAPISerializer.extend({
           links(author) {
            return {
              'posts': {
                related: `/api/authors/${author.id}/posts`
              }
            };
          }
         });
        ```
         @method links
        @param model
      */

    }, {
      key: "links",
      value: function links() {}
    }, {
      key: "getHashForPrimaryResource",
      value: function getHashForPrimaryResource(resource) {
        this._createRequestedIncludesGraph(resource);

        var resourceHash = this.getHashForResource(resource);
        var hashWithRoot = {
          data: resourceHash
        };
        var addToIncludes = this.getAddToIncludesForResource(resource);
        return [hashWithRoot, addToIncludes];
      }
    }, {
      key: "getHashForIncludedResource",
      value: function getHashForIncludedResource(resource) {
        var serializer = this.serializerFor(resource.modelName);
        var hash = serializer.getHashForResource(resource);
        var hashWithRoot = {
          included: this.isModel(resource) ? [hash] : hash
        };
        var addToIncludes = [];

        if (!this.hasQueryParamIncludes()) {
          addToIncludes = this.getAddToIncludesForResource(resource);
        }

        return [hashWithRoot, addToIncludes];
      }
    }, {
      key: "getHashForResource",
      value: function getHashForResource(resource) {
        var _this2 = this;

        var hash;

        if (this.isModel(resource)) {
          hash = this.getResourceObjectForModel(resource);
        } else {
          hash = resource.models.map(function (m) {
            return _this2.getResourceObjectForModel(m);
          });
        }

        return hash;
      }
      /*
        Returns a flat unique list of resources that need to be added to includes
      */

    }, {
      key: "getAddToIncludesForResource",
      value: function getAddToIncludesForResource(resource) {
        var relationshipPaths;

        if (this.hasQueryParamIncludes()) {
          relationshipPaths = this.getQueryParamIncludes();
        } else {
          var serializer = this.serializerFor(resource.modelName);
          relationshipPaths = serializer.getKeysForIncluded();
        }

        return this.getAddToIncludesForResourceAndPaths(resource, relationshipPaths);
      }
    }, {
      key: "getAddToIncludesForResourceAndPaths",
      value: function getAddToIncludesForResourceAndPaths(resource, relationshipPaths) {
        var _this3 = this;

        var includes = [];
        relationshipPaths.forEach(function (path) {
          var relationshipNames = path.split(".");

          var newIncludes = _this3.getIncludesForResourceAndPath.apply(_this3, [resource].concat(_toConsumableArray(relationshipNames)));

          includes.push(newIncludes);
        });
        return uniqBy_1(compact_1(flatten$1(includes)), function (m) {
          return m.toString();
        });
      }
    }, {
      key: "getIncludesForResourceAndPath",
      value: function getIncludesForResourceAndPath(resource) {
        var _this4 = this;

        for (var _len = arguments.length, names = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          names[_key - 1] = arguments[_key];
        }

        var nameForCurrentResource = camelize(names.shift());
        var includes = [];
        var modelsToAdd = [];

        if (this.isModel(resource)) {
          var relationship = resource[nameForCurrentResource];

          if (this.isModel(relationship)) {
            modelsToAdd = [relationship];
          } else if (this.isCollection(relationship)) {
            modelsToAdd = relationship.models;
          }
        } else {
          resource.models.forEach(function (model) {
            var relationship = model[nameForCurrentResource];

            if (_this4.isModel(relationship)) {
              modelsToAdd.push(relationship);
            } else if (_this4.isCollection(relationship)) {
              modelsToAdd = modelsToAdd.concat(relationship.models);
            }
          });
        }

        includes = includes.concat(modelsToAdd);

        if (names.length) {
          modelsToAdd.forEach(function (model) {
            includes = includes.concat(_this4.getIncludesForResourceAndPath.apply(_this4, [model].concat(names)));
          });
        }

        return includes;
      }
    }, {
      key: "getResourceObjectForModel",
      value: function getResourceObjectForModel(model) {
        var attrs = this._attrsForModel(model, true);

        delete attrs.id;
        var hash = {
          type: this.typeKeyForModel(model),
          id: model.id,
          attributes: attrs
        };
        return this._maybeAddRelationshipsToResourceObjectForModel(hash, model);
      }
    }, {
      key: "_maybeAddRelationshipsToResourceObjectForModel",
      value: function _maybeAddRelationshipsToResourceObjectForModel(hash, model) {
        var _this5 = this;

        var relationships = {};
        model.associationKeys.forEach(function (key) {
          var relationship = model[key];

          var relationshipKey = _this5.keyForRelationship(key);

          var relationshipHash = {};

          if (_this5.hasLinksForRelationship(model, key)) {
            var serializer = _this5.serializerFor(model.modelName);

            var links = serializer.links(model);
            relationshipHash.links = links[key];
          }

          if (_this5.alwaysIncludeLinkageData || _this5.shouldIncludeLinkageData(key, model) || _this5._relationshipIsIncludedForModel(key, model)) {
            var data = null;

            if (_this5.isModel(relationship)) {
              data = {
                type: _this5.typeKeyForModel(relationship),
                id: relationship.id
              };
            } else if (_this5.isCollection(relationship)) {
              data = relationship.models.map(function (model) {
                return {
                  type: _this5.typeKeyForModel(model),
                  id: model.id
                };
              });
            }

            relationshipHash.data = data;
          }

          if (!isEmpty_1(relationshipHash)) {
            relationships[relationshipKey] = relationshipHash;
          }
        });

        if (!isEmpty_1(relationships)) {
          hash.relationships = relationships;
        }

        return hash;
      }
    }, {
      key: "hasLinksForRelationship",
      value: function hasLinksForRelationship(model, relationshipKey) {
        var serializer = this.serializerFor(model.modelName);
        var links = serializer.links && serializer.links(model);
        return links && links[relationshipKey] != null;
      }
      /*
        This code (and a lot of this serializer) need to be re-worked according to
        the graph logic...
      */

    }, {
      key: "_relationshipIsIncludedForModel",
      value: function _relationshipIsIncludedForModel(relationshipKey, model) {
        if (this.hasQueryParamIncludes()) {
          var graph = this.request._includesGraph;

          var graphKey = this._graphKeyForModel(model); // Find the resource in the graph


          var graphResource; // Check primary data

          if (graph.data[graphKey]) {
            graphResource = graph.data[graphKey]; // Check includes
          } else if (graph.included[this._container.inflector.pluralize(model.modelName)]) {
            graphResource = graph.included[this._container.inflector.pluralize(model.modelName)][graphKey];
          } // If the model's in the graph, check if relationshipKey should be included


          return graphResource && graphResource.relationships && Object.prototype.hasOwnProperty.call(graphResource.relationships, dasherize(relationshipKey));
        } else {
          var relationshipPaths = this.getKeysForIncluded();
          return relationshipPaths.includes(relationshipKey);
        }
      }
      /*
        This is needed for _relationshipIsIncludedForModel - see the note there for
        more background.
         If/when we can refactor this serializer, the logic in this method would
        probably be the basis for the new overall json/graph creation.
      */

    }, {
      key: "_createRequestedIncludesGraph",
      value: function _createRequestedIncludesGraph(primaryResource) {
        var _this6 = this;
        var graph = {
          data: {}
        };

        if (this.isModel(primaryResource)) {
          var primaryResourceKey = this._graphKeyForModel(primaryResource);

          graph.data[primaryResourceKey] = {};

          this._addPrimaryModelToRequestedIncludesGraph(graph, primaryResource);
        } else if (this.isCollection(primaryResource)) {
          primaryResource.models.forEach(function (model) {
            var primaryResourceKey = _this6._graphKeyForModel(model);

            graph.data[primaryResourceKey] = {};

            _this6._addPrimaryModelToRequestedIncludesGraph(graph, model);
          });
        } // Hack :/ Need to think of a better palce to put this if
        // refactoring json:api serializer.


        this.request._includesGraph = graph;
      }
    }, {
      key: "_addPrimaryModelToRequestedIncludesGraph",
      value: function _addPrimaryModelToRequestedIncludesGraph(graph, model) {
        var _this7 = this;

        if (this.hasQueryParamIncludes()) {
          var graphKey = this._graphKeyForModel(model);

          this.getQueryParamIncludes().filter(function (item) {
            return !!item.trim();
          }).forEach(function (includesPath) {
            // includesPath is post.comments, for example
            graph.data[graphKey].relationships = graph.data[graphKey].relationships || {};
            var relationshipKeys = includesPath.split(".").map(dasherize);
            var relationshipKey = relationshipKeys[0];
            var graphRelationshipKey = relationshipKey;
            var normalizedRelationshipKey = camelize(relationshipKey);
            var hasAssociation = model.associationKeys.has(normalizedRelationshipKey);
            assert(hasAssociation, "You tried to include \"".concat(relationshipKey, "\" with ").concat(model, " but no association named \"").concat(normalizedRelationshipKey, "\" is defined on the model."));
            var relationship = model[normalizedRelationshipKey];
            var relationshipData;

            if (_this7.isModel(relationship)) {
              relationshipData = _this7._graphKeyForModel(relationship);
            } else if (_this7.isCollection(relationship)) {
              relationshipData = relationship.models.map(_this7._graphKeyForModel);
            } else {
              relationshipData = null;
            }

            graph.data[graphKey].relationships[graphRelationshipKey] = relationshipData;

            if (relationship) {
              _this7._addResourceToRequestedIncludesGraph(graph, relationship, relationshipKeys.slice(1));
            }
          });
        }
      }
    }, {
      key: "_addResourceToRequestedIncludesGraph",
      value: function _addResourceToRequestedIncludesGraph(graph, resource, relationshipNames) {
        var _this8 = this;

        graph.included = graph.included || {};
        var models = this.isCollection(resource) ? resource.models : [resource];
        models.forEach(function (model) {
          var collectionName = _this8._container.inflector.pluralize(model.modelName);

          graph.included[collectionName] = graph.included[collectionName] || {};

          _this8._addModelToRequestedIncludesGraph(graph, model, relationshipNames);
        });
      }
    }, {
      key: "_addModelToRequestedIncludesGraph",
      value: function _addModelToRequestedIncludesGraph(graph, model, relationshipNames) {
        var collectionName = this._container.inflector.pluralize(model.modelName);

        var resourceKey = this._graphKeyForModel(model);

        graph.included[collectionName][resourceKey] = graph.included[collectionName][resourceKey] || {};

        if (relationshipNames.length) {
          this._addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames);
        }
      }
      /*
        Lot of the same logic here from _addPrimaryModelToRequestedIncludesGraph, could refactor & share
      */

    }, {
      key: "_addResourceRelationshipsToRequestedIncludesGraph",
      value: function _addResourceRelationshipsToRequestedIncludesGraph(graph, collectionName, resourceKey, model, relationshipNames) {
        graph.included[collectionName][resourceKey].relationships = graph.included[collectionName][resourceKey].relationships || {};
        var relationshipName = relationshipNames[0];
        var relationship = model[camelize(relationshipName)];
        var relationshipData;

        if (this.isModel(relationship)) {
          relationshipData = this._graphKeyForModel(relationship);
        } else if (this.isCollection(relationship)) {
          relationshipData = relationship.models.map(this._graphKeyForModel);
        }

        graph.included[collectionName][resourceKey].relationships[relationshipName] = relationshipData;

        if (relationship) {
          this._addResourceToRequestedIncludesGraph(graph, relationship, relationshipNames.slice(1));
        }
      }
    }, {
      key: "_graphKeyForModel",
      value: function _graphKeyForModel(model) {
        return "".concat(model.modelName, ":").concat(model.id);
      }
    }, {
      key: "getQueryParamIncludes",
      value: function getQueryParamIncludes() {
        var includes = get_1(this, "request.queryParams.include");

        if (includes && !Array.isArray(includes)) {
          includes = includes.split(",");
        }

        return includes;
      }
    }, {
      key: "hasQueryParamIncludes",
      value: function hasQueryParamIncludes() {
        return !!this.getQueryParamIncludes();
      }
      /**
        Used to customize the `type` field of the document. By default, pluralizes and dasherizes the model's `modelName`.
         For example, the JSON:API document for a `blogPost` model would be:
         ```js
        {
          data: {
            id: 1,
            type: 'blog-posts'
          }
        }
        ```
         @method typeKeyForModel
        @param {Model} model
        @return {String}
        @public
      */

    }, {
      key: "typeKeyForModel",
      value: function typeKeyForModel(model) {
        return dasherize(this._container.inflector.pluralize(model.modelName));
      }
    }, {
      key: "getCoalescedIds",
      value: function getCoalescedIds(request) {
        var ids = request.queryParams && request.queryParams["filter[id]"];

        if (typeof ids === "string") {
          return ids.split(",");
        }

        return ids;
      }
      /**
        Allows for per-relationship inclusion of linkage data. Use this when `alwaysIncludeLinkageData` is not granular enough.
         ```js
        export default JSONAPISerializer.extend({
          shouldIncludeLinkageData(relationshipKey, model) {
            if (relationshipKey === 'author' || relationshipKey === 'ghostWriter') {
              return true;
            }
            return false;
          }
        });
        ```
         @method shouldIncludeLinkageData
        @param {String} relationshipKey
        @param {Model} model
        @return {Boolean}
        @public
      */

    }, {
      key: "shouldIncludeLinkageData",
      value: function shouldIncludeLinkageData(relationshipKey, model) {
        return false;
      }
    }]);

    return JSONAPISerializer;
  }(Serializer$1);

  JSONAPISerializer.prototype.alwaysIncludeLinkageData = false;
  var JsonApiSerializer = JSONAPISerializer;

  /**
   * @hide
   */

  var SerializerRegistry = /*#__PURE__*/function () {
    function SerializerRegistry(schema) {
      var serializerMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, SerializerRegistry);

      this.schema = schema;
      this._serializerMap = serializerMap;
    }

    _createClass(SerializerRegistry, [{
      key: "normalize",
      value: function normalize(payload, modelName) {
        return this.serializerFor(modelName).normalize(payload);
      }
    }, {
      key: "serialize",
      value: function serialize(response, request) {
        var _this = this;

        this.request = request;

        if (this._isModelOrCollection(response)) {
          var serializer = this.serializerFor(response.modelName);
          return serializer.serialize(response, request);
        } else if (Array.isArray(response) && response.some(this._isCollection)) {
          return response.reduce(function (json, collection) {
            var serializer = _this.serializerFor(collection.modelName);

            if (serializer.embed) {
              json[_this._container.inflector.pluralize(collection.modelName)] = serializer.serialize(collection, request);
            } else {
              json = Object.assign(json, serializer.serialize(collection, request));
            }

            return json;
          }, {});
        } else {
          return response;
        }
      }
    }, {
      key: "serializerFor",
      value: function serializerFor(type) {
        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            _ref$explicit = _ref.explicit,
            explicit = _ref$explicit === void 0 ? false : _ref$explicit;

        var SerializerForResponse = type && this._serializerMap && this._serializerMap[camelize(type)];

        if (explicit) {
          assert(!!SerializerForResponse, "You passed in ".concat(type, " as an explicit serializer type but that serializer doesn't exist."));
        } else {
          SerializerForResponse = SerializerForResponse || this._serializerMap.application || Serializer$1;
          assert(!SerializerForResponse || SerializerForResponse.prototype.embed || SerializerForResponse.prototype.root || new SerializerForResponse() instanceof JsonApiSerializer, "You cannot have a serializer that sideloads (embed: false) and disables the root (root: false).");
        }

        return new SerializerForResponse(this, type, this.request);
      }
    }, {
      key: "_isModel",
      value: function _isModel(object) {
        return object instanceof Model$1;
      }
    }, {
      key: "_isCollection",
      value: function _isCollection(object) {
        return object instanceof Collection || object instanceof PolymorphicCollection;
      }
    }, {
      key: "_isModelOrCollection",
      value: function _isModelOrCollection(object) {
        return this._isModel(object) || this._isCollection(object);
      }
    }, {
      key: "registerSerializers",
      value: function registerSerializers(newSerializerMaps) {
        var currentSerializerMap = this._serializerMap || {};
        this._serializerMap = Object.assign(currentSerializerMap, newSerializerMaps);
      }
    }, {
      key: "getCoalescedIds",
      value: function getCoalescedIds(request, modelName) {
        return this.serializerFor(modelName).getCoalescedIds(request);
      }
    }]);

    return SerializerRegistry;
  }();

  var correctPrototypeGetter = !fails(function () {
    function F() { /* empty */ }
    F.prototype.constructor = null;
    // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
    return Object.getPrototypeOf(new F()) !== F.prototype;
  });

  var IE_PROTO = sharedKey('IE_PROTO');
  var ObjectPrototype = Object.prototype;

  // `Object.getPrototypeOf` method
  // https://tc39.es/ecma262/#sec-object.getprototypeof
  // eslint-disable-next-line es/no-object-getprototypeof -- safe
  var objectGetPrototypeOf = correctPrototypeGetter ? Object.getPrototypeOf : function (O) {
    var object = toObject(O);
    if (has$3(object, IE_PROTO)) return object[IE_PROTO];
    var constructor = object.constructor;
    if (isCallable(constructor) && object instanceof constructor) {
      return constructor.prototype;
    } return object instanceof Object ? ObjectPrototype : null;
  };

  var ITERATOR$2 = wellKnownSymbol('iterator');
  var BUGGY_SAFARI_ITERATORS$1 = false;

  // `%IteratorPrototype%` object
  // https://tc39.es/ecma262/#sec-%iteratorprototype%-object
  var IteratorPrototype$2, PrototypeOfArrayIteratorPrototype, arrayIterator;

  /* eslint-disable es/no-array-prototype-keys -- safe */
  if ([].keys) {
    arrayIterator = [].keys();
    // Safari 8 has buggy iterators w/o `next`
    if (!('next' in arrayIterator)) BUGGY_SAFARI_ITERATORS$1 = true;
    else {
      PrototypeOfArrayIteratorPrototype = objectGetPrototypeOf(objectGetPrototypeOf(arrayIterator));
      if (PrototypeOfArrayIteratorPrototype !== Object.prototype) IteratorPrototype$2 = PrototypeOfArrayIteratorPrototype;
    }
  }

  var NEW_ITERATOR_PROTOTYPE = IteratorPrototype$2 == undefined || fails(function () {
    var test = {};
    // FF44- legacy iterators case
    return IteratorPrototype$2[ITERATOR$2].call(test) !== test;
  });

  if (NEW_ITERATOR_PROTOTYPE) IteratorPrototype$2 = {};

  // `%IteratorPrototype%[@@iterator]()` method
  // https://tc39.es/ecma262/#sec-%iteratorprototype%-@@iterator
  if (!isCallable(IteratorPrototype$2[ITERATOR$2])) {
    redefine(IteratorPrototype$2, ITERATOR$2, function () {
      return this;
    });
  }

  var iteratorsCore = {
    IteratorPrototype: IteratorPrototype$2,
    BUGGY_SAFARI_ITERATORS: BUGGY_SAFARI_ITERATORS$1
  };

  var IteratorPrototype$1 = iteratorsCore.IteratorPrototype;





  var returnThis$1 = function () { return this; };

  var createIteratorConstructor = function (IteratorConstructor, NAME, next) {
    var TO_STRING_TAG = NAME + ' Iterator';
    IteratorConstructor.prototype = objectCreate$1(IteratorPrototype$1, { next: createPropertyDescriptor(1, next) });
    setToStringTag(IteratorConstructor, TO_STRING_TAG, false);
    iterators[TO_STRING_TAG] = returnThis$1;
    return IteratorConstructor;
  };

  var PROPER_FUNCTION_NAME = functionName.PROPER;
  var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;
  var IteratorPrototype = iteratorsCore.IteratorPrototype;
  var BUGGY_SAFARI_ITERATORS = iteratorsCore.BUGGY_SAFARI_ITERATORS;
  var ITERATOR$1 = wellKnownSymbol('iterator');
  var KEYS = 'keys';
  var VALUES = 'values';
  var ENTRIES = 'entries';

  var returnThis = function () { return this; };

  var defineIterator = function (Iterable, NAME, IteratorConstructor, next, DEFAULT, IS_SET, FORCED) {
    createIteratorConstructor(IteratorConstructor, NAME, next);

    var getIterationMethod = function (KIND) {
      if (KIND === DEFAULT && defaultIterator) return defaultIterator;
      if (!BUGGY_SAFARI_ITERATORS && KIND in IterablePrototype) return IterablePrototype[KIND];
      switch (KIND) {
        case KEYS: return function keys() { return new IteratorConstructor(this, KIND); };
        case VALUES: return function values() { return new IteratorConstructor(this, KIND); };
        case ENTRIES: return function entries() { return new IteratorConstructor(this, KIND); };
      } return function () { return new IteratorConstructor(this); };
    };

    var TO_STRING_TAG = NAME + ' Iterator';
    var INCORRECT_VALUES_NAME = false;
    var IterablePrototype = Iterable.prototype;
    var nativeIterator = IterablePrototype[ITERATOR$1]
      || IterablePrototype['@@iterator']
      || DEFAULT && IterablePrototype[DEFAULT];
    var defaultIterator = !BUGGY_SAFARI_ITERATORS && nativeIterator || getIterationMethod(DEFAULT);
    var anyNativeIterator = NAME == 'Array' ? IterablePrototype.entries || nativeIterator : nativeIterator;
    var CurrentIteratorPrototype, methods, KEY;

    // fix native
    if (anyNativeIterator) {
      CurrentIteratorPrototype = objectGetPrototypeOf(anyNativeIterator.call(new Iterable()));
      if (CurrentIteratorPrototype !== Object.prototype && CurrentIteratorPrototype.next) {
        if (objectGetPrototypeOf(CurrentIteratorPrototype) !== IteratorPrototype) {
          if (objectSetPrototypeOf) {
            objectSetPrototypeOf(CurrentIteratorPrototype, IteratorPrototype);
          } else if (!isCallable(CurrentIteratorPrototype[ITERATOR$1])) {
            redefine(CurrentIteratorPrototype, ITERATOR$1, returnThis);
          }
        }
        // Set @@toStringTag to native iterators
        setToStringTag(CurrentIteratorPrototype, TO_STRING_TAG, true);
      }
    }

    // fix Array.prototype.{ values, @@iterator }.name in V8 / FF
    if (PROPER_FUNCTION_NAME && DEFAULT == VALUES && nativeIterator && nativeIterator.name !== VALUES) {
      if (CONFIGURABLE_FUNCTION_NAME) {
        createNonEnumerableProperty(IterablePrototype, 'name', VALUES);
      } else {
        INCORRECT_VALUES_NAME = true;
        defaultIterator = function values() { return nativeIterator.call(this); };
      }
    }

    // export additional methods
    if (DEFAULT) {
      methods = {
        values: getIterationMethod(VALUES),
        keys: IS_SET ? defaultIterator : getIterationMethod(KEYS),
        entries: getIterationMethod(ENTRIES)
      };
      if (FORCED) for (KEY in methods) {
        if (BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME || !(KEY in IterablePrototype)) {
          redefine(IterablePrototype, KEY, methods[KEY]);
        }
      } else _export({ target: NAME, proto: true, forced: BUGGY_SAFARI_ITERATORS || INCORRECT_VALUES_NAME }, methods);
    }

    // define iterator
    if (IterablePrototype[ITERATOR$1] !== defaultIterator) {
      redefine(IterablePrototype, ITERATOR$1, defaultIterator, { name: DEFAULT });
    }
    iterators[NAME] = defaultIterator;

    return methods;
  };

  var ARRAY_ITERATOR = 'Array Iterator';
  var setInternalState$2 = internalState.set;
  var getInternalState$1 = internalState.getterFor(ARRAY_ITERATOR);

  // `Array.prototype.entries` method
  // https://tc39.es/ecma262/#sec-array.prototype.entries
  // `Array.prototype.keys` method
  // https://tc39.es/ecma262/#sec-array.prototype.keys
  // `Array.prototype.values` method
  // https://tc39.es/ecma262/#sec-array.prototype.values
  // `Array.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-array.prototype-@@iterator
  // `CreateArrayIterator` internal method
  // https://tc39.es/ecma262/#sec-createarrayiterator
  var es_array_iterator = defineIterator(Array, 'Array', function (iterated, kind) {
    setInternalState$2(this, {
      type: ARRAY_ITERATOR,
      target: toIndexedObject(iterated), // target
      index: 0,                          // next index
      kind: kind                         // kind
    });
  // `%ArrayIteratorPrototype%.next` method
  // https://tc39.es/ecma262/#sec-%arrayiteratorprototype%.next
  }, function () {
    var state = getInternalState$1(this);
    var target = state.target;
    var kind = state.kind;
    var index = state.index++;
    if (!target || index >= target.length) {
      state.target = undefined;
      return { value: undefined, done: true };
    }
    if (kind == 'keys') return { value: index, done: false };
    if (kind == 'values') return { value: target[index], done: false };
    return { value: [index, target[index]], done: false };
  }, 'values');

  // argumentsList[@@iterator] is %ArrayProto_values%
  // https://tc39.es/ecma262/#sec-createunmappedargumentsobject
  // https://tc39.es/ecma262/#sec-createmappedargumentsobject
  iterators.Arguments = iterators.Array;

  // https://tc39.es/ecma262/#sec-array.prototype-@@unscopables
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');

  /* eslint-disable es/no-object-getownpropertynames -- safe */

  var $getOwnPropertyNames = objectGetOwnPropertyNames.f;

  var toString$1 = {}.toString;

  var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames
    ? Object.getOwnPropertyNames(window) : [];

  var getWindowNames = function (it) {
    try {
      return $getOwnPropertyNames(it);
    } catch (error) {
      return windowNames.slice();
    }
  };

  // fallback for IE11 buggy Object.getOwnPropertyNames with iframe and window
  var f = function getOwnPropertyNames(it) {
    return windowNames && toString$1.call(it) == '[object Window]'
      ? getWindowNames(it)
      : $getOwnPropertyNames(toIndexedObject(it));
  };

  var objectGetOwnPropertyNamesExternal = {
  	f: f
  };

  var freezing = !fails(function () {
    // eslint-disable-next-line es/no-object-isextensible, es/no-object-preventextensions -- required for testing
    return Object.isExtensible(Object.preventExtensions({}));
  });

  var internalMetadata = createCommonjsModule(function (module) {
  var defineProperty = objectDefineProperty.f;





  var REQUIRED = false;
  var METADATA = uid('meta');
  var id = 0;

  // eslint-disable-next-line es/no-object-isextensible -- safe
  var isExtensible = Object.isExtensible || function () {
    return true;
  };

  var setMetadata = function (it) {
    defineProperty(it, METADATA, { value: {
      objectID: 'O' + id++, // object ID
      weakData: {}          // weak collections IDs
    } });
  };

  var fastKey = function (it, create) {
    // return a primitive with prefix
    if (!isObject$1(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
    if (!has$3(it, METADATA)) {
      // can't set metadata to uncaught frozen object
      if (!isExtensible(it)) return 'F';
      // not necessary to add metadata
      if (!create) return 'E';
      // add missing metadata
      setMetadata(it);
    // return object ID
    } return it[METADATA].objectID;
  };

  var getWeakData = function (it, create) {
    if (!has$3(it, METADATA)) {
      // can't set metadata to uncaught frozen object
      if (!isExtensible(it)) return true;
      // not necessary to add metadata
      if (!create) return false;
      // add missing metadata
      setMetadata(it);
    // return the store of weak collections IDs
    } return it[METADATA].weakData;
  };

  // add metadata on freeze-family methods calling
  var onFreeze = function (it) {
    if (freezing && REQUIRED && isExtensible(it) && !has$3(it, METADATA)) setMetadata(it);
    return it;
  };

  var enable = function () {
    meta.enable = function () { /* empty */ };
    REQUIRED = true;
    var getOwnPropertyNames = objectGetOwnPropertyNames.f;
    var splice = [].splice;
    var test = {};
    test[METADATA] = 1;

    // prevent exposing of metadata key
    if (getOwnPropertyNames(test).length) {
      objectGetOwnPropertyNames.f = function (it) {
        var result = getOwnPropertyNames(it);
        for (var i = 0, length = result.length; i < length; i++) {
          if (result[i] === METADATA) {
            splice.call(result, i, 1);
            break;
          }
        } return result;
      };

      _export({ target: 'Object', stat: true, forced: true }, {
        getOwnPropertyNames: objectGetOwnPropertyNamesExternal.f
      });
    }
  };

  var meta = module.exports = {
    enable: enable,
    fastKey: fastKey,
    getWeakData: getWeakData,
    onFreeze: onFreeze
  };

  hiddenKeys$1[METADATA] = true;
  });
  internalMetadata.enable;
  internalMetadata.fastKey;
  internalMetadata.getWeakData;
  internalMetadata.onFreeze;

  // makes subclassing work correct for wrapped built-ins
  var inheritIfRequired = function ($this, dummy, Wrapper) {
    var NewTarget, NewTargetPrototype;
    if (
      // it can work only with native `setPrototypeOf`
      objectSetPrototypeOf &&
      // we haven't completely correct pre-ES6 way for getting `new.target`, so use this
      isCallable(NewTarget = dummy.constructor) &&
      NewTarget !== Wrapper &&
      isObject$1(NewTargetPrototype = NewTarget.prototype) &&
      NewTargetPrototype !== Wrapper.prototype
    ) objectSetPrototypeOf($this, NewTargetPrototype);
    return $this;
  };

  var collection = function (CONSTRUCTOR_NAME, wrapper, common) {
    var IS_MAP = CONSTRUCTOR_NAME.indexOf('Map') !== -1;
    var IS_WEAK = CONSTRUCTOR_NAME.indexOf('Weak') !== -1;
    var ADDER = IS_MAP ? 'set' : 'add';
    var NativeConstructor = global_1[CONSTRUCTOR_NAME];
    var NativePrototype = NativeConstructor && NativeConstructor.prototype;
    var Constructor = NativeConstructor;
    var exported = {};

    var fixMethod = function (KEY) {
      var nativeMethod = NativePrototype[KEY];
      redefine(NativePrototype, KEY,
        KEY == 'add' ? function add(value) {
          nativeMethod.call(this, value === 0 ? 0 : value);
          return this;
        } : KEY == 'delete' ? function (key) {
          return IS_WEAK && !isObject$1(key) ? false : nativeMethod.call(this, key === 0 ? 0 : key);
        } : KEY == 'get' ? function get(key) {
          return IS_WEAK && !isObject$1(key) ? undefined : nativeMethod.call(this, key === 0 ? 0 : key);
        } : KEY == 'has' ? function has(key) {
          return IS_WEAK && !isObject$1(key) ? false : nativeMethod.call(this, key === 0 ? 0 : key);
        } : function set(key, value) {
          nativeMethod.call(this, key === 0 ? 0 : key, value);
          return this;
        }
      );
    };

    var REPLACE = isForced_1(
      CONSTRUCTOR_NAME,
      !isCallable(NativeConstructor) || !(IS_WEAK || NativePrototype.forEach && !fails(function () {
        new NativeConstructor().entries().next();
      }))
    );

    if (REPLACE) {
      // create collection constructor
      Constructor = common.getConstructor(wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER);
      internalMetadata.enable();
    } else if (isForced_1(CONSTRUCTOR_NAME, true)) {
      var instance = new Constructor();
      // early implementations not supports chaining
      var HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance;
      // V8 ~ Chromium 40- weak-collections throws on primitives, but should return false
      var THROWS_ON_PRIMITIVES = fails(function () { instance.has(1); });
      // most early implementations doesn't supports iterables, most modern - not close it correctly
      // eslint-disable-next-line no-new -- required for testing
      var ACCEPT_ITERABLES = checkCorrectnessOfIteration(function (iterable) { new NativeConstructor(iterable); });
      // for early implementations -0 and +0 not the same
      var BUGGY_ZERO = !IS_WEAK && fails(function () {
        // V8 ~ Chromium 42- fails only with 5+ elements
        var $instance = new NativeConstructor();
        var index = 5;
        while (index--) $instance[ADDER](index, index);
        return !$instance.has(-0);
      });

      if (!ACCEPT_ITERABLES) {
        Constructor = wrapper(function (dummy, iterable) {
          anInstance(dummy, Constructor, CONSTRUCTOR_NAME);
          var that = inheritIfRequired(new NativeConstructor(), dummy, Constructor);
          if (iterable != undefined) iterate(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
          return that;
        });
        Constructor.prototype = NativePrototype;
        NativePrototype.constructor = Constructor;
      }

      if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
        fixMethod('delete');
        fixMethod('has');
        IS_MAP && fixMethod('get');
      }

      if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);

      // weak collections should not contains .clear method
      if (IS_WEAK && NativePrototype.clear) delete NativePrototype.clear;
    }

    exported[CONSTRUCTOR_NAME] = Constructor;
    _export({ global: true, forced: Constructor != NativeConstructor }, exported);

    setToStringTag(Constructor, CONSTRUCTOR_NAME);

    if (!IS_WEAK) common.setStrong(Constructor, CONSTRUCTOR_NAME, IS_MAP);

    return Constructor;
  };

  var defineProperty = objectDefineProperty.f;








  var fastKey = internalMetadata.fastKey;


  var setInternalState$1 = internalState.set;
  var internalStateGetterFor = internalState.getterFor;

  var collectionStrong = {
    getConstructor: function (wrapper, CONSTRUCTOR_NAME, IS_MAP, ADDER) {
      var C = wrapper(function (that, iterable) {
        anInstance(that, C, CONSTRUCTOR_NAME);
        setInternalState$1(that, {
          type: CONSTRUCTOR_NAME,
          index: objectCreate$1(null),
          first: undefined,
          last: undefined,
          size: 0
        });
        if (!descriptors) that.size = 0;
        if (iterable != undefined) iterate(iterable, that[ADDER], { that: that, AS_ENTRIES: IS_MAP });
      });

      var getInternalState = internalStateGetterFor(CONSTRUCTOR_NAME);

      var define = function (that, key, value) {
        var state = getInternalState(that);
        var entry = getEntry(that, key);
        var previous, index;
        // change existing entry
        if (entry) {
          entry.value = value;
        // create new entry
        } else {
          state.last = entry = {
            index: index = fastKey(key, true),
            key: key,
            value: value,
            previous: previous = state.last,
            next: undefined,
            removed: false
          };
          if (!state.first) state.first = entry;
          if (previous) previous.next = entry;
          if (descriptors) state.size++;
          else that.size++;
          // add to index
          if (index !== 'F') state.index[index] = entry;
        } return that;
      };

      var getEntry = function (that, key) {
        var state = getInternalState(that);
        // fast case
        var index = fastKey(key);
        var entry;
        if (index !== 'F') return state.index[index];
        // frozen object case
        for (entry = state.first; entry; entry = entry.next) {
          if (entry.key == key) return entry;
        }
      };

      redefineAll(C.prototype, {
        // `{ Map, Set }.prototype.clear()` methods
        // https://tc39.es/ecma262/#sec-map.prototype.clear
        // https://tc39.es/ecma262/#sec-set.prototype.clear
        clear: function clear() {
          var that = this;
          var state = getInternalState(that);
          var data = state.index;
          var entry = state.first;
          while (entry) {
            entry.removed = true;
            if (entry.previous) entry.previous = entry.previous.next = undefined;
            delete data[entry.index];
            entry = entry.next;
          }
          state.first = state.last = undefined;
          if (descriptors) state.size = 0;
          else that.size = 0;
        },
        // `{ Map, Set }.prototype.delete(key)` methods
        // https://tc39.es/ecma262/#sec-map.prototype.delete
        // https://tc39.es/ecma262/#sec-set.prototype.delete
        'delete': function (key) {
          var that = this;
          var state = getInternalState(that);
          var entry = getEntry(that, key);
          if (entry) {
            var next = entry.next;
            var prev = entry.previous;
            delete state.index[entry.index];
            entry.removed = true;
            if (prev) prev.next = next;
            if (next) next.previous = prev;
            if (state.first == entry) state.first = next;
            if (state.last == entry) state.last = prev;
            if (descriptors) state.size--;
            else that.size--;
          } return !!entry;
        },
        // `{ Map, Set }.prototype.forEach(callbackfn, thisArg = undefined)` methods
        // https://tc39.es/ecma262/#sec-map.prototype.foreach
        // https://tc39.es/ecma262/#sec-set.prototype.foreach
        forEach: function forEach(callbackfn /* , that = undefined */) {
          var state = getInternalState(this);
          var boundFunction = functionBindContext(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3);
          var entry;
          while (entry = entry ? entry.next : state.first) {
            boundFunction(entry.value, entry.key, this);
            // revert to the last existing entry
            while (entry && entry.removed) entry = entry.previous;
          }
        },
        // `{ Map, Set}.prototype.has(key)` methods
        // https://tc39.es/ecma262/#sec-map.prototype.has
        // https://tc39.es/ecma262/#sec-set.prototype.has
        has: function has(key) {
          return !!getEntry(this, key);
        }
      });

      redefineAll(C.prototype, IS_MAP ? {
        // `Map.prototype.get(key)` method
        // https://tc39.es/ecma262/#sec-map.prototype.get
        get: function get(key) {
          var entry = getEntry(this, key);
          return entry && entry.value;
        },
        // `Map.prototype.set(key, value)` method
        // https://tc39.es/ecma262/#sec-map.prototype.set
        set: function set(key, value) {
          return define(this, key === 0 ? 0 : key, value);
        }
      } : {
        // `Set.prototype.add(value)` method
        // https://tc39.es/ecma262/#sec-set.prototype.add
        add: function add(value) {
          return define(this, value = value === 0 ? 0 : value, value);
        }
      });
      if (descriptors) defineProperty(C.prototype, 'size', {
        get: function () {
          return getInternalState(this).size;
        }
      });
      return C;
    },
    setStrong: function (C, CONSTRUCTOR_NAME, IS_MAP) {
      var ITERATOR_NAME = CONSTRUCTOR_NAME + ' Iterator';
      var getInternalCollectionState = internalStateGetterFor(CONSTRUCTOR_NAME);
      var getInternalIteratorState = internalStateGetterFor(ITERATOR_NAME);
      // `{ Map, Set }.prototype.{ keys, values, entries, @@iterator }()` methods
      // https://tc39.es/ecma262/#sec-map.prototype.entries
      // https://tc39.es/ecma262/#sec-map.prototype.keys
      // https://tc39.es/ecma262/#sec-map.prototype.values
      // https://tc39.es/ecma262/#sec-map.prototype-@@iterator
      // https://tc39.es/ecma262/#sec-set.prototype.entries
      // https://tc39.es/ecma262/#sec-set.prototype.keys
      // https://tc39.es/ecma262/#sec-set.prototype.values
      // https://tc39.es/ecma262/#sec-set.prototype-@@iterator
      defineIterator(C, CONSTRUCTOR_NAME, function (iterated, kind) {
        setInternalState$1(this, {
          type: ITERATOR_NAME,
          target: iterated,
          state: getInternalCollectionState(iterated),
          kind: kind,
          last: undefined
        });
      }, function () {
        var state = getInternalIteratorState(this);
        var kind = state.kind;
        var entry = state.last;
        // revert to the last existing entry
        while (entry && entry.removed) entry = entry.previous;
        // get next entry
        if (!state.target || !(state.last = entry = entry ? entry.next : state.state.first)) {
          // or finish the iteration
          state.target = undefined;
          return { value: undefined, done: true };
        }
        // return step by kind
        if (kind == 'keys') return { value: entry.key, done: false };
        if (kind == 'values') return { value: entry.value, done: false };
        return { value: [entry.key, entry.value], done: false };
      }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);

      // `{ Map, Set }.prototype[@@species]` accessors
      // https://tc39.es/ecma262/#sec-get-map-@@species
      // https://tc39.es/ecma262/#sec-get-set-@@species
      setSpecies(CONSTRUCTOR_NAME);
    }
  };
  collectionStrong.getConstructor;
  collectionStrong.setStrong;

  // `Set` constructor
  // https://tc39.es/ecma262/#sec-set-objects
  collection('Set', function (init) {
    return function Set() { return init(this, arguments.length ? arguments[0] : undefined); };
  }, collectionStrong);

  var charAt = stringMultibyte.charAt;




  var STRING_ITERATOR = 'String Iterator';
  var setInternalState = internalState.set;
  var getInternalState = internalState.getterFor(STRING_ITERATOR);

  // `String.prototype[@@iterator]` method
  // https://tc39.es/ecma262/#sec-string.prototype-@@iterator
  defineIterator(String, 'String', function (iterated) {
    setInternalState(this, {
      type: STRING_ITERATOR,
      string: toString_1(iterated),
      index: 0
    });
  // `%StringIteratorPrototype%.next` method
  // https://tc39.es/ecma262/#sec-%stringiteratorprototype%.next
  }, function next() {
    var state = getInternalState(this);
    var string = state.string;
    var index = state.index;
    var point;
    if (index >= string.length) return { value: undefined, done: true };
    point = charAt(string, index);
    state.index += point.length;
    return { value: point, done: false };
  });

  var ITERATOR = wellKnownSymbol('iterator');
  var TO_STRING_TAG = wellKnownSymbol('toStringTag');
  var ArrayValues = es_array_iterator.values;

  var handlePrototype = function (CollectionPrototype, COLLECTION_NAME) {
    if (CollectionPrototype) {
      // some Chrome versions have non-configurable methods on DOMTokenList
      if (CollectionPrototype[ITERATOR] !== ArrayValues) try {
        createNonEnumerableProperty(CollectionPrototype, ITERATOR, ArrayValues);
      } catch (error) {
        CollectionPrototype[ITERATOR] = ArrayValues;
      }
      if (!CollectionPrototype[TO_STRING_TAG]) {
        createNonEnumerableProperty(CollectionPrototype, TO_STRING_TAG, COLLECTION_NAME);
      }
      if (domIterables[COLLECTION_NAME]) for (var METHOD_NAME in es_array_iterator) {
        // some Chrome versions have non-configurable methods on DOMTokenList
        if (CollectionPrototype[METHOD_NAME] !== es_array_iterator[METHOD_NAME]) try {
          createNonEnumerableProperty(CollectionPrototype, METHOD_NAME, es_array_iterator[METHOD_NAME]);
        } catch (error) {
          CollectionPrototype[METHOD_NAME] = es_array_iterator[METHOD_NAME];
        }
      }
    }
  };

  for (var COLLECTION_NAME in domIterables) {
    handlePrototype(global_1[COLLECTION_NAME] && global_1[COLLECTION_NAME].prototype, COLLECTION_NAME);
  }

  handlePrototype(domTokenListPrototype, 'DOMTokenList');

  /**
   * Casts `value` to `identity` if it's not a function.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {Function} Returns cast function.
   */
  function castFunction(value) {
    return typeof value == 'function' ? value : identity_1;
  }

  var _castFunction = castFunction;

  /**
   * Iterates over own and inherited enumerable string keyed properties of an
   * object and invokes `iteratee` for each property. The iteratee is invoked
   * with three arguments: (value, key, object). Iteratee functions may exit
   * iteration early by explicitly returning `false`.
   *
   * @static
   * @memberOf _
   * @since 0.3.0
   * @category Object
   * @param {Object} object The object to iterate over.
   * @param {Function} [iteratee=_.identity] The function invoked per iteration.
   * @returns {Object} Returns `object`.
   * @see _.forInRight
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   *   this.b = 2;
   * }
   *
   * Foo.prototype.c = 3;
   *
   * _.forIn(new Foo, function(value, key) {
   *   console.log(key);
   * });
   * // => Logs 'a', 'b', then 'c' (iteration order is not guaranteed).
   */
  function forIn(object, iteratee) {
    return object == null
      ? object
      : _baseFor(object, _castFunction(iteratee), keysIn_1);
  }

  var forIn_1 = forIn;

  var collectionNameCache = {};
  var internalCollectionNameCache = {};
  var modelNameCache = {};
  /**
    The primary use of the `Schema` class is to use it to find Models and Collections via the `Model` class methods.

    The `Schema` is most often accessed via the first parameter to a route handler:

    ```js
    this.get('posts', schema => {
      return schema.posts.where({ isAdmin: false });
    });
    ```

    It is also available from the `.schema` property of a `server` instance:

    ```js
    server.schema.users.create({ name: 'Yehuda' });
    ```

    To work with the Model or Collection returned from one of the methods below, refer to the instance methods in the API docs for the `Model` and `Collection` classes.

    @class Schema
    @constructor
    @public
   */

  var Schema = /*#__PURE__*/function () {
    function Schema(db) {
      var modelsMap = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      _classCallCheck(this, Schema);

      assert(db, "A schema requires a db");
      /**
        Returns Mirage's database. See the `Db` docs for the db's API.
         @property db
        @type {Object}
        @public
      */

      this.db = db;
      this._registry = {};
      this._dependentAssociations = {
        polymorphic: []
      };
      this.registerModels(modelsMap);
      this.isSaving = {}; // a hash of models that are being saved, used to avoid cycles
    }
    /**
      @method registerModels
      @param hash
      @public
      @hide
     */


    _createClass(Schema, [{
      key: "registerModels",
      value: function registerModels() {
        var _this = this;

        var hash = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        forIn_1(hash, function (model, key) {
          _this.registerModel(key, hash[key]);
        });
      }
      /**
        @method registerModel
        @param type
        @param ModelClass
        @public
        @hide
       */

    }, {
      key: "registerModel",
      value: function registerModel(type, ModelClass) {
        var _this2 = this;

        var camelizedModelName = camelize(type);
        var modelName = dasherize(camelizedModelName); // Avoid mutating original class, because we may want to reuse it across many tests

        ModelClass = ModelClass.extend(); // Store model & fks in registry
        // TODO: don't think this is needed anymore

        this._registry[camelizedModelName] = this._registry[camelizedModelName] || {
          class: null,
          foreignKeys: []
        }; // we may have created this key before, if another model added fks to it

        this._registry[camelizedModelName].class = ModelClass; // TODO: set here, remove from model#constructor

        ModelClass.prototype._schema = this;
        ModelClass.prototype.modelName = modelName; // Set up associations

        ModelClass.prototype.hasManyAssociations = {}; // a registry of the model's hasMany associations. Key is key from model definition, value is association instance itself

        ModelClass.prototype.hasManyAssociationFks = {}; // a lookup table to get the hasMany association by foreignKey

        ModelClass.prototype.belongsToAssociations = {}; // a registry of the model's belongsTo associations. Key is key from model definition, value is association instance itself

        ModelClass.prototype.belongsToAssociationFks = {}; // a lookup table to get the belongsTo association by foreignKey

        ModelClass.prototype.associationKeys = new Set(); // ex: address.user, user.addresses

        ModelClass.prototype.associationIdKeys = new Set(); // ex: address.user_id, user.address_ids

        ModelClass.prototype.dependentAssociations = []; // a registry of associations that depend on this model, needed for deletion cleanup.

        var fksAddedFromThisModel = {};

        for (var associationProperty in ModelClass.prototype) {
          if (ModelClass.prototype[associationProperty] instanceof Association) {
            var association = ModelClass.prototype[associationProperty];
            association.name = associationProperty;
            association.modelName = association.modelName || this.toModelName(associationProperty);
            association.ownerModelName = modelName;
            association.setSchema(this); // Update the registry with this association's foreign keys. This is
            // essentially our "db migration", since we must know about the fks.

            var _association$getForei = association.getForeignKeyArray(),
                _association$getForei2 = _slicedToArray(_association$getForei, 2),
                fkHolder = _association$getForei2[0],
                fk = _association$getForei2[1];

            fksAddedFromThisModel[fkHolder] = fksAddedFromThisModel[fkHolder] || [];
            assert(!fksAddedFromThisModel[fkHolder].includes(fk), "Your '".concat(type, "' model definition has multiple possible inverse relationships of type '").concat(fkHolder, "'. Please use explicit inverses."));
            fksAddedFromThisModel[fkHolder].push(fk);

            this._addForeignKeyToRegistry(fkHolder, fk); // Augment the Model's class with any methods added by this association


            association.addMethodsToModelClass(ModelClass, associationProperty);
          }
        } // Create a db collection for this model, if doesn't exist


        var collection = this.toCollectionName(modelName);

        if (!this.db[collection]) {
          this.db.createCollection(collection);
        } // Create the entity methods


        this[collection] = {
          camelizedModelName: camelizedModelName,
          new: function _new(attrs) {
            return _this2.new(camelizedModelName, attrs);
          },
          create: function create(attrs) {
            return _this2.create(camelizedModelName, attrs);
          },
          all: function all(attrs) {
            return _this2.all(camelizedModelName, attrs);
          },
          find: function find(attrs) {
            return _this2.find(camelizedModelName, attrs);
          },
          findBy: function findBy(attrs) {
            return _this2.findBy(camelizedModelName, attrs);
          },
          findOrCreateBy: function findOrCreateBy(attrs) {
            return _this2.findOrCreateBy(camelizedModelName, attrs);
          },
          where: function where(attrs) {
            return _this2.where(camelizedModelName, attrs);
          },
          none: function none(attrs) {
            return _this2.none(camelizedModelName, attrs);
          },
          first: function first(attrs) {
            return _this2.first(camelizedModelName, attrs);
          }
        };
        return this;
      }
      /**
        @method modelFor
        @param type
        @public
        @hide
       */

    }, {
      key: "modelFor",
      value: function modelFor(type) {
        return this._registry[type];
      }
      /**
        Create a new unsaved model instance with attributes *attrs*.
         ```js
        let post = blogPosts.new({ title: 'Lorem ipsum' });
        post.title;   // Lorem ipsum
        post.id;      // null
        post.isNew(); // true
        ```
         @method new
        @param type
        @param attrs
        @public
       */

    }, {
      key: "new",
      value: function _new(type, attrs) {
        return this._instantiateModel(dasherize(type), attrs);
      }
      /**
        Create a new model instance with attributes *attrs*, and insert it into the database.
         ```js
        let post = blogPosts.create({title: 'Lorem ipsum'});
        post.title;   // Lorem ipsum
        post.id;      // 1
        post.isNew(); // false
        ```
         @method create
        @param type
        @param attrs
        @public
       */

    }, {
      key: "create",
      value: function create(type, attrs) {
        return this.new(type, attrs).save();
      }
      /**
        Return all models in the database.
         ```js
        let posts = blogPosts.all();
        // [post:1, post:2, ...]
        ```
         @method all
        @param type
        @public
       */

    }, {
      key: "all",
      value: function all(type) {
        var collection = this.collectionForType(type);
        return this._hydrate(collection, dasherize(type));
      }
      /**
        Return an empty collection of type `type`.
         @method none
        @param type
        @public
       */

    }, {
      key: "none",
      value: function none(type) {
        return this._hydrate([], dasherize(type));
      }
      /**
        Return one or many models in the database by id.
         ```js
        let post = blogPosts.find(1);
        let posts = blogPosts.find([1, 3, 4]);
        ```
         @method find
        @param type
        @param ids
        @public
       */

    }, {
      key: "find",
      value: function find(type, ids) {
        var collection = this.collectionForType(type);
        var records = collection.find(ids);

        if (Array.isArray(ids)) {
          assert(records.length === ids.length, "Couldn't find all ".concat(this._container.inflector.pluralize(type), " with ids: (").concat(ids.join(","), ") (found ").concat(records.length, " results, but was looking for ").concat(ids.length, ")"));
        }

        return this._hydrate(records, dasherize(type));
      }
      /**
        Returns the first model in the database that matches the key-value pairs in `attrs`. Note that a string comparison is used.
         ```js
        let post = blogPosts.findBy({ published: true });
        let post = blogPosts.findBy({ authorId: 1, published: false });
        let post = blogPosts.findBy({ author: janeSmith, featured: true });
        ```
         This will return `null` if the schema doesn't have any matching record.
         A predicate function can also be used to find a match.
         ```js
        let longPost = blogPosts.findBy((post) => post.body.length > 1000);
        ```
         @method findBy
        @param type
        @param attributesOrPredicate
        @public
       */

    }, {
      key: "findBy",
      value: function findBy(type, query) {
        var collection = this.collectionForType(type);
        var record = collection.findBy(query);
        return this._hydrate(record, dasherize(type));
      }
      /**
        Returns the first model in the database that matches the key-value pairs in `attrs`, or creates a record with the attributes if one is not found.
         ```js
        // Find the first published blog post, or create a new one.
        let post = blogPosts.findOrCreateBy({ published: true });
        ```
         @method findOrCreateBy
        @param type
        @param attributeName
        @public
       */

    }, {
      key: "findOrCreateBy",
      value: function findOrCreateBy(type, attrs) {
        var collection = this.collectionForType(type);
        var record = collection.findBy(attrs);
        var model;

        if (!record) {
          model = this.create(type, attrs);
        } else {
          model = this._hydrate(record, dasherize(type));
        }

        return model;
      }
      /**
        Return an ORM/Collection, which represents an array of models from the database matching `query`.
         If `query` is an object, its key-value pairs will be compared against records using string comparison.
         `query` can also be a compare function.
         ```js
        let posts = blogPosts.where({ published: true });
        let posts = blogPosts.where(post => post.published === true);
        ```
         @method where
        @param type
        @param query
        @public
       */

    }, {
      key: "where",
      value: function where(type, query) {
        var collection = this.collectionForType(type);
        var records = collection.where(query);
        return this._hydrate(records, dasherize(type));
      }
      /**
        Returns the first model in the database.
         ```js
        let post = blogPosts.first();
        ```
         N.B. This will return `null` if the schema doesn't contain any records.
         @method first
        @param type
        @public
       */

    }, {
      key: "first",
      value: function first(type) {
        var collection = this.collectionForType(type);
        var record = collection[0];
        return this._hydrate(record, dasherize(type));
      }
      /**
        @method modelClassFor
        @param modelName
        @public
        @hide
       */

    }, {
      key: "modelClassFor",
      value: function modelClassFor(modelName) {
        var model = this._registry[camelize(modelName)];

        assert(model, "Model not registered: ".concat(modelName));
        return model.class.prototype;
      }
      /*
        This method updates the dependentAssociations registry, which is used to
        keep track of which models depend on a given association. It's used when
        deleting models - their dependents need to be looked up and foreign keys
        updated.
         For example,
             schema = {
              post: Model.extend(),
              comment: Model.extend({
                post: belongsTo()
              })
            };
             comment1.post = post1;
            ...
            post1.destroy()
         Deleting this post should clear out comment1's foreign key.
         Polymorphic associations can have _any_ other model as a dependent, so we
        handle them separately.
      */

    }, {
      key: "addDependentAssociation",
      value: function addDependentAssociation(association, modelName) {
        if (association.isPolymorphic) {
          this._dependentAssociations.polymorphic.push(association);
        } else {
          this._dependentAssociations[modelName] = this._dependentAssociations[modelName] || [];

          this._dependentAssociations[modelName].push(association);
        }
      }
    }, {
      key: "dependentAssociationsFor",
      value: function dependentAssociationsFor(modelName) {
        var directDependents = this._dependentAssociations[modelName] || [];
        var polymorphicAssociations = this._dependentAssociations.polymorphic || [];
        return directDependents.concat(polymorphicAssociations);
      }
      /**
        Returns an object containing the associations registered for the model of the given _modelName_.
         For example, given this configuration
        
        ```js
        import { createServer, Model, hasMany, belongsTo } from 'miragejs'
         let server = createServer({
          models: {
            user: Model,
            article: Model.extend({
              fineAuthor: belongsTo("user"),
              comments: hasMany()
            }),
            comment: Model
          }
        })
        ```
         each of the following would return empty objects
         ```js
        server.schema.associationsFor('user')
        // {}
        server.schema.associationsFor('comment')
        // {}
        ```
         but the associations for the `article` would return
         ```js
        server.schema.associationsFor('article')
         // {
        //   fineAuthor: BelongsToAssociation,
        //   comments: HasManyAssociation
        // }
        ```
         Check out the docs on the Association class to see what fields are available for each association.
         @method associationsFor
        @param {String} modelName
        @return {Object}
        @public
      */

    }, {
      key: "associationsFor",
      value: function associationsFor(modelName) {
        var modelClass = this.modelClassFor(modelName);
        return Object.assign({}, modelClass.belongsToAssociations, modelClass.hasManyAssociations);
      }
    }, {
      key: "hasModelForModelName",
      value: function hasModelForModelName(modelName) {
        return this.modelFor(camelize(modelName));
      }
      /*
        Private methods
      */

      /**
        @method collectionForType
        @param type
        @private
        @hide
       */

    }, {
      key: "collectionForType",
      value: function collectionForType(type) {
        var collection = this.toCollectionName(type);
        assert(this.db[collection], "You're trying to find model(s) of type ".concat(type, " but this collection doesn't exist in the database."));
        return this.db[collection];
      }
    }, {
      key: "toCollectionName",
      value: function toCollectionName(type) {
        if (typeof collectionNameCache[type] !== "string") {
          var modelName = dasherize(type);
          var collectionName = camelize(this._container.inflector.pluralize(modelName));
          collectionNameCache[type] = collectionName;
        }

        return collectionNameCache[type];
      } // This is to get at the underlying Db collection. Poorly named... need to
      // refactor to DbTable or something.

    }, {
      key: "toInternalCollectionName",
      value: function toInternalCollectionName(type) {
        if (typeof internalCollectionNameCache[type] !== "string") {
          var internalCollectionName = "_".concat(this.toCollectionName(type));
          internalCollectionNameCache[type] = internalCollectionName;
        }

        return internalCollectionNameCache[type];
      }
    }, {
      key: "toModelName",
      value: function toModelName(type) {
        if (typeof modelNameCache[type] !== "string") {
          var dasherized = dasherize(type);

          var modelName = this._container.inflector.singularize(dasherized);

          modelNameCache[type] = modelName;
        }

        return modelNameCache[type];
      }
      /**
        @method _addForeignKeyToRegistry
        @param type
        @param fk
        @private
        @hide
       */

    }, {
      key: "_addForeignKeyToRegistry",
      value: function _addForeignKeyToRegistry(type, fk) {
        this._registry[type] = this._registry[type] || {
          class: null,
          foreignKeys: []
        };
        var fks = this._registry[type].foreignKeys;

        if (!fks.includes(fk)) {
          fks.push(fk);
        }
      }
      /**
        @method _instantiateModel
        @param modelName
        @param attrs
        @private
        @hide
       */

    }, {
      key: "_instantiateModel",
      value: function _instantiateModel(modelName, attrs) {
        var ModelClass = this._modelFor(modelName);

        var fks = this._foreignKeysFor(modelName);

        return new ModelClass(this, modelName, attrs, fks);
      }
      /**
        @method _modelFor
        @param modelName
        @private
        @hide
       */

    }, {
      key: "_modelFor",
      value: function _modelFor(modelName) {
        return this._registry[camelize(modelName)].class;
      }
      /**
        @method _foreignKeysFor
        @param modelName
        @private
        @hide
       */

    }, {
      key: "_foreignKeysFor",
      value: function _foreignKeysFor(modelName) {
        return this._registry[camelize(modelName)].foreignKeys;
      }
      /**
        Takes a record and returns a model, or an array of records
        and returns a collection.
       *
        @method _hydrate
        @param records
        @param modelName
        @private
        @hide
       */

    }, {
      key: "_hydrate",
      value: function _hydrate(records, modelName) {
        if (Array.isArray(records)) {
          var models = records.map(function (record) {
            return this._instantiateModel(modelName, record);
          }, this);
          return new Collection(modelName, models);
        } else if (records) {
          return this._instantiateModel(modelName, records);
        } else {
          return null;
        }
      }
    }]);

    return Schema;
  }();

  var classes = {
    Db: Db$1,
    Association: Association,
    RouteHandler: RouteHandler,
    BaseRouteHandler: BaseRouteHandler,
    Serializer: Serializer$1,
    SerializerRegistry: SerializerRegistry,
    Schema: Schema
  };
  var defaultInflector$1 = {
    singularize: singularize,
    pluralize: pluralize
  };
  /**
    Lightweight DI container for customizable objects that are needed by
    deeply nested classes.

    @class Container
    @hide
   */

  var Container = /*#__PURE__*/function () {
    function Container() {
      _classCallCheck(this, Container);

      this.inflector = defaultInflector$1;
    }

    _createClass(Container, [{
      key: "register",
      value: function register(key, value) {
        this[key] = value;
      }
    }, {
      key: "create",
      value: function create(className) {
        var Class = classes[className];
        Class.prototype._container = this;

        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        return _construct(Class, args);
      }
    }]);

    return Container;
  }();
  /**
    These are side effects. We give each class a default container so it can be
    easily unit tested.

    We should remove these once we have test coverage and can refactor to a proper
    DI system.
  */


  var defaultContainer = new Container();
  Db$1.prototype._container = defaultContainer;
  Association.prototype._container = defaultContainer;
  BaseRouteHandler.prototype._container = defaultContainer;
  RouteHandler.prototype._container = defaultContainer;
  Serializer$1.prototype._container = defaultContainer;
  SerializerRegistry.prototype._container = defaultContainer;
  Schema.prototype._container = defaultContainer;
  var Container$1 = Container;

  /**
   * The base implementation of `_.set`.
   *
   * @private
   * @param {Object} object The object to modify.
   * @param {Array|string} path The path of the property to set.
   * @param {*} value The value to set.
   * @param {Function} [customizer] The function to customize path creation.
   * @returns {Object} Returns `object`.
   */
  function baseSet(object, path, value, customizer) {
    if (!isObject_1(object)) {
      return object;
    }
    path = _castPath(path, object);

    var index = -1,
        length = path.length,
        lastIndex = length - 1,
        nested = object;

    while (nested != null && ++index < length) {
      var key = _toKey(path[index]),
          newValue = value;

      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return object;
      }

      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = customizer ? customizer(objValue, key, nested) : undefined;
        if (newValue === undefined) {
          newValue = isObject_1(objValue)
            ? objValue
            : (_isIndex(path[index + 1]) ? [] : {});
        }
      }
      _assignValue(nested, key, newValue);
      nested = nested[key];
    }
    return object;
  }

  var _baseSet = baseSet;

  /**
   * The base implementation of  `_.pickBy` without support for iteratee shorthands.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} paths The property paths to pick.
   * @param {Function} predicate The function invoked per property.
   * @returns {Object} Returns the new object.
   */
  function basePickBy(object, paths, predicate) {
    var index = -1,
        length = paths.length,
        result = {};

    while (++index < length) {
      var path = paths[index],
          value = _baseGet(object, path);

      if (predicate(value, path)) {
        _baseSet(result, _castPath(path, object), value);
      }
    }
    return result;
  }

  var _basePickBy = basePickBy;

  /**
   * The base implementation of `_.pick` without support for individual
   * property identifiers.
   *
   * @private
   * @param {Object} object The source object.
   * @param {string[]} paths The property paths to pick.
   * @returns {Object} Returns the new object.
   */
  function basePick(object, paths) {
    return _basePickBy(object, paths, function(value, path) {
      return hasIn_1(object, path);
    });
  }

  var _basePick = basePick;

  /**
   * A specialized version of `baseRest` which flattens the rest array.
   *
   * @private
   * @param {Function} func The function to apply a rest parameter to.
   * @returns {Function} Returns the new function.
   */
  function flatRest(func) {
    return _setToString(_overRest(func, undefined, flatten_1), func + '');
  }

  var _flatRest = flatRest;

  /**
   * Creates an object composed of the picked `object` properties.
   *
   * @static
   * @since 0.1.0
   * @memberOf _
   * @category Object
   * @param {Object} object The source object.
   * @param {...(string|string[])} [paths] The property paths to pick.
   * @returns {Object} Returns the new object.
   * @example
   *
   * var object = { 'a': 1, 'b': '2', 'c': 3 };
   *
   * _.pick(object, ['a', 'c']);
   * // => { 'a': 1, 'c': 3 }
   */
  var pick = _flatRest(function(object, paths) {
    return object == null ? {} : _basePick(object, paths);
  });

  var pick_1 = pick;

  /**
   * Checks if the given arguments are from an iteratee call.
   *
   * @private
   * @param {*} value The potential iteratee value argument.
   * @param {*} index The potential iteratee index or key argument.
   * @param {*} object The potential iteratee object argument.
   * @returns {boolean} Returns `true` if the arguments are from an iteratee call,
   *  else `false`.
   */
  function isIterateeCall(value, index, object) {
    if (!isObject_1(object)) {
      return false;
    }
    var type = typeof index;
    if (type == 'number'
          ? (isArrayLike_1(object) && _isIndex(index, object.length))
          : (type == 'string' && index in object)
        ) {
      return eq_1(object[index], value);
    }
    return false;
  }

  var _isIterateeCall = isIterateeCall;

  /**
   * Creates a function like `_.assign`.
   *
   * @private
   * @param {Function} assigner The function to assign values.
   * @returns {Function} Returns the new assigner function.
   */
  function createAssigner(assigner) {
    return _baseRest(function(object, sources) {
      var index = -1,
          length = sources.length,
          customizer = length > 1 ? sources[length - 1] : undefined,
          guard = length > 2 ? sources[2] : undefined;

      customizer = (assigner.length > 3 && typeof customizer == 'function')
        ? (length--, customizer)
        : undefined;

      if (guard && _isIterateeCall(sources[0], sources[1], guard)) {
        customizer = length < 3 ? undefined : customizer;
        length = 1;
      }
      object = Object(object);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object, source, index, customizer);
        }
      }
      return object;
    });
  }

  var _createAssigner = createAssigner;

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /** Used to check objects for own properties. */
  var hasOwnProperty$1 = objectProto.hasOwnProperty;

  /**
   * Assigns own enumerable string keyed properties of source objects to the
   * destination object. Source objects are applied from left to right.
   * Subsequent sources overwrite property assignments of previous sources.
   *
   * **Note:** This method mutates `object` and is loosely based on
   * [`Object.assign`](https://mdn.io/Object/assign).
   *
   * @static
   * @memberOf _
   * @since 0.10.0
   * @category Object
   * @param {Object} object The destination object.
   * @param {...Object} [sources] The source objects.
   * @returns {Object} Returns `object`.
   * @see _.assignIn
   * @example
   *
   * function Foo() {
   *   this.a = 1;
   * }
   *
   * function Bar() {
   *   this.c = 3;
   * }
   *
   * Foo.prototype.b = 2;
   * Bar.prototype.d = 4;
   *
   * _.assign({ 'a': 0 }, new Foo, new Bar);
   * // => { 'a': 1, 'c': 3 }
   */
  var assign = _createAssigner(function(object, source) {
    if (_isPrototype(source) || isArrayLike_1(source)) {
      _copyObject(source, keys_1(source), object);
      return;
    }
    for (var key in source) {
      if (hasOwnProperty$1.call(source, key)) {
        _assignValue(object, key, source[key]);
      }
    }
  });

  var assign_1 = assign;

  /**
   * Creates a `_.find` or `_.findLast` function.
   *
   * @private
   * @param {Function} findIndexFunc The function to find the collection index.
   * @returns {Function} Returns the new find function.
   */
  function createFind(findIndexFunc) {
    return function(collection, predicate, fromIndex) {
      var iterable = Object(collection);
      if (!isArrayLike_1(collection)) {
        var iteratee = _baseIteratee(predicate);
        collection = keys_1(collection);
        predicate = function(key) { return iteratee(iterable[key], key, iterable); };
      }
      var index = findIndexFunc(collection, predicate, fromIndex);
      return index > -1 ? iterable[iteratee ? collection[index] : index] : undefined;
    };
  }

  var _createFind = createFind;

  /** Used to match a single whitespace character. */
  var reWhitespace = /\s/;

  /**
   * Used by `_.trim` and `_.trimEnd` to get the index of the last non-whitespace
   * character of `string`.
   *
   * @private
   * @param {string} string The string to inspect.
   * @returns {number} Returns the index of the last non-whitespace character.
   */
  function trimmedEndIndex(string) {
    var index = string.length;

    while (index-- && reWhitespace.test(string.charAt(index))) {}
    return index;
  }

  var _trimmedEndIndex = trimmedEndIndex;

  /** Used to match leading whitespace. */
  var reTrimStart = /^\s+/;

  /**
   * The base implementation of `_.trim`.
   *
   * @private
   * @param {string} string The string to trim.
   * @returns {string} Returns the trimmed string.
   */
  function baseTrim(string) {
    return string
      ? string.slice(0, _trimmedEndIndex(string) + 1).replace(reTrimStart, '')
      : string;
  }

  var _baseTrim = baseTrim;

  /** Used as references for various `Number` constants. */
  var NAN = 0 / 0;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol_1(value)) {
      return NAN;
    }
    if (isObject_1(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject_1(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = _baseTrim(value);
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  var toNumber_1 = toNumber;

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0,
      MAX_INTEGER = 1.7976931348623157e+308;

  /**
   * Converts `value` to a finite number.
   *
   * @static
   * @memberOf _
   * @since 4.12.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted number.
   * @example
   *
   * _.toFinite(3.2);
   * // => 3.2
   *
   * _.toFinite(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toFinite(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toFinite('3.2');
   * // => 3.2
   */
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber_1(value);
    if (value === INFINITY || value === -INFINITY) {
      var sign = (value < 0 ? -1 : 1);
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }

  var toFinite_1 = toFinite;

  /**
   * Converts `value` to an integer.
   *
   * **Note:** This method is loosely based on
   * [`ToInteger`](http://www.ecma-international.org/ecma-262/7.0/#sec-tointeger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to convert.
   * @returns {number} Returns the converted integer.
   * @example
   *
   * _.toInteger(3.2);
   * // => 3
   *
   * _.toInteger(Number.MIN_VALUE);
   * // => 0
   *
   * _.toInteger(Infinity);
   * // => 1.7976931348623157e+308
   *
   * _.toInteger('3.2');
   * // => 3
   */
  function toInteger(value) {
    var result = toFinite_1(value),
        remainder = result % 1;

    return result === result ? (remainder ? result - remainder : result) : 0;
  }

  var toInteger_1 = toInteger;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max;

  /**
   * This method is like `_.find` except that it returns the index of the first
   * element `predicate` returns truthy for instead of the element itself.
   *
   * @static
   * @memberOf _
   * @since 1.1.0
   * @category Array
   * @param {Array} array The array to inspect.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {number} Returns the index of the found element, else `-1`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'active': false },
   *   { 'user': 'fred',    'active': false },
   *   { 'user': 'pebbles', 'active': true }
   * ];
   *
   * _.findIndex(users, function(o) { return o.user == 'barney'; });
   * // => 0
   *
   * // The `_.matches` iteratee shorthand.
   * _.findIndex(users, { 'user': 'fred', 'active': false });
   * // => 1
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.findIndex(users, ['active', false]);
   * // => 0
   *
   * // The `_.property` iteratee shorthand.
   * _.findIndex(users, 'active');
   * // => 2
   */
  function findIndex(array, predicate, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = fromIndex == null ? 0 : toInteger_1(fromIndex);
    if (index < 0) {
      index = nativeMax(length + index, 0);
    }
    return _baseFindIndex(array, _baseIteratee(predicate), index);
  }

  var findIndex_1 = findIndex;

  /**
   * Iterates over elements of `collection`, returning the first element
   * `predicate` returns truthy for. The predicate is invoked with three
   * arguments: (value, index|key, collection).
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Collection
   * @param {Array|Object} collection The collection to inspect.
   * @param {Function} [predicate=_.identity] The function invoked per iteration.
   * @param {number} [fromIndex=0] The index to search from.
   * @returns {*} Returns the matched element, else `undefined`.
   * @example
   *
   * var users = [
   *   { 'user': 'barney',  'age': 36, 'active': true },
   *   { 'user': 'fred',    'age': 40, 'active': false },
   *   { 'user': 'pebbles', 'age': 1,  'active': true }
   * ];
   *
   * _.find(users, function(o) { return o.age < 40; });
   * // => object for 'barney'
   *
   * // The `_.matches` iteratee shorthand.
   * _.find(users, { 'age': 1, 'active': true });
   * // => object for 'pebbles'
   *
   * // The `_.matchesProperty` iteratee shorthand.
   * _.find(users, ['active', false]);
   * // => object for 'fred'
   *
   * // The `_.property` iteratee shorthand.
   * _.find(users, 'active');
   * // => object for 'barney'
   */
  var find = _createFind(findIndex_1);

  var find_1 = find;

  /**
   * Checks if `value` is an integer.
   *
   * **Note:** This method is based on
   * [`Number.isInteger`](https://mdn.io/Number/isInteger).
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an integer, else `false`.
   * @example
   *
   * _.isInteger(3);
   * // => true
   *
   * _.isInteger(Number.MIN_VALUE);
   * // => false
   *
   * _.isInteger(Infinity);
   * // => false
   *
   * _.isInteger('3');
   * // => false
   */
  function isInteger(value) {
    return typeof value == 'number' && value == toInteger_1(value);
  }

  var isInteger_1 = isInteger;

  if (typeof commonjsGlobal$1 !== "undefined" && typeof commonjsGlobal$1.self === 'undefined') {
    commonjsGlobal$1.self = {};
    commonjsGlobal$1.__pretenderNodePolyfill = true;
  }

  var createObject = Object.create;
  function createMap() {
      var map = createObject(null);
      map["__"] = undefined;
      delete map["__"];
      return map;
  }

  var Target = function Target(path, matcher, delegate) {
      this.path = path;
      this.matcher = matcher;
      this.delegate = delegate;
  };
  Target.prototype.to = function to (target, callback) {
      var delegate = this.delegate;
      if (delegate && delegate.willAddRoute) {
          target = delegate.willAddRoute(this.matcher.target, target);
      }
      this.matcher.add(this.path, target);
      if (callback) {
          if (callback.length === 0) {
              throw new Error("You must have an argument in the function passed to `to`");
          }
          this.matcher.addChild(this.path, target, callback, this.delegate);
      }
  };
  var Matcher = function Matcher(target) {
      this.routes = createMap();
      this.children = createMap();
      this.target = target;
  };
  Matcher.prototype.add = function add (path, target) {
      this.routes[path] = target;
  };
  Matcher.prototype.addChild = function addChild (path, target, callback, delegate) {
      var matcher = new Matcher(target);
      this.children[path] = matcher;
      var match = generateMatch(path, matcher, delegate);
      if (delegate && delegate.contextEntered) {
          delegate.contextEntered(target, match);
      }
      callback(match);
  };
  function generateMatch(startingPath, matcher, delegate) {
      function match(path, callback) {
          var fullPath = startingPath + path;
          if (callback) {
              callback(generateMatch(fullPath, matcher, delegate));
          }
          else {
              return new Target(fullPath, matcher, delegate);
          }
      }
      
      return match;
  }
  function addRoute(routeArray, path, handler) {
      var len = 0;
      for (var i = 0; i < routeArray.length; i++) {
          len += routeArray[i].path.length;
      }
      path = path.substr(len);
      var route = { path: path, handler: handler };
      routeArray.push(route);
  }
  function eachRoute(baseRoute, matcher, callback, binding) {
      var routes = matcher.routes;
      var paths = Object.keys(routes);
      for (var i = 0; i < paths.length; i++) {
          var path = paths[i];
          var routeArray = baseRoute.slice();
          addRoute(routeArray, path, routes[path]);
          var nested = matcher.children[path];
          if (nested) {
              eachRoute(routeArray, nested, callback, binding);
          }
          else {
              callback.call(binding, routeArray);
          }
      }
  }
  var map = function (callback, addRouteCallback) {
      var matcher = new Matcher();
      callback(generateMatch("", matcher, this.delegate));
      eachRoute([], matcher, function (routes) {
          if (addRouteCallback) {
              addRouteCallback(this, routes);
          }
          else {
              this.add(routes);
          }
      }, this);
  };

  // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
  // values that are not reserved (i.e., unicode characters, emoji, etc). The reserved
  // chars are "/" and "%".
  // Safe to call multiple times on the same path.
  // Normalizes percent-encoded values in `path` to upper-case and decodes percent-encoded
  function normalizePath(path) {
      return path.split("/")
          .map(normalizeSegment)
          .join("/");
  }
  // We want to ensure the characters "%" and "/" remain in percent-encoded
  // form when normalizing paths, so replace them with their encoded form after
  // decoding the rest of the path
  var SEGMENT_RESERVED_CHARS = /%|\//g;
  function normalizeSegment(segment) {
      if (segment.length < 3 || segment.indexOf("%") === -1)
          { return segment; }
      return decodeURIComponent(segment).replace(SEGMENT_RESERVED_CHARS, encodeURIComponent);
  }
  // We do not want to encode these characters when generating dynamic path segments
  // See https://tools.ietf.org/html/rfc3986#section-3.3
  // sub-delims: "!", "$", "&", "'", "(", ")", "*", "+", ",", ";", "="
  // others allowed by RFC 3986: ":", "@"
  //
  // First encode the entire path segment, then decode any of the encoded special chars.
  //
  // The chars "!", "'", "(", ")", "*" do not get changed by `encodeURIComponent`,
  // so the possible encoded chars are:
  // ['%24', '%26', '%2B', '%2C', '%3B', '%3D', '%3A', '%40'].
  var PATH_SEGMENT_ENCODINGS = /%(?:2(?:4|6|B|C)|3(?:B|D|A)|40)/g;
  function encodePathSegment(str) {
      return encodeURIComponent(str).replace(PATH_SEGMENT_ENCODINGS, decodeURIComponent);
  }

  var escapeRegex = /(\/|\.|\*|\+|\?|\||\(|\)|\[|\]|\{|\}|\\)/g;
  var isArray$1 = Array.isArray;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function getParam(params, key) {
      if (typeof params !== "object" || params === null) {
          throw new Error("You must pass an object as the second argument to `generate`.");
      }
      if (!hasOwnProperty.call(params, key)) {
          throw new Error("You must provide param `" + key + "` to `generate`.");
      }
      var value = params[key];
      var str = typeof value === "string" ? value : "" + value;
      if (str.length === 0) {
          throw new Error("You must provide a param `" + key + "`.");
      }
      return str;
  }
  var eachChar = [];
  eachChar[0 /* Static */] = function (segment, currentState) {
      var state = currentState;
      var value = segment.value;
      for (var i = 0; i < value.length; i++) {
          var ch = value.charCodeAt(i);
          state = state.put(ch, false, false);
      }
      return state;
  };
  eachChar[1 /* Dynamic */] = function (_, currentState) {
      return currentState.put(47 /* SLASH */, true, true);
  };
  eachChar[2 /* Star */] = function (_, currentState) {
      return currentState.put(-1 /* ANY */, false, true);
  };
  eachChar[4 /* Epsilon */] = function (_, currentState) {
      return currentState;
  };
  var regex = [];
  regex[0 /* Static */] = function (segment) {
      return segment.value.replace(escapeRegex, "\\$1");
  };
  regex[1 /* Dynamic */] = function () {
      return "([^/]+)";
  };
  regex[2 /* Star */] = function () {
      return "(.+)";
  };
  regex[4 /* Epsilon */] = function () {
      return "";
  };
  var generate = [];
  generate[0 /* Static */] = function (segment) {
      return segment.value;
  };
  generate[1 /* Dynamic */] = function (segment, params) {
      var value = getParam(params, segment.value);
      if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
          return encodePathSegment(value);
      }
      else {
          return value;
      }
  };
  generate[2 /* Star */] = function (segment, params) {
      return getParam(params, segment.value);
  };
  generate[4 /* Epsilon */] = function () {
      return "";
  };
  var EmptyObject = Object.freeze({});
  var EmptyArray = Object.freeze([]);
  // The `names` will be populated with the paramter name for each dynamic/star
  // segment. `shouldDecodes` will be populated with a boolean for each dyanamic/star
  // segment, indicating whether it should be decoded during recognition.
  function parse$1(segments, route, types) {
      // normalize route as not starting with a "/". Recognition will
      // also normalize.
      if (route.length > 0 && route.charCodeAt(0) === 47 /* SLASH */) {
          route = route.substr(1);
      }
      var parts = route.split("/");
      var names = undefined;
      var shouldDecodes = undefined;
      for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          var flags = 0;
          var type = 0;
          if (part === "") {
              type = 4 /* Epsilon */;
          }
          else if (part.charCodeAt(0) === 58 /* COLON */) {
              type = 1 /* Dynamic */;
          }
          else if (part.charCodeAt(0) === 42 /* STAR */) {
              type = 2 /* Star */;
          }
          else {
              type = 0 /* Static */;
          }
          flags = 2 << type;
          if (flags & 12 /* Named */) {
              part = part.slice(1);
              names = names || [];
              names.push(part);
              shouldDecodes = shouldDecodes || [];
              shouldDecodes.push((flags & 4 /* Decoded */) !== 0);
          }
          if (flags & 14 /* Counted */) {
              types[type]++;
          }
          segments.push({
              type: type,
              value: normalizeSegment(part)
          });
      }
      return {
          names: names || EmptyArray,
          shouldDecodes: shouldDecodes || EmptyArray,
      };
  }
  function isEqualCharSpec(spec, char, negate) {
      return spec.char === char && spec.negate === negate;
  }
  // A State has a character specification and (`charSpec`) and a list of possible
  // subsequent states (`nextStates`).
  //
  // If a State is an accepting state, it will also have several additional
  // properties:
  //
  // * `regex`: A regular expression that is used to extract parameters from paths
  //   that reached this accepting state.
  // * `handlers`: Information on how to convert the list of captures into calls
  //   to registered handlers with the specified parameters
  // * `types`: How many static, dynamic or star segments in this route. Used to
  //   decide which route to use if multiple registered routes match a path.
  //
  // Currently, State is implemented naively by looping over `nextStates` and
  // comparing a character specification against a character. A more efficient
  // implementation would use a hash of keys pointing at one or more next states.
  var State = function State(states, id, char, negate, repeat) {
      this.states = states;
      this.id = id;
      this.char = char;
      this.negate = negate;
      this.nextStates = repeat ? id : null;
      this.pattern = "";
      this._regex = undefined;
      this.handlers = undefined;
      this.types = undefined;
  };
  State.prototype.regex = function regex$1 () {
      if (!this._regex) {
          this._regex = new RegExp(this.pattern);
      }
      return this._regex;
  };
  State.prototype.get = function get (char, negate) {
          var this$1$1 = this;

      var nextStates = this.nextStates;
      if (nextStates === null)
          { return; }
      if (isArray$1(nextStates)) {
          for (var i = 0; i < nextStates.length; i++) {
              var child = this$1$1.states[nextStates[i]];
              if (isEqualCharSpec(child, char, negate)) {
                  return child;
              }
          }
      }
      else {
          var child$1 = this.states[nextStates];
          if (isEqualCharSpec(child$1, char, negate)) {
              return child$1;
          }
      }
  };
  State.prototype.put = function put (char, negate, repeat) {
      var state;
      // If the character specification already exists in a child of the current
      // state, just return that state.
      if (state = this.get(char, negate)) {
          return state;
      }
      // Make a new state for the character spec
      var states = this.states;
      state = new State(states, states.length, char, negate, repeat);
      states[states.length] = state;
      // Insert the new state as a child of the current state
      if (this.nextStates == null) {
          this.nextStates = state.id;
      }
      else if (isArray$1(this.nextStates)) {
          this.nextStates.push(state.id);
      }
      else {
          this.nextStates = [this.nextStates, state.id];
      }
      // Return the new state
      return state;
  };
  // Find a list of child states matching the next character
  State.prototype.match = function match (ch) {
          var this$1$1 = this;

      var nextStates = this.nextStates;
      if (!nextStates)
          { return []; }
      var returned = [];
      if (isArray$1(nextStates)) {
          for (var i = 0; i < nextStates.length; i++) {
              var child = this$1$1.states[nextStates[i]];
              if (isMatch(child, ch)) {
                  returned.push(child);
              }
          }
      }
      else {
          var child$1 = this.states[nextStates];
          if (isMatch(child$1, ch)) {
              returned.push(child$1);
          }
      }
      return returned;
  };
  function isMatch(spec, char) {
      return spec.negate ? spec.char !== char && spec.char !== -1 /* ANY */ : spec.char === char || spec.char === -1 /* ANY */;
  }
  // This is a somewhat naive strategy, but should work in a lot of cases
  // A better strategy would properly resolve /posts/:id/new and /posts/edit/:id.
  //
  // This strategy generally prefers more static and less dynamic matching.
  // Specifically, it
  //
  //  * prefers fewer stars to more, then
  //  * prefers using stars for less of the match to more, then
  //  * prefers fewer dynamic segments to more, then
  //  * prefers more static segments to more
  function sortSolutions(states) {
      return states.sort(function (a, b) {
          var ref = a.types || [0, 0, 0];
          var astatics = ref[0];
          var adynamics = ref[1];
          var astars = ref[2];
          var ref$1 = b.types || [0, 0, 0];
          var bstatics = ref$1[0];
          var bdynamics = ref$1[1];
          var bstars = ref$1[2];
          if (astars !== bstars) {
              return astars - bstars;
          }
          if (astars) {
              if (astatics !== bstatics) {
                  return bstatics - astatics;
              }
              if (adynamics !== bdynamics) {
                  return bdynamics - adynamics;
              }
          }
          if (adynamics !== bdynamics) {
              return adynamics - bdynamics;
          }
          if (astatics !== bstatics) {
              return bstatics - astatics;
          }
          return 0;
      });
  }
  function recognizeChar(states, ch) {
      var nextStates = [];
      for (var i = 0, l = states.length; i < l; i++) {
          var state = states[i];
          nextStates = nextStates.concat(state.match(ch));
      }
      return nextStates;
  }
  var RecognizeResults = function RecognizeResults(queryParams) {
      this.length = 0;
      this.queryParams = queryParams || {};
  };

  RecognizeResults.prototype.splice = Array.prototype.splice;
  RecognizeResults.prototype.slice = Array.prototype.slice;
  RecognizeResults.prototype.push = Array.prototype.push;
  function findHandler(state, originalPath, queryParams) {
      var handlers = state.handlers;
      var regex = state.regex();
      if (!regex || !handlers)
          { throw new Error("state not initialized"); }
      var captures = originalPath.match(regex);
      var currentCapture = 1;
      var result = new RecognizeResults(queryParams);
      result.length = handlers.length;
      for (var i = 0; i < handlers.length; i++) {
          var handler = handlers[i];
          var names = handler.names;
          var shouldDecodes = handler.shouldDecodes;
          var params = EmptyObject;
          var isDynamic = false;
          if (names !== EmptyArray && shouldDecodes !== EmptyArray) {
              for (var j = 0; j < names.length; j++) {
                  isDynamic = true;
                  var name = names[j];
                  var capture = captures && captures[currentCapture++];
                  if (params === EmptyObject) {
                      params = {};
                  }
                  if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS && shouldDecodes[j]) {
                      params[name] = capture && decodeURIComponent(capture);
                  }
                  else {
                      params[name] = capture;
                  }
              }
          }
          result[i] = {
              handler: handler.handler,
              params: params,
              isDynamic: isDynamic
          };
      }
      return result;
  }
  function decodeQueryParamPart(part) {
      // http://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.1
      part = part.replace(/\+/gm, "%20");
      var result;
      try {
          result = decodeURIComponent(part);
      }
      catch (error) {
          result = "";
      }
      return result;
  }
  var RouteRecognizer = function RouteRecognizer() {
      this.names = createMap();
      var states = [];
      var state = new State(states, 0, -1 /* ANY */, true, false);
      states[0] = state;
      this.states = states;
      this.rootState = state;
  };
  RouteRecognizer.prototype.add = function add (routes, options) {
      var currentState = this.rootState;
      var pattern = "^";
      var types = [0, 0, 0];
      var handlers = new Array(routes.length);
      var allSegments = [];
      var isEmpty = true;
      var j = 0;
      for (var i = 0; i < routes.length; i++) {
          var route = routes[i];
          var ref = parse$1(allSegments, route.path, types);
              var names = ref.names;
              var shouldDecodes = ref.shouldDecodes;
          // preserve j so it points to the start of newly added segments
          for (; j < allSegments.length; j++) {
              var segment = allSegments[j];
              if (segment.type === 4 /* Epsilon */) {
                  continue;
              }
              isEmpty = false;
              // Add a "/" for the new segment
              currentState = currentState.put(47 /* SLASH */, false, false);
              pattern += "/";
              // Add a representation of the segment to the NFA and regex
              currentState = eachChar[segment.type](segment, currentState);
              pattern += regex[segment.type](segment);
          }
          handlers[i] = {
              handler: route.handler,
              names: names,
              shouldDecodes: shouldDecodes
          };
      }
      if (isEmpty) {
          currentState = currentState.put(47 /* SLASH */, false, false);
          pattern += "/";
      }
      currentState.handlers = handlers;
      currentState.pattern = pattern + "$";
      currentState.types = types;
      var name;
      if (typeof options === "object" && options !== null && options.as) {
          name = options.as;
      }
      if (name) {
          // if (this.names[name]) {
          //   throw new Error("You may not add a duplicate route named `" + name + "`.");
          // }
          this.names[name] = {
              segments: allSegments,
              handlers: handlers
          };
      }
  };
  RouteRecognizer.prototype.handlersFor = function handlersFor (name) {
      var route = this.names[name];
      if (!route) {
          throw new Error("There is no route named " + name);
      }
      var result = new Array(route.handlers.length);
      for (var i = 0; i < route.handlers.length; i++) {
          var handler = route.handlers[i];
          result[i] = handler;
      }
      return result;
  };
  RouteRecognizer.prototype.hasRoute = function hasRoute (name) {
      return !!this.names[name];
  };
  RouteRecognizer.prototype.generate = function generate$1 (name, params) {
      var route = this.names[name];
      var output = "";
      if (!route) {
          throw new Error("There is no route named " + name);
      }
      var segments = route.segments;
      for (var i = 0; i < segments.length; i++) {
          var segment = segments[i];
          if (segment.type === 4 /* Epsilon */) {
              continue;
          }
          output += "/";
          output += generate[segment.type](segment, params);
      }
      if (output.charAt(0) !== "/") {
          output = "/" + output;
      }
      if (params && params.queryParams) {
          output += this.generateQueryString(params.queryParams);
      }
      return output;
  };
  RouteRecognizer.prototype.generateQueryString = function generateQueryString (params) {
      var pairs = [];
      var keys = Object.keys(params);
      keys.sort();
      for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          var value = params[key];
          if (value == null) {
              continue;
          }
          var pair = encodeURIComponent(key);
          if (isArray$1(value)) {
              for (var j = 0; j < value.length; j++) {
                  var arrayPair = key + "[]" + "=" + encodeURIComponent(value[j]);
                  pairs.push(arrayPair);
              }
          }
          else {
              pair += "=" + encodeURIComponent(value);
              pairs.push(pair);
          }
      }
      if (pairs.length === 0) {
          return "";
      }
      return "?" + pairs.join("&");
  };
  RouteRecognizer.prototype.parseQueryString = function parseQueryString (queryString) {
      var pairs = queryString.split("&");
      var queryParams = {};
      for (var i = 0; i < pairs.length; i++) {
          var pair = pairs[i].split("="), key = decodeQueryParamPart(pair[0]), keyLength = key.length, isArray = false, value = (void 0);
          if (pair.length === 1) {
              value = "true";
          }
          else {
              // Handle arrays
              if (keyLength > 2 && key.slice(keyLength - 2) === "[]") {
                  isArray = true;
                  key = key.slice(0, keyLength - 2);
                  if (!queryParams[key]) {
                      queryParams[key] = [];
                  }
              }
              value = pair[1] ? decodeQueryParamPart(pair[1]) : "";
          }
          if (isArray) {
              queryParams[key].push(value);
          }
          else {
              queryParams[key] = value;
          }
      }
      return queryParams;
  };
  RouteRecognizer.prototype.recognize = function recognize (path) {
      var results;
      var states = [this.rootState];
      var queryParams = {};
      var isSlashDropped = false;
      var hashStart = path.indexOf("#");
      if (hashStart !== -1) {
          path = path.substr(0, hashStart);
      }
      var queryStart = path.indexOf("?");
      if (queryStart !== -1) {
          var queryString = path.substr(queryStart + 1, path.length);
          path = path.substr(0, queryStart);
          queryParams = this.parseQueryString(queryString);
      }
      if (path.charAt(0) !== "/") {
          path = "/" + path;
      }
      var originalPath = path;
      if (RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS) {
          path = normalizePath(path);
      }
      else {
          path = decodeURI(path);
          originalPath = decodeURI(originalPath);
      }
      var pathLen = path.length;
      if (pathLen > 1 && path.charAt(pathLen - 1) === "/") {
          path = path.substr(0, pathLen - 1);
          originalPath = originalPath.substr(0, originalPath.length - 1);
          isSlashDropped = true;
      }
      for (var i = 0; i < path.length; i++) {
          states = recognizeChar(states, path.charCodeAt(i));
          if (!states.length) {
              break;
          }
      }
      var solutions = [];
      for (var i$1 = 0; i$1 < states.length; i$1++) {
          if (states[i$1].handlers) {
              solutions.push(states[i$1]);
          }
      }
      states = sortSolutions(solutions);
      var state = solutions[0];
      if (state && state.handlers) {
          // if a trailing slash was dropped and a star segment is the last segment
          // specified, put the trailing slash back
          if (isSlashDropped && state.pattern && state.pattern.slice(-5) === "(.+)$") {
              originalPath = originalPath + "/";
          }
          results = findHandler(state, originalPath, queryParams);
      }
      return results;
  };
  RouteRecognizer.VERSION = "0.3.4";
  // Set to false to opt-out of encoding and decoding path segments.
  // See https://github.com/tildeio/route-recognizer/pull/55
  RouteRecognizer.ENCODE_AND_DECODE_PATH_SEGMENTS = true;
  RouteRecognizer.Normalizer = {
      normalizeSegment: normalizeSegment, normalizePath: normalizePath, encodePathSegment: encodePathSegment
  };
  RouteRecognizer.prototype.map = map;

  /**
   * Minimal Event interface implementation
   *
   * Original implementation by Sven Fuchs: https://gist.github.com/995028
   * Modifications and tests by Christian Johansen.
   *
   * @author Sven Fuchs (svenfuchs@artweb-design.de)
   * @author Christian Johansen (christian@cjohansen.no)
   * @license BSD
   *
   * Copyright (c) 2011 Sven Fuchs, Christian Johansen
   */

  var _Event = function Event(type, bubbles, cancelable, target) {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.target = target;
  };

  _Event.prototype = {
    stopPropagation: function () {},
    preventDefault: function () {
      this.defaultPrevented = true;
    }
  };

  /*
    Used to set the statusText property of an xhr object
  */
  var httpStatusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };


  /*
    Cross-browser XML parsing. Used to turn
    XML responses into Document objects
    Borrowed from JSpec
  */
  function parseXML(text) {
    var xmlDoc;

    if (typeof DOMParser != "undefined") {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(text, "text/xml");
    } else {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(text);
    }

    return xmlDoc;
  }

  /*
    Without mocking, the native XMLHttpRequest object will throw
    an error when attempting to set these headers. We match this behavior.
  */
  var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
  };

  /*
    Adds an "event" onto the fake xhr object
    that just calls the same-named method. This is
    in case a library adds callbacks for these events.
  */
  function _addEventListener(eventName, xhr){
    xhr.addEventListener(eventName, function (event) {
      var listener = xhr["on" + eventName];

      if (listener && typeof listener == "function") {
        listener.call(event.target, event);
      }
    });
  }

  function EventedObject() {
    this._eventListeners = {};
    var events = ["loadstart", "progress", "load", "abort", "loadend"];
    for (var i = events.length - 1; i >= 0; i--) {
      _addEventListener(events[i], this);
    }
  }
  EventedObject.prototype = {
    /*
      Duplicates the behavior of native XMLHttpRequest's addEventListener function
    */
    addEventListener: function addEventListener(event, listener) {
      this._eventListeners[event] = this._eventListeners[event] || [];
      this._eventListeners[event].push(listener);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's removeEventListener function
    */
    removeEventListener: function removeEventListener(event, listener) {
      var listeners = this._eventListeners[event] || [];

      for (var i = 0, l = listeners.length; i < l; ++i) {
        if (listeners[i] == listener) {
          return listeners.splice(i, 1);
        }
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
    */
    dispatchEvent: function dispatchEvent(event) {
      var type = event.type;
      var listeners = this._eventListeners[type] || [];

      for (var i = 0; i < listeners.length; i++) {
        if (typeof listeners[i] == "function") {
          listeners[i].call(this, event);
        } else {
          listeners[i].handleEvent(event);
        }
      }

      return !!event.defaultPrevented;
    },

    /*
      Triggers an `onprogress` event with the given parameters.
    */
    _progress: function _progress(lengthComputable, loaded, total) {
      var event = new _Event('progress');
      event.target = this;
      event.lengthComputable = lengthComputable;
      event.loaded = loaded;
      event.total = total;
      this.dispatchEvent(event);
    }
  };

  /*
    Constructor for a fake window.XMLHttpRequest
  */
  function FakeXMLHttpRequest() {
    EventedObject.call(this);
    this.readyState = FakeXMLHttpRequest.UNSENT;
    this.requestHeaders = {};
    this.requestBody = null;
    this.status = 0;
    this.statusText = "";
    this.upload = new EventedObject();
    this.onabort= null;
    this.onerror= null;
    this.onload= null;
    this.onloadend= null;
    this.onloadstart= null;
    this.onprogress= null;
    this.onreadystatechange= null;
    this.ontimeout= null;
  }

  FakeXMLHttpRequest.prototype = new EventedObject();

  // These status codes are available on the native XMLHttpRequest
  // object, so we match that here in case a library is relying on them.
  FakeXMLHttpRequest.UNSENT = 0;
  FakeXMLHttpRequest.OPENED = 1;
  FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
  FakeXMLHttpRequest.LOADING = 3;
  FakeXMLHttpRequest.DONE = 4;

  var FakeXMLHttpRequestProto = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    async: true,
    withCredentials: false,

    /*
      Duplicates the behavior of native XMLHttpRequest's open function
    */
    open: function open(method, url, async, username, password) {
      this.method = method;
      this.url = url;
      this.async = typeof async == "boolean" ? async : true;
      this.username = username;
      this.password = password;
      this.responseText = null;
      this.response = this.responseText;
      this.responseXML = null;
      this.responseURL = url;
      this.requestHeaders = {};
      this.sendFlag = false;
      this._readyStateChange(FakeXMLHttpRequest.OPENED);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
    */
    setRequestHeader: function setRequestHeader(header, value) {
      verifyState(this);

      if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
        throw new Error("Refused to set unsafe header \"" + header + "\"");
      }

      if (this.requestHeaders[header]) {
        this.requestHeaders[header] += "," + value;
      } else {
        this.requestHeaders[header] = value;
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's send function
    */
    send: function send(data) {
      verifyState(this);

      if (!/^(get|head)$/i.test(this.method)) {
        var hasContentTypeHeader = false;

        Object.keys(this.requestHeaders).forEach(function (key) {
          if (key.toLowerCase() === 'content-type') {
            hasContentTypeHeader = true;
          }
        });

        if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
          this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
        }

        this.requestBody = data;
      }

      this.errorFlag = false;
      this.sendFlag = this.async;
      this._readyStateChange(FakeXMLHttpRequest.OPENED);

      if (typeof this.onSend == "function") {
        this.onSend(this);
      }

      this.dispatchEvent(new _Event("loadstart", false, false, this));
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's abort function
    */
    abort: function abort() {
      this.aborted = true;
      this.responseText = null;
      this.response = this.responseText;
      this.errorFlag = true;
      this.requestHeaders = {};

      this.dispatchEvent(new _Event("abort", false, false, this));

      if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
        this._readyStateChange(FakeXMLHttpRequest.UNSENT);
        this.sendFlag = false;
      }

      if (typeof this.onerror === "function") {
        this.onerror();
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
    */
    getResponseHeader: function getResponseHeader(header) {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return null;
      }

      if (/^Set-Cookie2?$/i.test(header)) {
        return null;
      }

      header = header.toLowerCase();

      for (var h in this.responseHeaders) {
        if (h.toLowerCase() == header) {
          return this.responseHeaders[h];
        }
      }

      return null;
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
    */
    getAllResponseHeaders: function getAllResponseHeaders() {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return "";
      }

      var headers = "";

      for (var header in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
          headers += header + ": " + this.responseHeaders[header] + "\r\n";
        }
      }

      return headers;
    },

    /*
     Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
     */
    overrideMimeType: function overrideMimeType(mimeType) {
      if (typeof mimeType === "string") {
        this.forceMimeType = mimeType.toLowerCase();
      }
    },


    /*
      Places a FakeXMLHttpRequest object into the passed
      state.
    */
    _readyStateChange: function _readyStateChange(state) {
      this.readyState = state;

      if (typeof this.onreadystatechange == "function") {
        this.onreadystatechange(new _Event("readystatechange"));
      }

      this.dispatchEvent(new _Event("readystatechange"));

      if (this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("load", false, false, this));
      }
      if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("loadend", false, false, this));
      }
    },


    /*
      Sets the FakeXMLHttpRequest object's response headers and
      places the object into readyState 2
    */
    _setResponseHeaders: function _setResponseHeaders(headers) {
      this.responseHeaders = {};

      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
            this.responseHeaders[header] = headers[header];
        }
      }

      if (this.forceMimeType) {
        this.responseHeaders['Content-Type'] = this.forceMimeType;
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
      } else {
        this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
      }
    },

    /*
      Sets the FakeXMLHttpRequest object's response body and
      if body text is XML, sets responseXML to parsed document
      object
    */
    _setResponseBody: function _setResponseBody(body) {
      verifyRequestSent(this);
      verifyHeadersReceived(this);
      verifyResponseBodyType(body);

      var chunkSize = this.chunkSize || 10;
      var index = 0;
      this.responseText = "";
      this.response = this.responseText;

      do {
        if (this.async) {
          this._readyStateChange(FakeXMLHttpRequest.LOADING);
        }

        this.responseText += body.substring(index, index + chunkSize);
        this.response = this.responseText;
        index += chunkSize;
      } while (index < body.length);

      var type = this.getResponseHeader("Content-Type");

      if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
        try {
          this.responseXML = parseXML(this.responseText);
        } catch (e) {
          // Unable to parse XML - no biggie
        }
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.DONE);
      } else {
        this.readyState = FakeXMLHttpRequest.DONE;
      }
    },

    /*
      Forces a response on to the FakeXMLHttpRequest object.

      This is the public API for faking responses. This function
      takes a number status, headers object, and string body:

      ```
      xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")

      ```
    */
    respond: function respond(status, headers, body) {
      this._setResponseHeaders(headers || {});
      this.status = typeof status == "number" ? status : 200;
      this.statusText = httpStatusCodes[this.status];
      this._setResponseBody(body || "");
    }
  };

  for (var property in FakeXMLHttpRequestProto) {
    FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
  }

  function verifyState(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }

    if (xhr.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }
  }


  function verifyRequestSent(xhr) {
      if (xhr.readyState == FakeXMLHttpRequest.DONE) {
          throw new Error("Request done");
      }
  }

  function verifyHeadersReceived(xhr) {
      if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
          throw new Error("No headers received");
      }
  }

  function verifyResponseBodyType(body) {
      if (typeof body != "string") {
          var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                               body + ", which is not a string.");
          error.name = "InvalidBodyException";
          throw error;
      }
  }

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  /**
   * Check if we're required to add a port number.
   *
   * @see https://url.spec.whatwg.org/#default-port
   * @param {Number|String} port Port number we need to check
   * @param {String} protocol Protocol we need to check against.
   * @returns {Boolean} Is it a default port for the given protocol
   * @api private
   */
  var requiresPort = function required(port, protocol) {
    protocol = protocol.split(':')[0];
    port = +port;

    if (!port) return false;

    switch (protocol) {
      case 'http':
      case 'ws':
      return port !== 80;

      case 'https':
      case 'wss':
      return port !== 443;

      case 'ftp':
      return port !== 21;

      case 'gopher':
      return port !== 70;

      case 'file':
      return false;
    }

    return port !== 0;
  };

  var has = Object.prototype.hasOwnProperty
    , undef;

  /**
   * Decode a URI encoded string.
   *
   * @param {String} input The URI encoded string.
   * @returns {String|Null} The decoded string.
   * @api private
   */
  function decode(input) {
    try {
      return decodeURIComponent(input.replace(/\+/g, ' '));
    } catch (e) {
      return null;
    }
  }

  /**
   * Simple query string parser.
   *
   * @param {String} query The query string that needs to be parsed.
   * @returns {Object}
   * @api public
   */
  function querystring(query) {
    var parser = /([^=?&]+)=?([^&]*)/g
      , result = {}
      , part;

    while (part = parser.exec(query)) {
      var key = decode(part[1])
        , value = decode(part[2]);

      //
      // Prevent overriding of existing properties. This ensures that build-in
      // methods like `toString` or __proto__ are not overriden by malicious
      // querystrings.
      //
      // In the case if failed decoding, we want to omit the key/value pairs
      // from the result.
      //
      if (key === null || value === null || key in result) continue;
      result[key] = value;
    }

    return result;
  }

  /**
   * Transform a query string to an object.
   *
   * @param {Object} obj Object that should be transformed.
   * @param {String} prefix Optional prefix.
   * @returns {String}
   * @api public
   */
  function querystringify(obj, prefix) {
    prefix = prefix || '';

    var pairs = []
      , value
      , key;

    //
    // Optionally prefix with a '?' if needed
    //
    if ('string' !== typeof prefix) prefix = '?';

    for (key in obj) {
      if (has.call(obj, key)) {
        value = obj[key];

        //
        // Edge cases where we actually want to encode the value to an empty
        // string instead of the stringified value.
        //
        if (!value && (value === null || value === undef || isNaN(value))) {
          value = '';
        }

        key = encodeURIComponent(key);
        value = encodeURIComponent(value);

        //
        // If we failed to encode the strings, we should bail out as we don't
        // want to add invalid strings to the query.
        //
        if (key === null || value === null) continue;
        pairs.push(key +'='+ value);
      }
    }

    return pairs.length ? prefix + pairs.join('&') : '';
  }

  //
  // Expose the module.
  //
  var stringify = querystringify;
  var parse = querystring;

  var querystringify_1 = {
  	stringify: stringify,
  	parse: parse
  };

  var slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//
    , protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\\/]+)?([\S\s]*)/i
    , windowsDriveLetter = /^[a-zA-Z]:/
    , whitespace = '[\\x09\\x0A\\x0B\\x0C\\x0D\\x20\\xA0\\u1680\\u180E\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200A\\u202F\\u205F\\u3000\\u2028\\u2029\\uFEFF]'
    , left = new RegExp('^'+ whitespace +'+');

  /**
   * Trim a given string.
   *
   * @param {String} str String to trim.
   * @public
   */
  function trimLeft(str) {
    return (str ? str : '').toString().replace(left, '');
  }

  /**
   * These are the parse rules for the URL parser, it informs the parser
   * about:
   *
   * 0. The char it Needs to parse, if it's a string it should be done using
   *    indexOf, RegExp using exec and NaN means set as current value.
   * 1. The property we should set when parsing this value.
   * 2. Indication if it's backwards or forward parsing, when set as number it's
   *    the value of extra chars that should be split off.
   * 3. Inherit from location if non existing in the parser.
   * 4. `toLowerCase` the resulting value.
   */
  var rules = [
    ['#', 'hash'],                        // Extract from the back.
    ['?', 'query'],                       // Extract from the back.
    function sanitize(address, url) {     // Sanitize what is left of the address
      return isSpecial(url.protocol) ? address.replace(/\\/g, '/') : address;
    },
    ['/', 'pathname'],                    // Extract from the back.
    ['@', 'auth', 1],                     // Extract from the front.
    [NaN, 'host', undefined, 1, 1],       // Set left over value.
    [/:(\d+)$/, 'port', undefined, 1],    // RegExp the back.
    [NaN, 'hostname', undefined, 1, 1]    // Set left over.
  ];

  /**
   * These properties should not be copied or inherited from. This is only needed
   * for all non blob URL's as a blob URL does not include a hash, only the
   * origin.
   *
   * @type {Object}
   * @private
   */
  var ignore = { hash: 1, query: 1 };

  /**
   * The location object differs when your code is loaded through a normal page,
   * Worker or through a worker using a blob. And with the blobble begins the
   * trouble as the location object will contain the URL of the blob, not the
   * location of the page where our code is loaded in. The actual origin is
   * encoded in the `pathname` so we can thankfully generate a good "default"
   * location from it so we can generate proper relative URL's again.
   *
   * @param {Object|String} loc Optional default location object.
   * @returns {Object} lolcation object.
   * @public
   */
  function lolcation(loc) {
    var globalVar;

    if (typeof window !== 'undefined') globalVar = window;
    else if (typeof commonjsGlobal !== 'undefined') globalVar = commonjsGlobal;
    else if (typeof self !== 'undefined') globalVar = self;
    else globalVar = {};

    var location = globalVar.location || {};
    loc = loc || location;

    var finaldestination = {}
      , type = typeof loc
      , key;

    if ('blob:' === loc.protocol) {
      finaldestination = new Url(unescape(loc.pathname), {});
    } else if ('string' === type) {
      finaldestination = new Url(loc, {});
      for (key in ignore) delete finaldestination[key];
    } else if ('object' === type) {
      for (key in loc) {
        if (key in ignore) continue;
        finaldestination[key] = loc[key];
      }

      if (finaldestination.slashes === undefined) {
        finaldestination.slashes = slashes.test(loc.href);
      }
    }

    return finaldestination;
  }

  /**
   * Check whether a protocol scheme is special.
   *
   * @param {String} The protocol scheme of the URL
   * @return {Boolean} `true` if the protocol scheme is special, else `false`
   * @private
   */
  function isSpecial(scheme) {
    return (
      scheme === 'file:' ||
      scheme === 'ftp:' ||
      scheme === 'http:' ||
      scheme === 'https:' ||
      scheme === 'ws:' ||
      scheme === 'wss:'
    );
  }

  /**
   * @typedef ProtocolExtract
   * @type Object
   * @property {String} protocol Protocol matched in the URL, in lowercase.
   * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
   * @property {String} rest Rest of the URL that is not part of the protocol.
   */

  /**
   * Extract protocol information from a URL with/without double slash ("//").
   *
   * @param {String} address URL we want to extract from.
   * @param {Object} location
   * @return {ProtocolExtract} Extracted information.
   * @private
   */
  function extractProtocol(address, location) {
    address = trimLeft(address);
    location = location || {};

    var match = protocolre.exec(address);
    var protocol = match[1] ? match[1].toLowerCase() : '';
    var forwardSlashes = !!match[2];
    var otherSlashes = !!match[3];
    var slashesCount = 0;
    var rest;

    if (forwardSlashes) {
      if (otherSlashes) {
        rest = match[2] + match[3] + match[4];
        slashesCount = match[2].length + match[3].length;
      } else {
        rest = match[2] + match[4];
        slashesCount = match[2].length;
      }
    } else {
      if (otherSlashes) {
        rest = match[3] + match[4];
        slashesCount = match[3].length;
      } else {
        rest = match[4];
      }
    }

    if (protocol === 'file:') {
      if (slashesCount >= 2) {
        rest = rest.slice(2);
      }
    } else if (isSpecial(protocol)) {
      rest = match[4];
    } else if (protocol) {
      if (forwardSlashes) {
        rest = rest.slice(2);
      }
    } else if (slashesCount >= 2 && isSpecial(location.protocol)) {
      rest = match[4];
    }

    return {
      protocol: protocol,
      slashes: forwardSlashes || isSpecial(protocol),
      slashesCount: slashesCount,
      rest: rest
    };
  }

  /**
   * Resolve a relative URL pathname against a base URL pathname.
   *
   * @param {String} relative Pathname of the relative URL.
   * @param {String} base Pathname of the base URL.
   * @return {String} Resolved pathname.
   * @private
   */
  function resolve(relative, base) {
    if (relative === '') return base;

    var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/'))
      , i = path.length
      , last = path[i - 1]
      , unshift = false
      , up = 0;

    while (i--) {
      if (path[i] === '.') {
        path.splice(i, 1);
      } else if (path[i] === '..') {
        path.splice(i, 1);
        up++;
      } else if (up) {
        if (i === 0) unshift = true;
        path.splice(i, 1);
        up--;
      }
    }

    if (unshift) path.unshift('');
    if (last === '.' || last === '..') path.push('');

    return path.join('/');
  }

  /**
   * The actual URL instance. Instead of returning an object we've opted-in to
   * create an actual constructor as it's much more memory efficient and
   * faster and it pleases my OCD.
   *
   * It is worth noting that we should not use `URL` as class name to prevent
   * clashes with the global URL instance that got introduced in browsers.
   *
   * @constructor
   * @param {String} address URL we want to parse.
   * @param {Object|String} [location] Location defaults for relative paths.
   * @param {Boolean|Function} [parser] Parser for the query string.
   * @private
   */
  function Url(address, location, parser) {
    address = trimLeft(address);

    if (!(this instanceof Url)) {
      return new Url(address, location, parser);
    }

    var relative, extracted, parse, instruction, index, key
      , instructions = rules.slice()
      , type = typeof location
      , url = this
      , i = 0;

    //
    // The following if statements allows this module two have compatibility with
    // 2 different API:
    //
    // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
    //    where the boolean indicates that the query string should also be parsed.
    //
    // 2. The `URL` interface of the browser which accepts a URL, object as
    //    arguments. The supplied object will be used as default values / fall-back
    //    for relative paths.
    //
    if ('object' !== type && 'string' !== type) {
      parser = location;
      location = null;
    }

    if (parser && 'function' !== typeof parser) parser = querystringify_1.parse;

    location = lolcation(location);

    //
    // Extract protocol information before running the instructions.
    //
    extracted = extractProtocol(address || '', location);
    relative = !extracted.protocol && !extracted.slashes;
    url.slashes = extracted.slashes || relative && location.slashes;
    url.protocol = extracted.protocol || location.protocol || '';
    address = extracted.rest;

    //
    // When the authority component is absent the URL starts with a path
    // component.
    //
    if (
      extracted.protocol === 'file:' && (
        extracted.slashesCount !== 2 || windowsDriveLetter.test(address)) ||
      (!extracted.slashes &&
        (extracted.protocol ||
          extracted.slashesCount < 2 ||
          !isSpecial(url.protocol)))
    ) {
      instructions[3] = [/(.*)/, 'pathname'];
    }

    for (; i < instructions.length; i++) {
      instruction = instructions[i];

      if (typeof instruction === 'function') {
        address = instruction(address, url);
        continue;
      }

      parse = instruction[0];
      key = instruction[1];

      if (parse !== parse) {
        url[key] = address;
      } else if ('string' === typeof parse) {
        if (~(index = address.indexOf(parse))) {
          if ('number' === typeof instruction[2]) {
            url[key] = address.slice(0, index);
            address = address.slice(index + instruction[2]);
          } else {
            url[key] = address.slice(index);
            address = address.slice(0, index);
          }
        }
      } else if ((index = parse.exec(address))) {
        url[key] = index[1];
        address = address.slice(0, index.index);
      }

      url[key] = url[key] || (
        relative && instruction[3] ? location[key] || '' : ''
      );

      //
      // Hostname, host and protocol should be lowercased so they can be used to
      // create a proper `origin`.
      //
      if (instruction[4]) url[key] = url[key].toLowerCase();
    }

    //
    // Also parse the supplied query string in to an object. If we're supplied
    // with a custom parser as function use that instead of the default build-in
    // parser.
    //
    if (parser) url.query = parser(url.query);

    //
    // If the URL is relative, resolve the pathname against the base URL.
    //
    if (
        relative
      && location.slashes
      && url.pathname.charAt(0) !== '/'
      && (url.pathname !== '' || location.pathname !== '')
    ) {
      url.pathname = resolve(url.pathname, location.pathname);
    }

    //
    // Default to a / for pathname if none exists. This normalizes the URL
    // to always have a /
    //
    if (url.pathname.charAt(0) !== '/' && isSpecial(url.protocol)) {
      url.pathname = '/' + url.pathname;
    }

    //
    // We should not add port numbers if they are already the default port number
    // for a given protocol. As the host also contains the port number we're going
    // override it with the hostname which contains no port number.
    //
    if (!requiresPort(url.port, url.protocol)) {
      url.host = url.hostname;
      url.port = '';
    }

    //
    // Parse down the `auth` for the username and password.
    //
    url.username = url.password = '';
    if (url.auth) {
      instruction = url.auth.split(':');
      url.username = instruction[0] || '';
      url.password = instruction[1] || '';
    }

    url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
      ? url.protocol +'//'+ url.host
      : 'null';

    //
    // The href is just the compiled result.
    //
    url.href = url.toString();
  }

  /**
   * This is convenience method for changing properties in the URL instance to
   * insure that they all propagate correctly.
   *
   * @param {String} part          Property we need to adjust.
   * @param {Mixed} value          The newly assigned value.
   * @param {Boolean|Function} fn  When setting the query, it will be the function
   *                               used to parse the query.
   *                               When setting the protocol, double slash will be
   *                               removed from the final url if it is true.
   * @returns {URL} URL instance for chaining.
   * @public
   */
  function set(part, value, fn) {
    var url = this;

    switch (part) {
      case 'query':
        if ('string' === typeof value && value.length) {
          value = (fn || querystringify_1.parse)(value);
        }

        url[part] = value;
        break;

      case 'port':
        url[part] = value;

        if (!requiresPort(value, url.protocol)) {
          url.host = url.hostname;
          url[part] = '';
        } else if (value) {
          url.host = url.hostname +':'+ value;
        }

        break;

      case 'hostname':
        url[part] = value;

        if (url.port) value += ':'+ url.port;
        url.host = value;
        break;

      case 'host':
        url[part] = value;

        if (/:\d+$/.test(value)) {
          value = value.split(':');
          url.port = value.pop();
          url.hostname = value.join(':');
        } else {
          url.hostname = value;
          url.port = '';
        }

        break;

      case 'protocol':
        url.protocol = value.toLowerCase();
        url.slashes = !fn;
        break;

      case 'pathname':
      case 'hash':
        if (value) {
          var char = part === 'pathname' ? '/' : '#';
          url[part] = value.charAt(0) !== char ? char + value : value;
        } else {
          url[part] = value;
        }
        break;

      default:
        url[part] = value;
    }

    for (var i = 0; i < rules.length; i++) {
      var ins = rules[i];

      if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
    }

    url.origin = url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
      ? url.protocol +'//'+ url.host
      : 'null';

    url.href = url.toString();

    return url;
  }

  /**
   * Transform the properties back in to a valid and full URL string.
   *
   * @param {Function} stringify Optional query stringify function.
   * @returns {String} Compiled version of the URL.
   * @public
   */
  function toString(stringify) {
    if (!stringify || 'function' !== typeof stringify) stringify = querystringify_1.stringify;

    var query
      , url = this
      , protocol = url.protocol;

    if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';

    var result = protocol + (url.slashes || isSpecial(url.protocol) ? '//' : '');

    if (url.username) {
      result += url.username;
      if (url.password) result += ':'+ url.password;
      result += '@';
    }

    result += url.host + url.pathname;

    query = 'object' === typeof url.query ? stringify(url.query) : url.query;
    if (query) result += '?' !== query.charAt(0) ? '?'+ query : query;

    if (url.hash) result += url.hash;

    return result;
  }

  Url.prototype = { set: set, toString: toString };

  //
  // Expose the URL parser and some additional properties that might be useful for
  // others or testing.
  //
  Url.extractProtocol = extractProtocol;
  Url.location = lolcation;
  Url.trimLeft = trimLeft;
  Url.qs = querystringify_1;

  var urlParse = Url;

  /**
   * parseURL - decompose a URL into its parts
   * @param  {String} url a URL
   * @return {Object} parts of the URL, including the following
   *
   * 'https://www.yahoo.com:1234/mypage?test=yes#abc'
   *
   * {
   *   host: 'www.yahoo.com:1234',
   *   protocol: 'https:',
   *   search: '?test=yes',
   *   hash: '#abc',
   *   href: 'https://www.yahoo.com:1234/mypage?test=yes#abc',
   *   pathname: '/mypage',
   *   fullpath: '/mypage?test=yes'
   * }
   */
  function parseURL(url) {
      var parsedUrl = new urlParse(url);
      if (!parsedUrl.host) {
          // eslint-disable-next-line no-self-assign
          parsedUrl.href = parsedUrl.href; // IE: load the host and protocol
      }
      var pathname = parsedUrl.pathname;
      if (pathname.charAt(0) !== '/') {
          pathname = '/' + pathname; // IE: prepend leading slash
      }
      var host = parsedUrl.host;
      if (parsedUrl.port === '80' || parsedUrl.port === '443') {
          host = parsedUrl.hostname; // IE: remove default port
      }
      return {
          host: host,
          protocol: parsedUrl.protocol,
          search: parsedUrl.query,
          hash: parsedUrl.hash,
          href: parsedUrl.href,
          pathname: pathname,
          fullpath: pathname + (parsedUrl.query || '') + (parsedUrl.hash || '')
      };
  }

  /**
   * Registry
   *
   * A registry is a map of HTTP verbs to route recognizers.
   */
  var Registry = /** @class */ (function () {
      function Registry( /* host */) {
          // Herein we keep track of RouteRecognizer instances
          // keyed by HTTP method. Feel free to add more as needed.
          this.verbs = {
              GET: new RouteRecognizer(),
              PUT: new RouteRecognizer(),
              POST: new RouteRecognizer(),
              DELETE: new RouteRecognizer(),
              PATCH: new RouteRecognizer(),
              HEAD: new RouteRecognizer(),
              OPTIONS: new RouteRecognizer()
          };
      }
      return Registry;
  }());

  /**
   * Hosts
   *
   * a map of hosts to Registries, ultimately allowing
   * a per-host-and-port, per HTTP verb lookup of RouteRecognizers
   */
  var Hosts = /** @class */ (function () {
      function Hosts() {
          this.registries = {};
      }
      /**
       * Hosts#forURL - retrieve a map of HTTP verbs to RouteRecognizers
       *                for a given URL
       *
       * @param  {String} url a URL
       * @return {Registry}   a map of HTTP verbs to RouteRecognizers
       *                      corresponding to the provided URL's
       *                      hostname and port
       */
      Hosts.prototype.forURL = function (url) {
          var host = parseURL(url).host;
          var registry = this.registries[host];
          if (registry === undefined) {
              registry = (this.registries[host] = new Registry( /*host*/));
          }
          return registry.verbs;
      };
      return Hosts;
  }());

  var global$1 =
    (typeof globalThis !== 'undefined' && globalThis) ||
    (typeof self !== 'undefined' && self) ||
    (typeof global$1 !== 'undefined' && global$1);

  var support = {
    searchParams: 'URLSearchParams' in global$1,
    iterable: 'Symbol' in global$1 && 'iterator' in Symbol,
    blob:
      'FileReader' in global$1 &&
      'Blob' in global$1 &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in global$1,
    arrayBuffer: 'ArrayBuffer' in global$1
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
      throw new TypeError('Invalid character in header field name: "' + name + '"')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      /*
        fetch-mock wraps the Response object in an ES6 Proxy to
        provide useful test harness features such as flush. However, on
        ES5 browsers without fetch or Proxy support pollyfills must be used;
        the proxy-pollyfill is unable to proxy an attribute unless it exists
        on the object before the Proxy is created. This change ensures
        Response.bodyUsed exists on the instance, while maintaining the
        semantic of setting Request.bodyUsed in the constructor before
        _initBody is called.
      */
      this.bodyUsed = this.bodyUsed;
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          var isConsumed = consumed(this);
          if (isConsumed) {
            return isConsumed
          }
          if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
            return Promise.resolve(
              this._bodyArrayBuffer.buffer.slice(
                this._bodyArrayBuffer.byteOffset,
                this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength
              )
            )
          } else {
            return Promise.resolve(this._bodyArrayBuffer)
          }
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode$1)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    if (!(this instanceof Request)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }

    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);

    if (this.method === 'GET' || this.method === 'HEAD') {
      if (options.cache === 'no-store' || options.cache === 'no-cache') {
        // Search for a '_' parameter in the query string
        var reParamSearch = /([?&])_=[^&]*/;
        if (reParamSearch.test(this.url)) {
          // If it already exists then set the value with the current time
          this.url = this.url.replace(reParamSearch, '$1_=' + new Date().getTime());
        } else {
          // Otherwise add a new '_' parameter to the end with the current time
          var reQueryString = /\?/;
          this.url += (reQueryString.test(this.url) ? '&' : '?') + '_=' + new Date().getTime();
        }
      }
    }
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode$1(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    // Avoiding split via regex to work around a common IE11 bug with the core-js 3.6.0 regex polyfill
    // https://github.com/github/fetch/issues/748
    // https://github.com/zloirock/core-js/issues/751
    preProcessedHeaders
      .split('\r')
      .map(function(header) {
        return header.indexOf('\n') === 0 ? header.substr(1, header.length) : header
      })
      .forEach(function(line) {
        var parts = line.split(':');
        var key = parts.shift().trim();
        if (key) {
          var value = parts.join(':').trim();
          headers.append(key, value);
        }
      });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!(this instanceof Response)) {
      throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.')
    }
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = options.statusText === undefined ? '' : '' + options.statusText;
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  var DOMException = global$1.DOMException;
  try {
    new DOMException();
  } catch (err) {
    DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    DOMException.prototype = Object.create(Error.prototype);
    DOMException.prototype.constructor = DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        setTimeout(function() {
          resolve(new Response(body, options));
        }, 0);
      };

      xhr.onerror = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.ontimeout = function() {
        setTimeout(function() {
          reject(new TypeError('Network request failed'));
        }, 0);
      };

      xhr.onabort = function() {
        setTimeout(function() {
          reject(new DOMException('Aborted', 'AbortError'));
        }, 0);
      };

      function fixUrl(url) {
        try {
          return url === '' && global$1.location.href ? global$1.location.href : url
        } catch (e) {
          return url
        }
      }

      xhr.open(request.method, fixUrl(request.url), true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr) {
        if (support.blob) {
          xhr.responseType = 'blob';
        } else if (
          support.arrayBuffer &&
          request.headers.get('Content-Type') &&
          request.headers.get('Content-Type').indexOf('application/octet-stream') !== -1
        ) {
          xhr.responseType = 'arraybuffer';
        }
      }

      if (init && typeof init.headers === 'object' && !(init.headers instanceof Headers)) {
        Object.getOwnPropertyNames(init.headers).forEach(function(name) {
          xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
        });
      } else {
        request.headers.forEach(function(value, name) {
          xhr.setRequestHeader(name, value);
        });
      }

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!global$1.fetch) {
    global$1.fetch = fetch;
    global$1.Headers = Headers;
    global$1.Request = Request;
    global$1.Response = Response;
  }

  var FakeFetch = /*#__PURE__*/Object.freeze({
  	__proto__: null,
  	Headers: Headers,
  	Request: Request,
  	Response: Response,
  	get DOMException () { return DOMException; },
  	fetch: fetch
  });

  function createPassthrough(fakeXHR, nativeXMLHttpRequest) {
      // event types to handle on the xhr
      var evts = ['error', 'timeout', 'abort', 'readystatechange'];
      // event types to handle on the xhr.upload
      var uploadEvents = [];
      // properties to copy from the native xhr to fake xhr
      var lifecycleProps = [
          'readyState',
          'responseText',
          'response',
          'responseXML',
          'responseURL',
          'status',
          'statusText',
      ];
      var xhr = (fakeXHR._passthroughRequest = new nativeXMLHttpRequest());
      xhr.open(fakeXHR.method, fakeXHR.url, fakeXHR.async, fakeXHR.username, fakeXHR.password);
      if (fakeXHR.responseType === 'arraybuffer') {
          lifecycleProps = ['readyState', 'response', 'status', 'statusText'];
          xhr.responseType = fakeXHR.responseType;
      }
      // use onload if the browser supports it
      if ('onload' in xhr) {
          evts.push('load');
      }
      // add progress event for async calls
      // avoid using progress events for sync calls, they will hang https://bugs.webkit.org/show_bug.cgi?id=40996.
      if (fakeXHR.async && fakeXHR.responseType !== 'arraybuffer') {
          evts.push('progress');
          uploadEvents.push('progress');
      }
      // update `propertyNames` properties from `fromXHR` to `toXHR`
      function copyLifecycleProperties(propertyNames, fromXHR, toXHR) {
          for (var i = 0; i < propertyNames.length; i++) {
              var prop = propertyNames[i];
              if (prop in fromXHR) {
                  toXHR[prop] = fromXHR[prop];
              }
          }
      }
      // fire fake event on `eventable`
      function dispatchEvent(eventable, eventType, event) {
          eventable.dispatchEvent(event);
          if (eventable['on' + eventType]) {
              eventable['on' + eventType](event);
          }
      }
      // set the on- handler on the native xhr for the given eventType
      function createHandler(eventType) {
          xhr['on' + eventType] = function (event) {
              copyLifecycleProperties(lifecycleProps, xhr, fakeXHR);
              dispatchEvent(fakeXHR, eventType, event);
          };
      }
      // set the on- handler on the native xhr's `upload` property for
      // the given eventType
      function createUploadHandler(eventType) {
          if (xhr.upload && fakeXHR.upload && fakeXHR.upload['on' + eventType]) {
              xhr.upload['on' + eventType] = function (event) {
                  dispatchEvent(fakeXHR.upload, eventType, event);
              };
          }
      }
      var i;
      for (i = 0; i < evts.length; i++) {
          createHandler(evts[i]);
      }
      for (i = 0; i < uploadEvents.length; i++) {
          createUploadHandler(uploadEvents[i]);
      }
      if (fakeXHR.async) {
          xhr.timeout = fakeXHR.timeout;
          xhr.withCredentials = fakeXHR.withCredentials;
      }
      // XMLHttpRequest.timeout default initializes to 0, and is not allowed to be used for
      // synchronous XMLHttpRequests requests in a document environment. However, when a XHR
      // polyfill does not sets the timeout value, it will throw in React Native environment.
      // TODO:
      // synchronous XHR is deprecated, make async the default as XMLHttpRequest.open(),
      // and throw error if sync XHR has timeout not 0
      if (!xhr.timeout && xhr.timeout !== 0) {
          xhr.timeout = 0; // default XMLHttpRequest timeout
      }
      for (var h in fakeXHR.requestHeaders) {
          xhr.setRequestHeader(h, fakeXHR.requestHeaders[h]);
      }
      return xhr;
  }

  function interceptor(ctx) {
      function FakeRequest() {
          // super()
          FakeXMLHttpRequest.call(this);
      }
      FakeRequest.prototype = Object.create(FakeXMLHttpRequest.prototype);
      FakeRequest.prototype.constructor = FakeRequest;
      // extend
      FakeRequest.prototype.send = function send() {
          this.sendArguments = arguments;
          if (!ctx.pretender.running) {
              throw new Error('You shut down a Pretender instance while there was a pending request. ' +
                  'That request just tried to complete. Check to see if you accidentally shut down ' +
                  'a pretender earlier than you intended to');
          }
          FakeXMLHttpRequest.prototype.send.apply(this, arguments);
          if (ctx.pretender.checkPassthrough(this)) {
              this.passthrough();
          }
          else {
              ctx.pretender.handleRequest(this);
          }
      };
      FakeRequest.prototype.passthrough = function passthrough() {
          if (!this.sendArguments) {
              throw new Error('You attempted to passthrough a FakeRequest that was never sent. ' +
                  'Call `.send()` on the original request first');
          }
          var xhr = createPassthrough(this, ctx.pretender._nativeXMLHttpRequest);
          xhr.send.apply(xhr, this.sendArguments);
          return xhr;
      };
      FakeRequest.prototype._passthroughCheck = function (method, args) {
          if (this._passthroughRequest) {
              return this._passthroughRequest[method].apply(this._passthroughRequest, args);
          }
          return FakeXMLHttpRequest.prototype[method].apply(this, args);
      };
      FakeRequest.prototype.abort = function abort() {
          return this._passthroughCheck('abort', arguments);
      };
      FakeRequest.prototype.getResponseHeader = function getResponseHeader() {
          return this._passthroughCheck('getResponseHeader', arguments);
      };
      FakeRequest.prototype.getAllResponseHeaders = function getAllResponseHeaders() {
          return this._passthroughCheck('getAllResponseHeaders', arguments);
      };
      if (ctx.pretender._nativeXMLHttpRequest.prototype._passthroughCheck) {
          // eslint-disable-next-line no-console
          console.warn('You created a second Pretender instance while there was already one running. ' +
              'Running two Pretender servers at once will lead to unexpected results and will ' +
              'be removed entirely in a future major version.' +
              'Please call .shutdown() on your instances when you no longer need them to respond.');
      }
      return FakeRequest;
  }

  var NoopArray = /** @class */ (function () {
      function NoopArray() {
          this.length = 0;
      }
      NoopArray.prototype.push = function () {
          var _items = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              _items[_i] = arguments[_i];
          }
          return 0;
      };
      return NoopArray;
  }());
  function scheduleProgressEvent(request, startTime, totalTime) {
      var totalSize = 0;
      var body = request.requestBody;
      if (body) {
          if (body instanceof FormData) {
              body.forEach(function (value) {
                  if (value instanceof File) {
                      totalSize += value.size;
                  }
                  else {
                      totalSize += value.length;
                  }
              });
          }
          else {
              // Support Blob, BufferSource, USVString, ArrayBufferView
              totalSize = body.byteLength || body.size || body.length || 0;
          }
      }
      setTimeout(function () {
          if (!request.aborted && !request.status) {
              var elapsedTime = new Date().getTime() - startTime.getTime();
              var progressTransmitted = totalTime <= 0 ? 0 : (elapsedTime / totalTime) * totalSize;
              // ProgressEvent expects loaded, total
              // https://xhr.spec.whatwg.org/#interface-progressevent
              request.upload._progress(true, progressTransmitted, totalSize);
              request._progress(true, progressTransmitted, totalSize);
              scheduleProgressEvent(request, startTime, totalTime);
          }
          else if (request.status) {
              // we're done, send a final progress event with loaded === total
              request.upload._progress(true, totalSize, totalSize);
              request._progress(true, totalSize, totalSize);
          }
      }, 50);
  }
  function isArray(array) {
      return Object.prototype.toString.call(array) === '[object Array]';
  }
  var PASSTHROUGH = {};
  function verbify(verb) {
      return function (path, handler, async) {
          return this.register(verb, path, handler, async);
      };
  }
  var Pretender = /** @class */ (function () {
      function Pretender() {
          var _this = this;
          this.hosts = new Hosts();
          this.handlers = [];
          this.get = verbify('GET');
          this.post = verbify('POST');
          this.put = verbify('PUT');
          this.delete = verbify('DELETE');
          this.patch = verbify('PATCH');
          this.head = verbify('HEAD');
          this.options = verbify('OPTIONS');
          this.passthrough = PASSTHROUGH;
          var lastArg = arguments[arguments.length - 1];
          var options = typeof lastArg === 'object' ? lastArg : null;
          var shouldNotTrack = options && options.trackRequests === false;
          this.handledRequests = shouldNotTrack ? new NoopArray() : [];
          this.passthroughRequests = shouldNotTrack ? new NoopArray() : [];
          this.unhandledRequests = shouldNotTrack ? new NoopArray() : [];
          this.requestReferences = [];
          this.forcePassthrough = options && options.forcePassthrough === true;
          this.disableUnhandled = options && options.disableUnhandled === true;
          // reference the native XMLHttpRequest object so
          // it can be restored later
          this._nativeXMLHttpRequest = self.XMLHttpRequest;
          this.running = false;
          var ctx = { pretender: this };
          this.ctx = ctx;
          // capture xhr requests, channeling them into
          // the route map.
          self.XMLHttpRequest = interceptor(ctx);
          // polyfill fetch when xhr is ready
          this._fetchProps = FakeFetch
              ? ['fetch', 'Headers', 'Request', 'Response']
              : [];
          this._fetchProps.forEach(function (name) {
              _this['_native' + name] = self[name];
              self[name] = FakeFetch[name];
          }, this);
          // 'start' the server
          this.running = true;
          // trigger the route map DSL.
          var argLength = options ? arguments.length - 1 : arguments.length;
          for (var i = 0; i < argLength; i++) {
              this.map(arguments[i]);
          }
      }
      Pretender.prototype.map = function (maps) {
          maps.call(this);
      };
      Pretender.prototype.register = function (verb, url, handler, async) {
          if (!handler) {
              throw new Error('The function you tried passing to Pretender to handle ' +
                  verb +
                  ' ' +
                  url +
                  ' is undefined or missing.');
          }
          var handlerInstance = handler;
          handlerInstance.numberOfCalls = 0;
          handlerInstance.async = async;
          this.handlers.push(handlerInstance);
          var registry = this.hosts.forURL(url)[verb];
          registry.add([
              {
                  path: parseURL(url).fullpath,
                  handler: handlerInstance,
              },
          ]);
          return handlerInstance;
      };
      Pretender.prototype.checkPassthrough = function (request) {
          var verb = request.method.toUpperCase();
          var path = parseURL(request.url).fullpath;
          var recognized = this.hosts.forURL(request.url)[verb].recognize(path);
          var match = recognized && recognized[0];
          if ((match && match.handler === PASSTHROUGH) || this.forcePassthrough) {
              this.passthroughRequests.push(request);
              this.passthroughRequest(verb, path, request);
              return true;
          }
          return false;
      };
      Pretender.prototype.handleRequest = function (request) {
          var verb = request.method.toUpperCase();
          var path = request.url;
          var handler = this._handlerFor(verb, path, request);
          if (handler) {
              handler.handler.numberOfCalls++;
              var async_1 = handler.handler.async;
              this.handledRequests.push(request);
              var pretender_1 = this;
              var _handleRequest_1 = function (statusHeadersAndBody) {
                  if (!isArray(statusHeadersAndBody)) {
                      var note = 'Remember to `return [status, headers, body];` in your route handler.';
                      throw new Error('Nothing returned by handler for ' + path + '. ' + note);
                  }
                  var status = statusHeadersAndBody[0];
                  var headers = pretender_1.prepareHeaders(statusHeadersAndBody[1]);
                  var body = pretender_1.prepareBody(statusHeadersAndBody[2], headers);
                  pretender_1.handleResponse(request, async_1, function () {
                      request.respond(status, headers, body);
                      pretender_1.handledRequest(verb, path, request);
                  });
              };
              try {
                  var result = handler.handler(request);
                  if (result && typeof result.then === 'function') {
                      // `result` is a promise, resolve it
                      result.then(function (resolvedResult) {
                          _handleRequest_1(resolvedResult);
                      });
                  }
                  else {
                      _handleRequest_1(result);
                  }
              }
              catch (error) {
                  this.erroredRequest(verb, path, request, error);
                  this.resolve(request);
              }
          }
          else {
              if (!this.disableUnhandled) {
                  this.unhandledRequests.push(request);
                  this.unhandledRequest(verb, path, request);
              }
          }
      };
      Pretender.prototype.handleResponse = function (request, strategy, callback) {
          var delay = typeof strategy === 'function' ? strategy() : strategy;
          delay = typeof delay === 'boolean' || typeof delay === 'number' ? delay : 0;
          if (delay === false) {
              callback();
          }
          else {
              var pretender_2 = this;
              pretender_2.requestReferences.push({
                  request: request,
                  callback: callback,
              });
              if (delay !== true) {
                  scheduleProgressEvent(request, new Date(), delay);
                  setTimeout(function () {
                      pretender_2.resolve(request);
                  }, delay);
              }
          }
      };
      Pretender.prototype.resolve = function (request) {
          for (var i = 0, len = this.requestReferences.length; i < len; i++) {
              var res = this.requestReferences[i];
              if (res.request === request) {
                  res.callback();
                  this.requestReferences.splice(i, 1);
                  break;
              }
          }
      };
      Pretender.prototype.requiresManualResolution = function (verb, path) {
          var handler = this._handlerFor(verb.toUpperCase(), path, {});
          if (!handler) {
              return false;
          }
          var async = handler.handler.async;
          return typeof async === 'function' ? async() === true : async === true;
      };
      Pretender.prototype.prepareBody = function (body, _headers) {
          return body;
      };
      Pretender.prototype.prepareHeaders = function (headers) {
          return headers;
      };
      Pretender.prototype.handledRequest = function (_verb, _path, _request) {
          /* no-op */
      };
      Pretender.prototype.passthroughRequest = function (_verb, _path, _request) {
          /* no-op */
      };
      Pretender.prototype.unhandledRequest = function (verb, path, _request) {
          throw new Error('Pretender intercepted ' +
              verb +
              ' ' +
              path +
              ' but no handler was defined for this type of request');
      };
      Pretender.prototype.erroredRequest = function (verb, path, _request, error) {
          error.message =
              'Pretender intercepted ' +
                  verb +
                  ' ' +
                  path +
                  ' but encountered an error: ' +
                  error.message;
          throw error;
      };
      Pretender.prototype.shutdown = function () {
          var _this = this;
          self.XMLHttpRequest = this._nativeXMLHttpRequest;
          this._fetchProps.forEach(function (name) {
              self[name] = _this['_native' + name];
          }, this);
          this.ctx.pretender = undefined;
          // 'stop' the server
          this.running = false;
      };
      Pretender.prototype._handlerFor = function (verb, url, request) {
          var registry = this.hosts.forURL(url)[verb];
          var matches = registry.recognize(parseURL(url).fullpath);
          var match = matches ? matches[0] : null;
          if (match) {
              request.params = match.params;
              request.queryParams = matches.queryParams;
          }
          return match;
      };
      Pretender.parseURL = parseURL;
      Pretender.Hosts = Hosts;
      Pretender.Registry = Registry;
      return Pretender;
  }());

  Pretender.parseURL = parseURL;
  Pretender.Hosts = Hosts;
  Pretender.Registry = Registry;

  if (typeof commonjsGlobal$1 !== "undefined" && commonjsGlobal$1.__pretenderNodePolyfill) {
    delete commonjsGlobal$1.self;
    delete commonjsGlobal$1.__pretenderNodePolyfill;
  }

  /**
    Mirage Interceptor Class

      urlPrefix;

      namespace;

      // Creates the interceptor instance
      constructor(mirageServer, mirageConfig)

      // Allow you to change some of the config options after the server is created
      config(mirageConfig)

      // These are the equivalent of the functions that were on the Mirage Server.
      // Those Mirage Server functions are redirected to the Interceptors functions for
      // backward compatibility
      get
      post
      put
      delete
      del
      patch
      head
      options

      // Start the interceptor. (Optional) this happens after the mirage server has been completed configured
      // and all the models, routes, etc have been defined.
      start
      // Shutdown the interceptor instance
      shutdown

   */

  /**
   @hide
   */

  var defaultPassthroughs = ["http://localhost:0/chromecheckurl", // mobile chrome
  "http://localhost:30820/socket.io", // electron
  function (request) {
    return /.+\.hot-update.json$/.test(request.url);
  }];
  var defaultRouteOptions = {
    coalesce: false,
    timing: undefined
  };
  /**
   * Determine if the object contains a valid option.
   *
   * @method isOption
   * @param {Object} option An object with one option value pair.
   * @return {Boolean} True if option is a valid option, false otherwise.
   * @private
   */

  function isOption(option) {
    if (!option || _typeof(option) !== "object") {
      return false;
    }

    var allOptions = Object.keys(defaultRouteOptions);
    var optionKeys = Object.keys(option);

    for (var i = 0; i < optionKeys.length; i++) {
      var key = optionKeys[i];

      if (allOptions.indexOf(key) > -1) {
        return true;
      }
    }

    return false;
  }
  /**
   * Extract arguments for a route.
   *
   * @method extractRouteArguments
   * @param {Array} args Of the form [options], [object, code], [function, code]
   * [shorthand, options], [shorthand, code, options]
   * @return {Array} [handler (i.e. the function, object or shorthand), code,
   * options].
   */

  function extractRouteArguments(args) {
    var _args$splice = args.splice(-1),
        _args$splice2 = _slicedToArray(_args$splice, 1),
        lastArg = _args$splice2[0];

    if (isOption(lastArg)) {
      lastArg = assign_1({}, defaultRouteOptions, lastArg);
    } else {
      args.push(lastArg);
      lastArg = defaultRouteOptions;
    }

    var t = 2 - args.length;

    while (t-- > 0) {
      args.push(undefined);
    }

    args.push(lastArg);
    return args;
  }

  var PretenderConfig = /*#__PURE__*/function () {
    function PretenderConfig() {
      _classCallCheck(this, PretenderConfig);

      _defineProperty$1(this, "urlPrefix", void 0);

      _defineProperty$1(this, "namespace", void 0);

      _defineProperty$1(this, "timing", void 0);

      _defineProperty$1(this, "passthroughChecks", void 0);

      _defineProperty$1(this, "pretender", void 0);

      _defineProperty$1(this, "mirageServer", void 0);

      _defineProperty$1(this, "trackRequests", void 0);
    }

    _createClass(PretenderConfig, [{
      key: "create",
      value: function create(mirageServer, config) {
        var _this = this;

        this.mirageServer = mirageServer;
        this.pretender = this._create(mirageServer, config);
        /**
         Mirage uses [pretender.js](https://github.com/trek/pretender) as its xhttp interceptor. In your Mirage config, `this.pretender` refers to the actual Pretender instance, so any config options that work there will work here as well.
          ```js
         createServer({
            routes() {
              this.pretender.handledRequest = (verb, path, request) => {
                console.log(`Your server responded to ${path}`);
              }
            }
          })
         ```
          Refer to [Pretender's docs](https://github.com/pretenderjs/pretender) if you want to change any options on your Pretender instance.
          @property pretender
         @return {Object} The Pretender instance
         @public
         */

        mirageServer.pretender = this.pretender;
        this.passthroughChecks = this.passthroughChecks || [];
        this.config(config);
        [["get"], ["post"], ["put"], ["delete", "del"], ["patch"], ["head"], ["options"]].forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              verb = _ref2[0],
              alias = _ref2[1];

          _this[verb] = function (path) {
            var _this$pretender;

            for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
              args[_key - 1] = arguments[_key];
            }

            var _extractRouteArgument = extractRouteArguments(args),
                _extractRouteArgument2 = _slicedToArray(_extractRouteArgument, 3),
                rawHandler = _extractRouteArgument2[0],
                customizedCode = _extractRouteArgument2[1],
                options = _extractRouteArgument2[2];

            var handler = mirageServer.registerRouteHandler(verb, path, rawHandler, customizedCode, options);

            var fullPath = _this._getFullPath(path);

            var timing = options.timing !== undefined ? options.timing : function () {
              return _this.timing;
            };
            return (_this$pretender = _this.pretender) === null || _this$pretender === void 0 ? void 0 : _this$pretender[verb](fullPath, handler, timing);
          };

          mirageServer[verb] = _this[verb];

          if (alias) {
            _this[alias] = _this[verb];
            mirageServer[alias] = _this[verb];
          }
        });
      }
    }, {
      key: "config",
      value: function config(_config) {
        var _ref3, _config$timing;

        var useDefaultPassthroughs = typeof _config.useDefaultPassthroughs !== "undefined" ? _config.useDefaultPassthroughs : true;

        if (useDefaultPassthroughs) {
          this._configureDefaultPassthroughs();
        }

        var didOverridePretenderConfig = _config.trackRequests !== undefined && _config.trackRequests !== this.trackRequests;
        assert(!didOverridePretenderConfig, "You cannot modify Pretender's request tracking once the server is created");
        /**
         Set the number of milliseconds for the the Server's response time.
          By default there's a 400ms delay during development, and 0 delay in testing (so your tests run fast).
          ```js
         createServer({
            routes() {
              this.timing = 400; // default
            }
          })
         ```
          To set the timing for individual routes, see the `timing` option for route handlers.
          @property timing
         @type Number
         @public
         */

        this.timing = (_ref3 = (_config$timing = _config.timing) !== null && _config$timing !== void 0 ? _config$timing : this.timing) !== null && _ref3 !== void 0 ? _ref3 : 400;
        /**
         Sets a string to prefix all route handler URLs with.
          Useful if your app makes API requests to a different port.
          ```js
         createServer({
            routes() {
              this.urlPrefix = 'http://localhost:8080'
            }
          })
         ```
         */

        this.urlPrefix = this.urlPrefix || _config.urlPrefix || "";
        /**
         Set the base namespace used for all routes defined with `get`, `post`, `put` or `del`.
          For example,
          ```js
         createServer({
            routes() {
              this.namespace = '/api';
               // this route will handle the URL '/api/contacts'
              this.get('/contacts', 'contacts');
            }
          })
         ```
          Note that only routes defined after `this.namespace` are affected. This is useful if you have a few one-off routes that you don't want under your namespace:
          ```js
         createServer({
            routes() {
               // this route handles /auth
              this.get('/auth', function() { ...});
               this.namespace = '/api';
              // this route will handle the URL '/api/contacts'
              this.get('/contacts', 'contacts');
            };
          })
         ```
          If your app is loaded from the filesystem vs. a server (e.g. via Cordova or Electron vs. `localhost` or `https://yourhost.com/`), you will need to explicitly define a namespace. Likely values are `/` (if requests are made with relative paths) or `https://yourhost.com/api/...` (if requests are made to a defined server).
          For a sample implementation leveraging a configured API host & namespace, check out [this issue comment](https://github.com/miragejs/ember-cli-mirage/issues/497#issuecomment-183458721).
          @property namespace
         @type String
         @public
         */

        this.namespace = this.namespace || _config.namespace || "";
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_configureDefaultPassthroughs",
      value: function _configureDefaultPassthroughs() {
        var _this2 = this;

        defaultPassthroughs.forEach(function (passthroughUrl) {
          _this2.passthrough(passthroughUrl);
        });
      }
      /**
       * Creates a new Pretender instance.
       *
       * @method _create
       * @param {Server} server
       * @return {Object} A new Pretender instance.
       * @public
       */

    }, {
      key: "_create",
      value: function _create(mirageServer, config) {
        if (typeof window !== "undefined") {
          this.trackRequests = config.trackRequests || false;
          return new Pretender(function () {
            this.passthroughRequest = function (verb, path, request) {
              if (mirageServer.shouldLog()) {
                console.log("Mirage: Passthrough request for ".concat(verb.toUpperCase(), " ").concat(request.url));
              }
            };

            this.handledRequest = function (verb, path, request) {
              if (mirageServer.shouldLog()) {
                console.groupCollapsed("Mirage: [".concat(request.status, "] ").concat(verb.toUpperCase(), " ").concat(request.url));
                var requestBody = request.requestBody,
                    responseText = request.responseText;
                var loggedRequest, loggedResponse;

                try {
                  loggedRequest = JSON.parse(requestBody);
                } catch (e) {
                  loggedRequest = requestBody;
                }

                try {
                  loggedResponse = JSON.parse(responseText);
                } catch (e) {
                  loggedResponse = responseText;
                }

                console.groupCollapsed("Response");
                console.log(loggedResponse);
                console.groupEnd();
                console.groupCollapsed("Request (data)");
                console.log(loggedRequest);
                console.groupEnd();
                console.groupCollapsed("Request (raw)");
                console.log(request);
                console.groupEnd();
                console.groupEnd();
              }
            };

            var originalCheckPassthrough = this.checkPassthrough;

            this.checkPassthrough = function (request) {
              var shouldPassthrough = mirageServer.passthroughChecks.some(function (passthroughCheck) {
                return passthroughCheck(request);
              });

              if (shouldPassthrough) {
                var url = request.url.includes("?") ? request.url.substr(0, request.url.indexOf("?")) : request.url;
                this[request.method.toLowerCase()](url, this.passthrough);
              }

              return originalCheckPassthrough.apply(this, arguments);
            };

            this.unhandledRequest = function (verb, path) {
              path = decodeURI(path);
              var namespaceError = "";

              if (this.namespace === "") {
                namespaceError = "There is no existing namespace defined. Please define one";
              } else {
                namespaceError = "The existing namespace is ".concat(this.namespace);
              }

              assert("Your app tried to ".concat(verb, " '").concat(path, "', but there was no route defined to handle this request. Define a route for this endpoint in your routes() config. Did you forget to define a namespace? ").concat(namespaceError));
            };
          }, {
            trackRequests: this.trackRequests
          });
        }
      }
      /**
       By default, if your app makes a request that is not defined in your server config, Mirage will throw an error. You can use `passthrough` to whitelist requests, and allow them to pass through your Mirage server to the actual network layer.
        Note: Put all passthrough config at the bottom of your routes, to give your route handlers precedence.
        To ignore paths on your current host (as well as configured `namespace`), use a leading `/`:
        ```js
       this.passthrough('/addresses');
       ```
        You can also pass a list of paths, or call `passthrough` multiple times:
        ```js
       this.passthrough('/addresses', '/contacts');
       this.passthrough('/something');
       this.passthrough('/else');
       ```
        These lines will allow all HTTP verbs to pass through. If you want only certain verbs to pass through, pass an array as the last argument with the specified verbs:
        ```js
       this.passthrough('/addresses', ['post']);
       this.passthrough('/contacts', '/photos', ['get']);
       ```
        You can pass a function to `passthrough` to do a runtime check on whether or not the request should be handled by Mirage. If the function returns `true` Mirage will not handle the request and let it pass through.
        ```js
       this.passthrough(request => {
          return request.queryParams.skipMirage;
        });
       ```
        If you want all requests on the current domain to pass through, simply invoke the method with no arguments:
        ```js
       this.passthrough();
       ```
        Note again that the current namespace (i.e. any `namespace` property defined above this call) will be applied.
        You can also allow other-origin hosts to passthrough. If you use a fully-qualified domain name, the `namespace` property will be ignored. Use two * wildcards to match all requests under a path:
        ```js
       this.passthrough('http://api.foo.bar/**');
       this.passthrough('http://api.twitter.com/v1/cards/**');
       ```
        In versions of Pretender prior to 0.12, `passthrough` only worked with jQuery >= 2.x. As long as you're on Pretender@0.12 or higher, you should be all set.
        @method passthrough
       @param {String} [...paths] Any number of paths to whitelist
       @param {Array} options Unused
       @public
       */

    }, {
      key: "passthrough",
      value: function passthrough() {
        var _this3 = this;

        for (var _len2 = arguments.length, paths = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          paths[_key2] = arguments[_key2];
        }

        // this only works in browser-like environments for now. in node users will have to configure
        // their own interceptor if they are using one.
        if (typeof window !== "undefined") {
          var verbs = ["get", "post", "put", "delete", "patch", "options", "head"];
          var lastArg = paths[paths.length - 1];

          if (paths.length === 0) {
            paths = ["/**", "/"];
          } else if (paths.length > 1 && Array.isArray(lastArg)) {
            verbs = paths.pop();
          }

          paths.forEach(function (path) {
            if (typeof path === "function") {
              _this3.passthroughChecks.push(path);
            } else {
              verbs.forEach(function (verb) {
                var fullPath = _this3._getFullPath(path);

                _this3.pretender[verb](fullPath, _this3.pretender.passthrough);
              });
            }
          });
        }
      }
      /**
       * Builds a full path for Pretender to monitor based on the `path` and
       * configured options (`urlPrefix` and `namespace`).
       *
       * @private
       * @hide
       */

    }, {
      key: "_getFullPath",
      value: function _getFullPath(path) {
        path = path[0] === "/" ? path.slice(1) : path;
        var fullPath = "";
        var urlPrefix = this.urlPrefix ? this.urlPrefix.trim() : "";
        var namespace = ""; // if there is a urlPrefix and a namespace

        if (this.urlPrefix && this.namespace) {
          if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] === "/") {
            namespace = this.namespace.substring(0, this.namespace.length - 1).substring(1);
          }

          if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] !== "/") {
            namespace = this.namespace.substring(1);
          }

          if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] === "/") {
            namespace = this.namespace.substring(0, this.namespace.length - 1);
          }

          if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] !== "/") {
            namespace = this.namespace;
          }
        } // if there is a namespace and no urlPrefix


        if (this.namespace && !this.urlPrefix) {
          if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] === "/") {
            namespace = this.namespace.substring(0, this.namespace.length - 1);
          }

          if (this.namespace[0] === "/" && this.namespace[this.namespace.length - 1] !== "/") {
            namespace = this.namespace;
          }

          if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] === "/") {
            var namespaceSub = this.namespace.substring(0, this.namespace.length - 1);
            namespace = "/".concat(namespaceSub);
          }

          if (this.namespace[0] !== "/" && this.namespace[this.namespace.length - 1] !== "/") {
            namespace = "/".concat(this.namespace);
          }
        } // if no namespace


        if (!this.namespace) {
          namespace = "";
        } // check to see if path is a FQDN. if so, ignore any urlPrefix/namespace that was set


        if (/^https?:\/\//.test(path)) {
          fullPath += path;
        } else {
          // otherwise, if there is a urlPrefix, use that as the beginning of the path
          if (urlPrefix.length) {
            fullPath += urlPrefix[urlPrefix.length - 1] === "/" ? urlPrefix : "".concat(urlPrefix, "/");
          } // add the namespace to the path


          fullPath += namespace; // add a trailing slash to the path if it doesn't already contain one

          if (fullPath[fullPath.length - 1] !== "/") {
            fullPath += "/";
          } // finally add the configured path


          fullPath += path; // if we're making a same-origin request, ensure a / is prepended and
          // dedup any double slashes

          if (!/^https?:\/\//.test(fullPath)) {
            fullPath = "/".concat(fullPath);
            fullPath = fullPath.replace(/\/+/g, "/");
          }
        }

        return fullPath;
      }
    }, {
      key: "start",
      value: function start() {// unneeded for pretender implementation
      }
    }, {
      key: "shutdown",
      value: function shutdown() {
        this.pretender.shutdown();
      }
    }]);

    return PretenderConfig;
  }();

  var isPluralForModelCache = {};
  var defaultInflector = {
    singularize: singularize,
    pluralize: pluralize
  };
  /**
   * Creates a Server
   * @param {Object} options Server's configuration object
   * @param {String} options.urlPrefix The base URL for the routes. Example: `http://miragejs.com`.
   * @param {String} options.namespace The default namespace for the `Server`. Example: `/api/v1`.
   * @param {Number} options.timing Default latency for the routes to respond to a request.
   * @param {String} options.environment Defines the environment of the `Server`.
   * @param {Boolean} options.trackRequests Pretender `trackRequests`.
   * @param {Boolean} options.useDefaultPassthroughs True to use mirage provided passthroughs
   * @param {Boolean} options.logging Set to true or false to explicitly specify logging behavior.
   * @param {Function} options.seeds Called on the seed phase. Should be used to seed the database.
   * @param {Function} options.scenarios Alias for seeds.
   * @param {Function} options.routes Should be used to define server routes.
   * @param {Function} options.baseConfig Alias for routes.
   * @param {Object} options.inflector Default inflector (used for pluralization and singularization).
   * @param {Object} options.identityManagers Database identity managers.
   * @param {Object} options.models Server models
   * @param {Object} options.serializers Server serializers
   * @param {Object} options.factories Server factories
   * @param {Object} options.pretender Pretender instance
   */

  function createServer(options) {
    return new Server(options);
  }
  /**
    The Mirage server.

    Note that `this` within your `routes` function refers to the server instance, which is the same instance that `server` refers to in your tests.

    @class Server
    @public
  */

  var Server = /*#__PURE__*/function () {
    /**
     * Creates a Server
     * @param {Object} options Server's configuration object
     * @param {String} options.urlPrefix The base URL for the routes. Example: `http://miragejs.com`.
     * @param {String} options.namespace The default namespace for the `Server`. Example: `/api/v1`.
     * @param {Number} options.timing Default latency for the routes to respond to a request.
     * @param {String} options.environment Defines the environment of the `Server`.
     * @param {Boolean} options.trackRequests Pretender `trackRequests`.
     * @param {Boolean} options.useDefaultPassthroughs True to use mirage provided passthroughs
     * @param {Boolean} options.logging Set to true or false to explicitly specify logging behavior.
     * @param {Function} options.seeds Called on the seed phase. Should be used to seed the database.
     * @param {Function} options.scenarios Alias for seeds.
     * @param {Function} options.routes Should be used to define server routes.
     * @param {Function} options.baseConfig Alias for routes.
     * @param {Object} options.inflector Default inflector (used for pluralization and singularization).
     * @param {Object} options.identityManagers Database identity managers.
     * @param {Object} options.models Server models
     * @param {Object} options.serializers Server serializers
     * @param {Object} options.factories Server factories
     * @param {Object} options.pretender Pretender instance
     */
    function Server() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      _classCallCheck(this, Server);

      this._container = new Container$1();
      this.config(options);
      /**
        Returns the Mirage Db instance.
         @property db
        @return Db
      */

      this.db = this.db || undefined;
      /**
        Returns the Mirage Schema (ORM) instance.
         @property schema
        @return Schema
      */

      this.schema = this.schema || undefined;
      this.middleware = [];
    } // todo deprecate following


    _createClass(Server, [{
      key: "namespace",
      get: function get() {
        return this.interceptor.namespace;
      },
      set: function set(value) {
        this.interceptor.namespace = value;
      } // todo deprecate following

    }, {
      key: "urlPrefix",
      get: function get() {
        return this.interceptor.urlPrefix;
      },
      set: function set(value) {
        this.interceptor.urlPrefix = value;
      } // todo deprecate following

    }, {
      key: "timing",
      get: function get() {
        return this.interceptor.timing;
      },
      set: function set(value) {
        this.interceptor.timing = value;
      } // todo deprecate following

    }, {
      key: "passthroughChecks",
      get: function get() {
        return this.interceptor.passthroughChecks;
      },
      set: function set(value) {
        this.interceptor.passthroughChecks = value;
      }
    }, {
      key: "config",
      value: function config() {
        var _this$interceptor$sta, _this$interceptor;

        var _config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        if (!_config.interceptor) {
          _config.interceptor = new PretenderConfig();
        }

        if (this.interceptor) {
          this.interceptor.config(_config);
        } else {
          this.interceptor = _config.interceptor;
          this.interceptor.create(this, _config);
        }

        var didOverrideConfig = _config.environment && this.environment && this.environment !== _config.environment;
        assert(!didOverrideConfig, "You cannot modify Mirage's environment once the server is created");
        this.environment = _config.environment || this.environment || "development";

        if (_config.routes) {
          assert(!_config.baseConfig, "The routes option is an alias for the baseConfig option. You can't pass both options into your server definition.");
          _config.baseConfig = _config.routes;
        }

        if (_config.seeds) {
          assert(!_config.scenarios, "The seeds option is an alias for the scenarios.default option. You can't pass both options into your server definition.");
          _config.scenarios = {
            default: _config.seeds
          };
        }

        this._config = _config;
        /**
          Mirage needs know the singular and plural versions of certain words for some of its APIs to work.
           For example, whenever you define a model
           ```js
          createServer({
            models: {
              post: Model
            }
          })
          ```
           Mirage will pluralize the word "post" and use it to create a `db.posts` database collection.
           To accomplish this, Mirage uses an object called an Inflector. An Inflector is an object with two methods, `singularize` and `pluralize`, that Mirage will call whenever it needs to inflect a word.
           Mirage has a default inflector, so if you write
           ```js
          createServer()
          ```
           you'll be using the node [inflected](https://github.com/martinandert/inflected#readme) package. This can be customized if you have irregular words or need to change the defaults. You can wead more in [the guide on customizing inflections](/docs/advanced/customizing-inflections).
           You typically should be able to make your customizations using the provided inflector. It's good to match any custom inflections your backend uses, as this will keep your Mirage code more consistent and simpler.
           You can also override the inflector completely and provide your own `pluralize` and `singularize` methods:
           ```js
          createServer({
            inflector: {
              pluralize(word) {
                // your logic
              },
              singularize(word) {
                // your logic
              }
            }
          })
          ```
        */

        this.inflector = _config.inflector || defaultInflector;

        this._container.register("inflector", this.inflector);
        /**
          Set to `true` or `false` to explicitly specify logging behavior.
           By default, server responses are logged in non-testing environments. Logging is disabled by default in testing, so as not to clutter CI test runner output.
           For example, to enable logging in tests, write the following:
           ```js
          test('I can view all users', function() {
            server.logging = true;
            server.create('user');
             visit('/users');
            // ...
          });
          ```
           You can also write a custom log message using the [Pretender server's `handledRequest` hook](https://github.com/pretenderjs/pretender#handled-requests). (You can access the pretender server from your Mirage server via `server.pretender`.)
           To override,
           ```js
          createServer({
            routes() {
              this.pretender.handledRequest = function(verb, path, request) {
                let { responseText } = request;
                // log request and response data
              }
            }
          })
          ```
           @property logging
          @return {Boolean}
          @public
        */


        this.logging = _config.logging !== undefined ? this.logging : undefined;
        this.testConfig = this.testConfig || undefined;
        this.trackRequests = _config.trackRequests;

        if (this.db) {
          this.db.registerIdentityManagers(_config.identityManagers);
        } else {
          this.db = this._container.create("Db", undefined, _config.identityManagers);
        }

        if (this.schema) {
          this.schema.registerModels(_config.models);
          this.serializerOrRegistry.registerSerializers(_config.serializers || {});
        } else {
          this.schema = this._container.create("Schema", this.db, _config.models);
          this.serializerOrRegistry = this._container.create("SerializerRegistry", this.schema, _config.serializers);
        }

        var hasFactories = this._hasModulesOfType(_config, "factories");

        var hasDefaultScenario = _config.scenarios && Object.prototype.hasOwnProperty.call(_config.scenarios, "default");

        if (_config.baseConfig) {
          this.loadConfig(_config.baseConfig);
        }

        if (this.isTest()) {
          this.loadConfig(_config.testConfig);

          if (typeof window !== "undefined") {
            window.server = this; // TODO: Better way to inject server into test env
          }
        }

        if (this.isTest() && hasFactories) {
          this.loadFactories(_config.factories);
        } else if (!this.isTest() && hasDefaultScenario) {
          this.loadFactories(_config.factories);

          _config.scenarios.default(this);
        } else {
          this.loadFixtures();
        }

        (_this$interceptor$sta = (_this$interceptor = this.interceptor).start) === null || _this$interceptor$sta === void 0 ? void 0 : _this$interceptor$sta.call(_this$interceptor);
      }
      /**
       * Determines if the current environment is the testing environment.
       *
       * @method isTest
       * @return {Boolean} True if the environment is 'test', false otherwise.
       * @public
       * @hide
       */

    }, {
      key: "isTest",
      value: function isTest() {
        return this.environment === "test";
      }
      /**
        Determines if the server should log.
         @method shouldLog
        @return The value of this.logging if defined, or false if in the testing environment,
        true otherwise.
        @public
        @hide
      */

    }, {
      key: "shouldLog",
      value: function shouldLog() {
        return typeof this.logging !== "undefined" ? this.logging : !this.isTest();
      }
      /**
       * Load the configuration given, setting timing to 0 if in the test
       * environment.
       *
       * @method loadConfig
       * @param {Object} config The configuration to load.
       * @public
       * @hide
       */

    }, {
      key: "loadConfig",
      value: function loadConfig(config) {
        config === null || config === void 0 ? void 0 : config.call(this);
        this.timing = this.isTest() ? 0 : this.timing || 0;
      } // TODO deprecate this in favor of direct call

    }, {
      key: "passthrough",
      value: function passthrough() {
        var _this$interceptor$pas, _this$interceptor2;

        for (var _len = arguments.length, paths = new Array(_len), _key = 0; _key < _len; _key++) {
          paths[_key] = arguments[_key];
        }

        (_this$interceptor$pas = (_this$interceptor2 = this.interceptor).passthrough) === null || _this$interceptor$pas === void 0 ? void 0 : _this$interceptor$pas.call.apply(_this$interceptor$pas, [_this$interceptor2].concat(paths));
      }
      /**
        By default, `fixtures` will be loaded during testing if you don't have factories defined, and during development if you don't have `seeds` defined. You can use `loadFixtures()` to also load fixture files in either of these environments, in addition to using factories to seed your database.
         `server.loadFixtures()` loads all the files, and `server.loadFixtures(file1, file2...)` loads selective fixture files.
         For example, in a test you may want to start out with all your fixture data loaded:
         ```js
        test('I can view the photos', function() {
          server.loadFixtures();
          server.createList('photo', 10);
           visit('/');
           andThen(() => {
            equal( find('img').length, 10 );
          });
        });
        ```
         or in development, you may want to load a few reference fixture files, and use factories to define the rest of your data:
         ```js
        createServer({
          ...,
          seeds(server) {
            server.loadFixtures('countries', 'states');
             let author = server.create('author');
            server.createList('post', 10, {author_id: author.id});
          }
        })
        ```
         @method loadFixtures
        @param {String} [...args] The name of the fixture to load.
        @public
      */

    }, {
      key: "loadFixtures",
      value: function loadFixtures() {
        var fixtures = this._config.fixtures;

        for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        if (args.length) {
          var camelizedArgs = args.map(camelize);
          var missingKeys = camelizedArgs.filter(function (key) {
            return !fixtures[key];
          });

          if (missingKeys.length) {
            throw new Error("Fixtures not found: ".concat(missingKeys.join(", ")));
          }

          fixtures = pick_1.apply(void 0, [fixtures].concat(_toConsumableArray(camelizedArgs)));
        }

        this.db.loadData(fixtures);
      }
      /*
        Factory methods
      */

      /**
       * Load factories into Mirage's database.
       *
       * @method loadFactories
       * @param {Object} factoryMap
       * @public
       * @hide
       */

    }, {
      key: "loadFactories",
      value: function loadFactories() {
        var _this = this;

        var factoryMap = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        // Store a reference to the factories
        var currentFactoryMap = this._factoryMap || {};
        this._factoryMap = assign_1(currentFactoryMap, factoryMap); // Create a collection for each factory

        Object.keys(factoryMap).forEach(function (type) {
          var collectionName = _this.schema.toCollectionName(type);

          _this.db.createCollection(collectionName);
        });
      }
      /**
       * Get the factory for a given type.
       *
       * @method factoryFor
       * @param {String} type
       * @private
       * @hide
       */

    }, {
      key: "factoryFor",
      value: function factoryFor(type) {
        var camelizedType = camelize(type);

        if (this._factoryMap && this._factoryMap[camelizedType]) {
          return this._factoryMap[camelizedType];
        }
      }
    }, {
      key: "build",
      value: function build(type) {
        for (var _len3 = arguments.length, traitsAndOverrides = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
          traitsAndOverrides[_key3 - 1] = arguments[_key3];
        }

        var traits = traitsAndOverrides.filter(function (arg) {
          return arg && typeof arg === "string";
        });
        var overrides = find_1(traitsAndOverrides, function (arg) {
          return isPlainObject$1(arg);
        });
        var camelizedType = camelize(type); // Store sequence for factory type as instance variable

        this.factorySequences = this.factorySequences || {};
        this.factorySequences[camelizedType] = this.factorySequences[camelizedType] + 1 || 0;
        var OriginalFactory = this.factoryFor(type);

        if (OriginalFactory) {
          OriginalFactory = OriginalFactory.extend({});
          var attrs = OriginalFactory.attrs || {};

          this._validateTraits(traits, OriginalFactory, type);

          var mergedExtensions = this._mergeExtensions(attrs, traits, overrides);

          this._mapAssociationsFromAttributes(type, attrs, overrides);

          this._mapAssociationsFromAttributes(type, mergedExtensions);

          var Factory = OriginalFactory.extend(mergedExtensions);
          var factory = new Factory();
          var sequence = this.factorySequences[camelizedType];
          return factory.build(sequence);
        } else {
          return overrides;
        }
      }
    }, {
      key: "buildList",
      value: function buildList(type, amount) {
        assert(isInteger_1(amount), "second argument has to be an integer, you passed: ".concat(_typeof(amount)));
        var list = [];

        for (var _len4 = arguments.length, traitsAndOverrides = new Array(_len4 > 2 ? _len4 - 2 : 0), _key4 = 2; _key4 < _len4; _key4++) {
          traitsAndOverrides[_key4 - 2] = arguments[_key4];
        }

        var buildArgs = [type].concat(traitsAndOverrides);

        for (var i = 0; i < amount; i++) {
          list.push(this.build.apply(this, buildArgs));
        }

        return list;
      }
      /**
        Generates a single model of type *type*, inserts it into the database (giving it an id), and returns the data that was
        added.
         ```js
        test("I can view a contact's details", function() {
          let contact = server.create('contact');
           visit('/contacts/' + contact.id);
           andThen(() => {
            equal( find('h1').text(), 'The contact is Link');
          });
        });
        ```
         You can override the attributes from the factory definition with a
        hash passed in as the second parameter. For example, if we had this factory
         ```js
        export default Factory.extend({
          name: 'Link'
        });
        ```
         we could override the name like this:
         ```js
        test("I can view the contacts", function() {
          server.create('contact', {name: 'Zelda'});
           visit('/');
           andThen(() => {
            equal( find('p').text(), 'Zelda' );
          });
        });
        ```
         @method create
        @param type the singularized type of the model
        @param traitsAndOverrides
        @public
      */

    }, {
      key: "create",
      value: function create(type) {
        var _this2 = this;

        assert(this._modelOrFactoryExistsForType(type), "You called server.create('".concat(type, "') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name.")); // When there is a Model defined, we should return an instance
        // of it instead of returning the bare attributes.

        for (var _len5 = arguments.length, options = new Array(_len5 > 1 ? _len5 - 1 : 0), _key5 = 1; _key5 < _len5; _key5++) {
          options[_key5 - 1] = arguments[_key5];
        }

        var traits = options.filter(function (arg) {
          return arg && typeof arg === "string";
        });
        var overrides = find_1(options, function (arg) {
          return isPlainObject$1(arg);
        });
        var collectionFromCreateList = find_1(options, function (arg) {
          return arg && Array.isArray(arg);
        });
        var attrs = this.build.apply(this, [type].concat(_toConsumableArray(traits), [overrides]));
        var modelOrRecord;

        if (this.schema && this.schema[this.schema.toCollectionName(type)]) {
          var modelClass = this.schema[this.schema.toCollectionName(type)];
          modelOrRecord = modelClass.create(attrs);
        } else {
          var collection, collectionName;

          if (collectionFromCreateList) {
            collection = collectionFromCreateList;
          } else {
            collectionName = this.schema ? this.schema.toInternalCollectionName(type) : "_".concat(this.inflector.pluralize(type));
            collection = this.db[collectionName];
          }

          assert(collection, "You called server.create('".concat(type, "') but no model or factory was found."));
          modelOrRecord = collection.insert(attrs);
        }

        var OriginalFactory = this.factoryFor(type);

        if (OriginalFactory) {
          OriginalFactory.extractAfterCreateCallbacks({
            traits: traits
          }).forEach(function (afterCreate) {
            afterCreate(modelOrRecord, _this2);
          });
        }

        return modelOrRecord;
      }
      /**
        Creates *amount* models of type *type*, optionally overriding the attributes from the factory with *attrs*.
         Returns the array of records that were added to the database.
         Here's an example from a test:
         ```js
        test("I can view the contacts", function() {
          server.createList('contact', 5);
          let youngContacts = server.createList('contact', 5, {age: 15});
           visit('/');
           andThen(function() {
            equal(currentRouteName(), 'index');
            equal( find('p').length, 10 );
          });
        });
        ```
         And one from setting up your development database:
         ```js
        createServer({
          seeds(server) {
            let contact = server.create('contact')
             server.createList('address', 5, { contact })
          }
        })
        ```
         @method createList
        @param type
        @param amount
        @param traitsAndOverrides
        @public
      */

    }, {
      key: "createList",
      value: function createList(type, amount) {
        assert(this._modelOrFactoryExistsForType(type), "You called server.createList('".concat(type, "') but no model or factory was found. Make sure you're passing in the singularized version of the model or factory name."));
        assert(isInteger_1(amount), "second argument has to be an integer, you passed: ".concat(_typeof(amount)));
        var list = [];
        var collectionName = this.schema ? this.schema.toInternalCollectionName(type) : "_".concat(this.inflector.pluralize(type));
        var collection = this.db[collectionName];

        for (var _len6 = arguments.length, traitsAndOverrides = new Array(_len6 > 2 ? _len6 - 2 : 0), _key6 = 2; _key6 < _len6; _key6++) {
          traitsAndOverrides[_key6 - 2] = arguments[_key6];
        }

        var createArguments = [type].concat(traitsAndOverrides, [collection]);

        for (var i = 0; i < amount; i++) {
          list.push(this.create.apply(this, createArguments));
        }

        return list;
      }
      /**
        Shutdown the server and stop intercepting network requests.
         @method shutdown
        @public
      */

    }, {
      key: "shutdown",
      value: function shutdown() {
        if (typeof window !== "undefined") {
          this.interceptor.shutdown();
        }

        if (typeof window !== "undefined" && this.environment === "test") {
          window.server = undefined;
        }
      }
    }, {
      key: "resource",
      value: function resource(resourceName) {
        var _this3 = this;

        var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
            only = _ref.only,
            except = _ref.except,
            path = _ref.path;

        resourceName = this.inflector.pluralize(resourceName);
        path = path || "/".concat(resourceName);
        only = only || [];
        except = except || [];

        if (only.length > 0 && except.length > 0) {
          throw "cannot use both :only and :except options";
        }

        var actionsMethodsAndsPathsMappings = {
          index: {
            methods: ["get"],
            path: "".concat(path)
          },
          show: {
            methods: ["get"],
            path: "".concat(path, "/:id")
          },
          create: {
            methods: ["post"],
            path: "".concat(path)
          },
          update: {
            methods: ["put", "patch"],
            path: "".concat(path, "/:id")
          },
          delete: {
            methods: ["del"],
            path: "".concat(path, "/:id")
          }
        };
        var allActions = Object.keys(actionsMethodsAndsPathsMappings);
        var actions = only.length > 0 && only || except.length > 0 && allActions.filter(function (action) {
          return except.indexOf(action) === -1;
        }) || allActions;
        actions.forEach(function (action) {
          var methodsWithPath = actionsMethodsAndsPathsMappings[action];
          methodsWithPath.methods.forEach(function (method) {
            return path === resourceName ? _this3[method](methodsWithPath.path) : _this3[method](methodsWithPath.path, resourceName);
          });
        });
      }
    }, {
      key: "_serialize",
      value: function _serialize(body) {
        if (typeof body === "string") {
          return body;
        } else {
          return JSON.stringify(body);
        }
      }
    }, {
      key: "registerRouteHandler",
      value: function registerRouteHandler(verb, path, rawHandler, customizedCode, options) {
        var _this4 = this;

        var middleware = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : this.middleware;

        var routeHandler = this._container.create("RouteHandler", {
          schema: this.schema,
          verb: verb,
          rawHandler: rawHandler,
          customizedCode: customizedCode,
          options: options,
          path: path,
          serializerOrRegistry: this.serializerOrRegistry,
          middleware: middleware
        });

        return function (request) {
          return routeHandler.handle(request).then(function (mirageResponse) {
            var _mirageResponse = _slicedToArray(mirageResponse, 3),
                code = _mirageResponse[0],
                headers = _mirageResponse[1],
                response = _mirageResponse[2];

            return [code, headers, _this4._serialize(response)];
          });
        };
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_hasModulesOfType",
      value: function _hasModulesOfType(modules, type) {
        var modulesOfType = modules[type];
        return modulesOfType ? Object.keys(modulesOfType).length > 0 : false;
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_typeIsPluralForModel",
      value: function _typeIsPluralForModel(typeOrCollectionName) {
        if (typeof isPluralForModelCache[typeOrCollectionName] !== "boolean") {
          var modelOrFactoryExists = this._modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName);

          var isPlural = typeOrCollectionName === this.inflector.pluralize(typeOrCollectionName);
          var isUncountable = this.inflector.singularize(typeOrCollectionName) === this.inflector.pluralize(typeOrCollectionName);
          var isPluralForModel = isPlural && !isUncountable && modelOrFactoryExists;
          isPluralForModelCache[typeOrCollectionName] = isPluralForModel;
        }

        return isPluralForModelCache[typeOrCollectionName];
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_modelOrFactoryExistsForType",
      value: function _modelOrFactoryExistsForType(type) {
        var modelExists = this.schema && this.schema.modelFor(camelize(type));
        var dbCollectionExists = this.db[this.schema.toInternalCollectionName(type)];
        return (modelExists || dbCollectionExists) && !this._typeIsPluralForModel(type);
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_modelOrFactoryExistsForTypeOrCollectionName",
      value: function _modelOrFactoryExistsForTypeOrCollectionName(typeOrCollectionName) {
        var modelExists = this.schema && this.schema.modelFor(camelize(typeOrCollectionName));
        var dbCollectionExists = this.db[this.schema.toInternalCollectionName(typeOrCollectionName)];
        return modelExists || dbCollectionExists;
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_validateTraits",
      value: function _validateTraits(traits, factory, type) {
        traits.forEach(function (traitName) {
          if (!factory.isTrait(traitName)) {
            throw new Error("'".concat(traitName, "' trait is not registered in '").concat(type, "' factory"));
          }
        });
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_mergeExtensions",
      value: function _mergeExtensions(attrs, traits, overrides) {
        var allExtensions = traits.map(function (traitName) {
          return attrs[traitName].extension;
        });
        allExtensions.push(overrides || {});
        return allExtensions.reduce(function (accum, extension) {
          return assign_1(accum, extension);
        }, {});
      }
      /**
       *
       * @private
       * @hide
       */

    }, {
      key: "_mapAssociationsFromAttributes",
      value: function _mapAssociationsFromAttributes(modelName, attributes) {
        var _this5 = this;

        var overrides = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        Object.keys(attributes || {}).filter(function (attr) {
          return isAssociation(attributes[attr]);
        }).forEach(function (attr) {
          var modelClass = _this5.schema.modelClassFor(modelName);

          var association = modelClass.associationFor(attr);
          assert(association && association instanceof BelongsTo, "You're using the `association` factory helper on the '".concat(attr, "' attribute of your ").concat(modelName, " factory, but that attribute is not a `belongsTo` association."));
          var isSelfReferentialBelongsTo = association && association instanceof BelongsTo && association.modelName === modelName;
          assert(!isSelfReferentialBelongsTo, "You're using the association() helper on your ".concat(modelName, " factory for ").concat(attr, ", which is a belongsTo self-referential relationship. You can't do this as it will lead to infinite recursion. You can move the helper inside of a trait and use it selectively."));
          var isPolymorphic = association && association.opts && association.opts.polymorphic;
          assert(!isPolymorphic, "You're using the association() helper on your ".concat(modelName, " factory for ").concat(attr, ", which is a polymorphic relationship. This is not currently supported."));
          var factoryAssociation = attributes[attr];
          var foreignKey = "".concat(camelize(attr), "Id");

          if (!overrides[attr]) {
            attributes[foreignKey] = _this5.create.apply(_this5, [association.modelName].concat(_toConsumableArray(factoryAssociation.traitsAndOverrides))).id;
          }

          delete attributes[attr];
        });
      }
    }]);

    return Server;
  }();

  var ActiveModelSerializer = Serializer$1.extend({
    serializeIds: "always",
    normalizeIds: true,
    keyForModel: function keyForModel(type) {
      return underscore(type);
    },
    keyForAttribute: function keyForAttribute(attr) {
      attr = Serializer$1.prototype.keyForAttribute.apply(this, arguments);
      return underscore(attr);
    },
    keyForRelationship: function keyForRelationship(type) {
      return this._container.inflector.pluralize(underscore(type));
    },
    keyForEmbeddedRelationship: function keyForEmbeddedRelationship(attributeName) {
      return underscore(attributeName);
    },
    keyForRelationshipIds: function keyForRelationshipIds(type) {
      return "".concat(underscore(this._container.inflector.singularize(type)), "_ids");
    },
    keyForForeignKey: function keyForForeignKey(relationshipName) {
      return "".concat(underscore(relationshipName), "_id");
    },
    keyForPolymorphicForeignKeyId: function keyForPolymorphicForeignKeyId(relationshipName) {
      return "".concat(underscore(relationshipName), "_id");
    },
    keyForPolymorphicForeignKeyType: function keyForPolymorphicForeignKeyType(relationshipName) {
      return "".concat(underscore(relationshipName), "_type");
    },
    normalize: function normalize(payload) {
      var _this = this;

      var type = Object.keys(payload)[0];
      var attrs = payload[type];
      var modelName = camelize(type);
      var modelClass = this.schema.modelClassFor(modelName);
      var belongsToAssociations = modelClass.belongsToAssociations,
          hasManyAssociations = modelClass.hasManyAssociations;
      var belongsToKeys = Object.keys(belongsToAssociations);
      var hasManyKeys = Object.keys(hasManyAssociations);

      if (this.primaryKey !== "id") {
        attrs.id = attrs[this.primaryKey];
        delete attrs[this.primaryKey];
      }

      var jsonApiPayload = {
        data: {
          type: this._container.inflector.pluralize(type),
          attributes: {}
        }
      };

      if (attrs.id) {
        jsonApiPayload.data.id = attrs.id;
      }

      var relationships = {};
      Object.keys(attrs).forEach(function (key) {
        if (key !== "id") {
          if (_this.normalizeIds) {
            if (belongsToKeys.includes(key)) {
              var association = belongsToAssociations[key];
              var associationModel = association.modelName;
              relationships[dasherize(key)] = {
                data: {
                  type: associationModel,
                  id: attrs[key]
                }
              };
            } else if (hasManyKeys.includes(key)) {
              var _association = hasManyAssociations[key];
              var _associationModel = _association.modelName;
              var data = attrs[key].map(function (id) {
                return {
                  type: _associationModel,
                  id: id
                };
              });
              relationships[dasherize(key)] = {
                data: data
              };
            } else {
              jsonApiPayload.data.attributes[dasherize(key)] = attrs[key];
            }
          } else {
            jsonApiPayload.data.attributes[dasherize(key)] = attrs[key];
          }
        }
      });

      if (Object.keys(relationships).length) {
        jsonApiPayload.data.relationships = relationships;
      }

      return jsonApiPayload;
    },
    getCoalescedIds: function getCoalescedIds(request) {
      return request.queryParams && request.queryParams.ids;
    }
  });

  var restSerializer = ActiveModelSerializer.extend({
    serializeIds: "always",
    keyForModel: function keyForModel(type) {
      return camelize(type);
    },
    keyForAttribute: function keyForAttribute(attr) {
      attr = ActiveModelSerializer.prototype.keyForAttribute.apply(this, arguments);
      return camelize(attr);
    },
    keyForRelationship: function keyForRelationship(type) {
      return camelize(this._container.inflector.pluralize(type));
    },
    keyForEmbeddedRelationship: function keyForEmbeddedRelationship(attributeName) {
      return camelize(attributeName);
    },
    keyForRelationshipIds: function keyForRelationshipIds(type) {
      return camelize(this._container.inflector.pluralize(type));
    },
    keyForForeignKey: function keyForForeignKey(relationshipName) {
      return camelize(this._container.inflector.singularize(relationshipName));
    },
    getCoalescedIds: function getCoalescedIds(request) {
      return request.queryParams && request.queryParams.ids;
    }
  });

  /**
    UUID generator

    @hide
  */
  function uuid () {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === "x" ? r : r & 0x3 | 0x8;
      return v.toString(16);
    });
  }

  /**
    @hide
  */

  function hasMany() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _construct(HasMany, args);
  }
  /**
    @hide
  */


  function belongsTo() {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    return _construct(BelongsTo, args);
  }
  var index = {
    Factory: Factory$1,
    Response: Response$1,
    hasMany: hasMany,
    belongsTo: belongsTo
  };

  exports.ActiveModelSerializer = ActiveModelSerializer;
  exports.Collection = Collection;
  exports.Factory = Factory$1;
  exports.IdentityManager = IdentityManager$1;
  exports.JSONAPISerializer = JsonApiSerializer;
  exports.Model = Model$1;
  exports.PretenderInterceptor = PretenderConfig;
  exports.Response = Response$1;
  exports.RestSerializer = restSerializer;
  exports.Serializer = Serializer$1;
  exports.Server = Server;
  exports._Db = Db$1;
  exports._DbCollection = DbCollection$1;
  exports._RouteHandler = RouteHandler;
  exports._SerializerRegistry = SerializerRegistry;
  exports._assert = assert;
  exports._ormAssociationsAssociation = Association;
  exports._ormAssociationsBelongsTo = BelongsTo;
  exports._ormAssociationsHasMany = HasMany;
  exports._ormPolymorphicCollection = PolymorphicCollection;
  exports._ormSchema = Schema;
  exports._routeHandlersBase = BaseRouteHandler;
  exports._routeHandlersFunction = FunctionRouteHandler;
  exports._routeHandlersObject = ObjectRouteHandler;
  exports._routeHandlersShorthandsBase = BaseShorthandRouteHandler;
  exports._routeHandlersShorthandsDelete = DeleteShorthandRouteHandler;
  exports._routeHandlersShorthandsGet = GetShorthandRouteHandler;
  exports._routeHandlersShorthandsHead = HeadShorthandRouteHandler;
  exports._routeHandlersShorthandsPost = PostShorthandRouteHandler;
  exports._routeHandlersShorthandsPut = PutShorthandRouteHandler;
  exports._utilsExtend = extend;
  exports._utilsInflectorCamelize = camelize;
  exports._utilsInflectorCapitalize = capitalize;
  exports._utilsInflectorDasherize = dasherize;
  exports._utilsInflectorUnderscore = underscore;
  exports._utilsIsAssociation = isAssociation;
  exports._utilsReferenceSort = referenceSort;
  exports._utilsUuid = uuid;
  exports.association = association$1;
  exports.belongsTo = belongsTo;
  exports.createServer = createServer;
  exports["default"] = index;
  exports.hasMany = hasMany;
  exports.trait = trait$1;

  Object.defineProperty(exports, '__esModule', { value: true });

}));

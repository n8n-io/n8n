var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var documentAll$2 = typeof document == 'object' && document.all;

// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot
// eslint-disable-next-line unicorn/no-typeof-undefined -- required for testing
var IS_HTMLDDA = typeof documentAll$2 == 'undefined' && documentAll$2 !== undefined;

var documentAll_1 = {
  all: documentAll$2,
  IS_HTMLDDA: IS_HTMLDDA
};

var $documentAll$1 = documentAll_1;

var documentAll$1 = $documentAll$1.all;

// `IsCallable` abstract operation
// https://tc39.es/ecma262/#sec-iscallable
var isCallable$e = $documentAll$1.IS_HTMLDDA ? function (argument) {
  return typeof argument == 'function' || argument === documentAll$1;
} : function (argument) {
  return typeof argument == 'function';
};

var objectDefineProperty = {};

var fails$b = function (exec) {
  try {
    return !!exec();
  } catch (error) {
    return true;
  }
};

var fails$a = fails$b;

// Detect IE8's incomplete defineProperty implementation
var descriptors = !fails$a(function () {
  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
  return Object.defineProperty({}, 1, { get: function () { return 7; } })[1] !== 7;
});

var check = function (it) {
  return it && it.Math === Math && it;
};

// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
var global$c =
  // eslint-disable-next-line es/no-global-this -- safe
  check(typeof globalThis == 'object' && globalThis) ||
  check(typeof window == 'object' && window) ||
  // eslint-disable-next-line no-restricted-globals -- safe
  check(typeof self == 'object' && self) ||
  check(typeof commonjsGlobal == 'object' && commonjsGlobal) ||
  // eslint-disable-next-line no-new-func -- fallback
  (function () { return this; })() || commonjsGlobal || Function('return this')();

var isCallable$d = isCallable$e;
var $documentAll = documentAll_1;

var documentAll = $documentAll.all;

var isObject$6 = $documentAll.IS_HTMLDDA ? function (it) {
  return typeof it == 'object' ? it !== null : isCallable$d(it) || it === documentAll;
} : function (it) {
  return typeof it == 'object' ? it !== null : isCallable$d(it);
};

var global$b = global$c;
var isObject$5 = isObject$6;

var document$1 = global$b.document;
// typeof document.createElement is 'object' in old IE
var EXISTS$1 = isObject$5(document$1) && isObject$5(document$1.createElement);

var documentCreateElement = function (it) {
  return EXISTS$1 ? document$1.createElement(it) : {};
};

var DESCRIPTORS$9 = descriptors;
var fails$9 = fails$b;
var createElement = documentCreateElement;

// Thanks to IE8 for its funny defineProperty
var ie8DomDefine = !DESCRIPTORS$9 && !fails$9(function () {
  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
  return Object.defineProperty(createElement('div'), 'a', {
    get: function () { return 7; }
  }).a !== 7;
});

var DESCRIPTORS$8 = descriptors;
var fails$8 = fails$b;

// V8 ~ Chrome 36-
// https://bugs.chromium.org/p/v8/issues/detail?id=3334
var v8PrototypeDefineBug = DESCRIPTORS$8 && fails$8(function () {
  // eslint-disable-next-line es/no-object-defineproperty -- required for testing
  return Object.defineProperty(function () { /* empty */ }, 'prototype', {
    value: 42,
    writable: false
  }).prototype !== 42;
});

var isObject$4 = isObject$6;

var $String$5 = String;
var $TypeError$8 = TypeError;

// `Assert: Type(argument) is Object`
var anObject$3 = function (argument) {
  if (isObject$4(argument)) return argument;
  throw new $TypeError$8($String$5(argument) + ' is not an object');
};

var fails$7 = fails$b;

var functionBindNative = !fails$7(function () {
  // eslint-disable-next-line es/no-function-prototype-bind -- safe
  var test = (function () { /* empty */ }).bind();
  // eslint-disable-next-line no-prototype-builtins -- safe
  return typeof test != 'function' || test.hasOwnProperty('prototype');
});

var NATIVE_BIND$1 = functionBindNative;

var call$4 = Function.prototype.call;

var functionCall = NATIVE_BIND$1 ? call$4.bind(call$4) : function () {
  return call$4.apply(call$4, arguments);
};

var global$a = global$c;
var isCallable$c = isCallable$e;

var aFunction = function (argument) {
  return isCallable$c(argument) ? argument : undefined;
};

var getBuiltIn$3 = function (namespace, method) {
  return arguments.length < 2 ? aFunction(global$a[namespace]) : global$a[namespace] && global$a[namespace][method];
};

var NATIVE_BIND = functionBindNative;

var FunctionPrototype$1 = Function.prototype;
var call$3 = FunctionPrototype$1.call;
var uncurryThisWithBind = NATIVE_BIND && FunctionPrototype$1.bind.bind(call$3, call$3);

var functionUncurryThis = NATIVE_BIND ? uncurryThisWithBind : function (fn) {
  return function () {
    return call$3.apply(fn, arguments);
  };
};

var uncurryThis$d = functionUncurryThis;

var objectIsPrototypeOf = uncurryThis$d({}.isPrototypeOf);

var engineUserAgent = typeof navigator != 'undefined' && String(navigator.userAgent) || '';

var global$9 = global$c;
var userAgent = engineUserAgent;

var process = global$9.process;
var Deno = global$9.Deno;
var versions = process && process.versions || Deno && Deno.version;
var v8 = versions && versions.v8;
var match, version;

if (v8) {
  match = v8.split('.');
  // in old Chrome, versions of V8 isn't V8 = Chrome / 10
  // but their correct versions are not interesting for us
  version = match[0] > 0 && match[0] < 4 ? 1 : +(match[0] + match[1]);
}

// BrowserFS NodeJS `process` polyfill incorrectly set `.v8` to `0.0`
// so check `userAgent` even if `.v8` exists, but 0
if (!version && userAgent) {
  match = userAgent.match(/Edge\/(\d+)/);
  if (!match || match[1] >= 74) {
    match = userAgent.match(/Chrome\/(\d+)/);
    if (match) version = +match[1];
  }
}

var engineV8Version = version;

/* eslint-disable es/no-symbol -- required for testing */
var V8_VERSION = engineV8Version;
var fails$6 = fails$b;
var global$8 = global$c;

var $String$4 = global$8.String;

// eslint-disable-next-line es/no-object-getownpropertysymbols -- required for testing
var symbolConstructorDetection = !!Object.getOwnPropertySymbols && !fails$6(function () {
  var symbol = Symbol('symbol detection');
  // Chrome 38 Symbol has incorrect toString conversion
  // `get-own-property-symbols` polyfill symbols converted to object are not Symbol instances
  // nb: Do not call `String` directly to avoid this being optimized out to `symbol+''` which will,
  // of course, fail.
  return !$String$4(symbol) || !(Object(symbol) instanceof Symbol) ||
    // Chrome 38-40 symbols are not inherited from DOM collections prototypes to instances
    !Symbol.sham && V8_VERSION && V8_VERSION < 41;
});

/* eslint-disable es/no-symbol -- required for testing */
var NATIVE_SYMBOL$1 = symbolConstructorDetection;

var useSymbolAsUid = NATIVE_SYMBOL$1
  && !Symbol.sham
  && typeof Symbol.iterator == 'symbol';

var getBuiltIn$2 = getBuiltIn$3;
var isCallable$b = isCallable$e;
var isPrototypeOf$1 = objectIsPrototypeOf;
var USE_SYMBOL_AS_UID$1 = useSymbolAsUid;

var $Object$4 = Object;

var isSymbol$2 = USE_SYMBOL_AS_UID$1 ? function (it) {
  return typeof it == 'symbol';
} : function (it) {
  var $Symbol = getBuiltIn$2('Symbol');
  return isCallable$b($Symbol) && isPrototypeOf$1($Symbol.prototype, $Object$4(it));
};

var $String$3 = String;

var tryToString$2 = function (argument) {
  try {
    return $String$3(argument);
  } catch (error) {
    return 'Object';
  }
};

var isCallable$a = isCallable$e;
var tryToString$1 = tryToString$2;

var $TypeError$7 = TypeError;

// `Assert: IsCallable(argument) is true`
var aCallable$3 = function (argument) {
  if (isCallable$a(argument)) return argument;
  throw new $TypeError$7(tryToString$1(argument) + ' is not a function');
};

// we can't use just `it == null` since of `document.all` special case
// https://tc39.es/ecma262/#sec-IsHTMLDDA-internal-slot-aec
var isNullOrUndefined$2 = function (it) {
  return it === null || it === undefined;
};

var aCallable$2 = aCallable$3;
var isNullOrUndefined$1 = isNullOrUndefined$2;

// `GetMethod` abstract operation
// https://tc39.es/ecma262/#sec-getmethod
var getMethod$1 = function (V, P) {
  var func = V[P];
  return isNullOrUndefined$1(func) ? undefined : aCallable$2(func);
};

var call$2 = functionCall;
var isCallable$9 = isCallable$e;
var isObject$3 = isObject$6;

var $TypeError$6 = TypeError;

// `OrdinaryToPrimitive` abstract operation
// https://tc39.es/ecma262/#sec-ordinarytoprimitive
var ordinaryToPrimitive$1 = function (input, pref) {
  var fn, val;
  if (pref === 'string' && isCallable$9(fn = input.toString) && !isObject$3(val = call$2(fn, input))) return val;
  if (isCallable$9(fn = input.valueOf) && !isObject$3(val = call$2(fn, input))) return val;
  if (pref !== 'string' && isCallable$9(fn = input.toString) && !isObject$3(val = call$2(fn, input))) return val;
  throw new $TypeError$6("Can't convert object to primitive value");
};

var shared$3 = {exports: {}};

var isPure = false;

var global$7 = global$c;

// eslint-disable-next-line es/no-object-defineproperty -- safe
var defineProperty$2 = Object.defineProperty;

var defineGlobalProperty$3 = function (key, value) {
  try {
    defineProperty$2(global$7, key, { value: value, configurable: true, writable: true });
  } catch (error) {
    global$7[key] = value;
  } return value;
};

var global$6 = global$c;
var defineGlobalProperty$2 = defineGlobalProperty$3;

var SHARED = '__core-js_shared__';
var store$3 = global$6[SHARED] || defineGlobalProperty$2(SHARED, {});

var sharedStore = store$3;

var store$2 = sharedStore;

(shared$3.exports = function (key, value) {
  return store$2[key] || (store$2[key] = value !== undefined ? value : {});
})('versions', []).push({
  version: '3.33.2',
  mode: 'global',
  copyright: '© 2014-2023 Denis Pushkarev (zloirock.ru)',
  license: 'https://github.com/zloirock/core-js/blob/v3.33.2/LICENSE',
  source: 'https://github.com/zloirock/core-js'
});

var sharedExports = shared$3.exports;

var isNullOrUndefined = isNullOrUndefined$2;

var $TypeError$5 = TypeError;

// `RequireObjectCoercible` abstract operation
// https://tc39.es/ecma262/#sec-requireobjectcoercible
var requireObjectCoercible$2 = function (it) {
  if (isNullOrUndefined(it)) throw new $TypeError$5("Can't call method on " + it);
  return it;
};

var requireObjectCoercible$1 = requireObjectCoercible$2;

var $Object$3 = Object;

// `ToObject` abstract operation
// https://tc39.es/ecma262/#sec-toobject
var toObject$2 = function (argument) {
  return $Object$3(requireObjectCoercible$1(argument));
};

var uncurryThis$c = functionUncurryThis;
var toObject$1 = toObject$2;

var hasOwnProperty = uncurryThis$c({}.hasOwnProperty);

// `HasOwnProperty` abstract operation
// https://tc39.es/ecma262/#sec-hasownproperty
// eslint-disable-next-line es/no-object-hasown -- safe
var hasOwnProperty_1 = Object.hasOwn || function hasOwn(it, key) {
  return hasOwnProperty(toObject$1(it), key);
};

var uncurryThis$b = functionUncurryThis;

var id = 0;
var postfix = Math.random();
var toString$5 = uncurryThis$b(1.0.toString);

var uid$3 = function (key) {
  return 'Symbol(' + (key === undefined ? '' : key) + ')_' + toString$5(++id + postfix, 36);
};

var global$5 = global$c;
var shared$2 = sharedExports;
var hasOwn$8 = hasOwnProperty_1;
var uid$2 = uid$3;
var NATIVE_SYMBOL = symbolConstructorDetection;
var USE_SYMBOL_AS_UID = useSymbolAsUid;

var Symbol$1 = global$5.Symbol;
var WellKnownSymbolsStore = shared$2('wks');
var createWellKnownSymbol = USE_SYMBOL_AS_UID ? Symbol$1['for'] || Symbol$1 : Symbol$1 && Symbol$1.withoutSetter || uid$2;

var wellKnownSymbol$5 = function (name) {
  if (!hasOwn$8(WellKnownSymbolsStore, name)) {
    WellKnownSymbolsStore[name] = NATIVE_SYMBOL && hasOwn$8(Symbol$1, name)
      ? Symbol$1[name]
      : createWellKnownSymbol('Symbol.' + name);
  } return WellKnownSymbolsStore[name];
};

var call$1 = functionCall;
var isObject$2 = isObject$6;
var isSymbol$1 = isSymbol$2;
var getMethod = getMethod$1;
var ordinaryToPrimitive = ordinaryToPrimitive$1;
var wellKnownSymbol$4 = wellKnownSymbol$5;

var $TypeError$4 = TypeError;
var TO_PRIMITIVE = wellKnownSymbol$4('toPrimitive');

// `ToPrimitive` abstract operation
// https://tc39.es/ecma262/#sec-toprimitive
var toPrimitive$2 = function (input, pref) {
  if (!isObject$2(input) || isSymbol$1(input)) return input;
  var exoticToPrim = getMethod(input, TO_PRIMITIVE);
  var result;
  if (exoticToPrim) {
    if (pref === undefined) pref = 'default';
    result = call$1(exoticToPrim, input, pref);
    if (!isObject$2(result) || isSymbol$1(result)) return result;
    throw new $TypeError$4("Can't convert object to primitive value");
  }
  if (pref === undefined) pref = 'number';
  return ordinaryToPrimitive(input, pref);
};

var toPrimitive$1 = toPrimitive$2;
var isSymbol = isSymbol$2;

// `ToPropertyKey` abstract operation
// https://tc39.es/ecma262/#sec-topropertykey
var toPropertyKey$2 = function (argument) {
  var key = toPrimitive$1(argument, 'string');
  return isSymbol(key) ? key : key + '';
};

var DESCRIPTORS$7 = descriptors;
var IE8_DOM_DEFINE$1 = ie8DomDefine;
var V8_PROTOTYPE_DEFINE_BUG = v8PrototypeDefineBug;
var anObject$2 = anObject$3;
var toPropertyKey$1 = toPropertyKey$2;

var $TypeError$3 = TypeError;
// eslint-disable-next-line es/no-object-defineproperty -- safe
var $defineProperty = Object.defineProperty;
// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
var $getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;
var ENUMERABLE = 'enumerable';
var CONFIGURABLE$1 = 'configurable';
var WRITABLE = 'writable';

// `Object.defineProperty` method
// https://tc39.es/ecma262/#sec-object.defineproperty
objectDefineProperty.f = DESCRIPTORS$7 ? V8_PROTOTYPE_DEFINE_BUG ? function defineProperty(O, P, Attributes) {
  anObject$2(O);
  P = toPropertyKey$1(P);
  anObject$2(Attributes);
  if (typeof O === 'function' && P === 'prototype' && 'value' in Attributes && WRITABLE in Attributes && !Attributes[WRITABLE]) {
    var current = $getOwnPropertyDescriptor$1(O, P);
    if (current && current[WRITABLE]) {
      O[P] = Attributes.value;
      Attributes = {
        configurable: CONFIGURABLE$1 in Attributes ? Attributes[CONFIGURABLE$1] : current[CONFIGURABLE$1],
        enumerable: ENUMERABLE in Attributes ? Attributes[ENUMERABLE] : current[ENUMERABLE],
        writable: false
      };
    }
  } return $defineProperty(O, P, Attributes);
} : $defineProperty : function defineProperty(O, P, Attributes) {
  anObject$2(O);
  P = toPropertyKey$1(P);
  anObject$2(Attributes);
  if (IE8_DOM_DEFINE$1) try {
    return $defineProperty(O, P, Attributes);
  } catch (error) { /* empty */ }
  if ('get' in Attributes || 'set' in Attributes) throw new $TypeError$3('Accessors not supported');
  if ('value' in Attributes) O[P] = Attributes.value;
  return O;
};

var makeBuiltIn$3 = {exports: {}};

var DESCRIPTORS$6 = descriptors;
var hasOwn$7 = hasOwnProperty_1;

var FunctionPrototype = Function.prototype;
// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
var getDescriptor = DESCRIPTORS$6 && Object.getOwnPropertyDescriptor;

var EXISTS = hasOwn$7(FunctionPrototype, 'name');
// additional protection from minified / mangled / dropped function names
var PROPER = EXISTS && (function something() { /* empty */ }).name === 'something';
var CONFIGURABLE = EXISTS && (!DESCRIPTORS$6 || (DESCRIPTORS$6 && getDescriptor(FunctionPrototype, 'name').configurable));

var functionName = {
  EXISTS: EXISTS,
  PROPER: PROPER,
  CONFIGURABLE: CONFIGURABLE
};

var uncurryThis$a = functionUncurryThis;
var isCallable$8 = isCallable$e;
var store$1 = sharedStore;

var functionToString = uncurryThis$a(Function.toString);

// this helper broken in `core-js@3.4.1-3.4.4`, so we can't use `shared` helper
if (!isCallable$8(store$1.inspectSource)) {
  store$1.inspectSource = function (it) {
    return functionToString(it);
  };
}

var inspectSource$1 = store$1.inspectSource;

var global$4 = global$c;
var isCallable$7 = isCallable$e;

var WeakMap$1 = global$4.WeakMap;

var weakMapBasicDetection = isCallable$7(WeakMap$1) && /native code/.test(String(WeakMap$1));

var createPropertyDescriptor$2 = function (bitmap, value) {
  return {
    enumerable: !(bitmap & 1),
    configurable: !(bitmap & 2),
    writable: !(bitmap & 4),
    value: value
  };
};

var DESCRIPTORS$5 = descriptors;
var definePropertyModule$2 = objectDefineProperty;
var createPropertyDescriptor$1 = createPropertyDescriptor$2;

var createNonEnumerableProperty$3 = DESCRIPTORS$5 ? function (object, key, value) {
  return definePropertyModule$2.f(object, key, createPropertyDescriptor$1(1, value));
} : function (object, key, value) {
  object[key] = value;
  return object;
};

var shared$1 = sharedExports;
var uid$1 = uid$3;

var keys = shared$1('keys');

var sharedKey$2 = function (key) {
  return keys[key] || (keys[key] = uid$1(key));
};

var hiddenKeys$3 = {};

var NATIVE_WEAK_MAP = weakMapBasicDetection;
var global$3 = global$c;
var isObject$1 = isObject$6;
var createNonEnumerableProperty$2 = createNonEnumerableProperty$3;
var hasOwn$6 = hasOwnProperty_1;
var shared = sharedStore;
var sharedKey$1 = sharedKey$2;
var hiddenKeys$2 = hiddenKeys$3;

var OBJECT_ALREADY_INITIALIZED = 'Object already initialized';
var TypeError$2 = global$3.TypeError;
var WeakMap = global$3.WeakMap;
var set, get, has;

var enforce = function (it) {
  return has(it) ? get(it) : set(it, {});
};

var getterFor = function (TYPE) {
  return function (it) {
    var state;
    if (!isObject$1(it) || (state = get(it)).type !== TYPE) {
      throw new TypeError$2('Incompatible receiver, ' + TYPE + ' required');
    } return state;
  };
};

if (NATIVE_WEAK_MAP || shared.state) {
  var store = shared.state || (shared.state = new WeakMap());
  /* eslint-disable no-self-assign -- prototype methods protection */
  store.get = store.get;
  store.has = store.has;
  store.set = store.set;
  /* eslint-enable no-self-assign -- prototype methods protection */
  set = function (it, metadata) {
    if (store.has(it)) throw new TypeError$2(OBJECT_ALREADY_INITIALIZED);
    metadata.facade = it;
    store.set(it, metadata);
    return metadata;
  };
  get = function (it) {
    return store.get(it) || {};
  };
  has = function (it) {
    return store.has(it);
  };
} else {
  var STATE = sharedKey$1('state');
  hiddenKeys$2[STATE] = true;
  set = function (it, metadata) {
    if (hasOwn$6(it, STATE)) throw new TypeError$2(OBJECT_ALREADY_INITIALIZED);
    metadata.facade = it;
    createNonEnumerableProperty$2(it, STATE, metadata);
    return metadata;
  };
  get = function (it) {
    return hasOwn$6(it, STATE) ? it[STATE] : {};
  };
  has = function (it) {
    return hasOwn$6(it, STATE);
  };
}

var internalState = {
  set: set,
  get: get,
  has: has,
  enforce: enforce,
  getterFor: getterFor
};

var uncurryThis$9 = functionUncurryThis;
var fails$5 = fails$b;
var isCallable$6 = isCallable$e;
var hasOwn$5 = hasOwnProperty_1;
var DESCRIPTORS$4 = descriptors;
var CONFIGURABLE_FUNCTION_NAME = functionName.CONFIGURABLE;
var inspectSource = inspectSource$1;
var InternalStateModule$1 = internalState;

var enforceInternalState$1 = InternalStateModule$1.enforce;
var getInternalState$1 = InternalStateModule$1.get;
var $String$2 = String;
// eslint-disable-next-line es/no-object-defineproperty -- safe
var defineProperty$1 = Object.defineProperty;
var stringSlice$1 = uncurryThis$9(''.slice);
var replace = uncurryThis$9(''.replace);
var join = uncurryThis$9([].join);

var CONFIGURABLE_LENGTH = DESCRIPTORS$4 && !fails$5(function () {
  return defineProperty$1(function () { /* empty */ }, 'length', { value: 8 }).length !== 8;
});

var TEMPLATE = String(String).split('String');

var makeBuiltIn$2 = makeBuiltIn$3.exports = function (value, name, options) {
  if (stringSlice$1($String$2(name), 0, 7) === 'Symbol(') {
    name = '[' + replace($String$2(name), /^Symbol\(([^)]*)\)/, '$1') + ']';
  }
  if (options && options.getter) name = 'get ' + name;
  if (options && options.setter) name = 'set ' + name;
  if (!hasOwn$5(value, 'name') || (CONFIGURABLE_FUNCTION_NAME && value.name !== name)) {
    if (DESCRIPTORS$4) defineProperty$1(value, 'name', { value: name, configurable: true });
    else value.name = name;
  }
  if (CONFIGURABLE_LENGTH && options && hasOwn$5(options, 'arity') && value.length !== options.arity) {
    defineProperty$1(value, 'length', { value: options.arity });
  }
  try {
    if (options && hasOwn$5(options, 'constructor') && options.constructor) {
      if (DESCRIPTORS$4) defineProperty$1(value, 'prototype', { writable: false });
    // in V8 ~ Chrome 53, prototypes of some methods, like `Array.prototype.values`, are non-writable
    } else if (value.prototype) value.prototype = undefined;
  } catch (error) { /* empty */ }
  var state = enforceInternalState$1(value);
  if (!hasOwn$5(state, 'source')) {
    state.source = join(TEMPLATE, typeof name == 'string' ? name : '');
  } return value;
};

// add fake Function#toString for correct work wrapped methods / constructors with methods like LoDash isNative
// eslint-disable-next-line no-extend-native -- required
Function.prototype.toString = makeBuiltIn$2(function toString() {
  return isCallable$6(this) && getInternalState$1(this).source || inspectSource(this);
}, 'toString');

var makeBuiltInExports = makeBuiltIn$3.exports;

var isCallable$5 = isCallable$e;
var definePropertyModule$1 = objectDefineProperty;
var makeBuiltIn$1 = makeBuiltInExports;
var defineGlobalProperty$1 = defineGlobalProperty$3;

var defineBuiltIn$4 = function (O, key, value, options) {
  if (!options) options = {};
  var simple = options.enumerable;
  var name = options.name !== undefined ? options.name : key;
  if (isCallable$5(value)) makeBuiltIn$1(value, name, options);
  if (options.global) {
    if (simple) O[key] = value;
    else defineGlobalProperty$1(key, value);
  } else {
    try {
      if (!options.unsafe) delete O[key];
      else if (O[key]) simple = true;
    } catch (error) { /* empty */ }
    if (simple) O[key] = value;
    else definePropertyModule$1.f(O, key, {
      value: value,
      enumerable: false,
      configurable: !options.nonConfigurable,
      writable: !options.nonWritable
    });
  } return O;
};

var wellKnownSymbol$3 = wellKnownSymbol$5;

var TO_STRING_TAG$2 = wellKnownSymbol$3('toStringTag');
var test = {};

test[TO_STRING_TAG$2] = 'z';

var toStringTagSupport = String(test) === '[object z]';

var uncurryThis$8 = functionUncurryThis;

var toString$4 = uncurryThis$8({}.toString);
var stringSlice = uncurryThis$8(''.slice);

var classofRaw$1 = function (it) {
  return stringSlice(toString$4(it), 8, -1);
};

var TO_STRING_TAG_SUPPORT = toStringTagSupport;
var isCallable$4 = isCallable$e;
var classofRaw = classofRaw$1;
var wellKnownSymbol$2 = wellKnownSymbol$5;

var TO_STRING_TAG$1 = wellKnownSymbol$2('toStringTag');
var $Object$2 = Object;

// ES3 wrong here
var CORRECT_ARGUMENTS = classofRaw(function () { return arguments; }()) === 'Arguments';

// fallback for IE11 Script Access Denied error
var tryGet = function (it, key) {
  try {
    return it[key];
  } catch (error) { /* empty */ }
};

// getting tag from ES6+ `Object.prototype.toString`
var classof$4 = TO_STRING_TAG_SUPPORT ? classofRaw : function (it) {
  var O, tag, result;
  return it === undefined ? 'Undefined' : it === null ? 'Null'
    // @@toStringTag case
    : typeof (tag = tryGet(O = $Object$2(it), TO_STRING_TAG$1)) == 'string' ? tag
    // builtinTag case
    : CORRECT_ARGUMENTS ? classofRaw(O)
    // ES3 arguments fallback
    : (result = classofRaw(O)) === 'Object' && isCallable$4(O.callee) ? 'Arguments' : result;
};

var classof$3 = classof$4;

var $String$1 = String;

var toString$3 = function (argument) {
  if (classof$3(argument) === 'Symbol') throw new TypeError('Cannot convert a Symbol value to a string');
  return $String$1(argument);
};

var $TypeError$2 = TypeError;

var validateArgumentsLength$3 = function (passed, required) {
  if (passed < required) throw new $TypeError$2('Not enough arguments');
  return passed;
};

var defineBuiltIn$3 = defineBuiltIn$4;
var uncurryThis$7 = functionUncurryThis;
var toString$2 = toString$3;
var validateArgumentsLength$2 = validateArgumentsLength$3;

var $URLSearchParams$1 = URLSearchParams;
var URLSearchParamsPrototype$2 = $URLSearchParams$1.prototype;
var append = uncurryThis$7(URLSearchParamsPrototype$2.append);
var $delete = uncurryThis$7(URLSearchParamsPrototype$2['delete']);
var forEach$1 = uncurryThis$7(URLSearchParamsPrototype$2.forEach);
var push$1 = uncurryThis$7([].push);
var params$1 = new $URLSearchParams$1('a=1&a=2&b=3');

params$1['delete']('a', 1);
// `undefined` case is a Chromium 117 bug
// https://bugs.chromium.org/p/v8/issues/detail?id=14222
params$1['delete']('b', undefined);

if (params$1 + '' !== 'a=2') {
  defineBuiltIn$3(URLSearchParamsPrototype$2, 'delete', function (name /* , value */) {
    var length = arguments.length;
    var $value = length < 2 ? undefined : arguments[1];
    if (length && $value === undefined) return $delete(this, name);
    var entries = [];
    forEach$1(this, function (v, k) { // also validates `this`
      push$1(entries, { key: k, value: v });
    });
    validateArgumentsLength$2(length, 1);
    var key = toString$2(name);
    var value = toString$2($value);
    var index = 0;
    var dindex = 0;
    var found = false;
    var entriesLength = entries.length;
    var entry;
    while (index < entriesLength) {
      entry = entries[index++];
      if (found || entry.key === key) {
        found = true;
        $delete(this, entry.key);
      } else dindex++;
    }
    while (dindex < entriesLength) {
      entry = entries[dindex++];
      if (!(entry.key === key && entry.value === value)) append(this, entry.key, entry.value);
    }
  }, { enumerable: true, unsafe: true });
}

var defineBuiltIn$2 = defineBuiltIn$4;
var uncurryThis$6 = functionUncurryThis;
var toString$1 = toString$3;
var validateArgumentsLength$1 = validateArgumentsLength$3;

var $URLSearchParams = URLSearchParams;
var URLSearchParamsPrototype$1 = $URLSearchParams.prototype;
var getAll = uncurryThis$6(URLSearchParamsPrototype$1.getAll);
var $has = uncurryThis$6(URLSearchParamsPrototype$1.has);
var params = new $URLSearchParams('a=1');

// `undefined` case is a Chromium 117 bug
// https://bugs.chromium.org/p/v8/issues/detail?id=14222
if (params.has('a', 2) || !params.has('a', undefined)) {
  defineBuiltIn$2(URLSearchParamsPrototype$1, 'has', function has(name /* , value */) {
    var length = arguments.length;
    var $value = length < 2 ? undefined : arguments[1];
    if (length && $value === undefined) return $has(this, name);
    var values = getAll(this, name); // also validates `this`
    validateArgumentsLength$1(length, 1);
    var value = toString$1($value);
    var index = 0;
    while (index < values.length) {
      if (values[index++] === value) return true;
    } return false;
  }, { enumerable: true, unsafe: true });
}

var makeBuiltIn = makeBuiltInExports;
var defineProperty = objectDefineProperty;

var defineBuiltInAccessor$2 = function (target, name, descriptor) {
  if (descriptor.get) makeBuiltIn(descriptor.get, name, { getter: true });
  if (descriptor.set) makeBuiltIn(descriptor.set, name, { setter: true });
  return defineProperty.f(target, name, descriptor);
};

var DESCRIPTORS$3 = descriptors;
var uncurryThis$5 = functionUncurryThis;
var defineBuiltInAccessor$1 = defineBuiltInAccessor$2;

var URLSearchParamsPrototype = URLSearchParams.prototype;
var forEach = uncurryThis$5(URLSearchParamsPrototype.forEach);

// `URLSearchParams.prototype.size` getter
// https://github.com/whatwg/url/pull/734
if (DESCRIPTORS$3 && !('size' in URLSearchParamsPrototype)) {
  defineBuiltInAccessor$1(URLSearchParamsPrototype, 'size', {
    get: function size() {
      var count = 0;
      forEach(this, function () { count++; });
      return count;
    },
    configurable: true,
    enumerable: true
  });
}

var objectGetOwnPropertyDescriptor = {};

var objectPropertyIsEnumerable = {};

var $propertyIsEnumerable = {}.propertyIsEnumerable;
// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
var getOwnPropertyDescriptor$1 = Object.getOwnPropertyDescriptor;

// Nashorn ~ JDK8 bug
var NASHORN_BUG = getOwnPropertyDescriptor$1 && !$propertyIsEnumerable.call({ 1: 2 }, 1);

// `Object.prototype.propertyIsEnumerable` method implementation
// https://tc39.es/ecma262/#sec-object.prototype.propertyisenumerable
objectPropertyIsEnumerable.f = NASHORN_BUG ? function propertyIsEnumerable(V) {
  var descriptor = getOwnPropertyDescriptor$1(this, V);
  return !!descriptor && descriptor.enumerable;
} : $propertyIsEnumerable;

var uncurryThis$4 = functionUncurryThis;
var fails$4 = fails$b;
var classof$2 = classofRaw$1;

var $Object$1 = Object;
var split = uncurryThis$4(''.split);

// fallback for non-array-like ES3 and non-enumerable old V8 strings
var indexedObject = fails$4(function () {
  // throws an error in rhino, see https://github.com/mozilla/rhino/issues/346
  // eslint-disable-next-line no-prototype-builtins -- safe
  return !$Object$1('z').propertyIsEnumerable(0);
}) ? function (it) {
  return classof$2(it) === 'String' ? split(it, '') : $Object$1(it);
} : $Object$1;

// toObject with fallback for non-array-like ES3 strings
var IndexedObject = indexedObject;
var requireObjectCoercible = requireObjectCoercible$2;

var toIndexedObject$3 = function (it) {
  return IndexedObject(requireObjectCoercible(it));
};

var DESCRIPTORS$2 = descriptors;
var call = functionCall;
var propertyIsEnumerableModule = objectPropertyIsEnumerable;
var createPropertyDescriptor = createPropertyDescriptor$2;
var toIndexedObject$2 = toIndexedObject$3;
var toPropertyKey = toPropertyKey$2;
var hasOwn$4 = hasOwnProperty_1;
var IE8_DOM_DEFINE = ie8DomDefine;

// eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
var $getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

// `Object.getOwnPropertyDescriptor` method
// https://tc39.es/ecma262/#sec-object.getownpropertydescriptor
objectGetOwnPropertyDescriptor.f = DESCRIPTORS$2 ? $getOwnPropertyDescriptor : function getOwnPropertyDescriptor(O, P) {
  O = toIndexedObject$2(O);
  P = toPropertyKey(P);
  if (IE8_DOM_DEFINE) try {
    return $getOwnPropertyDescriptor(O, P);
  } catch (error) { /* empty */ }
  if (hasOwn$4(O, P)) return createPropertyDescriptor(!call(propertyIsEnumerableModule.f, O, P), O[P]);
};

var objectGetOwnPropertyNames = {};

var ceil = Math.ceil;
var floor = Math.floor;

// `Math.trunc` method
// https://tc39.es/ecma262/#sec-math.trunc
// eslint-disable-next-line es/no-math-trunc -- safe
var mathTrunc = Math.trunc || function trunc(x) {
  var n = +x;
  return (n > 0 ? floor : ceil)(n);
};

var trunc = mathTrunc;

// `ToIntegerOrInfinity` abstract operation
// https://tc39.es/ecma262/#sec-tointegerorinfinity
var toIntegerOrInfinity$4 = function (argument) {
  var number = +argument;
  // eslint-disable-next-line no-self-compare -- NaN check
  return number !== number || number === 0 ? 0 : trunc(number);
};

var toIntegerOrInfinity$3 = toIntegerOrInfinity$4;

var max = Math.max;
var min$1 = Math.min;

// Helper for a popular repeating case of the spec:
// Let integer be ? ToInteger(index).
// If integer < 0, let result be max((length + integer), 0); else let result be min(integer, length).
var toAbsoluteIndex$1 = function (index, length) {
  var integer = toIntegerOrInfinity$3(index);
  return integer < 0 ? max(integer + length, 0) : min$1(integer, length);
};

var toIntegerOrInfinity$2 = toIntegerOrInfinity$4;

var min = Math.min;

// `ToLength` abstract operation
// https://tc39.es/ecma262/#sec-tolength
var toLength$1 = function (argument) {
  return argument > 0 ? min(toIntegerOrInfinity$2(argument), 0x1FFFFFFFFFFFFF) : 0; // 2 ** 53 - 1 == 9007199254740991
};

var toLength = toLength$1;

// `LengthOfArrayLike` abstract operation
// https://tc39.es/ecma262/#sec-lengthofarraylike
var lengthOfArrayLike$4 = function (obj) {
  return toLength(obj.length);
};

var toIndexedObject$1 = toIndexedObject$3;
var toAbsoluteIndex = toAbsoluteIndex$1;
var lengthOfArrayLike$3 = lengthOfArrayLike$4;

// `Array.prototype.{ indexOf, includes }` methods implementation
var createMethod = function (IS_INCLUDES) {
  return function ($this, el, fromIndex) {
    var O = toIndexedObject$1($this);
    var length = lengthOfArrayLike$3(O);
    var index = toAbsoluteIndex(fromIndex, length);
    var value;
    // Array#includes uses SameValueZero equality algorithm
    // eslint-disable-next-line no-self-compare -- NaN check
    if (IS_INCLUDES && el !== el) while (length > index) {
      value = O[index++];
      // eslint-disable-next-line no-self-compare -- NaN check
      if (value !== value) return true;
    // Array#indexOf ignores holes, Array#includes - not
    } else for (;length > index; index++) {
      if ((IS_INCLUDES || index in O) && O[index] === el) return IS_INCLUDES || index || 0;
    } return !IS_INCLUDES && -1;
  };
};

var arrayIncludes = {
  // `Array.prototype.includes` method
  // https://tc39.es/ecma262/#sec-array.prototype.includes
  includes: createMethod(true),
  // `Array.prototype.indexOf` method
  // https://tc39.es/ecma262/#sec-array.prototype.indexof
  indexOf: createMethod(false)
};

var uncurryThis$3 = functionUncurryThis;
var hasOwn$3 = hasOwnProperty_1;
var toIndexedObject = toIndexedObject$3;
var indexOf = arrayIncludes.indexOf;
var hiddenKeys$1 = hiddenKeys$3;

var push = uncurryThis$3([].push);

var objectKeysInternal = function (object, names) {
  var O = toIndexedObject(object);
  var i = 0;
  var result = [];
  var key;
  for (key in O) !hasOwn$3(hiddenKeys$1, key) && hasOwn$3(O, key) && push(result, key);
  // Don't enum bug & hidden keys
  while (names.length > i) if (hasOwn$3(O, key = names[i++])) {
    ~indexOf(result, key) || push(result, key);
  }
  return result;
};

// IE8- don't enum bug keys
var enumBugKeys$1 = [
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf'
];

var internalObjectKeys = objectKeysInternal;
var enumBugKeys = enumBugKeys$1;

var hiddenKeys = enumBugKeys.concat('length', 'prototype');

// `Object.getOwnPropertyNames` method
// https://tc39.es/ecma262/#sec-object.getownpropertynames
// eslint-disable-next-line es/no-object-getownpropertynames -- safe
objectGetOwnPropertyNames.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
  return internalObjectKeys(O, hiddenKeys);
};

var objectGetOwnPropertySymbols = {};

// eslint-disable-next-line es/no-object-getownpropertysymbols -- safe
objectGetOwnPropertySymbols.f = Object.getOwnPropertySymbols;

var getBuiltIn$1 = getBuiltIn$3;
var uncurryThis$2 = functionUncurryThis;
var getOwnPropertyNamesModule = objectGetOwnPropertyNames;
var getOwnPropertySymbolsModule = objectGetOwnPropertySymbols;
var anObject$1 = anObject$3;

var concat = uncurryThis$2([].concat);

// all object keys, includes non-enumerable and symbols
var ownKeys$1 = getBuiltIn$1('Reflect', 'ownKeys') || function ownKeys(it) {
  var keys = getOwnPropertyNamesModule.f(anObject$1(it));
  var getOwnPropertySymbols = getOwnPropertySymbolsModule.f;
  return getOwnPropertySymbols ? concat(keys, getOwnPropertySymbols(it)) : keys;
};

var hasOwn$2 = hasOwnProperty_1;
var ownKeys = ownKeys$1;
var getOwnPropertyDescriptorModule = objectGetOwnPropertyDescriptor;
var definePropertyModule = objectDefineProperty;

var copyConstructorProperties$1 = function (target, source, exceptions) {
  var keys = ownKeys(source);
  var defineProperty = definePropertyModule.f;
  var getOwnPropertyDescriptor = getOwnPropertyDescriptorModule.f;
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (!hasOwn$2(target, key) && !(exceptions && hasOwn$2(exceptions, key))) {
      defineProperty(target, key, getOwnPropertyDescriptor(source, key));
    }
  }
};

var fails$3 = fails$b;
var isCallable$3 = isCallable$e;

var replacement = /#|\.prototype\./;

var isForced$1 = function (feature, detection) {
  var value = data[normalize(feature)];
  return value === POLYFILL ? true
    : value === NATIVE ? false
    : isCallable$3(detection) ? fails$3(detection)
    : !!detection;
};

var normalize = isForced$1.normalize = function (string) {
  return String(string).replace(replacement, '.').toLowerCase();
};

var data = isForced$1.data = {};
var NATIVE = isForced$1.NATIVE = 'N';
var POLYFILL = isForced$1.POLYFILL = 'P';

var isForced_1 = isForced$1;

var global$2 = global$c;
var getOwnPropertyDescriptor = objectGetOwnPropertyDescriptor.f;
var createNonEnumerableProperty$1 = createNonEnumerableProperty$3;
var defineBuiltIn$1 = defineBuiltIn$4;
var defineGlobalProperty = defineGlobalProperty$3;
var copyConstructorProperties = copyConstructorProperties$1;
var isForced = isForced_1;

/*
  options.target         - name of the target object
  options.global         - target is the global object
  options.stat           - export as static methods of target
  options.proto          - export as prototype methods of target
  options.real           - real prototype method for the `pure` version
  options.forced         - export even if the native feature is available
  options.bind           - bind methods to the target, required for the `pure` version
  options.wrap           - wrap constructors to preventing global pollution, required for the `pure` version
  options.unsafe         - use the simple assignment of property instead of delete + defineProperty
  options.sham           - add a flag to not completely full polyfills
  options.enumerable     - export as enumerable property
  options.dontCallGetSet - prevent calling a getter on target
  options.name           - the .name of the function if it does not match the key
*/
var _export = function (options, source) {
  var TARGET = options.target;
  var GLOBAL = options.global;
  var STATIC = options.stat;
  var FORCED, target, key, targetProperty, sourceProperty, descriptor;
  if (GLOBAL) {
    target = global$2;
  } else if (STATIC) {
    target = global$2[TARGET] || defineGlobalProperty(TARGET, {});
  } else {
    target = (global$2[TARGET] || {}).prototype;
  }
  if (target) for (key in source) {
    sourceProperty = source[key];
    if (options.dontCallGetSet) {
      descriptor = getOwnPropertyDescriptor(target, key);
      targetProperty = descriptor && descriptor.value;
    } else targetProperty = target[key];
    FORCED = isForced(GLOBAL ? key : TARGET + (STATIC ? '.' : '#') + key, options.forced);
    // contained in target
    if (!FORCED && targetProperty !== undefined) {
      if (typeof sourceProperty == typeof targetProperty) continue;
      copyConstructorProperties(sourceProperty, targetProperty);
    }
    // add a flag to not completely full polyfills
    if (options.sham || (targetProperty && targetProperty.sham)) {
      createNonEnumerableProperty$1(sourceProperty, 'sham', true);
    }
    defineBuiltIn$1(target, key, sourceProperty, options);
  }
};

var fails$2 = fails$b;
var wellKnownSymbol$1 = wellKnownSymbol$5;
var DESCRIPTORS$1 = descriptors;
var IS_PURE = isPure;

var ITERATOR = wellKnownSymbol$1('iterator');

var urlConstructorDetection = !fails$2(function () {
  // eslint-disable-next-line unicorn/relative-url-style -- required for testing
  var url = new URL('b?a=1&b=2&c=3', 'http://a');
  var params = url.searchParams;
  var params2 = new URLSearchParams('a=1&a=2&b=3');
  var result = '';
  url.pathname = 'c%20d';
  params.forEach(function (value, key) {
    params['delete']('b');
    result += key + value;
  });
  params2['delete']('a', 2);
  // `undefined` case is a Chromium 117 bug
  // https://bugs.chromium.org/p/v8/issues/detail?id=14222
  params2['delete']('b', undefined);
  return (IS_PURE && (!url.toJSON || !params2.has('a', 1) || params2.has('a', 2) || !params2.has('a', undefined) || params2.has('b')))
    || (!params.size && (IS_PURE || !DESCRIPTORS$1))
    || !params.sort
    || url.href !== 'http://a/c%20d?a=1&c=3'
    || params.get('c') !== '3'
    || String(new URLSearchParams('?a=1')) !== 'a=1'
    || !params[ITERATOR]
    // throws in Edge
    || new URL('https://a@b').username !== 'a'
    || new URLSearchParams(new URLSearchParams('a=b')).get('a') !== 'b'
    // not punycoded in Edge
    || new URL('http://тест').host !== 'xn--e1aybc'
    // not escaped in Chrome 62-
    || new URL('http://a#б').hash !== '#%D0%B1'
    // fails in Chrome 66-
    || result !== 'a1c3'
    // throws in Safari
    || new URL('http://x', undefined).host !== 'x';
});

var $ = _export;
var getBuiltIn = getBuiltIn$3;
var fails$1 = fails$b;
var validateArgumentsLength = validateArgumentsLength$3;
var toString = toString$3;
var USE_NATIVE_URL = urlConstructorDetection;

var URL$1 = getBuiltIn('URL');

// https://github.com/nodejs/node/issues/47505
// https://github.com/denoland/deno/issues/18893
var THROWS_WITHOUT_ARGUMENTS = USE_NATIVE_URL && fails$1(function () {
  URL$1.canParse();
});

// `URL.canParse` method
// https://url.spec.whatwg.org/#dom-url-canparse
$({ target: 'URL', stat: true, forced: !THROWS_WITHOUT_ARGUMENTS }, {
  canParse: function canParse(url) {
    var length = validateArgumentsLength(arguments.length, 1);
    var urlString = toString(url);
    var base = length < 2 || arguments[1] === undefined ? undefined : toString(arguments[1]);
    try {
      return !!new URL$1(urlString, base);
    } catch (error) {
      return false;
    }
  }
});

class ConsoleLogger {
  constructor() {
    let logLevel = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'info';
    this.logLevel = logLevel;
  }
  trace() {
    if (['trace'].includes(this.logLevel)) {
      console.trace(...arguments);
    }
  }
  debug() {
    if (['trace', 'debug'].includes(this.logLevel)) {
      console.debug(...arguments);
    }
  }
  info() {
    if (['trace', 'debug', 'info'].includes(this.logLevel)) {
      console.log(...arguments);
    }
  }
  warn() {
    if (['trace', 'debug', 'info', 'warn'].includes(this.logLevel)) {
      console.warn(...arguments);
    }
  }
  error() {
    console.error(...arguments);
  }
}

var lengthOfArrayLike$2 = lengthOfArrayLike$4;

// https://tc39.es/proposal-change-array-by-copy/#sec-array.prototype.toReversed
// https://tc39.es/proposal-change-array-by-copy/#sec-%typedarray%.prototype.toReversed
var arrayToReversed$1 = function (O, C) {
  var len = lengthOfArrayLike$2(O);
  var A = new C(len);
  var k = 0;
  for (; k < len; k++) A[k] = O[len - k - 1];
  return A;
};

// eslint-disable-next-line es/no-typed-arrays -- safe
var arrayBufferBasicDetection = typeof ArrayBuffer != 'undefined' && typeof DataView != 'undefined';

var fails = fails$b;

var correctPrototypeGetter = !fails(function () {
  function F() { /* empty */ }
  F.prototype.constructor = null;
  // eslint-disable-next-line es/no-object-getprototypeof -- required for testing
  return Object.getPrototypeOf(new F()) !== F.prototype;
});

var hasOwn$1 = hasOwnProperty_1;
var isCallable$2 = isCallable$e;
var toObject = toObject$2;
var sharedKey = sharedKey$2;
var CORRECT_PROTOTYPE_GETTER = correctPrototypeGetter;

var IE_PROTO = sharedKey('IE_PROTO');
var $Object = Object;
var ObjectPrototype$1 = $Object.prototype;

// `Object.getPrototypeOf` method
// https://tc39.es/ecma262/#sec-object.getprototypeof
// eslint-disable-next-line es/no-object-getprototypeof -- safe
var objectGetPrototypeOf = CORRECT_PROTOTYPE_GETTER ? $Object.getPrototypeOf : function (O) {
  var object = toObject(O);
  if (hasOwn$1(object, IE_PROTO)) return object[IE_PROTO];
  var constructor = object.constructor;
  if (isCallable$2(constructor) && object instanceof constructor) {
    return constructor.prototype;
  } return object instanceof $Object ? ObjectPrototype$1 : null;
};

var uncurryThis$1 = functionUncurryThis;
var aCallable$1 = aCallable$3;

var functionUncurryThisAccessor = function (object, key, method) {
  try {
    // eslint-disable-next-line es/no-object-getownpropertydescriptor -- safe
    return uncurryThis$1(aCallable$1(Object.getOwnPropertyDescriptor(object, key)[method]));
  } catch (error) { /* empty */ }
};

var isCallable$1 = isCallable$e;

var $String = String;
var $TypeError$1 = TypeError;

var aPossiblePrototype$1 = function (argument) {
  if (typeof argument == 'object' || isCallable$1(argument)) return argument;
  throw new $TypeError$1("Can't set " + $String(argument) + ' as a prototype');
};

/* eslint-disable no-proto -- safe */
var uncurryThisAccessor = functionUncurryThisAccessor;
var anObject = anObject$3;
var aPossiblePrototype = aPossiblePrototype$1;

// `Object.setPrototypeOf` method
// https://tc39.es/ecma262/#sec-object.setprototypeof
// Works with __proto__ only. Old v8 can't work with null proto objects.
// eslint-disable-next-line es/no-object-setprototypeof -- safe
var objectSetPrototypeOf = Object.setPrototypeOf || ('__proto__' in {} ? function () {
  var CORRECT_SETTER = false;
  var test = {};
  var setter;
  try {
    setter = uncurryThisAccessor(Object.prototype, '__proto__', 'set');
    setter(test, []);
    CORRECT_SETTER = test instanceof Array;
  } catch (error) { /* empty */ }
  return function setPrototypeOf(O, proto) {
    anObject(O);
    aPossiblePrototype(proto);
    if (CORRECT_SETTER) setter(O, proto);
    else O.__proto__ = proto;
    return O;
  };
}() : undefined);

var NATIVE_ARRAY_BUFFER = arrayBufferBasicDetection;
var DESCRIPTORS = descriptors;
var global$1 = global$c;
var isCallable = isCallable$e;
var isObject = isObject$6;
var hasOwn = hasOwnProperty_1;
var classof$1 = classof$4;
var tryToString = tryToString$2;
var createNonEnumerableProperty = createNonEnumerableProperty$3;
var defineBuiltIn = defineBuiltIn$4;
var defineBuiltInAccessor = defineBuiltInAccessor$2;
var isPrototypeOf = objectIsPrototypeOf;
var getPrototypeOf = objectGetPrototypeOf;
var setPrototypeOf = objectSetPrototypeOf;
var wellKnownSymbol = wellKnownSymbol$5;
var uid = uid$3;
var InternalStateModule = internalState;

var enforceInternalState = InternalStateModule.enforce;
var getInternalState = InternalStateModule.get;
var Int8Array$1 = global$1.Int8Array;
var Int8ArrayPrototype = Int8Array$1 && Int8Array$1.prototype;
var Uint8ClampedArray = global$1.Uint8ClampedArray;
var Uint8ClampedArrayPrototype = Uint8ClampedArray && Uint8ClampedArray.prototype;
var TypedArray = Int8Array$1 && getPrototypeOf(Int8Array$1);
var TypedArrayPrototype = Int8ArrayPrototype && getPrototypeOf(Int8ArrayPrototype);
var ObjectPrototype = Object.prototype;
var TypeError$1 = global$1.TypeError;

var TO_STRING_TAG = wellKnownSymbol('toStringTag');
var TYPED_ARRAY_TAG = uid('TYPED_ARRAY_TAG');
var TYPED_ARRAY_CONSTRUCTOR = 'TypedArrayConstructor';
// Fixing native typed arrays in Opera Presto crashes the browser, see #595
var NATIVE_ARRAY_BUFFER_VIEWS = NATIVE_ARRAY_BUFFER && !!setPrototypeOf && classof$1(global$1.opera) !== 'Opera';
var TYPED_ARRAY_TAG_REQUIRED = false;
var NAME, Constructor, Prototype;

var TypedArrayConstructorsList = {
  Int8Array: 1,
  Uint8Array: 1,
  Uint8ClampedArray: 1,
  Int16Array: 2,
  Uint16Array: 2,
  Int32Array: 4,
  Uint32Array: 4,
  Float32Array: 4,
  Float64Array: 8
};

var BigIntArrayConstructorsList = {
  BigInt64Array: 8,
  BigUint64Array: 8
};

var isView = function isView(it) {
  if (!isObject(it)) return false;
  var klass = classof$1(it);
  return klass === 'DataView'
    || hasOwn(TypedArrayConstructorsList, klass)
    || hasOwn(BigIntArrayConstructorsList, klass);
};

var getTypedArrayConstructor$3 = function (it) {
  var proto = getPrototypeOf(it);
  if (!isObject(proto)) return;
  var state = getInternalState(proto);
  return (state && hasOwn(state, TYPED_ARRAY_CONSTRUCTOR)) ? state[TYPED_ARRAY_CONSTRUCTOR] : getTypedArrayConstructor$3(proto);
};

var isTypedArray = function (it) {
  if (!isObject(it)) return false;
  var klass = classof$1(it);
  return hasOwn(TypedArrayConstructorsList, klass)
    || hasOwn(BigIntArrayConstructorsList, klass);
};

var aTypedArray$3 = function (it) {
  if (isTypedArray(it)) return it;
  throw new TypeError$1('Target is not a typed array');
};

var aTypedArrayConstructor = function (C) {
  if (isCallable(C) && (!setPrototypeOf || isPrototypeOf(TypedArray, C))) return C;
  throw new TypeError$1(tryToString(C) + ' is not a typed array constructor');
};

var exportTypedArrayMethod$3 = function (KEY, property, forced, options) {
  if (!DESCRIPTORS) return;
  if (forced) for (var ARRAY in TypedArrayConstructorsList) {
    var TypedArrayConstructor = global$1[ARRAY];
    if (TypedArrayConstructor && hasOwn(TypedArrayConstructor.prototype, KEY)) try {
      delete TypedArrayConstructor.prototype[KEY];
    } catch (error) {
      // old WebKit bug - some methods are non-configurable
      try {
        TypedArrayConstructor.prototype[KEY] = property;
      } catch (error2) { /* empty */ }
    }
  }
  if (!TypedArrayPrototype[KEY] || forced) {
    defineBuiltIn(TypedArrayPrototype, KEY, forced ? property
      : NATIVE_ARRAY_BUFFER_VIEWS && Int8ArrayPrototype[KEY] || property, options);
  }
};

var exportTypedArrayStaticMethod = function (KEY, property, forced) {
  var ARRAY, TypedArrayConstructor;
  if (!DESCRIPTORS) return;
  if (setPrototypeOf) {
    if (forced) for (ARRAY in TypedArrayConstructorsList) {
      TypedArrayConstructor = global$1[ARRAY];
      if (TypedArrayConstructor && hasOwn(TypedArrayConstructor, KEY)) try {
        delete TypedArrayConstructor[KEY];
      } catch (error) { /* empty */ }
    }
    if (!TypedArray[KEY] || forced) {
      // V8 ~ Chrome 49-50 `%TypedArray%` methods are non-writable non-configurable
      try {
        return defineBuiltIn(TypedArray, KEY, forced ? property : NATIVE_ARRAY_BUFFER_VIEWS && TypedArray[KEY] || property);
      } catch (error) { /* empty */ }
    } else return;
  }
  for (ARRAY in TypedArrayConstructorsList) {
    TypedArrayConstructor = global$1[ARRAY];
    if (TypedArrayConstructor && (!TypedArrayConstructor[KEY] || forced)) {
      defineBuiltIn(TypedArrayConstructor, KEY, property);
    }
  }
};

for (NAME in TypedArrayConstructorsList) {
  Constructor = global$1[NAME];
  Prototype = Constructor && Constructor.prototype;
  if (Prototype) enforceInternalState(Prototype)[TYPED_ARRAY_CONSTRUCTOR] = Constructor;
  else NATIVE_ARRAY_BUFFER_VIEWS = false;
}

for (NAME in BigIntArrayConstructorsList) {
  Constructor = global$1[NAME];
  Prototype = Constructor && Constructor.prototype;
  if (Prototype) enforceInternalState(Prototype)[TYPED_ARRAY_CONSTRUCTOR] = Constructor;
}

// WebKit bug - typed arrays constructors prototype is Object.prototype
if (!NATIVE_ARRAY_BUFFER_VIEWS || !isCallable(TypedArray) || TypedArray === Function.prototype) {
  // eslint-disable-next-line no-shadow -- safe
  TypedArray = function TypedArray() {
    throw new TypeError$1('Incorrect invocation');
  };
  if (NATIVE_ARRAY_BUFFER_VIEWS) for (NAME in TypedArrayConstructorsList) {
    if (global$1[NAME]) setPrototypeOf(global$1[NAME], TypedArray);
  }
}

if (!NATIVE_ARRAY_BUFFER_VIEWS || !TypedArrayPrototype || TypedArrayPrototype === ObjectPrototype) {
  TypedArrayPrototype = TypedArray.prototype;
  if (NATIVE_ARRAY_BUFFER_VIEWS) for (NAME in TypedArrayConstructorsList) {
    if (global$1[NAME]) setPrototypeOf(global$1[NAME].prototype, TypedArrayPrototype);
  }
}

// WebKit bug - one more object in Uint8ClampedArray prototype chain
if (NATIVE_ARRAY_BUFFER_VIEWS && getPrototypeOf(Uint8ClampedArrayPrototype) !== TypedArrayPrototype) {
  setPrototypeOf(Uint8ClampedArrayPrototype, TypedArrayPrototype);
}

if (DESCRIPTORS && !hasOwn(TypedArrayPrototype, TO_STRING_TAG)) {
  TYPED_ARRAY_TAG_REQUIRED = true;
  defineBuiltInAccessor(TypedArrayPrototype, TO_STRING_TAG, {
    configurable: true,
    get: function () {
      return isObject(this) ? this[TYPED_ARRAY_TAG] : undefined;
    }
  });
  for (NAME in TypedArrayConstructorsList) if (global$1[NAME]) {
    createNonEnumerableProperty(global$1[NAME], TYPED_ARRAY_TAG, NAME);
  }
}

var arrayBufferViewCore = {
  NATIVE_ARRAY_BUFFER_VIEWS: NATIVE_ARRAY_BUFFER_VIEWS,
  TYPED_ARRAY_TAG: TYPED_ARRAY_TAG_REQUIRED && TYPED_ARRAY_TAG,
  aTypedArray: aTypedArray$3,
  aTypedArrayConstructor: aTypedArrayConstructor,
  exportTypedArrayMethod: exportTypedArrayMethod$3,
  exportTypedArrayStaticMethod: exportTypedArrayStaticMethod,
  getTypedArrayConstructor: getTypedArrayConstructor$3,
  isView: isView,
  isTypedArray: isTypedArray,
  TypedArray: TypedArray,
  TypedArrayPrototype: TypedArrayPrototype
};

var arrayToReversed = arrayToReversed$1;
var ArrayBufferViewCore$2 = arrayBufferViewCore;

var aTypedArray$2 = ArrayBufferViewCore$2.aTypedArray;
var exportTypedArrayMethod$2 = ArrayBufferViewCore$2.exportTypedArrayMethod;
var getTypedArrayConstructor$2 = ArrayBufferViewCore$2.getTypedArrayConstructor;

// `%TypedArray%.prototype.toReversed` method
// https://tc39.es/ecma262/#sec-%typedarray%.prototype.toreversed
exportTypedArrayMethod$2('toReversed', function toReversed() {
  return arrayToReversed(aTypedArray$2(this), getTypedArrayConstructor$2(this));
});

var lengthOfArrayLike$1 = lengthOfArrayLike$4;

var arrayFromConstructorAndList$1 = function (Constructor, list) {
  var index = 0;
  var length = lengthOfArrayLike$1(list);
  var result = new Constructor(length);
  while (length > index) result[index] = list[index++];
  return result;
};

var ArrayBufferViewCore$1 = arrayBufferViewCore;
var uncurryThis = functionUncurryThis;
var aCallable = aCallable$3;
var arrayFromConstructorAndList = arrayFromConstructorAndList$1;

var aTypedArray$1 = ArrayBufferViewCore$1.aTypedArray;
var getTypedArrayConstructor$1 = ArrayBufferViewCore$1.getTypedArrayConstructor;
var exportTypedArrayMethod$1 = ArrayBufferViewCore$1.exportTypedArrayMethod;
var sort = uncurryThis(ArrayBufferViewCore$1.TypedArrayPrototype.sort);

// `%TypedArray%.prototype.toSorted` method
// https://tc39.es/ecma262/#sec-%typedarray%.prototype.tosorted
exportTypedArrayMethod$1('toSorted', function toSorted(compareFn) {
  if (compareFn !== undefined) aCallable(compareFn);
  var O = aTypedArray$1(this);
  var A = arrayFromConstructorAndList(getTypedArrayConstructor$1(O), O);
  return sort(A, compareFn);
});

var lengthOfArrayLike = lengthOfArrayLike$4;
var toIntegerOrInfinity$1 = toIntegerOrInfinity$4;

var $RangeError = RangeError;

// https://tc39.es/proposal-change-array-by-copy/#sec-array.prototype.with
// https://tc39.es/proposal-change-array-by-copy/#sec-%typedarray%.prototype.with
var arrayWith$1 = function (O, C, index, value) {
  var len = lengthOfArrayLike(O);
  var relativeIndex = toIntegerOrInfinity$1(index);
  var actualIndex = relativeIndex < 0 ? len + relativeIndex : relativeIndex;
  if (actualIndex >= len || actualIndex < 0) throw new $RangeError('Incorrect index');
  var A = new C(len);
  var k = 0;
  for (; k < len; k++) A[k] = k === actualIndex ? value : O[k];
  return A;
};

var classof = classof$4;

var isBigIntArray$1 = function (it) {
  var klass = classof(it);
  return klass === 'BigInt64Array' || klass === 'BigUint64Array';
};

var toPrimitive = toPrimitive$2;

var $TypeError = TypeError;

// `ToBigInt` abstract operation
// https://tc39.es/ecma262/#sec-tobigint
var toBigInt$1 = function (argument) {
  var prim = toPrimitive(argument, 'number');
  if (typeof prim == 'number') throw new $TypeError("Can't convert number to bigint");
  // eslint-disable-next-line es/no-bigint -- safe
  return BigInt(prim);
};

var arrayWith = arrayWith$1;
var ArrayBufferViewCore = arrayBufferViewCore;
var isBigIntArray = isBigIntArray$1;
var toIntegerOrInfinity = toIntegerOrInfinity$4;
var toBigInt = toBigInt$1;

var aTypedArray = ArrayBufferViewCore.aTypedArray;
var getTypedArrayConstructor = ArrayBufferViewCore.getTypedArrayConstructor;
var exportTypedArrayMethod = ArrayBufferViewCore.exportTypedArrayMethod;

var PROPER_ORDER = !!function () {
  try {
    // eslint-disable-next-line no-throw-literal, es/no-typed-arrays, es/no-array-prototype-with -- required for testing
    new Int8Array(1)['with'](2, { valueOf: function () { throw 8; } });
  } catch (error) {
    // some early implementations, like WebKit, does not follow the final semantic
    // https://github.com/tc39/proposal-change-array-by-copy/pull/86
    return error === 8;
  }
}();

// `%TypedArray%.prototype.with` method
// https://tc39.es/ecma262/#sec-%typedarray%.prototype.with
exportTypedArrayMethod('with', { 'with': function (index, value) {
  var O = aTypedArray(this);
  var relativeIndex = toIntegerOrInfinity(index);
  var actualValue = isBigIntArray(O) ? toBigInt(value) : +value;
  return arrayWith(O, getTypedArrayConstructor(O), relativeIndex, actualValue);
} }['with'], !PROPER_ORDER);

async function* readChunks(reader) {
  let readResult = await reader.read();
  while (!readResult.done) {
    yield readResult.value;
    readResult = await reader.read();
  }
}
function getLines() {
  let buffer;
  return function* onChunk(arr) {
    buffer = buffer === undefined ? arr : concatBuffers(buffer, arr);
    while (buffer && buffer.length) {
      const nextNewLineIndex = buffer.findIndex(char => [ControlChars.NewLine, ControlChars.CarriageReturn].includes(char));
      const foundEOL = nextNewLineIndex !== -1;
      if (!foundEOL) {
        // We reached the end of the buffer but the line hasn't ended.
        // Wait for the next arr and then continue parsing:
        break;
      }
      const hasCRLF = buffer[nextNewLineIndex] === ControlChars.CarriageReturn && buffer[nextNewLineIndex + 1] === ControlChars.NewLine;
      const eol = hasCRLF ? nextNewLineIndex + 1 : nextNewLineIndex;
      const nextColonIndex = buffer.findIndex(char => [ControlChars.Colon].includes(char));
      const foundField = nextColonIndex !== -1 && nextColonIndex < nextNewLineIndex;
      const fieldLength = foundField ? nextColonIndex : nextNewLineIndex;

      // we've reached the line end, send it out:
      yield [buffer.subarray(0, nextNewLineIndex), fieldLength];
      buffer = buffer.subarray(eol + 1);
    }
  };
}
function getMessages() {
  let message = undefined;
  const decoder = new TextDecoder();

  // return a function that can process each incoming line buffer:
  return function* onLine(line, fieldLength) {
    const isEndOfMessage = line.length === 0;
    if (isEndOfMessage) {
      if (message) {
        yield [message];
      }
      message = createMessage();
    } else if (fieldLength > 0) {
      // exclude comments and lines with no values
      // line is of format "<field>:<value>" or "<field>: <value>"
      // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
      const field = decoder.decode(line.subarray(0, fieldLength));
      const valueOffset = fieldLength + (line[fieldLength + 1] === ControlChars.Space ? 2 : 1);
      const value = decoder.decode(line.subarray(valueOffset));
      message ??= createMessage();
      switch (field) {
        case 'data':
          // if this message already has data, append the new value to the old.
          // otherwise, just set to the new value:
          message.data = message.data ? message.data + '\n' + value : value; // otherwise,
          break;
        case 'event':
          message.event = value;
          break;
        case 'id':
          message.id = value;
          yield [undefined, value, undefined];
          break;
        case 'retry':
          const retry = parseInt(value, 10);
          if (!isNaN(retry)) {
            // per spec, ignore non-integers
            message.retry = retry;
            yield [undefined, undefined, retry];
          }
          break;
      }
    }
  };
}
var ControlChars = /*#__PURE__*/function (ControlChars) {
  ControlChars[ControlChars["NewLine"] = 10] = "NewLine";
  ControlChars[ControlChars["CarriageReturn"] = 13] = "CarriageReturn";
  ControlChars[ControlChars["Space"] = 32] = "Space";
  ControlChars[ControlChars["Colon"] = 58] = "Colon";
  return ControlChars;
}(ControlChars || {});
function concatBuffers(a, b) {
  const res = new Uint8Array(a.length + b.length);
  res.set(a);
  res.set(b, a.length);
  return res;
}
function createMessage() {
  return {
    data: '',
    event: '',
    id: '',
    retry: undefined
  };
}

const ContentTypeEventStream = 'text/event-stream';

/**
 * @deprecated
 */

class CustomEventSource extends EventTarget {
  // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource-url

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource-readystate
  CONNECTING = 0;
  OPEN = 1;
  CLOSED = 2;
  readyState = this.CONNECTING;

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#handler-eventsource-onopen
  onerror = null;
  // https://html.spec.whatwg.org/multipage/server-sent-events.html#handler-eventsource-onmessage
  onmessage = null;
  // https://html.spec.whatwg.org/multipage/server-sent-events.html#handler-eventsource-onerror
  onopen = null;
  onRetryDelayReceived = null;
  timeoutId = undefined;
  constructor(url, initDict,
  /**
   * @deprecated Use the related options in initDict
   */
  extraOptions) {
    super();
    this.options = initDict ?? {};
    this.extraOptions = extraOptions;
    this.url = url instanceof URL ? url.toString() : url;
    this.retry = initDict?.retry ?? 5000;
    if (!this.options.disableLogger) {
      this.logger = this.options.logger ?? new ConsoleLogger();
    }
    this.connect();
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource-withcredentials
  get withCredentials() {
    return this.options.withCredentials ?? false;
  }
  get retryDelay() {
    return this.retry;
  }
  async connect(lastEventId) {
    if (this.readyState === this.CLOSED) {
      this.logger?.warn('Canceled reconnecting due to state already being closed');
      return;
    }
    try {
      // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource
      this.abortController = new AbortController();
      this.readyState = this.CONNECTING;
      const fetchOptions = {
        ...this.options,
        headers: lastEventId ? {
          ...this.options.headers,
          Accept: ContentTypeEventStream,
          'Last-Event-ID': lastEventId
        } : {
          ...this.options.headers,
          Accept: ContentTypeEventStream
        },
        cache: 'no-store',
        credentials: this.withCredentials ? 'include' : 'omit',
        signal: this.abortController?.signal
      };
      const response = this.options.fetch ? await this.options.fetch(this.url, fetchOptions) : this.extraOptions?.fetchInput ? await this.extraOptions.fetchInput(this.url, fetchOptions) : await globalThis.fetch(this.url, fetchOptions);

      // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource (Step 15)
      if (response.status !== 200) {
        return this.failConnection(`Request failed with status code ${response.status}`, response);
      } else if (!response.headers.get('Content-Type')?.includes(ContentTypeEventStream)) {
        return this.failConnection(`Request failed with wrong content type '${response.headers.get('Content-Type')}'`, response);
      } else if (!response?.body) {
        return this.failConnection(`Request failed with empty response body'`, response);
      }
      this.announceConnection(response);
      const reader = response.body.getReader();
      const getLine = getLines();
      const getMessage = getMessages();
      for await (const chunk of readChunks(reader)) {
        for await (const [line, fieldLength] of getLine(chunk)) {
          for await (const [message, id, retry] of getMessage(line, fieldLength)) {
            if (typeof id !== 'undefined') {
              this.currentLastEventId = id;
            } else if (typeof retry !== 'undefined') {
              this.retry = retry;
              this.onRetryDelayReceived?.(retry);
            } else if (message) {
              this.dispatchMessage(message, this.currentLastEventId, response.url);
            }
          }
        }
      }
    } catch (error) {
      if (typeof error === 'object' && error?.name === 'AbortError') {
        return;
      }
      await this.reconnect('Reconnecting EventSource because of error', error);
      return;
    }
    await this.reconnect('Reconnecting because EventSource connection closed');
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#reestablish-the-connection
  async reconnect(msg, error) {
    const event = new Event('error');
    this.dispatchEvent(event);
    this.onerror?.(event);
    if (error) {
      this.logger?.warn('Error occurred in EventSource', error ?? '');
    }
    if (this.readyState === this.CLOSED || this.options.disableRetry) {
      return;
    }
    if (msg) {
      this.logger?.warn(msg, error ?? '');
    }
    this.timeoutId = setTimeout(async () => {
      await this.connect(this.currentLastEventId);
    }, this.retry);
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#dispatchMessage
  dispatchMessage(message, lastEventId, url) {
    const origin = url && URL.canParse(url) ? new URL(url) : undefined;
    const eventType = !message?.event ? 'message' : message.event;
    const event = new MessageEvent(eventType, {
      data: message?.data,
      // https://html.spec.whatwg.org/multipage/server-sent-events.html#dispatchMessage (Note)
      lastEventId: message?.id || lastEventId,
      origin: origin?.origin
    });
    this.dispatchEvent(event);
    if (eventType === 'message') {
      this.onmessage?.(event);
    }
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#fail-the-connection
  failConnection(error, response) {
    this.logger?.error('Fatal error occurred in EventSource', error);
    this.readyState = this.CLOSED;
    const event = new Event('error');
    event.response = response;
    this.dispatchEvent(event);
    this.onerror?.(event);
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#announce-the-connection
  announceConnection(response) {
    this.logger?.debug('Connection established');
    this.readyState = this.OPEN;
    const event = new Event('open');
    event.response = response;
    this.dispatchEvent(event);
    this.onopen?.(event);
  }

  // https://html.spec.whatwg.org/multipage/server-sent-events.html#dom-eventsource-close
  close() {
    this.readyState = this.CLOSED;
    clearTimeout(this.timeoutId);
    this.abortController?.abort();
  }
  addEventListener(type, listener, options) {
    super.addEventListener(type, listener, options);
  }
  removeEventListener(type, listener, options) {
    super.removeEventListener(type, listener, options);
  }
}

export { CustomEventSource, CustomEventSource as EventSource };

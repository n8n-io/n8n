'use strict';

var vitest = require('vitest');

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
class Matcher {
  constructor(asymmetricMatch, description) {
    this.asymmetricMatch = asymmetricMatch;
    this.description = description;
    __publicField(this, "$$typeof");
    __publicField(this, "inverse");
    this.$$typeof = Symbol.for("vi.asymmetricMatcher");
  }
  toString() {
    return this.description;
  }
  toAsymmetricMatcher() {
    return this.description;
  }
  getExpectedType() {
    return "undefined";
  }
}
class CaptorMatcher {
  constructor() {
    __publicField(this, "$$typeof");
    __publicField(this, "asymmetricMatch");
    __publicField(this, "value");
    __publicField(this, "values", []);
    this.$$typeof = Symbol.for("vi.asymmetricMatcher");
    this.asymmetricMatch = (actualValue) => {
      this.value = actualValue;
      this.values.push(actualValue);
      return true;
    };
  }
  getExpectedType() {
    return "Object";
  }
  toString() {
    return "captor";
  }
  toAsymmetricMatcher() {
    return "captor";
  }
}
const any = () => new Matcher(() => true, "any()");
const anyBoolean = () => new Matcher((actualValue) => typeof actualValue === "boolean", "anyBoolean()");
const anyNumber = () => new Matcher((actualValue) => typeof actualValue === "number" && !isNaN(actualValue), "anyNumber()");
const anyString = () => new Matcher((actualValue) => typeof actualValue === "string", "anyString()");
const anyFunction = () => new Matcher((actualValue) => typeof actualValue === "function", "anyFunction()");
const anySymbol = () => new Matcher((actualValue) => typeof actualValue === "symbol", "anySymbol()");
const anyObject = () => new Matcher((actualValue) => typeof actualValue === "object" && actualValue !== null, "anyObject()");
const anyArray = () => new Matcher((actualValue) => Array.isArray(actualValue), "anyArray()");
const anyMap = () => new Matcher((actualValue) => actualValue instanceof Map, "anyMap()");
const anySet = () => new Matcher((actualValue) => actualValue instanceof Set, "anySet()");
const isA = (clazz) => new Matcher((actualValue) => actualValue instanceof clazz, "isA()");
const arrayIncludes = (arrayVal) => new Matcher((actualValue) => Array.isArray(actualValue) && actualValue.includes(arrayVal), "arrayIncludes()");
const setHas = (arrayVal) => new Matcher((actualValue) => anySet().asymmetricMatch(actualValue) && actualValue.has(arrayVal), "setHas()");
const mapHas = (mapVal) => new Matcher((actualValue) => anyMap().asymmetricMatch(actualValue) && actualValue.has(mapVal), "mapHas()");
const objectContainsKey = (key) => new Matcher((actualValue) => anyObject().asymmetricMatch(actualValue) && actualValue[key] !== void 0, "objectContainsKey()");
const objectContainsValue = (value) => new Matcher(
  (actualValue) => anyObject().asymmetricMatch(actualValue) && Object.values(actualValue).includes(value),
  "objectContainsValue()"
);
const notNull = () => new Matcher((actualValue) => actualValue !== null, "notNull()");
const notUndefined = () => new Matcher((actualValue) => actualValue !== void 0, "notUndefined()");
const notEmpty = () => new Matcher((actualValue) => actualValue !== null && actualValue !== void 0 && actualValue !== "", "notEmpty()");
const captor = () => new CaptorMatcher();
const matches = (matcher) => new Matcher(matcher, "matches()");

function isVitestAsymmetricMatcher(obj) {
  return !!obj && typeof obj === "object" && "asymmetricMatch" in obj && typeof obj.asymmetricMatch === "function";
}
const checkCalledWith = (calledWithStack, actualArgs, fallbackMockImplementation) => {
  const calledWithInstance = calledWithStack.find(
    (instance) => instance.args.every((matcher, i) => {
      if (matcher instanceof Matcher) {
        return matcher.asymmetricMatch(actualArgs[i]);
      }
      if (isVitestAsymmetricMatcher(matcher)) {
        return matcher.asymmetricMatch(actualArgs[i]);
      }
      return actualArgs[i] === matcher;
    })
  );
  return calledWithInstance ? calledWithInstance.calledWithFn(...actualArgs) : fallbackMockImplementation && fallbackMockImplementation(...actualArgs);
};
const calledWithFn = ({ fallbackMockImplementation } = {}) => {
  const fn = fallbackMockImplementation ? vitest.vi.fn(fallbackMockImplementation) : vitest.vi.fn();
  let calledWithStack = [];
  fn.calledWith = (...args) => {
    const calledWithFn2 = fallbackMockImplementation ? vitest.vi.fn(fallbackMockImplementation) : vitest.vi.fn();
    const mockImplementation = fn.getMockImplementation();
    if (!mockImplementation || fn.getMockImplementation()?.name === "implementation" || mockImplementation === fallbackMockImplementation) {
      fn.mockImplementation((...args2) => checkCalledWith(calledWithStack, args2, fallbackMockImplementation));
      calledWithStack = [];
    }
    calledWithStack.unshift({ args, calledWithFn: calledWithFn2 });
    return calledWithFn2;
  };
  return fn;
};

const DEFAULT_CONFIG = {
  ignoreProps: ["then"]
};
let GLOBAL_CONFIG = DEFAULT_CONFIG;
const VitestMockExtended = {
  DEFAULT_CONFIG,
  configure: (config) => {
    GLOBAL_CONFIG = { ...DEFAULT_CONFIG, ...config };
  },
  resetConfig: () => {
    GLOBAL_CONFIG = DEFAULT_CONFIG;
  }
};
const mockClear = (mock2) => {
  for (const key of Object.keys(mock2)) {
    const value = mock2[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (value._isMockObject) {
      mockClear(value);
    }
    if (value._isMockFunction && "mockClear" in value) {
      value.mockClear();
    }
  }
  if (!mock2._isMockObject) {
    return mock2.mockClear();
  }
};
const mockReset = (mock2) => {
  for (const key of Object.keys(mock2)) {
    if (mock2[key] === null || mock2[key] === void 0) {
      continue;
    }
    if (mock2[key]._isMockObject) {
      mockReset(mock2[key]);
    }
    if (mock2[key]._isMockFunction) {
      mock2[key].mockReset();
    }
  }
  if (!mock2._isMockObject) {
    return mock2.mockReset();
  }
};
function mockDeep(arg1, arg2) {
  const [opts, mockImplementation] = typeof arg1 === "object" && (typeof arg1.fallbackMockImplementation === "function" || arg1.funcPropSupport === true) ? [arg1, arg2] : [{}, arg1];
  return mock(mockImplementation, { deep: true, fallbackMockImplementation: opts.fallbackMockImplementation });
}
const overrideMockImp = (obj, opts) => {
  const proxy = new Proxy(obj, handler(opts));
  for (const name of Object.keys(obj)) {
    if (typeof obj[name] === "object" && obj[name] !== null) {
      proxy[name] = overrideMockImp(obj[name], opts);
    } else {
      proxy[name] = obj[name];
    }
  }
  return proxy;
};
const handler = (opts) => ({
  ownKeys(target) {
    return Reflect.ownKeys(target);
  },
  set: (obj, property, value) => {
    obj[property] = value;
    return true;
  },
  get: (obj, property) => {
    if (!(property in obj)) {
      if (property === "_isMockObject" || property === "_isMockFunction") {
        return void 0;
      }
      if (GLOBAL_CONFIG.ignoreProps?.includes(property)) {
        return void 0;
      }
      if (property === Symbol.iterator) {
        return obj[property];
      }
      if (opts?.useActualToJSON && property === "toJSON") {
        return JSON.stringify(obj);
      }
      const fn = calledWithFn({ fallbackMockImplementation: opts?.fallbackMockImplementation });
      if (opts?.deep && property !== "calls") {
        obj[property] = new Proxy(fn, handler(opts));
        obj[property]._isMockObject = true;
      } else {
        obj[property] = fn;
      }
    }
    if (obj instanceof Date && typeof obj[property] === "function") {
      return obj[property].bind(obj);
    }
    return obj[property];
  }
});
const mock = (mockImplementation = {}, opts) => {
  mockImplementation._isMockObject = true;
  return overrideMockImp(mockImplementation, opts);
};
const mockFn = () => {
  return calledWithFn();
};
function mocked(obj, _deep) {
  return obj;
}
function mockedFn(obj) {
  return obj;
}
const stub = () => {
  return new Proxy({}, {
    get: (obj, property) => {
      if (property in obj) {
        return obj[property];
      }
      return vitest.vi.fn();
    }
  });
};

exports.CaptorMatcher = CaptorMatcher;
exports.Matcher = Matcher;
exports.VitestMockExtended = VitestMockExtended;
exports.any = any;
exports.anyArray = anyArray;
exports.anyBoolean = anyBoolean;
exports.anyFunction = anyFunction;
exports.anyMap = anyMap;
exports.anyNumber = anyNumber;
exports.anyObject = anyObject;
exports.anySet = anySet;
exports.anyString = anyString;
exports.anySymbol = anySymbol;
exports.arrayIncludes = arrayIncludes;
exports.calledWithFn = calledWithFn;
exports.captor = captor;
exports.isA = isA;
exports.mapHas = mapHas;
exports.matches = matches;
exports.mock = mock;
exports.mockClear = mockClear;
exports.mockDeep = mockDeep;
exports.mockFn = mockFn;
exports.mockReset = mockReset;
exports.mocked = mocked;
exports.mockedFn = mockedFn;
exports.notEmpty = notEmpty;
exports.notNull = notNull;
exports.notUndefined = notUndefined;
exports.objectContainsKey = objectContainsKey;
exports.objectContainsValue = objectContainsValue;
exports.setHas = setHas;
exports.stub = stub;
//# sourceMappingURL=index.cjs.map

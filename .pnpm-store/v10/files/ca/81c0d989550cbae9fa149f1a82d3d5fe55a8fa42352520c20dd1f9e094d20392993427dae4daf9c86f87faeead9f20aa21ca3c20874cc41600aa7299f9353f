// src/utils.ts
function assert(condition, message) {
  if (!condition)
    throw new Error(message);
}
function isType(type, value) {
  return typeof value === type;
}
function isPromise(value) {
  return value instanceof Promise;
}
function define(obj, key, descriptor) {
  Object.defineProperty(obj, key, descriptor);
}
function defineValue(obj, key, value) {
  define(obj, key, { value, configurable: !0, writable: !0 });
}

// src/constants.ts
var SYMBOL_STATE = Symbol.for("tinyspy:spy");

// src/internal.ts
var spies = /* @__PURE__ */ new Set(), reset = (state) => {
  state.called = !1, state.callCount = 0, state.calls = [], state.results = [], state.resolves = [], state.next = [];
}, defineState = (spy2) => (define(spy2, SYMBOL_STATE, {
  value: { reset: () => reset(spy2[SYMBOL_STATE]) }
}), spy2[SYMBOL_STATE]), getInternalState = (spy2) => spy2[SYMBOL_STATE] || defineState(spy2);
function createInternalSpy(cb) {
  assert(
    isType("function", cb) || isType("undefined", cb),
    "cannot spy on a non-function value"
  );
  let fn = function(...args) {
    let state2 = getInternalState(fn);
    state2.called = !0, state2.callCount++, state2.calls.push(args);
    let next = state2.next.shift();
    if (next) {
      state2.results.push(next);
      let [type2, result2] = next;
      if (type2 === "ok")
        return result2;
      throw result2;
    }
    let result, type = "ok", resultIndex = state2.results.length;
    if (state2.impl)
      try {
        new.target ? result = Reflect.construct(state2.impl, args, new.target) : result = state2.impl.apply(this, args), type = "ok";
      } catch (err) {
        throw result = err, type = "error", state2.results.push([type, err]), err;
      }
    let resultTuple = [type, result];
    return isPromise(result) && result.then(
      (r) => state2.resolves[resultIndex] = ["ok", r],
      (e) => state2.resolves[resultIndex] = ["error", e]
    ), state2.results.push(resultTuple), result;
  };
  defineValue(fn, "_isMockFunction", !0), defineValue(fn, "length", cb ? cb.length : 0), defineValue(fn, "name", cb && cb.name || "spy");
  let state = getInternalState(fn);
  return state.reset(), state.impl = cb, fn;
}
function isMockFunction(obj) {
  return !!obj && obj._isMockFunction === !0;
}
function populateSpy(spy2) {
  let state = getInternalState(spy2);
  "returns" in spy2 || (define(spy2, "returns", {
    get: () => state.results.map(([, r]) => r)
  }), [
    "called",
    "callCount",
    "results",
    "resolves",
    "calls",
    "reset",
    "impl"
  ].forEach(
    (n) => define(spy2, n, { get: () => state[n], set: (v) => state[n] = v })
  ), defineValue(spy2, "nextError", (error) => (state.next.push(["error", error]), state)), defineValue(spy2, "nextResult", (result) => (state.next.push(["ok", result]), state)));
}

// src/spy.ts
function spy(cb) {
  let spy2 = createInternalSpy(cb);
  return populateSpy(spy2), spy2;
}

// src/spyOn.ts
var getDescriptor = (obj, method) => {
  let objDescriptor = Object.getOwnPropertyDescriptor(obj, method);
  if (objDescriptor)
    return [obj, objDescriptor];
  let currentProto = Object.getPrototypeOf(obj);
  for (; currentProto !== null; ) {
    let descriptor = Object.getOwnPropertyDescriptor(currentProto, method);
    if (descriptor)
      return [currentProto, descriptor];
    currentProto = Object.getPrototypeOf(currentProto);
  }
}, setPototype = (fn, val) => {
  val != null && typeof val == "function" && val.prototype != null && Object.setPrototypeOf(fn.prototype, val.prototype);
};
function internalSpyOn(obj, methodName, mock) {
  assert(
    !isType("undefined", obj),
    "spyOn could not find an object to spy upon"
  ), assert(
    isType("object", obj) || isType("function", obj),
    "cannot spyOn on a primitive value"
  );
  let [accessName, accessType] = (() => {
    if (!isType("object", methodName))
      return [methodName, "value"];
    if ("getter" in methodName && "setter" in methodName)
      throw new Error("cannot spy on both getter and setter");
    if ("getter" in methodName)
      return [methodName.getter, "get"];
    if ("setter" in methodName)
      return [methodName.setter, "set"];
    throw new Error("specify getter or setter to spy on");
  })(), [originalDescriptorObject, originalDescriptor] = getDescriptor(obj, accessName) || [];
  assert(
    originalDescriptor || accessName in obj,
    `${String(accessName)} does not exist`
  );
  let ssr = !1;
  accessType === "value" && originalDescriptor && !originalDescriptor.value && originalDescriptor.get && (accessType = "get", ssr = !0, mock = originalDescriptor.get());
  let original;
  originalDescriptor ? original = originalDescriptor[accessType] : accessType !== "value" ? original = () => obj[accessName] : original = obj[accessName], original && isSpyFunction(original) && (original = original[SYMBOL_STATE].getOriginal());
  let reassign = (cb) => {
    let { value, ...desc } = originalDescriptor || {
      configurable: !0,
      writable: !0
    };
    accessType !== "value" && delete desc.writable, desc[accessType] = cb, define(obj, accessName, desc);
  }, restore = () => {
    originalDescriptorObject !== obj ? Reflect.deleteProperty(obj, accessName) : originalDescriptor && !original ? define(obj, accessName, originalDescriptor) : reassign(original);
  };
  mock || (mock = original);
  let spy2 = wrap(createInternalSpy(mock), mock);
  accessType === "value" && setPototype(spy2, original);
  let state = spy2[SYMBOL_STATE];
  return defineValue(state, "restore", restore), defineValue(state, "getOriginal", () => ssr ? original() : original), defineValue(state, "willCall", (newCb) => (state.impl = newCb, spy2)), reassign(
    ssr ? () => (setPototype(spy2, mock), spy2) : spy2
  ), spies.add(spy2), spy2;
}
var ignoreProperties = /* @__PURE__ */ new Set([
  "length",
  "name",
  "prototype"
]);
function getAllProperties(original) {
  let properties = /* @__PURE__ */ new Set(), descriptors2 = {};
  for (; original && original !== Object.prototype && original !== Function.prototype; ) {
    let ownProperties = [
      ...Object.getOwnPropertyNames(original),
      ...Object.getOwnPropertySymbols(original)
    ];
    for (let prop of ownProperties)
      descriptors2[prop] || ignoreProperties.has(prop) || (properties.add(prop), descriptors2[prop] = Object.getOwnPropertyDescriptor(original, prop));
    original = Object.getPrototypeOf(original);
  }
  return {
    properties,
    descriptors: descriptors2
  };
}
function wrap(mock, original) {
  if (!original || // the original is already a spy, so it has all the properties
  SYMBOL_STATE in original)
    return mock;
  let { properties, descriptors: descriptors2 } = getAllProperties(original);
  for (let key of properties) {
    let descriptor = descriptors2[key];
    getDescriptor(mock, key) || define(mock, key, descriptor);
  }
  return mock;
}
function spyOn(obj, methodName, mock) {
  let spy2 = internalSpyOn(obj, methodName, mock);
  return populateSpy(spy2), ["restore", "getOriginal", "willCall"].forEach((method) => {
    defineValue(spy2, method, spy2[SYMBOL_STATE][method]);
  }), spy2;
}
function isSpyFunction(obj) {
  return isMockFunction(obj) && "getOriginal" in obj[SYMBOL_STATE];
}

// src/restoreAll.ts
function restoreAll() {
  for (let fn of spies)
    fn.restore();
  spies.clear();
}
export {
  createInternalSpy,
  getInternalState,
  internalSpyOn,
  restoreAll,
  spies,
  spy,
  spyOn
};

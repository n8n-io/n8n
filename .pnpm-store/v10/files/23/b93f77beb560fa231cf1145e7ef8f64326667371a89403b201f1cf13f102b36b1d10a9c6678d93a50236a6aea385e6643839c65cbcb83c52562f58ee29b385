// src/testing.ts
import {
  createApp,
  customRef,
  isReactive,
  isRef,
  isVue2,
  set,
  toRaw,
  triggerRef
} from "vue-demi";
import {
  setActivePinia,
  createPinia
} from "pinia";
function createTestingPinia({
  initialState = {},
  plugins = [],
  stubActions = true,
  stubPatch = false,
  stubReset = false,
  fakeApp = false,
  createSpy: _createSpy
} = {}) {
  const pinia = createPinia();
  pinia._p.push(({ store }) => {
    if (initialState[store.$id]) {
      mergeReactiveObjects(store.$state, initialState[store.$id]);
    }
  });
  plugins.forEach((plugin) => pinia._p.push(plugin));
  pinia._p.push(WritableComputed);
  const createSpy = _createSpy || // @ts-ignore
  typeof jest !== "undefined" && jest.fn || typeof vi !== "undefined" && vi.fn;
  if (!createSpy) {
    throw new Error(
      "[@pinia/testing]: You must configure the `createSpy` option."
    );
  }
  pinia._p.push(({ store, options }) => {
    Object.keys(options.actions).forEach((action) => {
      if (action === "$reset") return;
      store[action] = stubActions ? createSpy() : createSpy(store[action]);
    });
    store.$patch = stubPatch ? createSpy() : createSpy(store.$patch);
    store.$reset = stubReset ? createSpy() : createSpy(store.$reset);
  });
  if (fakeApp) {
    const app = createApp({});
    app.use(pinia);
  }
  pinia._testing = true;
  setActivePinia(pinia);
  Object.defineProperty(pinia, "app", {
    configurable: true,
    enumerable: true,
    get() {
      return this._a;
    }
  });
  return pinia;
}
function mergeReactiveObjects(target, patchToApply) {
  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key)) continue;
    const subPatch = patchToApply[key];
    const targetValue = target[key];
    if (isPlainObject(targetValue) && isPlainObject(subPatch) && target.hasOwnProperty(key) && !isRef(subPatch) && !isReactive(subPatch)) {
      target[key] = mergeReactiveObjects(targetValue, subPatch);
    } else {
      if (isVue2) {
        set(target, key, subPatch);
      } else {
        target[key] = subPatch;
      }
    }
  }
  return target;
}
function isPlainObject(o) {
  return o && typeof o === "object" && Object.prototype.toString.call(o) === "[object Object]" && typeof o.toJSON !== "function";
}
function isComputed(v) {
  return !!v && isRef(v) && "effect" in v;
}
function WritableComputed({ store }) {
  const rawStore = toRaw(store);
  for (const key in rawStore) {
    const originalComputed = rawStore[key];
    if (isComputed(originalComputed)) {
      const originalFn = originalComputed.effect.fn;
      rawStore[key] = customRef((track, trigger) => {
        const overriddenFn = () => (
          // @ts-expect-error: internal value
          originalComputed._value
        );
        return {
          get: () => {
            track();
            return originalComputed.value;
          },
          set: (newValue) => {
            if (newValue === void 0) {
              originalComputed.effect.fn = originalFn;
              delete originalComputed._value;
              originalComputed._dirty = true;
            } else {
              originalComputed.effect.fn = overriddenFn;
              originalComputed._value = newValue;
            }
            triggerRef(originalComputed);
            trigger();
          }
        };
      });
    }
  }
}
export {
  createTestingPinia
};

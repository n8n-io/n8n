/**
   * vue-table
   *
   * Copyright (c) TanStack
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE.md file in the root directory of this source tree.
   *
   * @license MIT
   */
import { createTable } from '@tanstack/table-core';
export * from '@tanstack/table-core';
import { defineComponent, h, isRef, shallowRef, watch, ref, watchEffect, unref } from 'vue';

function trueFn() {
  return true;
}
const $PROXY = Symbol('merge-proxy');

// https://github.com/solidjs/solid/blob/c20ca4fd8c36bc0522fedb2c7f38a110b7ee2663/packages/solid/src/render/component.ts#L51-L118
const propTraps = {
  get(_, property, receiver) {
    if (property === $PROXY) return receiver;
    return _.get(property);
  },
  has(_, property) {
    return _.has(property);
  },
  set: trueFn,
  deleteProperty: trueFn,
  getOwnPropertyDescriptor(_, property) {
    return {
      configurable: true,
      enumerable: true,
      get() {
        return _.get(property);
      },
      set: trueFn,
      deleteProperty: trueFn
    };
  },
  ownKeys(_) {
    return _.keys();
  }
};
function resolveSource(s) {
  return 'value' in s ? s.value : s;
}
function mergeProxy() {
  for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }
  return new Proxy({
    get(property) {
      for (let i = sources.length - 1; i >= 0; i--) {
        const v = resolveSource(sources[i])[property];
        if (v !== undefined) return v;
      }
    },
    has(property) {
      for (let i = sources.length - 1; i >= 0; i--) {
        if (property in resolveSource(sources[i])) return true;
      }
      return false;
    },
    keys() {
      const keys = [];
      for (let i = 0; i < sources.length; i++) keys.push(...Object.keys(resolveSource(sources[i])));
      return [...Array.from(new Set(keys))];
    }
  }, propTraps);
}

const FlexRender = defineComponent({
  props: ['render', 'props'],
  setup: props => {
    return () => {
      if (typeof props.render === 'function' || typeof props.render === 'object') {
        return h(props.render, props.props);
      }
      return props.render;
    };
  }
});
function getOptionsWithReactiveData(options) {
  return mergeProxy(options, {
    data: unref(options.data)
  });
}
function useVueTable(initialOptions) {
  const IS_REACTIVE = isRef(initialOptions.data);
  const resolvedOptions = mergeProxy({
    state: {},
    // Dummy state
    onStateChange: () => {},
    // noop
    renderFallbackValue: null,
    mergeOptions(defaultOptions, options) {
      return IS_REACTIVE ? {
        ...defaultOptions,
        ...options
      } : mergeProxy(defaultOptions, options);
    }
  }, IS_REACTIVE ? getOptionsWithReactiveData(initialOptions) : initialOptions);
  const table = createTable(resolvedOptions);

  // Add reactivity support
  if (IS_REACTIVE) {
    const dataRef = shallowRef(initialOptions.data);
    watch(dataRef, () => {
      table.setState(prev => ({
        ...prev,
        data: dataRef.value
      }));
    }, {
      immediate: true
    });
  }

  // can't use `reactive` because update needs to be immutable
  const state = ref(table.initialState);
  watchEffect(() => {
    table.setOptions(prev => {
      var _initialOptions$state;
      const stateProxy = new Proxy({}, {
        get: (_, prop) => state.value[prop]
      });
      return mergeProxy(prev, IS_REACTIVE ? getOptionsWithReactiveData(initialOptions) : initialOptions, {
        // merge the initialState and `options.state`
        // create a new proxy on each `setOptions` call
        // and get the value from state on each property access
        state: mergeProxy(stateProxy, (_initialOptions$state = initialOptions.state) != null ? _initialOptions$state : {}),
        // Similarly, we'll maintain both our internal state and any user-provided
        // state.
        onStateChange: updater => {
          if (updater instanceof Function) {
            state.value = updater(state.value);
          } else {
            state.value = updater;
          }
          initialOptions.onStateChange == null || initialOptions.onStateChange(updater);
        }
      });
    });
  });
  return table;
}

export { FlexRender, useVueTable };
//# sourceMappingURL=index.mjs.map

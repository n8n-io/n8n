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
'use strict';

var tableCore = require('@tanstack/table-core');
var vue = require('vue');
var mergeProxy = require('./merge-proxy.js');

const FlexRender = vue.defineComponent({
  props: ['render', 'props'],
  setup: props => {
    return () => {
      if (typeof props.render === 'function' || typeof props.render === 'object') {
        return vue.h(props.render, props.props);
      }
      return props.render;
    };
  }
});
function getOptionsWithReactiveData(options) {
  return mergeProxy.mergeProxy(options, {
    data: vue.unref(options.data)
  });
}
function useVueTable(initialOptions) {
  const IS_REACTIVE = vue.isRef(initialOptions.data);
  const resolvedOptions = mergeProxy.mergeProxy({
    state: {},
    // Dummy state
    onStateChange: () => {},
    // noop
    renderFallbackValue: null,
    mergeOptions(defaultOptions, options) {
      return IS_REACTIVE ? {
        ...defaultOptions,
        ...options
      } : mergeProxy.mergeProxy(defaultOptions, options);
    }
  }, IS_REACTIVE ? getOptionsWithReactiveData(initialOptions) : initialOptions);
  const table = tableCore.createTable(resolvedOptions);

  // Add reactivity support
  if (IS_REACTIVE) {
    const dataRef = vue.shallowRef(initialOptions.data);
    vue.watch(dataRef, () => {
      table.setState(prev => ({
        ...prev,
        data: dataRef.value
      }));
    }, {
      immediate: true
    });
  }

  // can't use `reactive` because update needs to be immutable
  const state = vue.ref(table.initialState);
  vue.watchEffect(() => {
    table.setOptions(prev => {
      var _initialOptions$state;
      const stateProxy = new Proxy({}, {
        get: (_, prop) => state.value[prop]
      });
      return mergeProxy.mergeProxy(prev, IS_REACTIVE ? getOptionsWithReactiveData(initialOptions) : initialOptions, {
        // merge the initialState and `options.state`
        // create a new proxy on each `setOptions` call
        // and get the value from state on each property access
        state: mergeProxy.mergeProxy(stateProxy, (_initialOptions$state = initialOptions.state) != null ? _initialOptions$state : {}),
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

exports.FlexRender = FlexRender;
exports.useVueTable = useVueTable;
Object.keys(tableCore).forEach(function (k) {
  if (k !== 'default' && !Object.prototype.hasOwnProperty.call(exports, k)) Object.defineProperty(exports, k, {
    enumerable: true,
    get: function () { return tableCore[k]; }
  });
});
//# sourceMappingURL=index.js.map

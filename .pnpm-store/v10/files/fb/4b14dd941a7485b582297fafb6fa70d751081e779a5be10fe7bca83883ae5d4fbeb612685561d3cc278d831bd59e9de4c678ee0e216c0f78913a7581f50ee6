'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@popperjs/core');
var lodashUnified = require('lodash-unified');

const usePopper = (referenceElementRef, popperElementRef, opts = {}) => {
  const stateUpdater = {
    name: "updateState",
    enabled: true,
    phase: "write",
    fn: ({ state }) => {
      const derivedState = deriveState(state);
      Object.assign(states.value, derivedState);
    },
    requires: ["computeStyles"]
  };
  const options = vue.computed(() => {
    const { onFirstUpdate, placement, strategy, modifiers } = vue.unref(opts);
    return {
      onFirstUpdate,
      placement: placement || "bottom",
      strategy: strategy || "absolute",
      modifiers: [
        ...modifiers || [],
        stateUpdater,
        { name: "applyStyles", enabled: false }
      ]
    };
  });
  const instanceRef = vue.shallowRef();
  const states = vue.ref({
    styles: {
      popper: {
        position: vue.unref(options).strategy,
        left: "0",
        top: "0"
      },
      arrow: {
        position: "absolute"
      }
    },
    attributes: {}
  });
  const destroy = () => {
    if (!instanceRef.value)
      return;
    instanceRef.value.destroy();
    instanceRef.value = void 0;
  };
  vue.watch(options, (newOptions) => {
    const instance = vue.unref(instanceRef);
    if (instance) {
      instance.setOptions(newOptions);
    }
  }, {
    deep: true
  });
  vue.watch([referenceElementRef, popperElementRef], ([referenceElement, popperElement]) => {
    destroy();
    if (!referenceElement || !popperElement)
      return;
    instanceRef.value = core.createPopper(referenceElement, popperElement, vue.unref(options));
  });
  vue.onBeforeUnmount(() => {
    destroy();
  });
  return {
    state: vue.computed(() => {
      var _a;
      return { ...((_a = vue.unref(instanceRef)) == null ? void 0 : _a.state) || {} };
    }),
    styles: vue.computed(() => vue.unref(states).styles),
    attributes: vue.computed(() => vue.unref(states).attributes),
    update: () => {
      var _a;
      return (_a = vue.unref(instanceRef)) == null ? void 0 : _a.update();
    },
    forceUpdate: () => {
      var _a;
      return (_a = vue.unref(instanceRef)) == null ? void 0 : _a.forceUpdate();
    },
    instanceRef: vue.computed(() => vue.unref(instanceRef))
  };
};
function deriveState(state) {
  const elements = Object.keys(state.elements);
  const styles = lodashUnified.fromPairs(elements.map((element) => [element, state.styles[element] || {}]));
  const attributes = lodashUnified.fromPairs(elements.map((element) => [element, state.attributes[element]]));
  return {
    styles,
    attributes
  };
}

exports.usePopper = usePopper;
//# sourceMappingURL=index.js.map

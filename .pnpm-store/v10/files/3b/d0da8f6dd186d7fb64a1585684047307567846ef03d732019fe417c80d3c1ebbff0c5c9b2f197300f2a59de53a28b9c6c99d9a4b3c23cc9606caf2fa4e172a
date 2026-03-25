'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var lodashUnified = require('lodash-unified');
require('../../../../hooks/index.js');
var constants = require('../constants.js');
var utils = require('../utils.js');
var index = require('../../../../hooks/use-popper/index.js');

const DEFAULT_ARROW_OFFSET = 0;
const usePopperContent = (props) => {
  const { popperInstanceRef, contentRef, triggerRef, role } = vue.inject(constants.POPPER_INJECTION_KEY, void 0);
  const arrowRef = vue.ref();
  const arrowOffset = vue.ref();
  const eventListenerModifier = vue.computed(() => {
    return {
      name: "eventListeners",
      enabled: !!props.visible
    };
  });
  const arrowModifier = vue.computed(() => {
    var _a;
    const arrowEl = vue.unref(arrowRef);
    const offset = (_a = vue.unref(arrowOffset)) != null ? _a : DEFAULT_ARROW_OFFSET;
    return {
      name: "arrow",
      enabled: !lodashUnified.isUndefined(arrowEl),
      options: {
        element: arrowEl,
        padding: offset
      }
    };
  });
  const options = vue.computed(() => {
    return {
      onFirstUpdate: () => {
        update();
      },
      ...utils.buildPopperOptions(props, [
        vue.unref(arrowModifier),
        vue.unref(eventListenerModifier)
      ])
    };
  });
  const computedReference = vue.computed(() => utils.unwrapMeasurableEl(props.referenceEl) || vue.unref(triggerRef));
  const { attributes, state, styles, update, forceUpdate, instanceRef } = index.usePopper(computedReference, contentRef, options);
  vue.watch(instanceRef, (instance) => popperInstanceRef.value = instance);
  vue.onMounted(() => {
    vue.watch(() => {
      var _a;
      return (_a = vue.unref(computedReference)) == null ? void 0 : _a.getBoundingClientRect();
    }, () => {
      update();
    });
  });
  return {
    attributes,
    arrowRef,
    contentRef,
    instanceRef,
    state,
    styles,
    role,
    forceUpdate,
    update
  };
};

exports.usePopperContent = usePopperContent;
//# sourceMappingURL=use-content.js.map

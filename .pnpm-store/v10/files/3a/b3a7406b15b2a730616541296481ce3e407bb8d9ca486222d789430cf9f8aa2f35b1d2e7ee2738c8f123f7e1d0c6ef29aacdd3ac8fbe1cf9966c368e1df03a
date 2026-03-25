'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var lodashUnified = require('lodash-unified');
var dom = require('@floating-ui/dom');
require('../../utils/index.js');
var runtime = require('../../utils/vue/props/runtime.js');
var objects = require('../../utils/objects.js');

const useFloatingProps = runtime.buildProps({});
const unrefReference = (elRef) => {
  if (!core.isClient)
    return;
  if (!elRef)
    return elRef;
  const unrefEl = core.unrefElement(elRef);
  if (unrefEl)
    return unrefEl;
  return vue.isRef(elRef) ? unrefEl : elRef;
};
const getPositionDataWithUnit = (record, key) => {
  const value = record == null ? void 0 : record[key];
  return lodashUnified.isNil(value) ? "" : `${value}px`;
};
const useFloating = ({
  middleware,
  placement,
  strategy
}) => {
  const referenceRef = vue.ref();
  const contentRef = vue.ref();
  const x = vue.ref();
  const y = vue.ref();
  const middlewareData = vue.ref({});
  const states = {
    x,
    y,
    placement,
    strategy,
    middlewareData
  };
  const update = async () => {
    if (!core.isClient)
      return;
    const referenceEl = unrefReference(referenceRef);
    const contentEl = core.unrefElement(contentRef);
    if (!referenceEl || !contentEl)
      return;
    const data = await dom.computePosition(referenceEl, contentEl, {
      placement: vue.unref(placement),
      strategy: vue.unref(strategy),
      middleware: vue.unref(middleware)
    });
    objects.keysOf(states).forEach((key) => {
      states[key].value = data[key];
    });
  };
  vue.onMounted(() => {
    vue.watchEffect(() => {
      update();
    });
  });
  return {
    ...states,
    update,
    referenceRef,
    contentRef
  };
};
const arrowMiddleware = ({
  arrowRef,
  padding
}) => {
  return {
    name: "arrow",
    options: {
      element: arrowRef,
      padding
    },
    fn(args) {
      const arrowEl = vue.unref(arrowRef);
      if (!arrowEl)
        return {};
      return dom.arrow({
        element: arrowEl,
        padding
      }).fn(args);
    }
  };
};

exports.arrowMiddleware = arrowMiddleware;
exports.getPositionDataWithUnit = getPositionDataWithUnit;
exports.useFloating = useFloating;
exports.useFloatingProps = useFloatingProps;
//# sourceMappingURL=index.js.map

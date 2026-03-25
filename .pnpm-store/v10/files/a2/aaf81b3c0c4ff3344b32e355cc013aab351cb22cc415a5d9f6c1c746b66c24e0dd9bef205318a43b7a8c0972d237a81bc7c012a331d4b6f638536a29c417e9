import { isRef, ref, unref, onMounted, watchEffect } from 'vue';
import { isClient, unrefElement } from '@vueuse/core';
import { isNil } from 'lodash-unified';
import { computePosition, arrow } from '@floating-ui/dom';
import '../../utils/index.mjs';
import { buildProps } from '../../utils/vue/props/runtime.mjs';
import { keysOf } from '../../utils/objects.mjs';

const useFloatingProps = buildProps({});
const unrefReference = (elRef) => {
  if (!isClient)
    return;
  if (!elRef)
    return elRef;
  const unrefEl = unrefElement(elRef);
  if (unrefEl)
    return unrefEl;
  return isRef(elRef) ? unrefEl : elRef;
};
const getPositionDataWithUnit = (record, key) => {
  const value = record == null ? void 0 : record[key];
  return isNil(value) ? "" : `${value}px`;
};
const useFloating = ({
  middleware,
  placement,
  strategy
}) => {
  const referenceRef = ref();
  const contentRef = ref();
  const x = ref();
  const y = ref();
  const middlewareData = ref({});
  const states = {
    x,
    y,
    placement,
    strategy,
    middlewareData
  };
  const update = async () => {
    if (!isClient)
      return;
    const referenceEl = unrefReference(referenceRef);
    const contentEl = unrefElement(contentRef);
    if (!referenceEl || !contentEl)
      return;
    const data = await computePosition(referenceEl, contentEl, {
      placement: unref(placement),
      strategy: unref(strategy),
      middleware: unref(middleware)
    });
    keysOf(states).forEach((key) => {
      states[key].value = data[key];
    });
  };
  onMounted(() => {
    watchEffect(() => {
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
      const arrowEl = unref(arrowRef);
      if (!arrowEl)
        return {};
      return arrow({
        element: arrowEl,
        padding
      }).fn(args);
    }
  };
};

export { arrowMiddleware, getPositionDataWithUnit, useFloating, useFloatingProps };
//# sourceMappingURL=index.mjs.map

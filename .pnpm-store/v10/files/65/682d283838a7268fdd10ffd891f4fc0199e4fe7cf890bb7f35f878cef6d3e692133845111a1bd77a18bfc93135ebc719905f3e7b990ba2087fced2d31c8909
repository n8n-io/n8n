import { watch, unref, nextTick } from 'vue';

const useDelayedRender = ({
  indicator,
  intermediateIndicator,
  shouldSetIntermediate = () => true,
  beforeShow,
  afterShow,
  afterHide,
  beforeHide
}) => {
  watch(() => unref(indicator), (val) => {
    if (val) {
      beforeShow == null ? void 0 : beforeShow();
      nextTick(() => {
        if (!unref(indicator))
          return;
        if (shouldSetIntermediate("show")) {
          intermediateIndicator.value = true;
        }
      });
    } else {
      beforeHide == null ? void 0 : beforeHide();
      nextTick(() => {
        if (unref(indicator))
          return;
        if (shouldSetIntermediate("hide")) {
          intermediateIndicator.value = false;
        }
      });
    }
  });
  watch(() => intermediateIndicator.value, (val) => {
    if (val) {
      afterShow == null ? void 0 : afterShow();
    } else {
      afterHide == null ? void 0 : afterHide();
    }
  });
};

export { useDelayedRender };
//# sourceMappingURL=index.mjs.map

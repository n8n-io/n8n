'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');

const useDelayedRender = ({
  indicator,
  intermediateIndicator,
  shouldSetIntermediate = () => true,
  beforeShow,
  afterShow,
  afterHide,
  beforeHide
}) => {
  vue.watch(() => vue.unref(indicator), (val) => {
    if (val) {
      beforeShow == null ? void 0 : beforeShow();
      vue.nextTick(() => {
        if (!vue.unref(indicator))
          return;
        if (shouldSetIntermediate("show")) {
          intermediateIndicator.value = true;
        }
      });
    } else {
      beforeHide == null ? void 0 : beforeHide();
      vue.nextTick(() => {
        if (vue.unref(indicator))
          return;
        if (shouldSetIntermediate("hide")) {
          intermediateIndicator.value = false;
        }
      });
    }
  });
  vue.watch(() => intermediateIndicator.value, (val) => {
    if (val) {
      afterShow == null ? void 0 : afterShow();
    } else {
      afterHide == null ? void 0 : afterHide();
    }
  });
};

exports.useDelayedRender = useDelayedRender;
//# sourceMappingURL=index.js.map

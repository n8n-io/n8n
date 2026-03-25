'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var index = require('../use-timeout/index.js');
var runtime = require('../../utils/vue/props/runtime.js');
var types = require('../../utils/types.js');

const useDelayedToggleProps = runtime.buildProps({
  showAfter: {
    type: Number,
    default: 0
  },
  hideAfter: {
    type: Number,
    default: 200
  },
  autoClose: {
    type: Number,
    default: 0
  }
});
const useDelayedToggle = ({
  showAfter,
  hideAfter,
  autoClose,
  open,
  close
}) => {
  const { registerTimeout } = index.useTimeout();
  const {
    registerTimeout: registerTimeoutForAutoClose,
    cancelTimeout: cancelTimeoutForAutoClose
  } = index.useTimeout();
  const onOpen = (event) => {
    registerTimeout(() => {
      open(event);
      const _autoClose = vue.unref(autoClose);
      if (types.isNumber(_autoClose) && _autoClose > 0) {
        registerTimeoutForAutoClose(() => {
          close(event);
        }, _autoClose);
      }
    }, vue.unref(showAfter));
  };
  const onClose = (event) => {
    cancelTimeoutForAutoClose();
    registerTimeout(() => {
      close(event);
    }, vue.unref(hideAfter));
  };
  return {
    onOpen,
    onClose
  };
};

exports.useDelayedToggle = useDelayedToggle;
exports.useDelayedToggleProps = useDelayedToggleProps;
//# sourceMappingURL=index.js.map

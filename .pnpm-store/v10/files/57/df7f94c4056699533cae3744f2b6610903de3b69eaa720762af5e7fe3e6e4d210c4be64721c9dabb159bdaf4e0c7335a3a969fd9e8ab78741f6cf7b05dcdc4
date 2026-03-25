'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var lodashUnified = require('lodash-unified');
require('../../../hooks/index.js');
require('../../../constants/index.js');
require('../../../utils/index.js');
require('../../config-provider/index.js');
var index = require('../../../hooks/use-z-index/index.js');
var index$1 = require('../../../hooks/use-id/index.js');
var useGlobalConfig = require('../../config-provider/src/hooks/use-global-config.js');
var index$2 = require('../../../hooks/use-namespace/index.js');
var style = require('../../../utils/dom/style.js');
var event = require('../../../constants/event.js');
var index$3 = require('../../../hooks/use-lockscreen/index.js');

const useDialog = (props, targetRef) => {
  var _a;
  const instance = vue.getCurrentInstance();
  const emit = instance.emit;
  const { nextZIndex } = index.useZIndex();
  let lastPosition = "";
  const titleId = index$1.useId();
  const bodyId = index$1.useId();
  const visible = vue.ref(false);
  const closed = vue.ref(false);
  const rendered = vue.ref(false);
  const zIndex = vue.ref((_a = props.zIndex) != null ? _a : nextZIndex());
  let openTimer = void 0;
  let closeTimer = void 0;
  const namespace = useGlobalConfig.useGlobalConfig("namespace", index$2.defaultNamespace);
  const style$1 = vue.computed(() => {
    const style2 = {};
    const varPrefix = `--${namespace.value}-dialog`;
    if (!props.fullscreen) {
      if (props.top) {
        style2[`${varPrefix}-margin-top`] = props.top;
      }
      if (props.width) {
        style2[`${varPrefix}-width`] = style.addUnit(props.width);
      }
    }
    return style2;
  });
  const overlayDialogStyle = vue.computed(() => {
    if (props.alignCenter) {
      return { display: "flex" };
    }
    return {};
  });
  function afterEnter() {
    emit("opened");
  }
  function afterLeave() {
    emit("closed");
    emit(event.UPDATE_MODEL_EVENT, false);
    if (props.destroyOnClose) {
      rendered.value = false;
    }
  }
  function beforeLeave() {
    emit("close");
  }
  function open() {
    closeTimer == null ? void 0 : closeTimer();
    openTimer == null ? void 0 : openTimer();
    if (props.openDelay && props.openDelay > 0) {
      ;
      ({ stop: openTimer } = core.useTimeoutFn(() => doOpen(), props.openDelay));
    } else {
      doOpen();
    }
  }
  function close() {
    openTimer == null ? void 0 : openTimer();
    closeTimer == null ? void 0 : closeTimer();
    if (props.closeDelay && props.closeDelay > 0) {
      ;
      ({ stop: closeTimer } = core.useTimeoutFn(() => doClose(), props.closeDelay));
    } else {
      doClose();
    }
  }
  function handleClose() {
    function hide(shouldCancel) {
      if (shouldCancel)
        return;
      closed.value = true;
      visible.value = false;
    }
    if (props.beforeClose) {
      props.beforeClose(hide);
    } else {
      close();
    }
  }
  function onModalClick() {
    if (props.closeOnClickModal) {
      handleClose();
    }
  }
  function doOpen() {
    if (!core.isClient)
      return;
    visible.value = true;
  }
  function doClose() {
    visible.value = false;
  }
  function onOpenAutoFocus() {
    emit("openAutoFocus");
  }
  function onCloseAutoFocus() {
    emit("closeAutoFocus");
  }
  function onFocusoutPrevented(event) {
    var _a2;
    if (((_a2 = event.detail) == null ? void 0 : _a2.focusReason) === "pointer") {
      event.preventDefault();
    }
  }
  if (props.lockScroll) {
    index$3.useLockscreen(visible);
  }
  function onCloseRequested() {
    if (props.closeOnPressEscape) {
      handleClose();
    }
  }
  vue.watch(() => props.modelValue, (val) => {
    if (val) {
      closed.value = false;
      open();
      rendered.value = true;
      zIndex.value = lodashUnified.isUndefined(props.zIndex) ? nextZIndex() : zIndex.value++;
      vue.nextTick(() => {
        emit("open");
        if (targetRef.value) {
          targetRef.value.scrollTop = 0;
        }
      });
    } else {
      if (visible.value) {
        close();
      }
    }
  });
  vue.watch(() => props.fullscreen, (val) => {
    if (!targetRef.value)
      return;
    if (val) {
      lastPosition = targetRef.value.style.transform;
      targetRef.value.style.transform = "";
    } else {
      targetRef.value.style.transform = lastPosition;
    }
  });
  vue.onMounted(() => {
    if (props.modelValue) {
      visible.value = true;
      rendered.value = true;
      open();
    }
  });
  return {
    afterEnter,
    afterLeave,
    beforeLeave,
    handleClose,
    onModalClick,
    close,
    doClose,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onCloseRequested,
    onFocusoutPrevented,
    titleId,
    bodyId,
    closed,
    style: style$1,
    overlayDialogStyle,
    rendered,
    visible,
    zIndex
  };
};

exports.useDialog = useDialog;
//# sourceMappingURL=use-dialog.js.map

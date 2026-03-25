'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var constants = require('./constants.js');
var error = require('../../../utils/error.js');
var index = require('../../../hooks/use-namespace/index.js');

const COMPONENT_NAME = "ElLabelWrap";
var FormLabelWrap = vue.defineComponent({
  name: COMPONENT_NAME,
  props: {
    isAutoWidth: Boolean,
    updateAll: Boolean
  },
  setup(props, {
    slots
  }) {
    const formContext = vue.inject(constants.formContextKey, void 0);
    const formItemContext = vue.inject(constants.formItemContextKey);
    if (!formItemContext)
      error.throwError(COMPONENT_NAME, "usage: <el-form-item><label-wrap /></el-form-item>");
    const ns = index.useNamespace("form");
    const el = vue.ref();
    const computedWidth = vue.ref(0);
    const getLabelWidth = () => {
      var _a;
      if ((_a = el.value) == null ? void 0 : _a.firstElementChild) {
        const width = window.getComputedStyle(el.value.firstElementChild).width;
        return Math.ceil(Number.parseFloat(width));
      } else {
        return 0;
      }
    };
    const updateLabelWidth = (action = "update") => {
      vue.nextTick(() => {
        if (slots.default && props.isAutoWidth) {
          if (action === "update") {
            computedWidth.value = getLabelWidth();
          } else if (action === "remove") {
            formContext == null ? void 0 : formContext.deregisterLabelWidth(computedWidth.value);
          }
        }
      });
    };
    const updateLabelWidthFn = () => updateLabelWidth("update");
    vue.onMounted(() => {
      updateLabelWidthFn();
    });
    vue.onBeforeUnmount(() => {
      updateLabelWidth("remove");
    });
    vue.onUpdated(() => updateLabelWidthFn());
    vue.watch(computedWidth, (val, oldVal) => {
      if (props.updateAll) {
        formContext == null ? void 0 : formContext.registerLabelWidth(val, oldVal);
      }
    });
    core.useResizeObserver(vue.computed(() => {
      var _a, _b;
      return (_b = (_a = el.value) == null ? void 0 : _a.firstElementChild) != null ? _b : null;
    }), updateLabelWidthFn);
    return () => {
      var _a, _b;
      if (!slots)
        return null;
      const {
        isAutoWidth
      } = props;
      if (isAutoWidth) {
        const autoLabelWidth = formContext == null ? void 0 : formContext.autoLabelWidth;
        const hasLabel = formItemContext == null ? void 0 : formItemContext.hasLabel;
        const style = {};
        if (hasLabel && autoLabelWidth && autoLabelWidth !== "auto") {
          const marginWidth = Math.max(0, Number.parseInt(autoLabelWidth, 10) - computedWidth.value);
          const marginPosition = formContext.labelPosition === "left" ? "marginRight" : "marginLeft";
          if (marginWidth) {
            style[marginPosition] = `${marginWidth}px`;
          }
        }
        return vue.createVNode("div", {
          "ref": el,
          "class": [ns.be("item", "label-wrap")],
          "style": style
        }, [(_a = slots.default) == null ? void 0 : _a.call(slots)]);
      } else {
        return vue.createVNode(vue.Fragment, {
          "ref": el
        }, [(_b = slots.default) == null ? void 0 : _b.call(slots)]);
      }
    };
  }
});

exports["default"] = FormLabelWrap;
//# sourceMappingURL=form-label-wrap.js.map

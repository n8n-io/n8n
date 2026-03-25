'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../utils/index.js');
require('../../../hooks/index.js');
var util = require('./util.js');
var bar = require('./bar2.js');
var constants = require('./constants.js');
var scrollbar = require('./scrollbar.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var style = require('../../../utils/dom/style.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');
var error = require('../../../utils/error.js');

const COMPONENT_NAME = "ElScrollbar";
const __default__ = vue.defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: scrollbar.scrollbarProps,
  emits: scrollbar.scrollbarEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const ns = index.useNamespace("scrollbar");
    let stopResizeObserver = void 0;
    let stopResizeListener = void 0;
    const scrollbarRef = vue.ref();
    const wrapRef = vue.ref();
    const resizeRef = vue.ref();
    const sizeWidth = vue.ref("0");
    const sizeHeight = vue.ref("0");
    const barRef = vue.ref();
    const ratioY = vue.ref(1);
    const ratioX = vue.ref(1);
    const wrapStyle = vue.computed(() => {
      const style$1 = {};
      if (props.height)
        style$1.height = style.addUnit(props.height);
      if (props.maxHeight)
        style$1.maxHeight = style.addUnit(props.maxHeight);
      return [props.wrapStyle, style$1];
    });
    const wrapKls = vue.computed(() => {
      return [
        props.wrapClass,
        ns.e("wrap"),
        { [ns.em("wrap", "hidden-default")]: !props.native }
      ];
    });
    const resizeKls = vue.computed(() => {
      return [ns.e("view"), props.viewClass];
    });
    const handleScroll = () => {
      var _a;
      if (wrapRef.value) {
        (_a = barRef.value) == null ? void 0 : _a.handleScroll(wrapRef.value);
        emit("scroll", {
          scrollTop: wrapRef.value.scrollTop,
          scrollLeft: wrapRef.value.scrollLeft
        });
      }
    };
    function scrollTo(arg1, arg2) {
      if (shared.isObject(arg1)) {
        wrapRef.value.scrollTo(arg1);
      } else if (types.isNumber(arg1) && types.isNumber(arg2)) {
        wrapRef.value.scrollTo(arg1, arg2);
      }
    }
    const setScrollTop = (value) => {
      if (!types.isNumber(value)) {
        error.debugWarn(COMPONENT_NAME, "value must be a number");
        return;
      }
      wrapRef.value.scrollTop = value;
    };
    const setScrollLeft = (value) => {
      if (!types.isNumber(value)) {
        error.debugWarn(COMPONENT_NAME, "value must be a number");
        return;
      }
      wrapRef.value.scrollLeft = value;
    };
    const update = () => {
      if (!wrapRef.value)
        return;
      const offsetHeight = wrapRef.value.offsetHeight - util.GAP;
      const offsetWidth = wrapRef.value.offsetWidth - util.GAP;
      const originalHeight = offsetHeight ** 2 / wrapRef.value.scrollHeight;
      const originalWidth = offsetWidth ** 2 / wrapRef.value.scrollWidth;
      const height = Math.max(originalHeight, props.minSize);
      const width = Math.max(originalWidth, props.minSize);
      ratioY.value = originalHeight / (offsetHeight - originalHeight) / (height / (offsetHeight - height));
      ratioX.value = originalWidth / (offsetWidth - originalWidth) / (width / (offsetWidth - width));
      sizeHeight.value = height + util.GAP < offsetHeight ? `${height}px` : "";
      sizeWidth.value = width + util.GAP < offsetWidth ? `${width}px` : "";
    };
    vue.watch(() => props.noresize, (noresize) => {
      if (noresize) {
        stopResizeObserver == null ? void 0 : stopResizeObserver();
        stopResizeListener == null ? void 0 : stopResizeListener();
      } else {
        ;
        ({ stop: stopResizeObserver } = core.useResizeObserver(resizeRef, update));
        stopResizeListener = core.useEventListener("resize", update);
      }
    }, { immediate: true });
    vue.watch(() => [props.maxHeight, props.height], () => {
      if (!props.native)
        vue.nextTick(() => {
          var _a;
          update();
          if (wrapRef.value) {
            (_a = barRef.value) == null ? void 0 : _a.handleScroll(wrapRef.value);
          }
        });
    });
    vue.provide(constants.scrollbarContextKey, vue.reactive({
      scrollbarElement: scrollbarRef,
      wrapElement: wrapRef
    }));
    vue.onMounted(() => {
      if (!props.native)
        vue.nextTick(() => {
          update();
        });
    });
    vue.onUpdated(() => update());
    expose({
      wrapRef,
      update,
      scrollTo,
      setScrollTop,
      setScrollLeft,
      handleScroll
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "scrollbarRef",
        ref: scrollbarRef,
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        vue.createElementVNode("div", {
          ref_key: "wrapRef",
          ref: wrapRef,
          class: vue.normalizeClass(vue.unref(wrapKls)),
          style: vue.normalizeStyle(vue.unref(wrapStyle)),
          onScroll: handleScroll
        }, [
          (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.tag), {
            id: _ctx.id,
            ref_key: "resizeRef",
            ref: resizeRef,
            class: vue.normalizeClass(vue.unref(resizeKls)),
            style: vue.normalizeStyle(_ctx.viewStyle),
            role: _ctx.role,
            "aria-label": _ctx.ariaLabel,
            "aria-orientation": _ctx.ariaOrientation
          }, {
            default: vue.withCtx(() => [
              vue.renderSlot(_ctx.$slots, "default")
            ]),
            _: 3
          }, 8, ["id", "class", "style", "role", "aria-label", "aria-orientation"]))
        ], 38),
        !_ctx.native ? (vue.openBlock(), vue.createBlock(bar["default"], {
          key: 0,
          ref_key: "barRef",
          ref: barRef,
          height: sizeHeight.value,
          width: sizeWidth.value,
          always: _ctx.always,
          "ratio-x": ratioX.value,
          "ratio-y": ratioY.value
        }, null, 8, ["height", "width", "always", "ratio-x", "ratio-y"])) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Scrollbar = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/scrollbar/src/scrollbar.vue"]]);

exports["default"] = Scrollbar;
//# sourceMappingURL=scrollbar2.js.map

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
require('../../../hooks/index.js');
var index$3 = require('../../image-viewer/index.js');
require('../../../utils/index.js');
var image = require('./image.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var index$2 = require('../../../hooks/use-attrs/index.js');
var position = require('../../../utils/dom/position.js');
var types = require('../../../utils/types.js');
var shared = require('@vue/shared');
var scroll = require('../../../utils/dom/scroll.js');

const _hoisted_1 = ["src", "loading"];
const _hoisted_2 = { key: 0 };
const __default__ = vue.defineComponent({
  name: "ElImage",
  inheritAttrs: false
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: image.imageProps,
  emits: image.imageEmits,
  setup(__props, { emit }) {
    const props = __props;
    let prevOverflow = "";
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("image");
    const rawAttrs = vue.useAttrs();
    const attrs = index$2.useAttrs();
    const imageSrc = vue.ref();
    const hasLoadError = vue.ref(false);
    const isLoading = vue.ref(true);
    const showViewer = vue.ref(false);
    const container = vue.ref();
    const _scrollContainer = vue.ref();
    const supportLoading = core.isClient && "loading" in HTMLImageElement.prototype;
    let stopScrollListener;
    let stopWheelListener;
    const imageKls = vue.computed(() => [
      ns.e("inner"),
      preview.value && ns.e("preview"),
      isLoading.value && ns.is("loading")
    ]);
    const containerStyle = vue.computed(() => rawAttrs.style);
    const imageStyle = vue.computed(() => {
      const { fit } = props;
      if (core.isClient && fit) {
        return { objectFit: fit };
      }
      return {};
    });
    const preview = vue.computed(() => {
      const { previewSrcList } = props;
      return Array.isArray(previewSrcList) && previewSrcList.length > 0;
    });
    const imageIndex = vue.computed(() => {
      const { previewSrcList, initialIndex } = props;
      let previewIndex = initialIndex;
      if (initialIndex > previewSrcList.length - 1) {
        previewIndex = 0;
      }
      return previewIndex;
    });
    const isManual = vue.computed(() => {
      if (props.loading === "eager")
        return false;
      return !supportLoading && props.loading === "lazy" || props.lazy;
    });
    const loadImage = () => {
      if (!core.isClient)
        return;
      isLoading.value = true;
      hasLoadError.value = false;
      imageSrc.value = props.src;
    };
    function handleLoad(event) {
      isLoading.value = false;
      hasLoadError.value = false;
      emit("load", event);
    }
    function handleError(event) {
      isLoading.value = false;
      hasLoadError.value = true;
      emit("error", event);
    }
    function handleLazyLoad() {
      if (position.isInContainer(container.value, _scrollContainer.value)) {
        loadImage();
        removeLazyLoadListener();
      }
    }
    const lazyLoadHandler = core.useThrottleFn(handleLazyLoad, 200, true);
    async function addLazyLoadListener() {
      var _a;
      if (!core.isClient)
        return;
      await vue.nextTick();
      const { scrollContainer } = props;
      if (types.isElement(scrollContainer)) {
        _scrollContainer.value = scrollContainer;
      } else if (shared.isString(scrollContainer) && scrollContainer !== "") {
        _scrollContainer.value = (_a = document.querySelector(scrollContainer)) != null ? _a : void 0;
      } else if (container.value) {
        _scrollContainer.value = scroll.getScrollContainer(container.value);
      }
      if (_scrollContainer.value) {
        stopScrollListener = core.useEventListener(_scrollContainer, "scroll", lazyLoadHandler);
        setTimeout(() => handleLazyLoad(), 100);
      }
    }
    function removeLazyLoadListener() {
      if (!core.isClient || !_scrollContainer.value || !lazyLoadHandler)
        return;
      stopScrollListener == null ? void 0 : stopScrollListener();
      _scrollContainer.value = void 0;
    }
    function wheelHandler(e) {
      if (!e.ctrlKey)
        return;
      if (e.deltaY < 0) {
        e.preventDefault();
        return false;
      } else if (e.deltaY > 0) {
        e.preventDefault();
        return false;
      }
    }
    function clickHandler() {
      if (!preview.value)
        return;
      stopWheelListener = core.useEventListener("wheel", wheelHandler, {
        passive: false
      });
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      showViewer.value = true;
      emit("show");
    }
    function closeViewer() {
      stopWheelListener == null ? void 0 : stopWheelListener();
      document.body.style.overflow = prevOverflow;
      showViewer.value = false;
      emit("close");
    }
    function switchViewer(val) {
      emit("switch", val);
    }
    vue.watch(() => props.src, () => {
      if (isManual.value) {
        isLoading.value = true;
        hasLoadError.value = false;
        removeLazyLoadListener();
        addLazyLoadListener();
      } else {
        loadImage();
      }
    });
    vue.onMounted(() => {
      if (isManual.value) {
        addLazyLoadListener();
      } else {
        loadImage();
      }
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "container",
        ref: container,
        class: vue.normalizeClass([vue.unref(ns).b(), _ctx.$attrs.class]),
        style: vue.normalizeStyle(vue.unref(containerStyle))
      }, [
        hasLoadError.value ? vue.renderSlot(_ctx.$slots, "error", { key: 0 }, () => [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).e("error"))
          }, vue.toDisplayString(vue.unref(t)("el.image.error")), 3)
        ]) : (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 1 }, [
          imageSrc.value !== void 0 ? (vue.openBlock(), vue.createElementBlock("img", vue.mergeProps({ key: 0 }, vue.unref(attrs), {
            src: imageSrc.value,
            loading: _ctx.loading,
            style: vue.unref(imageStyle),
            class: vue.unref(imageKls),
            onClick: clickHandler,
            onLoad: handleLoad,
            onError: handleError
          }), null, 16, _hoisted_1)) : vue.createCommentVNode("v-if", true),
          isLoading.value ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass(vue.unref(ns).e("wrapper"))
          }, [
            vue.renderSlot(_ctx.$slots, "placeholder", {}, () => [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(ns).e("placeholder"))
              }, null, 2)
            ])
          ], 2)) : vue.createCommentVNode("v-if", true)
        ], 64)),
        vue.unref(preview) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 2 }, [
          showViewer.value ? (vue.openBlock(), vue.createBlock(vue.unref(index$3.ElImageViewer), {
            key: 0,
            "z-index": _ctx.zIndex,
            "initial-index": vue.unref(imageIndex),
            infinite: _ctx.infinite,
            "zoom-rate": _ctx.zoomRate,
            "min-scale": _ctx.minScale,
            "max-scale": _ctx.maxScale,
            "url-list": _ctx.previewSrcList,
            "hide-on-click-modal": _ctx.hideOnClickModal,
            teleported: _ctx.previewTeleported,
            "close-on-press-escape": _ctx.closeOnPressEscape,
            onClose: closeViewer,
            onSwitch: switchViewer
          }, {
            default: vue.withCtx(() => [
              _ctx.$slots.viewer ? (vue.openBlock(), vue.createElementBlock("div", _hoisted_2, [
                vue.renderSlot(_ctx.$slots, "viewer")
              ])) : vue.createCommentVNode("v-if", true)
            ]),
            _: 3
          }, 8, ["z-index", "initial-index", "infinite", "zoom-rate", "min-scale", "max-scale", "url-list", "hide-on-click-modal", "teleported", "close-on-press-escape"])) : vue.createCommentVNode("v-if", true)
        ], 64)) : vue.createCommentVNode("v-if", true)
      ], 6);
    };
  }
});
var Image = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/image/src/image.vue"]]);

exports["default"] = Image;
//# sourceMappingURL=image2.js.map

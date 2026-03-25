'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var lodashUnified = require('lodash-unified');
require('../../../hooks/index.js');
require('../../../constants/index.js');
require('../../../utils/index.js');
var index$3 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
var imageViewer = require('./image-viewer.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var index$2 = require('../../../hooks/use-z-index/index.js');
var types = require('../../../utils/types.js');
var aria = require('../../../constants/aria.js');
var objects = require('../../../utils/objects.js');

const _hoisted_1 = ["src"];
const __default__ = vue.defineComponent({
  name: "ElImageViewer"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: imageViewer.imageViewerProps,
  emits: imageViewer.imageViewerEmits,
  setup(__props, { expose, emit }) {
    const props = __props;
    const modes = {
      CONTAIN: {
        name: "contain",
        icon: vue.markRaw(iconsVue.FullScreen)
      },
      ORIGINAL: {
        name: "original",
        icon: vue.markRaw(iconsVue.ScaleToOriginal)
      }
    };
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("image-viewer");
    const { nextZIndex } = index$2.useZIndex();
    const wrapper = vue.ref();
    const imgRefs = vue.ref([]);
    const scopeEventListener = vue.effectScope();
    const loading = vue.ref(true);
    const activeIndex = vue.ref(props.initialIndex);
    const mode = vue.shallowRef(modes.CONTAIN);
    const transform = vue.ref({
      scale: 1,
      deg: 0,
      offsetX: 0,
      offsetY: 0,
      enableTransition: false
    });
    const isSingle = vue.computed(() => {
      const { urlList } = props;
      return urlList.length <= 1;
    });
    const isFirst = vue.computed(() => {
      return activeIndex.value === 0;
    });
    const isLast = vue.computed(() => {
      return activeIndex.value === props.urlList.length - 1;
    });
    const currentImg = vue.computed(() => {
      return props.urlList[activeIndex.value];
    });
    const arrowPrevKls = vue.computed(() => [
      ns.e("btn"),
      ns.e("prev"),
      ns.is("disabled", !props.infinite && isFirst.value)
    ]);
    const arrowNextKls = vue.computed(() => [
      ns.e("btn"),
      ns.e("next"),
      ns.is("disabled", !props.infinite && isLast.value)
    ]);
    const imgStyle = vue.computed(() => {
      const { scale, deg, offsetX, offsetY, enableTransition } = transform.value;
      let translateX = offsetX / scale;
      let translateY = offsetY / scale;
      switch (deg % 360) {
        case 90:
        case -270:
          ;
          [translateX, translateY] = [translateY, -translateX];
          break;
        case 180:
        case -180:
          ;
          [translateX, translateY] = [-translateX, -translateY];
          break;
        case 270:
        case -90:
          ;
          [translateX, translateY] = [-translateY, translateX];
          break;
      }
      const style = {
        transform: `scale(${scale}) rotate(${deg}deg) translate(${translateX}px, ${translateY}px)`,
        transition: enableTransition ? "transform .3s" : ""
      };
      if (mode.value.name === modes.CONTAIN.name) {
        style.maxWidth = style.maxHeight = "100%";
      }
      return style;
    });
    const computedZIndex = vue.computed(() => {
      return types.isNumber(props.zIndex) ? props.zIndex : nextZIndex();
    });
    function hide() {
      unregisterEventListener();
      emit("close");
    }
    function registerEventListener() {
      const keydownHandler = lodashUnified.throttle((e) => {
        switch (e.code) {
          case aria.EVENT_CODE.esc:
            props.closeOnPressEscape && hide();
            break;
          case aria.EVENT_CODE.space:
            toggleMode();
            break;
          case aria.EVENT_CODE.left:
            prev();
            break;
          case aria.EVENT_CODE.up:
            handleActions("zoomIn");
            break;
          case aria.EVENT_CODE.right:
            next();
            break;
          case aria.EVENT_CODE.down:
            handleActions("zoomOut");
            break;
        }
      });
      const mousewheelHandler = lodashUnified.throttle((e) => {
        const delta = e.deltaY || e.deltaX;
        handleActions(delta < 0 ? "zoomIn" : "zoomOut", {
          zoomRate: props.zoomRate,
          enableTransition: false
        });
      });
      scopeEventListener.run(() => {
        core.useEventListener(document, "keydown", keydownHandler);
        core.useEventListener(document, "wheel", mousewheelHandler);
      });
    }
    function unregisterEventListener() {
      scopeEventListener.stop();
    }
    function handleImgLoad() {
      loading.value = false;
    }
    function handleImgError(e) {
      loading.value = false;
      e.target.alt = t("el.image.error");
    }
    function handleMouseDown(e) {
      if (loading.value || e.button !== 0 || !wrapper.value)
        return;
      transform.value.enableTransition = false;
      const { offsetX, offsetY } = transform.value;
      const startX = e.pageX;
      const startY = e.pageY;
      const dragHandler = lodashUnified.throttle((ev) => {
        transform.value = {
          ...transform.value,
          offsetX: offsetX + ev.pageX - startX,
          offsetY: offsetY + ev.pageY - startY
        };
      });
      const removeMousemove = core.useEventListener(document, "mousemove", dragHandler);
      core.useEventListener(document, "mouseup", () => {
        removeMousemove();
      });
      e.preventDefault();
    }
    function reset() {
      transform.value = {
        scale: 1,
        deg: 0,
        offsetX: 0,
        offsetY: 0,
        enableTransition: false
      };
    }
    function toggleMode() {
      if (loading.value)
        return;
      const modeNames = objects.keysOf(modes);
      const modeValues = Object.values(modes);
      const currentMode = mode.value.name;
      const index = modeValues.findIndex((i) => i.name === currentMode);
      const nextIndex = (index + 1) % modeNames.length;
      mode.value = modes[modeNames[nextIndex]];
      reset();
    }
    function setActiveItem(index) {
      const len = props.urlList.length;
      activeIndex.value = (index + len) % len;
    }
    function prev() {
      if (isFirst.value && !props.infinite)
        return;
      setActiveItem(activeIndex.value - 1);
    }
    function next() {
      if (isLast.value && !props.infinite)
        return;
      setActiveItem(activeIndex.value + 1);
    }
    function handleActions(action, options = {}) {
      if (loading.value)
        return;
      const { minScale, maxScale } = props;
      const { zoomRate, rotateDeg, enableTransition } = {
        zoomRate: props.zoomRate,
        rotateDeg: 90,
        enableTransition: true,
        ...options
      };
      switch (action) {
        case "zoomOut":
          if (transform.value.scale > minScale) {
            transform.value.scale = Number.parseFloat((transform.value.scale / zoomRate).toFixed(3));
          }
          break;
        case "zoomIn":
          if (transform.value.scale < maxScale) {
            transform.value.scale = Number.parseFloat((transform.value.scale * zoomRate).toFixed(3));
          }
          break;
        case "clockwise":
          transform.value.deg += rotateDeg;
          emit("rotate", transform.value.deg);
          break;
        case "anticlockwise":
          transform.value.deg -= rotateDeg;
          emit("rotate", transform.value.deg);
          break;
      }
      transform.value.enableTransition = enableTransition;
    }
    vue.watch(currentImg, () => {
      vue.nextTick(() => {
        const $img = imgRefs.value[0];
        if (!($img == null ? void 0 : $img.complete)) {
          loading.value = true;
        }
      });
    });
    vue.watch(activeIndex, (val) => {
      reset();
      emit("switch", val);
    });
    vue.onMounted(() => {
      var _a, _b;
      registerEventListener();
      (_b = (_a = wrapper.value) == null ? void 0 : _a.focus) == null ? void 0 : _b.call(_a);
    });
    expose({
      setActiveItem
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Teleport, {
        to: "body",
        disabled: !_ctx.teleported
      }, [
        vue.createVNode(vue.Transition, {
          name: "viewer-fade",
          appear: ""
        }, {
          default: vue.withCtx(() => [
            vue.createElementVNode("div", {
              ref_key: "wrapper",
              ref: wrapper,
              tabindex: -1,
              class: vue.normalizeClass(vue.unref(ns).e("wrapper")),
              style: vue.normalizeStyle({ zIndex: vue.unref(computedZIndex) })
            }, [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(ns).e("mask")),
                onClick: _cache[0] || (_cache[0] = vue.withModifiers(($event) => _ctx.hideOnClickModal && hide(), ["self"]))
              }, null, 2),
              vue.createCommentVNode(" CLOSE "),
              vue.createElementVNode("span", {
                class: vue.normalizeClass([vue.unref(ns).e("btn"), vue.unref(ns).e("close")]),
                onClick: hide
              }, [
                vue.createVNode(vue.unref(index$3.ElIcon), null, {
                  default: vue.withCtx(() => [
                    vue.createVNode(vue.unref(iconsVue.Close))
                  ]),
                  _: 1
                })
              ], 2),
              vue.createCommentVNode(" ARROW "),
              !vue.unref(isSingle) ? (vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: 0 }, [
                vue.createElementVNode("span", {
                  class: vue.normalizeClass(vue.unref(arrowPrevKls)),
                  onClick: prev
                }, [
                  vue.createVNode(vue.unref(index$3.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ArrowLeft))
                    ]),
                    _: 1
                  })
                ], 2),
                vue.createElementVNode("span", {
                  class: vue.normalizeClass(vue.unref(arrowNextKls)),
                  onClick: next
                }, [
                  vue.createVNode(vue.unref(index$3.ElIcon), null, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ArrowRight))
                    ]),
                    _: 1
                  })
                ], 2)
              ], 64)) : vue.createCommentVNode("v-if", true),
              vue.createCommentVNode(" ACTIONS "),
              vue.createElementVNode("div", {
                class: vue.normalizeClass([vue.unref(ns).e("btn"), vue.unref(ns).e("actions")])
              }, [
                vue.createElementVNode("div", {
                  class: vue.normalizeClass(vue.unref(ns).e("actions__inner"))
                }, [
                  vue.createVNode(vue.unref(index$3.ElIcon), {
                    onClick: _cache[1] || (_cache[1] = ($event) => handleActions("zoomOut"))
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ZoomOut))
                    ]),
                    _: 1
                  }),
                  vue.createVNode(vue.unref(index$3.ElIcon), {
                    onClick: _cache[2] || (_cache[2] = ($event) => handleActions("zoomIn"))
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.ZoomIn))
                    ]),
                    _: 1
                  }),
                  vue.createElementVNode("i", {
                    class: vue.normalizeClass(vue.unref(ns).e("actions__divider"))
                  }, null, 2),
                  vue.createVNode(vue.unref(index$3.ElIcon), { onClick: toggleMode }, {
                    default: vue.withCtx(() => [
                      (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(mode).icon)))
                    ]),
                    _: 1
                  }),
                  vue.createElementVNode("i", {
                    class: vue.normalizeClass(vue.unref(ns).e("actions__divider"))
                  }, null, 2),
                  vue.createVNode(vue.unref(index$3.ElIcon), {
                    onClick: _cache[3] || (_cache[3] = ($event) => handleActions("anticlockwise"))
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.RefreshLeft))
                    ]),
                    _: 1
                  }),
                  vue.createVNode(vue.unref(index$3.ElIcon), {
                    onClick: _cache[4] || (_cache[4] = ($event) => handleActions("clockwise"))
                  }, {
                    default: vue.withCtx(() => [
                      vue.createVNode(vue.unref(iconsVue.RefreshRight))
                    ]),
                    _: 1
                  })
                ], 2)
              ], 2),
              vue.createCommentVNode(" CANVAS "),
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(ns).e("canvas"))
              }, [
                (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.urlList, (url, i) => {
                  return vue.withDirectives((vue.openBlock(), vue.createElementBlock("img", {
                    ref_for: true,
                    ref: (el) => imgRefs.value[i] = el,
                    key: url,
                    src: url,
                    style: vue.normalizeStyle(vue.unref(imgStyle)),
                    class: vue.normalizeClass(vue.unref(ns).e("img")),
                    onLoad: handleImgLoad,
                    onError: handleImgError,
                    onMousedown: handleMouseDown
                  }, null, 46, _hoisted_1)), [
                    [vue.vShow, i === activeIndex.value]
                  ]);
                }), 128))
              ], 2),
              vue.renderSlot(_ctx.$slots, "default")
            ], 6)
          ]),
          _: 3
        })
      ], 8, ["disabled"]);
    };
  }
});
var ImageViewer = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/image-viewer/src/image-viewer.vue"]]);

exports["default"] = ImageViewer;
//# sourceMappingURL=image-viewer2.js.map

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var core = require('@vueuse/core');
var watermark = require('./watermark.js');
var utils = require('./utils.js');
var useClips = require('./useClips.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const __default__ = vue.defineComponent({
  name: "ElWatermark"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: watermark.watermarkProps,
  setup(__props) {
    const props = __props;
    const style = {
      position: "relative"
    };
    const color = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.color) != null ? _b : "rgba(0,0,0,.15)";
    });
    const fontSize = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontSize) != null ? _b : 16;
    });
    const fontWeight = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontWeight) != null ? _b : "normal";
    });
    const fontStyle = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontStyle) != null ? _b : "normal";
    });
    const fontFamily = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontFamily) != null ? _b : "sans-serif";
    });
    const textAlign = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.textAlign) != null ? _b : "center";
    });
    const textBaseline = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.textBaseline) != null ? _b : "top";
    });
    const gapX = vue.computed(() => props.gap[0]);
    const gapY = vue.computed(() => props.gap[1]);
    const gapXCenter = vue.computed(() => gapX.value / 2);
    const gapYCenter = vue.computed(() => gapY.value / 2);
    const offsetLeft = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.offset) == null ? void 0 : _a[0]) != null ? _b : gapXCenter.value;
    });
    const offsetTop = vue.computed(() => {
      var _a, _b;
      return (_b = (_a = props.offset) == null ? void 0 : _a[1]) != null ? _b : gapYCenter.value;
    });
    const getMarkStyle = () => {
      const markStyle = {
        zIndex: props.zIndex,
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        backgroundRepeat: "repeat"
      };
      let positionLeft = offsetLeft.value - gapXCenter.value;
      let positionTop = offsetTop.value - gapYCenter.value;
      if (positionLeft > 0) {
        markStyle.left = `${positionLeft}px`;
        markStyle.width = `calc(100% - ${positionLeft}px)`;
        positionLeft = 0;
      }
      if (positionTop > 0) {
        markStyle.top = `${positionTop}px`;
        markStyle.height = `calc(100% - ${positionTop}px)`;
        positionTop = 0;
      }
      markStyle.backgroundPosition = `${positionLeft}px ${positionTop}px`;
      return markStyle;
    };
    const containerRef = vue.shallowRef(null);
    const watermarkRef = vue.shallowRef();
    const stopObservation = vue.ref(false);
    const destroyWatermark = () => {
      if (watermarkRef.value) {
        watermarkRef.value.remove();
        watermarkRef.value = void 0;
      }
    };
    const appendWatermark = (base64Url, markWidth) => {
      var _a;
      if (containerRef.value && watermarkRef.value) {
        stopObservation.value = true;
        watermarkRef.value.setAttribute("style", utils.getStyleStr({
          ...getMarkStyle(),
          backgroundImage: `url('${base64Url}')`,
          backgroundSize: `${Math.floor(markWidth)}px`
        }));
        (_a = containerRef.value) == null ? void 0 : _a.append(watermarkRef.value);
        setTimeout(() => {
          stopObservation.value = false;
        });
      }
    };
    const getMarkSize = (ctx) => {
      let defaultWidth = 120;
      let defaultHeight = 64;
      const image = props.image;
      const content = props.content;
      const width = props.width;
      const height = props.height;
      if (!image && ctx.measureText) {
        ctx.font = `${Number(fontSize.value)}px ${fontFamily.value}`;
        const contents = Array.isArray(content) ? content : [content];
        const sizes = contents.map((item) => {
          const metrics = ctx.measureText(item);
          return [
            metrics.width,
            metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
          ];
        });
        defaultWidth = Math.ceil(Math.max(...sizes.map((size) => size[0])));
        defaultHeight = Math.ceil(Math.max(...sizes.map((size) => size[1]))) * contents.length + (contents.length - 1) * useClips.FontGap;
      }
      return [width != null ? width : defaultWidth, height != null ? height : defaultHeight];
    };
    const getClips = useClips["default"]();
    const renderWatermark = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const image = props.image;
      const content = props.content;
      const rotate = props.rotate;
      if (ctx) {
        if (!watermarkRef.value) {
          watermarkRef.value = document.createElement("div");
        }
        const ratio = utils.getPixelRatio();
        const [markWidth, markHeight] = getMarkSize(ctx);
        const drawCanvas = (drawContent) => {
          const [textClips, clipWidth] = getClips(drawContent || "", rotate, ratio, markWidth, markHeight, {
            color: color.value,
            fontSize: fontSize.value,
            fontStyle: fontStyle.value,
            fontWeight: fontWeight.value,
            fontFamily: fontFamily.value,
            textAlign: textAlign.value,
            textBaseline: textBaseline.value
          }, gapX.value, gapY.value);
          appendWatermark(textClips, clipWidth);
        };
        if (image) {
          const img = new Image();
          img.onload = () => {
            drawCanvas(img);
          };
          img.onerror = () => {
            drawCanvas(content);
          };
          img.crossOrigin = "anonymous";
          img.referrerPolicy = "no-referrer";
          img.src = image;
        } else {
          drawCanvas(content);
        }
      }
    };
    vue.onMounted(() => {
      renderWatermark();
    });
    vue.watch(() => props, () => {
      renderWatermark();
    }, {
      deep: true,
      flush: "post"
    });
    vue.onBeforeUnmount(() => {
      destroyWatermark();
    });
    const onMutate = (mutations) => {
      if (stopObservation.value) {
        return;
      }
      mutations.forEach((mutation) => {
        if (utils.reRendering(mutation, watermarkRef.value)) {
          destroyWatermark();
          renderWatermark();
        }
      });
    };
    core.useMutationObserver(containerRef, onMutate, {
      attributes: true
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        ref_key: "containerRef",
        ref: containerRef,
        style: vue.normalizeStyle([style])
      }, [
        vue.renderSlot(_ctx.$slots, "default")
      ], 4);
    };
  }
});
var Watermark = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/watermark/src/watermark.vue"]]);

exports["default"] = Watermark;
//# sourceMappingURL=watermark2.js.map

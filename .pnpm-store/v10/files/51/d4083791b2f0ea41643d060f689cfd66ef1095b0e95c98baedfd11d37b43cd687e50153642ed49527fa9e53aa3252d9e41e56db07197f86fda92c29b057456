import { defineComponent, computed, shallowRef, ref, onMounted, watch, onBeforeUnmount, openBlock, createElementBlock, normalizeStyle, renderSlot } from 'vue';
import { useMutationObserver } from '@vueuse/core';
import { watermarkProps } from './watermark.mjs';
import { getStyleStr, getPixelRatio, reRendering } from './utils.mjs';
import useClips, { FontGap } from './useClips.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const __default__ = defineComponent({
  name: "ElWatermark"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: watermarkProps,
  setup(__props) {
    const props = __props;
    const style = {
      position: "relative"
    };
    const color = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.color) != null ? _b : "rgba(0,0,0,.15)";
    });
    const fontSize = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontSize) != null ? _b : 16;
    });
    const fontWeight = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontWeight) != null ? _b : "normal";
    });
    const fontStyle = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontStyle) != null ? _b : "normal";
    });
    const fontFamily = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.fontFamily) != null ? _b : "sans-serif";
    });
    const textAlign = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.textAlign) != null ? _b : "center";
    });
    const textBaseline = computed(() => {
      var _a, _b;
      return (_b = (_a = props.font) == null ? void 0 : _a.textBaseline) != null ? _b : "top";
    });
    const gapX = computed(() => props.gap[0]);
    const gapY = computed(() => props.gap[1]);
    const gapXCenter = computed(() => gapX.value / 2);
    const gapYCenter = computed(() => gapY.value / 2);
    const offsetLeft = computed(() => {
      var _a, _b;
      return (_b = (_a = props.offset) == null ? void 0 : _a[0]) != null ? _b : gapXCenter.value;
    });
    const offsetTop = computed(() => {
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
    const containerRef = shallowRef(null);
    const watermarkRef = shallowRef();
    const stopObservation = ref(false);
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
        watermarkRef.value.setAttribute("style", getStyleStr({
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
        defaultHeight = Math.ceil(Math.max(...sizes.map((size) => size[1]))) * contents.length + (contents.length - 1) * FontGap;
      }
      return [width != null ? width : defaultWidth, height != null ? height : defaultHeight];
    };
    const getClips = useClips();
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
        const ratio = getPixelRatio();
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
    onMounted(() => {
      renderWatermark();
    });
    watch(() => props, () => {
      renderWatermark();
    }, {
      deep: true,
      flush: "post"
    });
    onBeforeUnmount(() => {
      destroyWatermark();
    });
    const onMutate = (mutations) => {
      if (stopObservation.value) {
        return;
      }
      mutations.forEach((mutation) => {
        if (reRendering(mutation, watermarkRef.value)) {
          destroyWatermark();
          renderWatermark();
        }
      });
    };
    useMutationObserver(containerRef, onMutate, {
      attributes: true
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        ref_key: "containerRef",
        ref: containerRef,
        style: normalizeStyle([style])
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 4);
    };
  }
});
var Watermark = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/watermark/src/watermark.vue"]]);

export { Watermark as default };
//# sourceMappingURL=watermark2.mjs.map

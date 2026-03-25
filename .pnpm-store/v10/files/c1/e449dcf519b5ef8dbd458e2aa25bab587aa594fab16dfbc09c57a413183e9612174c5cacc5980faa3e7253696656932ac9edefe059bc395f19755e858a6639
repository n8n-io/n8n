'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var progress = require('./progress.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var shared = require('@vue/shared');

const _hoisted_1 = ["aria-valuenow"];
const _hoisted_2 = { viewBox: "0 0 100 100" };
const _hoisted_3 = ["d", "stroke", "stroke-linecap", "stroke-width"];
const _hoisted_4 = ["d", "stroke", "opacity", "stroke-linecap", "stroke-width"];
const _hoisted_5 = { key: 0 };
const __default__ = vue.defineComponent({
  name: "ElProgress"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: progress.progressProps,
  setup(__props) {
    const props = __props;
    const STATUS_COLOR_MAP = {
      success: "#13ce66",
      exception: "#ff4949",
      warning: "#e6a23c",
      default: "#20a0ff"
    };
    const ns = index.useNamespace("progress");
    const barStyle = vue.computed(() => ({
      width: `${props.percentage}%`,
      animationDuration: `${props.duration}s`,
      backgroundColor: getCurrentColor(props.percentage)
    }));
    const relativeStrokeWidth = vue.computed(() => (props.strokeWidth / props.width * 100).toFixed(1));
    const radius = vue.computed(() => {
      if (["circle", "dashboard"].includes(props.type)) {
        return Number.parseInt(`${50 - Number.parseFloat(relativeStrokeWidth.value) / 2}`, 10);
      }
      return 0;
    });
    const trackPath = vue.computed(() => {
      const r = radius.value;
      const isDashboard = props.type === "dashboard";
      return `
          M 50 50
          m 0 ${isDashboard ? "" : "-"}${r}
          a ${r} ${r} 0 1 1 0 ${isDashboard ? "-" : ""}${r * 2}
          a ${r} ${r} 0 1 1 0 ${isDashboard ? "" : "-"}${r * 2}
          `;
    });
    const perimeter = vue.computed(() => 2 * Math.PI * radius.value);
    const rate = vue.computed(() => props.type === "dashboard" ? 0.75 : 1);
    const strokeDashoffset = vue.computed(() => {
      const offset = -1 * perimeter.value * (1 - rate.value) / 2;
      return `${offset}px`;
    });
    const trailPathStyle = vue.computed(() => ({
      strokeDasharray: `${perimeter.value * rate.value}px, ${perimeter.value}px`,
      strokeDashoffset: strokeDashoffset.value
    }));
    const circlePathStyle = vue.computed(() => ({
      strokeDasharray: `${perimeter.value * rate.value * (props.percentage / 100)}px, ${perimeter.value}px`,
      strokeDashoffset: strokeDashoffset.value,
      transition: "stroke-dasharray 0.6s ease 0s, stroke 0.6s ease, opacity ease 0.6s"
    }));
    const stroke = vue.computed(() => {
      let ret;
      if (props.color) {
        ret = getCurrentColor(props.percentage);
      } else {
        ret = STATUS_COLOR_MAP[props.status] || STATUS_COLOR_MAP.default;
      }
      return ret;
    });
    const statusIcon = vue.computed(() => {
      if (props.status === "warning") {
        return iconsVue.WarningFilled;
      }
      if (props.type === "line") {
        return props.status === "success" ? iconsVue.CircleCheck : iconsVue.CircleClose;
      } else {
        return props.status === "success" ? iconsVue.Check : iconsVue.Close;
      }
    });
    const progressTextSize = vue.computed(() => {
      return props.type === "line" ? 12 + props.strokeWidth * 0.4 : props.width * 0.111111 + 2;
    });
    const content = vue.computed(() => props.format(props.percentage));
    function getColors(color) {
      const span = 100 / color.length;
      const seriesColors = color.map((seriesColor, index) => {
        if (shared.isString(seriesColor)) {
          return {
            color: seriesColor,
            percentage: (index + 1) * span
          };
        }
        return seriesColor;
      });
      return seriesColors.sort((a, b) => a.percentage - b.percentage);
    }
    const getCurrentColor = (percentage) => {
      var _a;
      const { color } = props;
      if (shared.isFunction(color)) {
        return color(percentage);
      } else if (shared.isString(color)) {
        return color;
      } else {
        const colors = getColors(color);
        for (const color2 of colors) {
          if (color2.percentage > percentage)
            return color2.color;
        }
        return (_a = colors[colors.length - 1]) == null ? void 0 : _a.color;
      }
    };
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([
          vue.unref(ns).b(),
          vue.unref(ns).m(_ctx.type),
          vue.unref(ns).is(_ctx.status),
          {
            [vue.unref(ns).m("without-text")]: !_ctx.showText,
            [vue.unref(ns).m("text-inside")]: _ctx.textInside
          }
        ]),
        role: "progressbar",
        "aria-valuenow": _ctx.percentage,
        "aria-valuemin": "0",
        "aria-valuemax": "100"
      }, [
        _ctx.type === "line" ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).b("bar"))
        }, [
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).be("bar", "outer")),
            style: vue.normalizeStyle({ height: `${_ctx.strokeWidth}px` })
          }, [
            vue.createElementVNode("div", {
              class: vue.normalizeClass([
                vue.unref(ns).be("bar", "inner"),
                { [vue.unref(ns).bem("bar", "inner", "indeterminate")]: _ctx.indeterminate },
                { [vue.unref(ns).bem("bar", "inner", "striped")]: _ctx.striped },
                { [vue.unref(ns).bem("bar", "inner", "striped-flow")]: _ctx.stripedFlow }
              ]),
              style: vue.normalizeStyle(vue.unref(barStyle))
            }, [
              (_ctx.showText || _ctx.$slots.default) && _ctx.textInside ? (vue.openBlock(), vue.createElementBlock("div", {
                key: 0,
                class: vue.normalizeClass(vue.unref(ns).be("bar", "innerText"))
              }, [
                vue.renderSlot(_ctx.$slots, "default", { percentage: _ctx.percentage }, () => [
                  vue.createElementVNode("span", null, vue.toDisplayString(vue.unref(content)), 1)
                ])
              ], 2)) : vue.createCommentVNode("v-if", true)
            ], 6)
          ], 6)
        ], 2)) : (vue.openBlock(), vue.createElementBlock("div", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).b("circle")),
          style: vue.normalizeStyle({ height: `${_ctx.width}px`, width: `${_ctx.width}px` })
        }, [
          (vue.openBlock(), vue.createElementBlock("svg", _hoisted_2, [
            vue.createElementVNode("path", {
              class: vue.normalizeClass(vue.unref(ns).be("circle", "track")),
              d: vue.unref(trackPath),
              stroke: `var(${vue.unref(ns).cssVarName("fill-color-light")}, #e5e9f2)`,
              "stroke-linecap": _ctx.strokeLinecap,
              "stroke-width": vue.unref(relativeStrokeWidth),
              fill: "none",
              style: vue.normalizeStyle(vue.unref(trailPathStyle))
            }, null, 14, _hoisted_3),
            vue.createElementVNode("path", {
              class: vue.normalizeClass(vue.unref(ns).be("circle", "path")),
              d: vue.unref(trackPath),
              stroke: vue.unref(stroke),
              fill: "none",
              opacity: _ctx.percentage ? 1 : 0,
              "stroke-linecap": _ctx.strokeLinecap,
              "stroke-width": vue.unref(relativeStrokeWidth),
              style: vue.normalizeStyle(vue.unref(circlePathStyle))
            }, null, 14, _hoisted_4)
          ]))
        ], 6)),
        (_ctx.showText || _ctx.$slots.default) && !_ctx.textInside ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 2,
          class: vue.normalizeClass(vue.unref(ns).e("text")),
          style: vue.normalizeStyle({ fontSize: `${vue.unref(progressTextSize)}px` })
        }, [
          vue.renderSlot(_ctx.$slots, "default", { percentage: _ctx.percentage }, () => [
            !_ctx.status ? (vue.openBlock(), vue.createElementBlock("span", _hoisted_5, vue.toDisplayString(vue.unref(content)), 1)) : (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 1 }, {
              default: vue.withCtx(() => [
                (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(vue.unref(statusIcon))))
              ]),
              _: 1
            }))
          ])
        ], 6)) : vue.createCommentVNode("v-if", true)
      ], 10, _hoisted_1);
    };
  }
});
var Progress = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/progress/src/progress.vue"]]);

exports["default"] = Progress;
//# sourceMappingURL=progress2.js.map

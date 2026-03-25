'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
var timelineItem = require('./timeline-item.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElTimelineItem"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: timelineItem.timelineItemProps,
  setup(__props) {
    const props = __props;
    const ns = index.useNamespace("timeline-item");
    const defaultNodeKls = vue.computed(() => [
      ns.e("node"),
      ns.em("node", props.size || ""),
      ns.em("node", props.type || ""),
      ns.is("hollow", props.hollow)
    ]);
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("li", {
        class: vue.normalizeClass([vue.unref(ns).b(), { [vue.unref(ns).e("center")]: _ctx.center }])
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("tail"))
        }, null, 2),
        !_ctx.$slots.dot ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(defaultNodeKls)),
          style: vue.normalizeStyle({
            backgroundColor: _ctx.color
          })
        }, [
          _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), {
            key: 0,
            class: vue.normalizeClass(vue.unref(ns).e("icon"))
          }, {
            default: vue.withCtx(() => [
              (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
            ]),
            _: 1
          }, 8, ["class"])) : vue.createCommentVNode("v-if", true)
        ], 6)) : vue.createCommentVNode("v-if", true),
        _ctx.$slots.dot ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 1,
          class: vue.normalizeClass(vue.unref(ns).e("dot"))
        }, [
          vue.renderSlot(_ctx.$slots, "dot")
        ], 2)) : vue.createCommentVNode("v-if", true),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("wrapper"))
        }, [
          !_ctx.hideTimestamp && _ctx.placement === "top" ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            class: vue.normalizeClass([vue.unref(ns).e("timestamp"), vue.unref(ns).is("top")])
          }, vue.toDisplayString(_ctx.timestamp), 3)) : vue.createCommentVNode("v-if", true),
          vue.createElementVNode("div", {
            class: vue.normalizeClass(vue.unref(ns).e("content"))
          }, [
            vue.renderSlot(_ctx.$slots, "default")
          ], 2),
          !_ctx.hideTimestamp && _ctx.placement === "bottom" ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 1,
            class: vue.normalizeClass([vue.unref(ns).e("timestamp"), vue.unref(ns).is("bottom")])
          }, vue.toDisplayString(_ctx.timestamp), 3)) : vue.createCommentVNode("v-if", true)
        ], 2)
      ], 2);
    };
  }
});
var TimelineItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/timeline/src/timeline-item.vue"]]);

exports["default"] = TimelineItem;
//# sourceMappingURL=timeline-item2.js.map

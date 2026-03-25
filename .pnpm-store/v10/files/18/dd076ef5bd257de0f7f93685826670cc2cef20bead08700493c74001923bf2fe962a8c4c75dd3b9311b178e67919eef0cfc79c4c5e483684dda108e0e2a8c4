'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var imgEmpty = require('./img-empty.js');
var empty = require('./empty.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-locale/index.js');
var index$1 = require('../../../hooks/use-namespace/index.js');
var style = require('../../../utils/dom/style.js');

const _hoisted_1 = ["src"];
const _hoisted_2 = { key: 1 };
const __default__ = vue.defineComponent({
  name: "ElEmpty"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: empty.emptyProps,
  setup(__props) {
    const props = __props;
    const { t } = index.useLocale();
    const ns = index$1.useNamespace("empty");
    const emptyDescription = vue.computed(() => props.description || t("el.table.emptyText"));
    const imageStyle = vue.computed(() => ({
      width: style.addUnit(props.imageSize)
    }));
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(ns).b())
      }, [
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("image")),
          style: vue.normalizeStyle(vue.unref(imageStyle))
        }, [
          _ctx.image ? (vue.openBlock(), vue.createElementBlock("img", {
            key: 0,
            src: _ctx.image,
            ondragstart: "return false"
          }, null, 8, _hoisted_1)) : vue.renderSlot(_ctx.$slots, "image", { key: 1 }, () => [
            vue.createVNode(imgEmpty["default"])
          ])
        ], 6),
        vue.createElementVNode("div", {
          class: vue.normalizeClass(vue.unref(ns).e("description"))
        }, [
          _ctx.$slots.description ? vue.renderSlot(_ctx.$slots, "description", { key: 0 }) : (vue.openBlock(), vue.createElementBlock("p", _hoisted_2, vue.toDisplayString(vue.unref(emptyDescription)), 1))
        ], 2),
        _ctx.$slots.default ? (vue.openBlock(), vue.createElementBlock("div", {
          key: 0,
          class: vue.normalizeClass(vue.unref(ns).e("bottom"))
        }, [
          vue.renderSlot(_ctx.$slots, "default")
        ], 2)) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Empty = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/empty/src/empty.vue"]]);

exports["default"] = Empty;
//# sourceMappingURL=empty2.js.map

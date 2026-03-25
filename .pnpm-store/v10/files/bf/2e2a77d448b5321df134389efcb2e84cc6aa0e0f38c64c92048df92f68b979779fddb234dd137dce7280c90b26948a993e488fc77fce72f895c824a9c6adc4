'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var iconsVue = require('@element-plus/icons-vue');
var skeletonItem = require('./skeleton-item.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const __default__ = vue.defineComponent({
  name: "ElSkeletonItem"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: skeletonItem.skeletonItemProps,
  setup(__props) {
    const ns = index.useNamespace("skeleton");
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass([vue.unref(ns).e("item"), vue.unref(ns).e(_ctx.variant)])
      }, [
        _ctx.variant === "image" ? (vue.openBlock(), vue.createBlock(vue.unref(iconsVue.PictureFilled), { key: 0 })) : vue.createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var SkeletonItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/skeleton/src/skeleton-item.vue"]]);

exports["default"] = SkeletonItem;
//# sourceMappingURL=skeleton-item2.js.map

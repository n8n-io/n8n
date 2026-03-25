'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../hooks/index.js');
var skeleton = require('./skeleton.js');
var skeletonItem = require('./skeleton-item2.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var index$1 = require('../../../hooks/use-throttle-render/index.js');

const __default__ = vue.defineComponent({
  name: "ElSkeleton"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: skeleton.skeletonProps,
  setup(__props, { expose }) {
    const props = __props;
    const ns = index.useNamespace("skeleton");
    const uiLoading = index$1.useThrottleRender(vue.toRef(props, "loading"), props.throttle);
    expose({
      uiLoading
    });
    return (_ctx, _cache) => {
      return vue.unref(uiLoading) ? (vue.openBlock(), vue.createElementBlock("div", vue.mergeProps({
        key: 0,
        class: [vue.unref(ns).b(), vue.unref(ns).is("animated", _ctx.animated)]
      }, _ctx.$attrs), [
        (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.count, (i) => {
          return vue.openBlock(), vue.createElementBlock(vue.Fragment, { key: i }, [
            _ctx.loading ? vue.renderSlot(_ctx.$slots, "template", { key: i }, () => [
              vue.createVNode(skeletonItem["default"], {
                class: vue.normalizeClass(vue.unref(ns).is("first")),
                variant: "p"
              }, null, 8, ["class"]),
              (vue.openBlock(true), vue.createElementBlock(vue.Fragment, null, vue.renderList(_ctx.rows, (item) => {
                return vue.openBlock(), vue.createBlock(skeletonItem["default"], {
                  key: item,
                  class: vue.normalizeClass([
                    vue.unref(ns).e("paragraph"),
                    vue.unref(ns).is("last", item === _ctx.rows && _ctx.rows > 1)
                  ]),
                  variant: "p"
                }, null, 8, ["class"]);
              }), 128))
            ]) : vue.createCommentVNode("v-if", true)
          ], 64);
        }), 128))
      ], 16)) : vue.renderSlot(_ctx.$slots, "default", vue.normalizeProps(vue.mergeProps({ key: 1 }, _ctx.$attrs)));
    };
  }
});
var Skeleton = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/skeleton/src/skeleton.vue"]]);

exports["default"] = Skeleton;
//# sourceMappingURL=skeleton2.js.map

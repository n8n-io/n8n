'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
require('../../../hooks/index.js');
var backtop = require('./backtop.js');
var useBacktop = require('./use-backtop.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');

const COMPONENT_NAME = "ElBacktop";
const __default__ = vue.defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: backtop.backtopProps,
  emits: backtop.backtopEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("backtop");
    const { handleClick, visible } = useBacktop.useBackTop(props, emit, COMPONENT_NAME);
    const backTopStyle = vue.computed(() => ({
      right: `${props.right}px`,
      bottom: `${props.bottom}px`
    }));
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createBlock(vue.Transition, {
        name: `${vue.unref(ns).namespace.value}-fade-in`
      }, {
        default: vue.withCtx(() => [
          vue.unref(visible) ? (vue.openBlock(), vue.createElementBlock("div", {
            key: 0,
            style: vue.normalizeStyle(vue.unref(backTopStyle)),
            class: vue.normalizeClass(vue.unref(ns).b()),
            onClick: _cache[0] || (_cache[0] = vue.withModifiers((...args) => vue.unref(handleClick) && vue.unref(handleClick)(...args), ["stop"]))
          }, [
            vue.renderSlot(_ctx.$slots, "default", {}, () => [
              vue.createVNode(vue.unref(index$1.ElIcon), {
                class: vue.normalizeClass(vue.unref(ns).e("icon"))
              }, {
                default: vue.withCtx(() => [
                  vue.createVNode(vue.unref(iconsVue.CaretTop))
                ]),
                _: 1
              }, 8, ["class"])
            ])
          ], 6)) : vue.createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["name"]);
    };
  }
});
var Backtop = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/backtop/src/backtop.vue"]]);

exports["default"] = Backtop;
//# sourceMappingURL=backtop2.js.map

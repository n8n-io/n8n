'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../icon/index.js');
require('../../../hooks/index.js');
require('../../../utils/index.js');
var avatar = require('./avatar.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');
var index = require('../../../hooks/use-namespace/index.js');
var shared = require('@vue/shared');
var types = require('../../../utils/types.js');
var style = require('../../../utils/dom/style.js');

const _hoisted_1 = ["src", "alt", "srcset"];
const __default__ = vue.defineComponent({
  name: "ElAvatar"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: avatar.avatarProps,
  emits: avatar.avatarEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = index.useNamespace("avatar");
    const hasLoadError = vue.ref(false);
    const avatarClass = vue.computed(() => {
      const { size, icon, shape } = props;
      const classList = [ns.b()];
      if (shared.isString(size))
        classList.push(ns.m(size));
      if (icon)
        classList.push(ns.m("icon"));
      if (shape)
        classList.push(ns.m(shape));
      return classList;
    });
    const sizeStyle = vue.computed(() => {
      const { size } = props;
      return types.isNumber(size) ? ns.cssVarBlock({
        size: style.addUnit(size) || ""
      }) : void 0;
    });
    const fitStyle = vue.computed(() => ({
      objectFit: props.fit
    }));
    vue.watch(() => props.src, () => hasLoadError.value = false);
    function handleError(e) {
      hasLoadError.value = true;
      emit("error", e);
    }
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("span", {
        class: vue.normalizeClass(vue.unref(avatarClass)),
        style: vue.normalizeStyle(vue.unref(sizeStyle))
      }, [
        (_ctx.src || _ctx.srcSet) && !hasLoadError.value ? (vue.openBlock(), vue.createElementBlock("img", {
          key: 0,
          src: _ctx.src,
          alt: _ctx.alt,
          srcset: _ctx.srcSet,
          style: vue.normalizeStyle(vue.unref(fitStyle)),
          onError: handleError
        }, null, 44, _hoisted_1)) : _ctx.icon ? (vue.openBlock(), vue.createBlock(vue.unref(index$1.ElIcon), { key: 1 }, {
          default: vue.withCtx(() => [
            (vue.openBlock(), vue.createBlock(vue.resolveDynamicComponent(_ctx.icon)))
          ]),
          _: 1
        })) : vue.renderSlot(_ctx.$slots, "default", { key: 2 })
      ], 6);
    };
  }
});
var Avatar = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/avatar/src/avatar.vue"]]);

exports["default"] = Avatar;
//# sourceMappingURL=avatar2.js.map

'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var index$1 = require('../../collapse-transition/index.js');
var index = require('../../icon/index.js');
var iconsVue = require('@element-plus/icons-vue');
var collapseItem = require('./collapse-item.js');
var useCollapseItem = require('./use-collapse-item.js');
var pluginVue_exportHelper = require('../../../_virtual/plugin-vue_export-helper.js');

const _hoisted_1 = ["id", "aria-expanded", "aria-controls", "aria-describedby", "tabindex"];
const _hoisted_2 = ["id", "aria-hidden", "aria-labelledby"];
const __default__ = vue.defineComponent({
  name: "ElCollapseItem"
});
const _sfc_main = /* @__PURE__ */ vue.defineComponent({
  ...__default__,
  props: collapseItem.collapseItemProps,
  setup(__props, { expose }) {
    const props = __props;
    const {
      focusing,
      id,
      isActive,
      handleFocus,
      handleHeaderClick,
      handleEnterClick
    } = useCollapseItem.useCollapseItem(props);
    const {
      arrowKls,
      headKls,
      rootKls,
      itemWrapperKls,
      itemContentKls,
      scopedContentId,
      scopedHeadId
    } = useCollapseItem.useCollapseItemDOM(props, { focusing, isActive, id });
    expose({
      isActive
    });
    return (_ctx, _cache) => {
      return vue.openBlock(), vue.createElementBlock("div", {
        class: vue.normalizeClass(vue.unref(rootKls))
      }, [
        vue.createElementVNode("button", {
          id: vue.unref(scopedHeadId),
          class: vue.normalizeClass(vue.unref(headKls)),
          "aria-expanded": vue.unref(isActive),
          "aria-controls": vue.unref(scopedContentId),
          "aria-describedby": vue.unref(scopedContentId),
          tabindex: _ctx.disabled ? -1 : 0,
          type: "button",
          onClick: _cache[0] || (_cache[0] = (...args) => vue.unref(handleHeaderClick) && vue.unref(handleHeaderClick)(...args)),
          onKeydown: _cache[1] || (_cache[1] = vue.withKeys(vue.withModifiers((...args) => vue.unref(handleEnterClick) && vue.unref(handleEnterClick)(...args), ["stop", "prevent"]), ["space", "enter"])),
          onFocus: _cache[2] || (_cache[2] = (...args) => vue.unref(handleFocus) && vue.unref(handleFocus)(...args)),
          onBlur: _cache[3] || (_cache[3] = ($event) => focusing.value = false)
        }, [
          vue.renderSlot(_ctx.$slots, "title", {}, () => [
            vue.createTextVNode(vue.toDisplayString(_ctx.title), 1)
          ]),
          vue.createVNode(vue.unref(index.ElIcon), {
            class: vue.normalizeClass(vue.unref(arrowKls))
          }, {
            default: vue.withCtx(() => [
              vue.createVNode(vue.unref(iconsVue.ArrowRight))
            ]),
            _: 1
          }, 8, ["class"])
        ], 42, _hoisted_1),
        vue.createVNode(vue.unref(index$1["default"]), null, {
          default: vue.withCtx(() => [
            vue.withDirectives(vue.createElementVNode("div", {
              id: vue.unref(scopedContentId),
              role: "region",
              class: vue.normalizeClass(vue.unref(itemWrapperKls)),
              "aria-hidden": !vue.unref(isActive),
              "aria-labelledby": vue.unref(scopedHeadId)
            }, [
              vue.createElementVNode("div", {
                class: vue.normalizeClass(vue.unref(itemContentKls))
              }, [
                vue.renderSlot(_ctx.$slots, "default")
              ], 2)
            ], 10, _hoisted_2), [
              [vue.vShow, vue.unref(isActive)]
            ])
          ]),
          _: 3
        })
      ], 2);
    };
  }
});
var CollapseItem = /* @__PURE__ */ pluginVue_exportHelper["default"](_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/collapse/src/collapse-item.vue"]]);

exports["default"] = CollapseItem;
//# sourceMappingURL=collapse-item2.js.map

import { defineComponent, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, withKeys, withModifiers, renderSlot, createTextVNode, toDisplayString, createVNode, withCtx, withDirectives, vShow } from 'vue';
import _CollapseTransition from '../../collapse-transition/index.mjs';
import { ElIcon } from '../../icon/index.mjs';
import { ArrowRight } from '@element-plus/icons-vue';
import { collapseItemProps } from './collapse-item.mjs';
import { useCollapseItem, useCollapseItemDOM } from './use-collapse-item.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const _hoisted_1 = ["id", "aria-expanded", "aria-controls", "aria-describedby", "tabindex"];
const _hoisted_2 = ["id", "aria-hidden", "aria-labelledby"];
const __default__ = defineComponent({
  name: "ElCollapseItem"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: collapseItemProps,
  setup(__props, { expose }) {
    const props = __props;
    const {
      focusing,
      id,
      isActive,
      handleFocus,
      handleHeaderClick,
      handleEnterClick
    } = useCollapseItem(props);
    const {
      arrowKls,
      headKls,
      rootKls,
      itemWrapperKls,
      itemContentKls,
      scopedContentId,
      scopedHeadId
    } = useCollapseItemDOM(props, { focusing, isActive, id });
    expose({
      isActive
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(rootKls))
      }, [
        createElementVNode("button", {
          id: unref(scopedHeadId),
          class: normalizeClass(unref(headKls)),
          "aria-expanded": unref(isActive),
          "aria-controls": unref(scopedContentId),
          "aria-describedby": unref(scopedContentId),
          tabindex: _ctx.disabled ? -1 : 0,
          type: "button",
          onClick: _cache[0] || (_cache[0] = (...args) => unref(handleHeaderClick) && unref(handleHeaderClick)(...args)),
          onKeydown: _cache[1] || (_cache[1] = withKeys(withModifiers((...args) => unref(handleEnterClick) && unref(handleEnterClick)(...args), ["stop", "prevent"]), ["space", "enter"])),
          onFocus: _cache[2] || (_cache[2] = (...args) => unref(handleFocus) && unref(handleFocus)(...args)),
          onBlur: _cache[3] || (_cache[3] = ($event) => focusing.value = false)
        }, [
          renderSlot(_ctx.$slots, "title", {}, () => [
            createTextVNode(toDisplayString(_ctx.title), 1)
          ]),
          createVNode(unref(ElIcon), {
            class: normalizeClass(unref(arrowKls))
          }, {
            default: withCtx(() => [
              createVNode(unref(ArrowRight))
            ]),
            _: 1
          }, 8, ["class"])
        ], 42, _hoisted_1),
        createVNode(unref(_CollapseTransition), null, {
          default: withCtx(() => [
            withDirectives(createElementVNode("div", {
              id: unref(scopedContentId),
              role: "region",
              class: normalizeClass(unref(itemWrapperKls)),
              "aria-hidden": !unref(isActive),
              "aria-labelledby": unref(scopedHeadId)
            }, [
              createElementVNode("div", {
                class: normalizeClass(unref(itemContentKls))
              }, [
                renderSlot(_ctx.$slots, "default")
              ], 2)
            ], 10, _hoisted_2), [
              [vShow, unref(isActive)]
            ])
          ]),
          _: 3
        })
      ], 2);
    };
  }
});
var CollapseItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/collapse/src/collapse-item.vue"]]);

export { CollapseItem as default };
//# sourceMappingURL=collapse-item2.mjs.map

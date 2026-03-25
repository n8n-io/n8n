import { defineComponent, computed, openBlock, createBlock, Transition, unref, withCtx, createElementBlock, normalizeStyle, normalizeClass, withModifiers, renderSlot, createVNode, createCommentVNode } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import { CaretTop } from '@element-plus/icons-vue';
import '../../../hooks/index.mjs';
import { backtopProps, backtopEmits } from './backtop.mjs';
import { useBackTop } from './use-backtop.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const COMPONENT_NAME = "ElBacktop";
const __default__ = defineComponent({
  name: COMPONENT_NAME
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: backtopProps,
  emits: backtopEmits,
  setup(__props, { emit }) {
    const props = __props;
    const ns = useNamespace("backtop");
    const { handleClick, visible } = useBackTop(props, emit, COMPONENT_NAME);
    const backTopStyle = computed(() => ({
      right: `${props.right}px`,
      bottom: `${props.bottom}px`
    }));
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, {
        name: `${unref(ns).namespace.value}-fade-in`
      }, {
        default: withCtx(() => [
          unref(visible) ? (openBlock(), createElementBlock("div", {
            key: 0,
            style: normalizeStyle(unref(backTopStyle)),
            class: normalizeClass(unref(ns).b()),
            onClick: _cache[0] || (_cache[0] = withModifiers((...args) => unref(handleClick) && unref(handleClick)(...args), ["stop"]))
          }, [
            renderSlot(_ctx.$slots, "default", {}, () => [
              createVNode(unref(ElIcon), {
                class: normalizeClass(unref(ns).e("icon"))
              }, {
                default: withCtx(() => [
                  createVNode(unref(CaretTop))
                ]),
                _: 1
              }, 8, ["class"])
            ])
          ], 6)) : createCommentVNode("v-if", true)
        ]),
        _: 3
      }, 8, ["name"]);
    };
  }
});
var Backtop = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/backtop/src/backtop.vue"]]);

export { Backtop as default };
//# sourceMappingURL=backtop2.mjs.map

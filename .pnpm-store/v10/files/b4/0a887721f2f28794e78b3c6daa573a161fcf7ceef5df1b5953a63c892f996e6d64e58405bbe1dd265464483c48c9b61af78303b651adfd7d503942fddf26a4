import { defineComponent, useSlots, ref, computed, openBlock, createBlock, Transition, unref, withCtx, withDirectives, createElementVNode, normalizeClass, resolveDynamicComponent, createCommentVNode, createElementBlock, renderSlot, createTextVNode, toDisplayString, Fragment, createVNode, vShow } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import { alertProps, alertEmits } from './alert.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { TypeComponents, TypeComponentsMap } from '../../../utils/vue/icon.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElAlert"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: alertProps,
  emits: alertEmits,
  setup(__props, { emit }) {
    const props = __props;
    const { Close } = TypeComponents;
    const slots = useSlots();
    const ns = useNamespace("alert");
    const visible = ref(true);
    const iconComponent = computed(() => TypeComponentsMap[props.type]);
    const iconClass = computed(() => [
      ns.e("icon"),
      { [ns.is("big")]: !!props.description || !!slots.default }
    ]);
    const isBoldTitle = computed(() => {
      return { [ns.is("bold")]: props.description || slots.default };
    });
    const close = (evt) => {
      visible.value = false;
      emit("close", evt);
    };
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, {
        name: unref(ns).b("fade"),
        persisted: ""
      }, {
        default: withCtx(() => [
          withDirectives(createElementVNode("div", {
            class: normalizeClass([unref(ns).b(), unref(ns).m(_ctx.type), unref(ns).is("center", _ctx.center), unref(ns).is(_ctx.effect)]),
            role: "alert"
          }, [
            _ctx.showIcon && unref(iconComponent) ? (openBlock(), createBlock(unref(ElIcon), {
              key: 0,
              class: normalizeClass(unref(iconClass))
            }, {
              default: withCtx(() => [
                (openBlock(), createBlock(resolveDynamicComponent(unref(iconComponent))))
              ]),
              _: 1
            }, 8, ["class"])) : createCommentVNode("v-if", true),
            createElementVNode("div", {
              class: normalizeClass(unref(ns).e("content"))
            }, [
              _ctx.title || _ctx.$slots.title ? (openBlock(), createElementBlock("span", {
                key: 0,
                class: normalizeClass([unref(ns).e("title"), unref(isBoldTitle)])
              }, [
                renderSlot(_ctx.$slots, "title", {}, () => [
                  createTextVNode(toDisplayString(_ctx.title), 1)
                ])
              ], 2)) : createCommentVNode("v-if", true),
              _ctx.$slots.default || _ctx.description ? (openBlock(), createElementBlock("p", {
                key: 1,
                class: normalizeClass(unref(ns).e("description"))
              }, [
                renderSlot(_ctx.$slots, "default", {}, () => [
                  createTextVNode(toDisplayString(_ctx.description), 1)
                ])
              ], 2)) : createCommentVNode("v-if", true),
              _ctx.closable ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                _ctx.closeText ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  class: normalizeClass([unref(ns).e("close-btn"), unref(ns).is("customed")]),
                  onClick: close
                }, toDisplayString(_ctx.closeText), 3)) : (openBlock(), createBlock(unref(ElIcon), {
                  key: 1,
                  class: normalizeClass(unref(ns).e("close-btn")),
                  onClick: close
                }, {
                  default: withCtx(() => [
                    createVNode(unref(Close))
                  ]),
                  _: 1
                }, 8, ["class"]))
              ], 64)) : createCommentVNode("v-if", true)
            ], 2)
          ], 2), [
            [vShow, visible.value]
          ])
        ]),
        _: 3
      }, 8, ["name"]);
    };
  }
});
var Alert = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/alert/src/alert.vue"]]);

export { Alert as default };
//# sourceMappingURL=alert2.mjs.map

import { defineComponent, useSlots, computed, openBlock, createElementBlock, normalizeClass, unref, renderSlot, createCommentVNode, createElementVNode, createBlock, withCtx, resolveDynamicComponent, createTextVNode, toDisplayString, createVNode } from 'vue';
import { ElIcon } from '../../icon/index.mjs';
import { ElDivider } from '../../divider/index.mjs';
import '../../../hooks/index.mjs';
import { pageHeaderProps, pageHeaderEmits } from './page-header.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const _hoisted_1 = ["aria-label"];
const __default__ = defineComponent({
  name: "ElPageHeader"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: pageHeaderProps,
  emits: pageHeaderEmits,
  setup(__props, { emit }) {
    const slots = useSlots();
    const { t } = useLocale();
    const ns = useNamespace("page-header");
    const kls = computed(() => {
      return [
        ns.b(),
        {
          [ns.m("has-breadcrumb")]: !!slots.breadcrumb,
          [ns.m("has-extra")]: !!slots.extra,
          [ns.is("contentful")]: !!slots.default
        }
      ];
    });
    function handleClick() {
      emit("back");
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(kls))
      }, [
        _ctx.$slots.breadcrumb ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(ns).e("breadcrumb"))
        }, [
          renderSlot(_ctx.$slots, "breadcrumb")
        ], 2)) : createCommentVNode("v-if", true),
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("header"))
        }, [
          createElementVNode("div", {
            class: normalizeClass(unref(ns).e("left"))
          }, [
            createElementVNode("div", {
              class: normalizeClass(unref(ns).e("back")),
              role: "button",
              tabindex: "0",
              onClick: handleClick
            }, [
              _ctx.icon || _ctx.$slots.icon ? (openBlock(), createElementBlock("div", {
                key: 0,
                "aria-label": _ctx.title || unref(t)("el.pageHeader.title"),
                class: normalizeClass(unref(ns).e("icon"))
              }, [
                renderSlot(_ctx.$slots, "icon", {}, () => [
                  _ctx.icon ? (openBlock(), createBlock(unref(ElIcon), { key: 0 }, {
                    default: withCtx(() => [
                      (openBlock(), createBlock(resolveDynamicComponent(_ctx.icon)))
                    ]),
                    _: 1
                  })) : createCommentVNode("v-if", true)
                ])
              ], 10, _hoisted_1)) : createCommentVNode("v-if", true),
              createElementVNode("div", {
                class: normalizeClass(unref(ns).e("title"))
              }, [
                renderSlot(_ctx.$slots, "title", {}, () => [
                  createTextVNode(toDisplayString(_ctx.title || unref(t)("el.pageHeader.title")), 1)
                ])
              ], 2)
            ], 2),
            createVNode(unref(ElDivider), { direction: "vertical" }),
            createElementVNode("div", {
              class: normalizeClass(unref(ns).e("content"))
            }, [
              renderSlot(_ctx.$slots, "content", {}, () => [
                createTextVNode(toDisplayString(_ctx.content), 1)
              ])
            ], 2)
          ], 2),
          _ctx.$slots.extra ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: normalizeClass(unref(ns).e("extra"))
          }, [
            renderSlot(_ctx.$slots, "extra")
          ], 2)) : createCommentVNode("v-if", true)
        ], 2),
        _ctx.$slots.default ? (openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(unref(ns).e("main"))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 2)) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var PageHeader = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/page-header/src/page-header.vue"]]);

export { PageHeader as default };
//# sourceMappingURL=page-header2.mjs.map

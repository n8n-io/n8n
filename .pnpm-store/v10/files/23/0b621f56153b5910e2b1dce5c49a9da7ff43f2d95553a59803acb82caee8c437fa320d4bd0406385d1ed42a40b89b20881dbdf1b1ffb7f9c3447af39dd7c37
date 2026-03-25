import { defineComponent, computed, openBlock, createElementBlock, normalizeClass, unref, createElementVNode, normalizeStyle, renderSlot, createVNode, toDisplayString, createCommentVNode } from 'vue';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import ImgEmpty from './img-empty.mjs';
import { emptyProps } from './empty.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { addUnit } from '../../../utils/dom/style.mjs';

const _hoisted_1 = ["src"];
const _hoisted_2 = { key: 1 };
const __default__ = defineComponent({
  name: "ElEmpty"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: emptyProps,
  setup(__props) {
    const props = __props;
    const { t } = useLocale();
    const ns = useNamespace("empty");
    const emptyDescription = computed(() => props.description || t("el.table.emptyText"));
    const imageStyle = computed(() => ({
      width: addUnit(props.imageSize)
    }));
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(unref(ns).b())
      }, [
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("image")),
          style: normalizeStyle(unref(imageStyle))
        }, [
          _ctx.image ? (openBlock(), createElementBlock("img", {
            key: 0,
            src: _ctx.image,
            ondragstart: "return false"
          }, null, 8, _hoisted_1)) : renderSlot(_ctx.$slots, "image", { key: 1 }, () => [
            createVNode(ImgEmpty)
          ])
        ], 6),
        createElementVNode("div", {
          class: normalizeClass(unref(ns).e("description"))
        }, [
          _ctx.$slots.description ? renderSlot(_ctx.$slots, "description", { key: 0 }) : (openBlock(), createElementBlock("p", _hoisted_2, toDisplayString(unref(emptyDescription)), 1))
        ], 2),
        _ctx.$slots.default ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(unref(ns).e("bottom"))
        }, [
          renderSlot(_ctx.$slots, "default")
        ], 2)) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var Empty = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/empty/src/empty.vue"]]);

export { Empty as default };
//# sourceMappingURL=empty2.mjs.map

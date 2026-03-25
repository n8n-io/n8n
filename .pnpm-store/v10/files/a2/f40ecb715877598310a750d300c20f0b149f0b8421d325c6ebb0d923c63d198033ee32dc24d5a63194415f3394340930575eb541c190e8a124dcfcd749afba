import { defineComponent, openBlock, createElementBlock, normalizeClass, unref, createBlock, createCommentVNode } from 'vue';
import '../../../hooks/index.mjs';
import { PictureFilled } from '@element-plus/icons-vue';
import { skeletonItemProps } from './skeleton-item.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElSkeletonItem"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: skeletonItemProps,
  setup(__props) {
    const ns = useNamespace("skeleton");
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: normalizeClass([unref(ns).e("item"), unref(ns).e(_ctx.variant)])
      }, [
        _ctx.variant === "image" ? (openBlock(), createBlock(unref(PictureFilled), { key: 0 })) : createCommentVNode("v-if", true)
      ], 2);
    };
  }
});
var SkeletonItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/skeleton/src/skeleton-item.vue"]]);

export { SkeletonItem as default };
//# sourceMappingURL=skeleton-item2.mjs.map

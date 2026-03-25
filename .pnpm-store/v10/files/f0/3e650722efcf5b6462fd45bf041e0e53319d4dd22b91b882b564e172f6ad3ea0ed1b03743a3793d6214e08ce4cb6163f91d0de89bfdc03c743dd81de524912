import { defineComponent, computed, openBlock, createBlock, resolveDynamicComponent, normalizeClass, unref, normalizeStyle, withCtx, renderSlot } from 'vue';
import '../../../hooks/index.mjs';
import '../../form/index.mjs';
import '../../../utils/index.mjs';
import { textProps } from './text.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { useFormSize } from '../../form/src/hooks/use-form-common-props.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isUndefined } from '../../../utils/types.mjs';

const __default__ = defineComponent({
  name: "ElText"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: textProps,
  setup(__props) {
    const props = __props;
    const textSize = useFormSize();
    const ns = useNamespace("text");
    const textKls = computed(() => [
      ns.b(),
      ns.m(props.type),
      ns.m(textSize.value),
      ns.is("truncated", props.truncated),
      ns.is("line-clamp", !isUndefined(props.lineClamp))
    ]);
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(_ctx.tag), {
        class: normalizeClass(unref(textKls)),
        style: normalizeStyle({ "-webkit-line-clamp": _ctx.lineClamp })
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["class", "style"]);
    };
  }
});
var Text = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/text/src/text.vue"]]);

export { Text as default };
//# sourceMappingURL=text2.mjs.map

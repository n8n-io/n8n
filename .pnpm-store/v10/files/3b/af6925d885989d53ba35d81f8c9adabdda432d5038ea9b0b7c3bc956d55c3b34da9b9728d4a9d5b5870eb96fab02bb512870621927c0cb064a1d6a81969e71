import { defineComponent, inject, computed, openBlock, createBlock, resolveDynamicComponent, normalizeClass, unref, normalizeStyle, withCtx, renderSlot } from 'vue';
import '../../../utils/index.mjs';
import '../../../hooks/index.mjs';
import '../../row/index.mjs';
import { colProps } from './col.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';
import { rowContextKey } from '../../row/src/constants.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { isNumber } from '../../../utils/types.mjs';
import { isObject } from '@vue/shared';

const __default__ = defineComponent({
  name: "ElCol"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: colProps,
  setup(__props) {
    const props = __props;
    const { gutter } = inject(rowContextKey, { gutter: computed(() => 0) });
    const ns = useNamespace("col");
    const style = computed(() => {
      const styles = {};
      if (gutter.value) {
        styles.paddingLeft = styles.paddingRight = `${gutter.value / 2}px`;
      }
      return styles;
    });
    const colKls = computed(() => {
      const classes = [];
      const pos = ["span", "offset", "pull", "push"];
      pos.forEach((prop) => {
        const size = props[prop];
        if (isNumber(size)) {
          if (prop === "span")
            classes.push(ns.b(`${props[prop]}`));
          else if (size > 0)
            classes.push(ns.b(`${prop}-${props[prop]}`));
        }
      });
      const sizes = ["xs", "sm", "md", "lg", "xl"];
      sizes.forEach((size) => {
        if (isNumber(props[size])) {
          classes.push(ns.b(`${size}-${props[size]}`));
        } else if (isObject(props[size])) {
          Object.entries(props[size]).forEach(([prop, sizeProp]) => {
            classes.push(prop !== "span" ? ns.b(`${size}-${prop}-${sizeProp}`) : ns.b(`${size}-${sizeProp}`));
          });
        }
      });
      if (gutter.value) {
        classes.push(ns.is("guttered"));
      }
      return [ns.b(), classes];
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(resolveDynamicComponent(_ctx.tag), {
        class: normalizeClass(unref(colKls)),
        style: normalizeStyle(unref(style))
      }, {
        default: withCtx(() => [
          renderSlot(_ctx.$slots, "default")
        ]),
        _: 3
      }, 8, ["class", "style"]);
    };
  }
});
var Col = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/col/src/col.vue"]]);

export { Col as default };
//# sourceMappingURL=col2.mjs.map

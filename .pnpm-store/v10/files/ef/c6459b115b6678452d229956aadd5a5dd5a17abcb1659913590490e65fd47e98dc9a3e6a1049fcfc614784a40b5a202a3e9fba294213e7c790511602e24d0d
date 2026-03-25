import { defineComponent, computed, openBlock, createElementBlock, unref, toDisplayString, createBlock, withCtx, resolveDynamicComponent } from 'vue';
import '../../../../hooks/index.mjs';
import { ElIcon } from '../../../icon/index.mjs';
import { paginationPrevProps, paginationPrevEmits } from './prev.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';

const _hoisted_1 = ["disabled", "aria-label", "aria-disabled"];
const _hoisted_2 = { key: 0 };
const __default__ = defineComponent({
  name: "ElPaginationPrev"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: paginationPrevProps,
  emits: paginationPrevEmits,
  setup(__props) {
    const props = __props;
    const { t } = useLocale();
    const internalDisabled = computed(() => props.disabled || props.currentPage <= 1);
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("button", {
        type: "button",
        class: "btn-prev",
        disabled: unref(internalDisabled),
        "aria-label": _ctx.prevText || unref(t)("el.pagination.prev"),
        "aria-disabled": unref(internalDisabled),
        onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("click", $event))
      }, [
        _ctx.prevText ? (openBlock(), createElementBlock("span", _hoisted_2, toDisplayString(_ctx.prevText), 1)) : (openBlock(), createBlock(unref(ElIcon), { key: 1 }, {
          default: withCtx(() => [
            (openBlock(), createBlock(resolveDynamicComponent(_ctx.prevIcon)))
          ]),
          _: 1
        }))
      ], 8, _hoisted_1);
    };
  }
});
var Prev = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/prev.vue"]]);

export { Prev as default };
//# sourceMappingURL=prev2.mjs.map

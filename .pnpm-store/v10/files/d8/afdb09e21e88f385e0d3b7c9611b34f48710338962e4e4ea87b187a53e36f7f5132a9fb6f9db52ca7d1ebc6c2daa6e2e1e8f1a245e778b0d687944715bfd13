import { defineComponent, ref, watch, computed, openBlock, createElementBlock, normalizeClass, unref, createVNode, withCtx, Fragment, renderList, createBlock } from 'vue';
import { isEqual } from 'lodash-unified';
import { ElSelect, ElOption } from '../../../select/index.mjs';
import '../../../../hooks/index.mjs';
import { usePagination } from '../usePagination.mjs';
import { paginationSizesProps } from './sizes.mjs';
import _export_sfc from '../../../../_virtual/plugin-vue_export-helper.mjs';
import { useLocale } from '../../../../hooks/use-locale/index.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';

const __default__ = defineComponent({
  name: "ElPaginationSizes"
});
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...__default__,
  props: paginationSizesProps,
  emits: ["page-size-change"],
  setup(__props, { emit }) {
    const props = __props;
    const { t } = useLocale();
    const ns = useNamespace("pagination");
    const pagination = usePagination();
    const innerPageSize = ref(props.pageSize);
    watch(() => props.pageSizes, (newVal, oldVal) => {
      if (isEqual(newVal, oldVal))
        return;
      if (Array.isArray(newVal)) {
        const pageSize = newVal.includes(props.pageSize) ? props.pageSize : props.pageSizes[0];
        emit("page-size-change", pageSize);
      }
    });
    watch(() => props.pageSize, (newVal) => {
      innerPageSize.value = newVal;
    });
    const innerPageSizes = computed(() => props.pageSizes);
    function handleChange(val) {
      var _a;
      if (val !== innerPageSize.value) {
        innerPageSize.value = val;
        (_a = pagination.handleSizeChange) == null ? void 0 : _a.call(pagination, Number(val));
      }
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("span", {
        class: normalizeClass(unref(ns).e("sizes"))
      }, [
        createVNode(unref(ElSelect), {
          "model-value": innerPageSize.value,
          disabled: _ctx.disabled,
          "popper-class": _ctx.popperClass,
          size: _ctx.size,
          teleported: _ctx.teleported,
          "validate-event": false,
          onChange: handleChange
        }, {
          default: withCtx(() => [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(innerPageSizes), (item) => {
              return openBlock(), createBlock(unref(ElOption), {
                key: item,
                value: item,
                label: item + unref(t)("el.pagination.pagesize")
              }, null, 8, ["value", "label"]);
            }), 128))
          ]),
          _: 1
        }, 8, ["model-value", "disabled", "popper-class", "size", "teleported"])
      ], 2);
    };
  }
});
var Sizes = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/pagination/src/components/sizes.vue"]]);

export { Sizes as default };
//# sourceMappingURL=sizes2.mjs.map

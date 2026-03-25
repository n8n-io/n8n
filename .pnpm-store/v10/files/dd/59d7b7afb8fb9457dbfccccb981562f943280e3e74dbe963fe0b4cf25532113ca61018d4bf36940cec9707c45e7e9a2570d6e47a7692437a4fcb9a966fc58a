import { defineComponent, ref, computed, reactive, onMounted, h } from 'vue';
import { pick } from 'lodash-unified';
import { ElSelect } from '../../select/index.mjs';
import _Tree from '../../tree/index.mjs';
import { useSelect } from './select.mjs';
import { useTree } from './tree.mjs';
import CacheOptions from './cache-options.mjs';
import _export_sfc from '../../../_virtual/plugin-vue_export-helper.mjs';

const _sfc_main = defineComponent({
  name: "ElTreeSelect",
  inheritAttrs: false,
  props: {
    ...ElSelect.props,
    ..._Tree.props,
    cacheData: {
      type: Array,
      default: () => []
    }
  },
  setup(props, context) {
    const { slots, expose } = context;
    const select = ref();
    const tree = ref();
    const key = computed(() => props.nodeKey || props.valueKey || "value");
    const selectProps = useSelect(props, context, { select, tree, key });
    const { cacheOptions, ...treeProps } = useTree(props, context, {
      select,
      tree,
      key
    });
    const methods = reactive({});
    expose(methods);
    onMounted(() => {
      Object.assign(methods, {
        ...pick(tree.value, [
          "filter",
          "updateKeyChildren",
          "getCheckedNodes",
          "setCheckedNodes",
          "getCheckedKeys",
          "setCheckedKeys",
          "setChecked",
          "getHalfCheckedNodes",
          "getHalfCheckedKeys",
          "getCurrentKey",
          "getCurrentNode",
          "setCurrentKey",
          "setCurrentNode",
          "getNode",
          "remove",
          "append",
          "insertBefore",
          "insertAfter"
        ]),
        ...pick(select.value, ["focus", "blur"])
      });
    });
    return () => h(ElSelect, reactive({
      ...selectProps,
      ref: (ref2) => select.value = ref2
    }), {
      ...slots,
      default: () => [
        h(CacheOptions, { data: cacheOptions.value }),
        h(_Tree, reactive({
          ...treeProps,
          ref: (ref2) => tree.value = ref2
        }))
      ]
    });
  }
});
var TreeSelect = /* @__PURE__ */ _export_sfc(_sfc_main, [["__file", "/home/runner/work/element-plus/element-plus/packages/components/tree-select/src/tree-select.vue"]]);

export { TreeSelect as default };
//# sourceMappingURL=tree-select.mjs.map

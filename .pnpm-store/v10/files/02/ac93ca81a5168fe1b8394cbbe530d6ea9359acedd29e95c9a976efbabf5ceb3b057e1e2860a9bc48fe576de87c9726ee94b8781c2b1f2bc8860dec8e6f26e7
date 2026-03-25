import { toRefs, computed, nextTick } from 'vue';
import { pick } from 'lodash-unified';
import { ElSelect } from '../../select/index.mjs';
import '../../../hooks/index.mjs';
import '../../../constants/index.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';
import { UPDATE_MODEL_EVENT } from '../../../constants/event.mjs';

const useSelect = (props, { attrs, emit }, {
  tree,
  key
}) => {
  const ns = useNamespace("tree-select");
  const result = {
    ...pick(toRefs(props), Object.keys(ElSelect.props)),
    ...attrs,
    "onUpdate:modelValue": (value) => emit(UPDATE_MODEL_EVENT, value),
    valueKey: key,
    popperClass: computed(() => {
      const classes = [ns.e("popper")];
      if (props.popperClass)
        classes.push(props.popperClass);
      return classes.join(" ");
    }),
    filterMethod: (keyword = "") => {
      if (props.filterMethod)
        props.filterMethod(keyword);
      nextTick(() => {
        var _a;
        (_a = tree.value) == null ? void 0 : _a.filter(keyword);
      });
    },
    onVisibleChange: (visible) => {
      var _a;
      (_a = attrs.onVisibleChange) == null ? void 0 : _a.call(attrs, visible);
      if (props.filterable && visible) {
        result.filterMethod();
      }
    }
  };
  return result;
};

export { useSelect };
//# sourceMappingURL=select.mjs.map

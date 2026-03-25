import { inject, ref, computed, unref } from 'vue';
import '../../../hooks/index.mjs';
import '../../../utils/index.mjs';
import { collapseContextKey } from './constants.mjs';
import { generateId } from '../../../utils/rand.mjs';
import { useNamespace } from '../../../hooks/use-namespace/index.mjs';

const useCollapseItem = (props) => {
  const collapse = inject(collapseContextKey);
  const focusing = ref(false);
  const isClick = ref(false);
  const id = ref(generateId());
  const isActive = computed(() => collapse == null ? void 0 : collapse.activeNames.value.includes(props.name));
  const handleFocus = () => {
    setTimeout(() => {
      if (!isClick.value) {
        focusing.value = true;
      } else {
        isClick.value = false;
      }
    }, 50);
  };
  const handleHeaderClick = () => {
    if (props.disabled)
      return;
    collapse == null ? void 0 : collapse.handleItemClick(props.name);
    focusing.value = false;
    isClick.value = true;
  };
  const handleEnterClick = () => {
    collapse == null ? void 0 : collapse.handleItemClick(props.name);
  };
  return {
    focusing,
    id,
    isActive,
    handleFocus,
    handleHeaderClick,
    handleEnterClick
  };
};
const useCollapseItemDOM = (props, { focusing, isActive, id }) => {
  const ns = useNamespace("collapse");
  const rootKls = computed(() => [
    ns.b("item"),
    ns.is("active", unref(isActive)),
    ns.is("disabled", props.disabled)
  ]);
  const headKls = computed(() => [
    ns.be("item", "header"),
    ns.is("active", unref(isActive)),
    { focusing: unref(focusing) && !props.disabled }
  ]);
  const arrowKls = computed(() => [
    ns.be("item", "arrow"),
    ns.is("active", unref(isActive))
  ]);
  const itemWrapperKls = computed(() => ns.be("item", "wrap"));
  const itemContentKls = computed(() => ns.be("item", "content"));
  const scopedContentId = computed(() => ns.b(`content-${unref(id)}`));
  const scopedHeadId = computed(() => ns.b(`head-${unref(id)}`));
  return {
    arrowKls,
    headKls,
    rootKls,
    itemWrapperKls,
    itemContentKls,
    scopedContentId,
    scopedHeadId
  };
};

export { useCollapseItem, useCollapseItemDOM };
//# sourceMappingURL=use-collapse-item.mjs.map

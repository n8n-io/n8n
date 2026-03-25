import { ref, computed } from 'vue';
import { isFunction } from '@vue/shared';

function useFilter(props, tree) {
  const hiddenNodeKeySet = ref(/* @__PURE__ */ new Set([]));
  const hiddenExpandIconKeySet = ref(/* @__PURE__ */ new Set([]));
  const filterable = computed(() => {
    return isFunction(props.filterMethod);
  });
  function doFilter(query) {
    var _a;
    if (!filterable.value) {
      return;
    }
    const expandKeySet = /* @__PURE__ */ new Set();
    const hiddenExpandIconKeys = hiddenExpandIconKeySet.value;
    const hiddenKeys = hiddenNodeKeySet.value;
    const family = [];
    const nodes = ((_a = tree.value) == null ? void 0 : _a.treeNodes) || [];
    const filter = props.filterMethod;
    hiddenKeys.clear();
    function traverse(nodes2) {
      nodes2.forEach((node) => {
        family.push(node);
        if (filter == null ? void 0 : filter(query, node.data)) {
          family.forEach((member) => {
            expandKeySet.add(member.key);
          });
        } else if (node.isLeaf) {
          hiddenKeys.add(node.key);
        }
        const children = node.children;
        if (children) {
          traverse(children);
        }
        if (!node.isLeaf) {
          if (!expandKeySet.has(node.key)) {
            hiddenKeys.add(node.key);
          } else if (children) {
            let allHidden = true;
            for (const childNode of children) {
              if (!hiddenKeys.has(childNode.key)) {
                allHidden = false;
                break;
              }
            }
            if (allHidden) {
              hiddenExpandIconKeys.add(node.key);
            } else {
              hiddenExpandIconKeys.delete(node.key);
            }
          }
        }
        family.pop();
      });
    }
    traverse(nodes);
    return expandKeySet;
  }
  function isForceHiddenExpandIcon(node) {
    return hiddenExpandIconKeySet.value.has(node.key);
  }
  return {
    hiddenExpandIconKeySet,
    hiddenNodeKeySet,
    doFilter,
    isForceHiddenExpandIcon
  };
}

export { useFilter };
//# sourceMappingURL=useFilter.mjs.map

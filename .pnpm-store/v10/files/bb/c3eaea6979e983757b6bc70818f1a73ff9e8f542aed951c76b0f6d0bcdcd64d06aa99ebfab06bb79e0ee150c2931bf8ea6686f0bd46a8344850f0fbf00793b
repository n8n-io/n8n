'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var virtualTree = require('../virtual-tree.js');

function useCheck(props, tree) {
  const checkedKeys = vue.ref(/* @__PURE__ */ new Set());
  const indeterminateKeys = vue.ref(/* @__PURE__ */ new Set());
  const { emit } = vue.getCurrentInstance();
  vue.watch([() => tree.value, () => props.defaultCheckedKeys], () => {
    return vue.nextTick(() => {
      _setCheckedKeys(props.defaultCheckedKeys);
    });
  }, {
    immediate: true
  });
  const updateCheckedKeys = () => {
    if (!tree.value || !props.showCheckbox || props.checkStrictly) {
      return;
    }
    const { levelTreeNodeMap, maxLevel } = tree.value;
    const checkedKeySet = checkedKeys.value;
    const indeterminateKeySet = /* @__PURE__ */ new Set();
    for (let level = maxLevel - 1; level >= 1; --level) {
      const nodes = levelTreeNodeMap.get(level);
      if (!nodes)
        continue;
      nodes.forEach((node) => {
        const children = node.children;
        if (children) {
          let allChecked = true;
          let hasChecked = false;
          for (const childNode of children) {
            const key = childNode.key;
            if (checkedKeySet.has(key)) {
              hasChecked = true;
            } else if (indeterminateKeySet.has(key)) {
              allChecked = false;
              hasChecked = true;
              break;
            } else {
              allChecked = false;
            }
          }
          if (allChecked) {
            checkedKeySet.add(node.key);
          } else if (hasChecked) {
            indeterminateKeySet.add(node.key);
            checkedKeySet.delete(node.key);
          } else {
            checkedKeySet.delete(node.key);
            indeterminateKeySet.delete(node.key);
          }
        }
      });
    }
    indeterminateKeys.value = indeterminateKeySet;
  };
  const isChecked = (node) => checkedKeys.value.has(node.key);
  const isIndeterminate = (node) => indeterminateKeys.value.has(node.key);
  const toggleCheckbox = (node, isChecked2, nodeClick = true) => {
    const checkedKeySet = checkedKeys.value;
    const toggle = (node2, checked) => {
      checkedKeySet[checked ? virtualTree.SetOperationEnum.ADD : virtualTree.SetOperationEnum.DELETE](node2.key);
      const children = node2.children;
      if (!props.checkStrictly && children) {
        children.forEach((childNode) => {
          if (!childNode.disabled) {
            toggle(childNode, checked);
          }
        });
      }
    };
    toggle(node, isChecked2);
    updateCheckedKeys();
    if (nodeClick) {
      afterNodeCheck(node, isChecked2);
    }
  };
  const afterNodeCheck = (node, checked) => {
    const { checkedNodes, checkedKeys: checkedKeys2 } = getChecked();
    const { halfCheckedNodes, halfCheckedKeys } = getHalfChecked();
    emit(virtualTree.NODE_CHECK, node.data, {
      checkedKeys: checkedKeys2,
      checkedNodes,
      halfCheckedKeys,
      halfCheckedNodes
    });
    emit(virtualTree.NODE_CHECK_CHANGE, node.data, checked);
  };
  function getCheckedKeys(leafOnly = false) {
    return getChecked(leafOnly).checkedKeys;
  }
  function getCheckedNodes(leafOnly = false) {
    return getChecked(leafOnly).checkedNodes;
  }
  function getHalfCheckedKeys() {
    return getHalfChecked().halfCheckedKeys;
  }
  function getHalfCheckedNodes() {
    return getHalfChecked().halfCheckedNodes;
  }
  function getChecked(leafOnly = false) {
    const checkedNodes = [];
    const keys = [];
    if ((tree == null ? void 0 : tree.value) && props.showCheckbox) {
      const { treeNodeMap } = tree.value;
      checkedKeys.value.forEach((key) => {
        const node = treeNodeMap.get(key);
        if (node && (!leafOnly || leafOnly && node.isLeaf)) {
          keys.push(key);
          checkedNodes.push(node.data);
        }
      });
    }
    return {
      checkedKeys: keys,
      checkedNodes
    };
  }
  function getHalfChecked() {
    const halfCheckedNodes = [];
    const halfCheckedKeys = [];
    if ((tree == null ? void 0 : tree.value) && props.showCheckbox) {
      const { treeNodeMap } = tree.value;
      indeterminateKeys.value.forEach((key) => {
        const node = treeNodeMap.get(key);
        if (node) {
          halfCheckedKeys.push(key);
          halfCheckedNodes.push(node.data);
        }
      });
    }
    return {
      halfCheckedNodes,
      halfCheckedKeys
    };
  }
  function setCheckedKeys(keys) {
    checkedKeys.value.clear();
    indeterminateKeys.value.clear();
    _setCheckedKeys(keys);
  }
  function setChecked(key, isChecked2) {
    if ((tree == null ? void 0 : tree.value) && props.showCheckbox) {
      const node = tree.value.treeNodeMap.get(key);
      if (node) {
        toggleCheckbox(node, isChecked2, false);
      }
    }
  }
  function _setCheckedKeys(keys) {
    if (tree == null ? void 0 : tree.value) {
      const { treeNodeMap } = tree.value;
      if (props.showCheckbox && treeNodeMap && keys) {
        for (const key of keys) {
          const node = treeNodeMap.get(key);
          if (node && !isChecked(node)) {
            toggleCheckbox(node, true, false);
          }
        }
      }
    }
  }
  return {
    updateCheckedKeys,
    toggleCheckbox,
    isChecked,
    isIndeterminate,
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys
  };
}

exports.useCheck = useCheck;
//# sourceMappingURL=useCheck.js.map

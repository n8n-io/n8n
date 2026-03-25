'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var virtualTree = require('../virtual-tree.js');
var useCheck = require('./useCheck.js');
var useFilter = require('./useFilter.js');
var shared = require('@vue/shared');

function useTree(props, emit) {
  const expandedKeySet = vue.ref(new Set(props.defaultExpandedKeys));
  const currentKey = vue.ref();
  const tree = vue.shallowRef();
  vue.watch(() => props.currentNodeKey, (key) => {
    currentKey.value = key;
  }, {
    immediate: true
  });
  vue.watch(() => props.data, (data) => {
    setData(data);
  }, {
    immediate: true
  });
  const {
    isIndeterminate,
    isChecked,
    toggleCheckbox,
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys
  } = useCheck.useCheck(props, tree);
  const { doFilter, hiddenNodeKeySet, isForceHiddenExpandIcon } = useFilter.useFilter(props, tree);
  const valueKey = vue.computed(() => {
    var _a;
    return ((_a = props.props) == null ? void 0 : _a.value) || virtualTree.TreeOptionsEnum.KEY;
  });
  const childrenKey = vue.computed(() => {
    var _a;
    return ((_a = props.props) == null ? void 0 : _a.children) || virtualTree.TreeOptionsEnum.CHILDREN;
  });
  const disabledKey = vue.computed(() => {
    var _a;
    return ((_a = props.props) == null ? void 0 : _a.disabled) || virtualTree.TreeOptionsEnum.DISABLED;
  });
  const labelKey = vue.computed(() => {
    var _a;
    return ((_a = props.props) == null ? void 0 : _a.label) || virtualTree.TreeOptionsEnum.LABEL;
  });
  const flattenTree = vue.computed(() => {
    const expandedKeys = expandedKeySet.value;
    const hiddenKeys = hiddenNodeKeySet.value;
    const flattenNodes = [];
    const nodes = tree.value && tree.value.treeNodes || [];
    function traverse() {
      const stack = [];
      for (let i = nodes.length - 1; i >= 0; --i) {
        stack.push(nodes[i]);
      }
      while (stack.length) {
        const node = stack.pop();
        if (!node)
          continue;
        if (!hiddenKeys.has(node.key)) {
          flattenNodes.push(node);
        }
        if (expandedKeys.has(node.key)) {
          const children = node.children;
          if (children) {
            const length = children.length;
            for (let i = length - 1; i >= 0; --i) {
              stack.push(children[i]);
            }
          }
        }
      }
    }
    traverse();
    return flattenNodes;
  });
  const isNotEmpty = vue.computed(() => {
    return flattenTree.value.length > 0;
  });
  function createTree(data) {
    const treeNodeMap = /* @__PURE__ */ new Map();
    const levelTreeNodeMap = /* @__PURE__ */ new Map();
    let maxLevel = 1;
    function traverse(nodes, level = 1, parent = void 0) {
      var _a;
      const siblings = [];
      for (const rawNode of nodes) {
        const value = getKey(rawNode);
        const node = {
          level,
          key: value,
          data: rawNode
        };
        node.label = getLabel(rawNode);
        node.parent = parent;
        const children = getChildren(rawNode);
        node.disabled = getDisabled(rawNode);
        node.isLeaf = !children || children.length === 0;
        if (children && children.length) {
          node.children = traverse(children, level + 1, node);
        }
        siblings.push(node);
        treeNodeMap.set(value, node);
        if (!levelTreeNodeMap.has(level)) {
          levelTreeNodeMap.set(level, []);
        }
        (_a = levelTreeNodeMap.get(level)) == null ? void 0 : _a.push(node);
      }
      if (level > maxLevel) {
        maxLevel = level;
      }
      return siblings;
    }
    const treeNodes = traverse(data);
    return {
      treeNodeMap,
      levelTreeNodeMap,
      maxLevel,
      treeNodes
    };
  }
  function filter(query) {
    const keys = doFilter(query);
    if (keys) {
      expandedKeySet.value = keys;
    }
  }
  function getChildren(node) {
    return node[childrenKey.value];
  }
  function getKey(node) {
    if (!node) {
      return "";
    }
    return node[valueKey.value];
  }
  function getDisabled(node) {
    return node[disabledKey.value];
  }
  function getLabel(node) {
    return node[labelKey.value];
  }
  function toggleExpand(node) {
    const expandedKeys = expandedKeySet.value;
    if (expandedKeys.has(node.key)) {
      collapseNode(node);
    } else {
      expandNode(node);
    }
  }
  function setExpandedKeys(keys) {
    expandedKeySet.value = new Set(keys);
  }
  function handleNodeClick(node, e) {
    emit(virtualTree.NODE_CLICK, node.data, node, e);
    handleCurrentChange(node);
    if (props.expandOnClickNode) {
      toggleExpand(node);
    }
    if (props.showCheckbox && props.checkOnClickNode && !node.disabled) {
      toggleCheckbox(node, !isChecked(node), true);
    }
  }
  function handleCurrentChange(node) {
    if (!isCurrent(node)) {
      currentKey.value = node.key;
      emit(virtualTree.CURRENT_CHANGE, node.data, node);
    }
  }
  function handleNodeCheck(node, checked) {
    toggleCheckbox(node, checked);
  }
  function expandNode(node) {
    const keySet = expandedKeySet.value;
    if (tree.value && props.accordion) {
      const { treeNodeMap } = tree.value;
      keySet.forEach((key) => {
        const treeNode = treeNodeMap.get(key);
        if (node && node.level === (treeNode == null ? void 0 : treeNode.level)) {
          keySet.delete(key);
        }
      });
    }
    keySet.add(node.key);
    emit(virtualTree.NODE_EXPAND, node.data, node);
  }
  function collapseNode(node) {
    expandedKeySet.value.delete(node.key);
    emit(virtualTree.NODE_COLLAPSE, node.data, node);
  }
  function isExpanded(node) {
    return expandedKeySet.value.has(node.key);
  }
  function isDisabled(node) {
    return !!node.disabled;
  }
  function isCurrent(node) {
    const current = currentKey.value;
    return current !== void 0 && current === node.key;
  }
  function getCurrentNode() {
    var _a, _b;
    if (!currentKey.value)
      return void 0;
    return (_b = (_a = tree.value) == null ? void 0 : _a.treeNodeMap.get(currentKey.value)) == null ? void 0 : _b.data;
  }
  function getCurrentKey() {
    return currentKey.value;
  }
  function setCurrentKey(key) {
    currentKey.value = key;
  }
  function setData(data) {
    vue.nextTick(() => tree.value = createTree(data));
  }
  function getNode(data) {
    var _a;
    const key = shared.isObject(data) ? getKey(data) : data;
    return (_a = tree.value) == null ? void 0 : _a.treeNodeMap.get(key);
  }
  return {
    tree,
    flattenTree,
    isNotEmpty,
    getKey,
    getChildren,
    toggleExpand,
    toggleCheckbox,
    isExpanded,
    isChecked,
    isIndeterminate,
    isDisabled,
    isCurrent,
    isForceHiddenExpandIcon,
    handleNodeClick,
    handleNodeCheck,
    getCurrentNode,
    getCurrentKey,
    setCurrentKey,
    getCheckedKeys,
    getCheckedNodes,
    getHalfCheckedKeys,
    getHalfCheckedNodes,
    setChecked,
    setCheckedKeys,
    filter,
    setData,
    getNode,
    expandNode,
    collapseNode,
    setExpandedKeys
  };
}

exports.useTree = useTree;
//# sourceMappingURL=useTree.js.map

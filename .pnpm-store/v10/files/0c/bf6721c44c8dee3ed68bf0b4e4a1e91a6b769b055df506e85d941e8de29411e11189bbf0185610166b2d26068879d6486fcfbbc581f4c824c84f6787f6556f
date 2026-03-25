'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
var vnode = require('../../utils/vue/vnode.js');

const getOrderedChildren = (vm, childComponentName, children) => {
  const nodes = vnode.flattedChildren(vm.subTree).filter((n) => {
    var _a;
    return vue.isVNode(n) && ((_a = n.type) == null ? void 0 : _a.name) === childComponentName && !!n.component;
  });
  const uids = nodes.map((n) => n.component.uid);
  return uids.map((uid) => children[uid]).filter((p) => !!p);
};
const useOrderedChildren = (vm, childComponentName) => {
  const children = {};
  const orderedChildren = vue.shallowRef([]);
  const addChild = (child) => {
    children[child.uid] = child;
    orderedChildren.value = getOrderedChildren(vm, childComponentName, children);
  };
  const removeChild = (uid) => {
    delete children[uid];
    orderedChildren.value = orderedChildren.value.filter((children2) => children2.uid !== uid);
  };
  return {
    children: orderedChildren,
    addChild,
    removeChild
  };
};

exports.useOrderedChildren = useOrderedChildren;
//# sourceMappingURL=index.js.map

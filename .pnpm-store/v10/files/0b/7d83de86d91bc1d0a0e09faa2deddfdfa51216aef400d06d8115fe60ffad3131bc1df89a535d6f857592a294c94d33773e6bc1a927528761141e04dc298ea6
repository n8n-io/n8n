import { isFunction } from '@vue/shared';
import '../../../utils/index.mjs';
import { isEmpty, isUndefined } from '../../../utils/types.mjs';
import { capitalize } from '../../../utils/strings.mjs';

let uid = 0;
const calculatePathNodes = (node) => {
  const nodes = [node];
  let { parent } = node;
  while (parent) {
    nodes.unshift(parent);
    parent = parent.parent;
  }
  return nodes;
};
class Node {
  constructor(data, config, parent, root = false) {
    this.data = data;
    this.config = config;
    this.parent = parent;
    this.root = root;
    this.uid = uid++;
    this.checked = false;
    this.indeterminate = false;
    this.loading = false;
    const { value: valueKey, label: labelKey, children: childrenKey } = config;
    const childrenData = data[childrenKey];
    const pathNodes = calculatePathNodes(this);
    this.level = root ? 0 : parent ? parent.level + 1 : 1;
    this.value = data[valueKey];
    this.label = data[labelKey];
    this.pathNodes = pathNodes;
    this.pathValues = pathNodes.map((node) => node.value);
    this.pathLabels = pathNodes.map((node) => node.label);
    this.childrenData = childrenData;
    this.children = (childrenData || []).map((child) => new Node(child, config, this));
    this.loaded = !config.lazy || this.isLeaf || !isEmpty(childrenData);
  }
  get isDisabled() {
    const { data, parent, config } = this;
    const { disabled, checkStrictly } = config;
    const isDisabled = isFunction(disabled) ? disabled(data, this) : !!data[disabled];
    return isDisabled || !checkStrictly && (parent == null ? void 0 : parent.isDisabled);
  }
  get isLeaf() {
    const { data, config, childrenData, loaded } = this;
    const { lazy, leaf } = config;
    const isLeaf = isFunction(leaf) ? leaf(data, this) : data[leaf];
    return isUndefined(isLeaf) ? lazy && !loaded ? false : !(Array.isArray(childrenData) && childrenData.length) : !!isLeaf;
  }
  get valueByOption() {
    return this.config.emitPath ? this.pathValues : this.value;
  }
  appendChild(childData) {
    const { childrenData, children } = this;
    const node = new Node(childData, this.config, this);
    if (Array.isArray(childrenData)) {
      childrenData.push(childData);
    } else {
      this.childrenData = [childData];
    }
    children.push(node);
    return node;
  }
  calcText(allLevels, separator) {
    const text = allLevels ? this.pathLabels.join(separator) : this.label;
    this.text = text;
    return text;
  }
  broadcast(event, ...args) {
    const handlerName = `onParent${capitalize(event)}`;
    this.children.forEach((child) => {
      if (child) {
        child.broadcast(event, ...args);
        child[handlerName] && child[handlerName](...args);
      }
    });
  }
  emit(event, ...args) {
    const { parent } = this;
    const handlerName = `onChild${capitalize(event)}`;
    if (parent) {
      parent[handlerName] && parent[handlerName](...args);
      parent.emit(event, ...args);
    }
  }
  onParentCheck(checked) {
    if (!this.isDisabled) {
      this.setCheckState(checked);
    }
  }
  onChildCheck() {
    const { children } = this;
    const validChildren = children.filter((child) => !child.isDisabled);
    const checked = validChildren.length ? validChildren.every((child) => child.checked) : false;
    this.setCheckState(checked);
  }
  setCheckState(checked) {
    const totalNum = this.children.length;
    const checkedNum = this.children.reduce((c, p) => {
      const num = p.checked ? 1 : p.indeterminate ? 0.5 : 0;
      return c + num;
    }, 0);
    this.checked = this.loaded && this.children.filter((child) => !child.isDisabled).every((child) => child.loaded && child.checked) && checked;
    this.indeterminate = this.loaded && checkedNum !== totalNum && checkedNum > 0;
  }
  doCheck(checked) {
    if (this.checked === checked)
      return;
    const { checkStrictly, multiple } = this.config;
    if (checkStrictly || !multiple) {
      this.checked = checked;
    } else {
      this.broadcast("check", checked);
      this.setCheckState(checked);
      this.emit("check");
    }
  }
}

export { Node as default };
//# sourceMappingURL=node.mjs.map

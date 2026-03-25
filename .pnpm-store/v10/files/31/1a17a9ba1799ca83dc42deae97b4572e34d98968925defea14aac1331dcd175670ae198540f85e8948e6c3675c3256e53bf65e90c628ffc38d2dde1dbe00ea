// src/jsx/children.ts
var toArray = (children) => Array.isArray(children) ? children : [children];
var Children = {
  map: (children, fn) => toArray(children).map(fn),
  forEach: (children, fn) => {
    toArray(children).forEach(fn);
  },
  count: (children) => toArray(children).length,
  only: (_children) => {
    const children = toArray(_children);
    if (children.length !== 1) {
      throw new Error("Children.only() expects only one child");
    }
    return children[0];
  },
  toArray
};
export {
  Children,
  toArray
};

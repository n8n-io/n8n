export default function(selector) {
  return function() {
    return this.matches(selector);
  };
}

export function childMatcher(selector) {
  return function(node) {
    return node.matches(selector);
  };
}


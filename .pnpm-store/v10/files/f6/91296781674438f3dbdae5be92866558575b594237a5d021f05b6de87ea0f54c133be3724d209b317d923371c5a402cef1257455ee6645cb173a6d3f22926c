function empty() {
  return [];
}

export default function(selector) {
  return selector == null ? empty : function() {
    return this.querySelectorAll(selector);
  };
}

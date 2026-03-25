export let Caret = /*#__PURE__*/function (Caret) {
  Caret["beforeValue"] = "beforeValue";
  Caret["afterValue"] = "afterValue";
  Caret["beforeKey"] = "beforeKey";
  return Caret;
}({});
export let StackType = /*#__PURE__*/function (StackType) {
  StackType["root"] = "root";
  StackType["object"] = "object";
  StackType["array"] = "array";
  StackType["ndJson"] = "ndJson";
  StackType["functionCall"] = "dataType";
  return StackType;
}({});
export function createStack() {
  const stack = [StackType.root];
  let caret = Caret.beforeValue;
  return {
    get type() {
      return last(stack);
    },
    get caret() {
      return caret;
    },
    pop() {
      stack.pop();
      caret = Caret.afterValue;
      return true;
    },
    push(type, newCaret) {
      stack.push(type);
      caret = newCaret;
      return true;
    },
    update(newCaret) {
      caret = newCaret;
      return true;
    }
  };
}
function last(array) {
  return array[array.length - 1];
}
//# sourceMappingURL=stack.js.map
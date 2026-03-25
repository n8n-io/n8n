import { defineComponent } from 'vue';
import '../../../utils/index.mjs';
import { isString, isFunction } from '@vue/shared';

var ElOptions = defineComponent({
  name: "ElOptions",
  emits: ["update-options"],
  setup(_, { slots, emit }) {
    let cachedOptions = [];
    function isSameOptions(a, b) {
      if (a.length !== b.length)
        return false;
      for (const [index] of a.entries()) {
        if (a[index] != b[index]) {
          return false;
        }
      }
      return true;
    }
    return () => {
      var _a, _b;
      const children = (_a = slots.default) == null ? void 0 : _a.call(slots);
      const filteredOptions = [];
      function filterOptions(children2) {
        if (!Array.isArray(children2))
          return;
        children2.forEach((item) => {
          var _a2, _b2, _c, _d;
          const name = (_a2 = (item == null ? void 0 : item.type) || {}) == null ? void 0 : _a2.name;
          if (name === "ElOptionGroup") {
            filterOptions(!isString(item.children) && !Array.isArray(item.children) && isFunction((_b2 = item.children) == null ? void 0 : _b2.default) ? (_c = item.children) == null ? void 0 : _c.default() : item.children);
          } else if (name === "ElOption") {
            filteredOptions.push((_d = item.props) == null ? void 0 : _d.label);
          } else if (Array.isArray(item.children)) {
            filterOptions(item.children);
          }
        });
      }
      if (children.length) {
        filterOptions((_b = children[0]) == null ? void 0 : _b.children);
      }
      if (!isSameOptions(filteredOptions, cachedOptions)) {
        cachedOptions = filteredOptions;
        emit("update-options", filteredOptions);
      }
      return children;
    };
  }
});

export { ElOptions as default };
//# sourceMappingURL=options.mjs.map

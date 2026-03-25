import { get, set } from 'lodash-unified';
export { hasOwn } from '@vue/shared';

const keysOf = (arr) => Object.keys(arr);
const entriesOf = (arr) => Object.entries(arr);
const getProp = (obj, path, defaultValue) => {
  return {
    get value() {
      return get(obj, path, defaultValue);
    },
    set value(val) {
      set(obj, path, val);
    }
  };
};

export { entriesOf, getProp, keysOf };
//# sourceMappingURL=objects.mjs.map

import { watch, unref } from 'vue';
import '../../utils/index.mjs';
import { debugWarn } from '../../utils/error.mjs';

const useDeprecated = ({ from, replacement, scope, version, ref, type = "API" }, condition) => {
  watch(() => unref(condition), (val) => {
    if (val) {
      debugWarn(scope, `[${type}] ${from} is about to be deprecated in version ${version}, please use ${replacement} instead.
For more detail, please visit: ${ref}
`);
    }
  }, {
    immediate: true
  });
};

export { useDeprecated };
//# sourceMappingURL=index.mjs.map

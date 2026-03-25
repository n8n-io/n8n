import { inject, computed, unref } from 'vue';
import '../../utils/index.mjs';
import '../../constants/index.mjs';
import { buildProp } from '../../utils/vue/props/runtime.mjs';
import { componentSizes } from '../../constants/size.mjs';

const useSizeProp = buildProp({
  type: String,
  values: componentSizes,
  required: false
});
const useSizeProps = {
  size: useSizeProp
};
const SIZE_INJECTION_KEY = Symbol("size");
const useGlobalSize = () => {
  const injectedSize = inject(SIZE_INJECTION_KEY, {});
  return computed(() => {
    return unref(injectedSize.size) || "";
  });
};

export { SIZE_INJECTION_KEY, useGlobalSize, useSizeProp, useSizeProps };
//# sourceMappingURL=index.mjs.map

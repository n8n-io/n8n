'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../utils/index.js');
require('../../constants/index.js');
var runtime = require('../../utils/vue/props/runtime.js');
var size = require('../../constants/size.js');

const useSizeProp = runtime.buildProp({
  type: String,
  values: size.componentSizes,
  required: false
});
const useSizeProps = {
  size: useSizeProp
};
const SIZE_INJECTION_KEY = Symbol("size");
const useGlobalSize = () => {
  const injectedSize = vue.inject(SIZE_INJECTION_KEY, {});
  return vue.computed(() => {
    return vue.unref(injectedSize.size) || "";
  });
};

exports.SIZE_INJECTION_KEY = SIZE_INJECTION_KEY;
exports.useGlobalSize = useGlobalSize;
exports.useSizeProp = useSizeProp;
exports.useSizeProps = useSizeProps;
//# sourceMappingURL=index.js.map

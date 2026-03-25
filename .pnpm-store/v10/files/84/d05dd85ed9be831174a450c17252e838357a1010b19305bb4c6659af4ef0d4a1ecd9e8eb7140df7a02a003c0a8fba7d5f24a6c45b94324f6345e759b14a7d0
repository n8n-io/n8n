'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var usePropsAlias = require('./use-props-alias.js');

const useComputedData = (props) => {
  const propsAlias = usePropsAlias.usePropsAlias(props);
  const dataObj = vue.computed(() => props.data.reduce((o, cur) => (o[cur[propsAlias.value.key]] = cur) && o, {}));
  const sourceData = vue.computed(() => props.data.filter((item) => !props.modelValue.includes(item[propsAlias.value.key])));
  const targetData = vue.computed(() => {
    if (props.targetOrder === "original") {
      return props.data.filter((item) => props.modelValue.includes(item[propsAlias.value.key]));
    } else {
      return props.modelValue.reduce((arr, cur) => {
        const val = dataObj.value[cur];
        if (val) {
          arr.push(val);
        }
        return arr;
      }, []);
    }
  });
  return {
    sourceData,
    targetData
  };
};

exports.useComputedData = useComputedData;
//# sourceMappingURL=use-computed-data.js.map

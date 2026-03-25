import '../../../utils/index.mjs';
import { definePropType } from '../../../utils/vue/props/runtime.mjs';
import { mutable } from '../../../utils/typescript.mjs';

const classType = String;
const columns = {
  type: definePropType(Array),
  required: true
};
const column = {
  type: definePropType(Object)
};
const fixedDataType = {
  type: definePropType(Array)
};
const dataType = {
  ...fixedDataType,
  required: true
};
const expandColumnKey = String;
const expandKeys = {
  type: definePropType(Array),
  default: () => mutable([])
};
const requiredNumber = {
  type: Number,
  required: true
};
const rowKey = {
  type: definePropType([String, Number, Symbol]),
  default: "id"
};
const styleType = {
  type: definePropType(Object)
};

export { classType, column, columns, dataType, expandColumnKey, expandKeys, fixedDataType, requiredNumber, rowKey, styleType };
//# sourceMappingURL=common.mjs.map

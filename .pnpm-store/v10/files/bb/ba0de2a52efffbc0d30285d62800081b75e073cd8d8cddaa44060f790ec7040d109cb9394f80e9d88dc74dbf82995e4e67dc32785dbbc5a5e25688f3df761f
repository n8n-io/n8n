'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var constants = require('../constants.js');
var basicCell = require('../props/basic-cell.js');
var index = require('../../../../hooks/use-namespace/index.js');

var ElDatePickerCell = vue.defineComponent({
  name: "ElDatePickerCell",
  props: basicCell.basicCellProps,
  setup(props) {
    const ns = index.useNamespace("date-table-cell");
    const {
      slots
    } = vue.inject(constants.ROOT_PICKER_INJECTION_KEY);
    return () => {
      const {
        cell
      } = props;
      if (slots.default) {
        const list = slots.default(cell).filter((item) => {
          return item.patchFlag !== -2 && item.type.toString() !== "Symbol(Comment)" && item.type.toString() !== "Symbol(v-cmt)";
        });
        if (list.length) {
          return list;
        }
      }
      return vue.createVNode("div", {
        "class": ns.b()
      }, [vue.createVNode("span", {
        "class": ns.e("text")
      }, [cell == null ? void 0 : cell.text])]);
    };
  }
});

exports["default"] = ElDatePickerCell;
//# sourceMappingURL=basic-cell-render.js.map

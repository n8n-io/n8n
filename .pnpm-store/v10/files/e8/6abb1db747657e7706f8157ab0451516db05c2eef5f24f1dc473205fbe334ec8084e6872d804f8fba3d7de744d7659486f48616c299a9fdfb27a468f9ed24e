import { defineComponent, h } from 'vue';
import '../../../../hooks/index.mjs';
import useStyle from './style-helper.mjs';
import { useNamespace } from '../../../../hooks/use-namespace/index.mjs';

var TableFooter = defineComponent({
  name: "ElTableFooter",
  props: {
    fixed: {
      type: String,
      default: ""
    },
    store: {
      required: true,
      type: Object
    },
    summaryMethod: Function,
    sumText: String,
    border: Boolean,
    defaultSort: {
      type: Object,
      default: () => {
        return {
          prop: "",
          order: ""
        };
      }
    }
  },
  setup(props) {
    const { getCellClasses, getCellStyles, columns } = useStyle(props);
    const ns = useNamespace("table");
    return {
      ns,
      getCellClasses,
      getCellStyles,
      columns
    };
  },
  render() {
    const { columns, getCellStyles, getCellClasses, summaryMethod, sumText } = this;
    const data = this.store.states.data.value;
    let sums = [];
    if (summaryMethod) {
      sums = summaryMethod({
        columns,
        data
      });
    } else {
      columns.forEach((column, index) => {
        if (index === 0) {
          sums[index] = sumText;
          return;
        }
        const values = data.map((item) => Number(item[column.property]));
        const precisions = [];
        let notNumber = true;
        values.forEach((value) => {
          if (!Number.isNaN(+value)) {
            notNumber = false;
            const decimal = `${value}`.split(".")[1];
            precisions.push(decimal ? decimal.length : 0);
          }
        });
        const precision = Math.max.apply(null, precisions);
        if (!notNumber) {
          sums[index] = values.reduce((prev, curr) => {
            const value = Number(curr);
            if (!Number.isNaN(+value)) {
              return Number.parseFloat((prev + curr).toFixed(Math.min(precision, 20)));
            } else {
              return prev;
            }
          }, 0);
        } else {
          sums[index] = "";
        }
      });
    }
    return h(h("tfoot", [
      h("tr", {}, [
        ...columns.map((column, cellIndex) => h("td", {
          key: cellIndex,
          colspan: column.colSpan,
          rowspan: column.rowSpan,
          class: getCellClasses(columns, cellIndex),
          style: getCellStyles(column, cellIndex)
        }, [
          h("div", {
            class: ["cell", column.labelClassName]
          }, [sums[cellIndex]])
        ]))
      ])
    ]));
  }
});

export { TableFooter as default };
//# sourceMappingURL=index.mjs.map

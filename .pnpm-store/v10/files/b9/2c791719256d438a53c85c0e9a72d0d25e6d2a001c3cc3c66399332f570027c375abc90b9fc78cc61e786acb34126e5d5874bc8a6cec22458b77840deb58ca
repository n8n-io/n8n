import { defineComponent, getCurrentInstance, ref, computed, onBeforeMount, onMounted, onBeforeUnmount, Fragment, h } from 'vue';
import { ElCheckbox } from '../../../checkbox/index.mjs';
import '../../../../utils/index.mjs';
import { cellStarts } from '../config.mjs';
import { mergeOptions, compose } from '../util.mjs';
import useWatcher from './watcher-helper.mjs';
import useRender from './render-helper.mjs';
import defaultProps from './defaults.mjs';
import { isUndefined } from '../../../../utils/types.mjs';
import { isString } from '@vue/shared';

let columnIdSeed = 1;
var ElTableColumn = defineComponent({
  name: "ElTableColumn",
  components: {
    ElCheckbox
  },
  props: defaultProps,
  setup(props, { slots }) {
    const instance = getCurrentInstance();
    const columnConfig = ref({});
    const owner = computed(() => {
      let parent2 = instance.parent;
      while (parent2 && !parent2.tableId) {
        parent2 = parent2.parent;
      }
      return parent2;
    });
    const { registerNormalWatchers, registerComplexWatchers } = useWatcher(owner, props);
    const {
      columnId,
      isSubColumn,
      realHeaderAlign,
      columnOrTableParent,
      setColumnWidth,
      setColumnForcedProps,
      setColumnRenders,
      getPropsData,
      getColumnElIndex,
      realAlign,
      updateColumnOrder
    } = useRender(props, slots, owner);
    const parent = columnOrTableParent.value;
    columnId.value = `${parent.tableId || parent.columnId}_column_${columnIdSeed++}`;
    onBeforeMount(() => {
      isSubColumn.value = owner.value !== parent;
      const type = props.type || "default";
      const sortable = props.sortable === "" ? true : props.sortable;
      const showOverflowTooltip = isUndefined(props.showOverflowTooltip) ? parent.props.showOverflowTooltip : props.showOverflowTooltip;
      const defaults = {
        ...cellStarts[type],
        id: columnId.value,
        type,
        property: props.prop || props.property,
        align: realAlign,
        headerAlign: realHeaderAlign,
        showOverflowTooltip,
        filterable: props.filters || props.filterMethod,
        filteredValue: [],
        filterPlacement: "",
        isColumnGroup: false,
        isSubColumn: false,
        filterOpened: false,
        sortable,
        index: props.index,
        rawColumnKey: instance.vnode.key
      };
      const basicProps = [
        "columnKey",
        "label",
        "className",
        "labelClassName",
        "type",
        "renderHeader",
        "formatter",
        "fixed",
        "resizable"
      ];
      const sortProps = ["sortMethod", "sortBy", "sortOrders"];
      const selectProps = ["selectable", "reserveSelection"];
      const filterProps = [
        "filterMethod",
        "filters",
        "filterMultiple",
        "filterOpened",
        "filteredValue",
        "filterPlacement"
      ];
      let column = getPropsData(basicProps, sortProps, selectProps, filterProps);
      column = mergeOptions(defaults, column);
      const chains = compose(setColumnRenders, setColumnWidth, setColumnForcedProps);
      column = chains(column);
      columnConfig.value = column;
      registerNormalWatchers();
      registerComplexWatchers();
    });
    onMounted(() => {
      var _a;
      const parent2 = columnOrTableParent.value;
      const children = isSubColumn.value ? parent2.vnode.el.children : (_a = parent2.refs.hiddenColumns) == null ? void 0 : _a.children;
      const getColumnIndex = () => getColumnElIndex(children || [], instance.vnode.el);
      columnConfig.value.getColumnIndex = getColumnIndex;
      const columnIndex = getColumnIndex();
      columnIndex > -1 && owner.value.store.commit("insertColumn", columnConfig.value, isSubColumn.value ? parent2.columnConfig.value : null, updateColumnOrder);
    });
    onBeforeUnmount(() => {
      owner.value.store.commit("removeColumn", columnConfig.value, isSubColumn.value ? parent.columnConfig.value : null, updateColumnOrder);
    });
    instance.columnId = columnId.value;
    instance.columnConfig = columnConfig;
    return;
  },
  render() {
    var _a, _b, _c;
    try {
      const renderDefault = (_b = (_a = this.$slots).default) == null ? void 0 : _b.call(_a, {
        row: {},
        column: {},
        $index: -1
      });
      const children = [];
      if (Array.isArray(renderDefault)) {
        for (const childNode of renderDefault) {
          if (((_c = childNode.type) == null ? void 0 : _c.name) === "ElTableColumn" || childNode.shapeFlag & 2) {
            children.push(childNode);
          } else if (childNode.type === Fragment && Array.isArray(childNode.children)) {
            childNode.children.forEach((vnode2) => {
              if ((vnode2 == null ? void 0 : vnode2.patchFlag) !== 1024 && !isString(vnode2 == null ? void 0 : vnode2.children)) {
                children.push(vnode2);
              }
            });
          }
        }
      }
      const vnode = h("div", children);
      return vnode;
    } catch (e) {
      return h("div", []);
    }
  }
});

export { ElTableColumn as default };
//# sourceMappingURL=index.mjs.map

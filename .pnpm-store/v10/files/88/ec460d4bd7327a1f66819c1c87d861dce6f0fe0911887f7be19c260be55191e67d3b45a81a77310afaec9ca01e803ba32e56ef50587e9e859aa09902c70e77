'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
var tokens = require('../tokens.js');

function useMapState() {
  const table = vue.inject(tokens.TABLE_INJECTION_KEY);
  const store = table == null ? void 0 : table.store;
  const leftFixedLeafCount = vue.computed(() => {
    return store.states.fixedLeafColumnsLength.value;
  });
  const rightFixedLeafCount = vue.computed(() => {
    return store.states.rightFixedColumns.value.length;
  });
  const columnsCount = vue.computed(() => {
    return store.states.columns.value.length;
  });
  const leftFixedCount = vue.computed(() => {
    return store.states.fixedColumns.value.length;
  });
  const rightFixedCount = vue.computed(() => {
    return store.states.rightFixedColumns.value.length;
  });
  return {
    leftFixedLeafCount,
    rightFixedLeafCount,
    columnsCount,
    leftFixedCount,
    rightFixedCount,
    columns: store.states.columns
  };
}

exports["default"] = useMapState;
//# sourceMappingURL=mapState-helper.js.map

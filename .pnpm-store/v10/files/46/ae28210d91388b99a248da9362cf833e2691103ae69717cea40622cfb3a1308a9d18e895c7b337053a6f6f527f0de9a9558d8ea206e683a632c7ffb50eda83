'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../utils/index.js');
var util = require('../util.js');
var shared = require('@vue/shared');

function getAllAliases(props, aliases) {
  return props.reduce((prev, cur) => {
    prev[cur] = cur;
    return prev;
  }, aliases);
}
function useWatcher(owner, props_) {
  const instance = vue.getCurrentInstance();
  const registerComplexWatchers = () => {
    const props = ["fixed"];
    const aliases = {
      realWidth: "width",
      realMinWidth: "minWidth"
    };
    const allAliases = getAllAliases(props, aliases);
    Object.keys(allAliases).forEach((key) => {
      const columnKey = aliases[key];
      if (shared.hasOwn(props_, columnKey)) {
        vue.watch(() => props_[columnKey], (newVal) => {
          let value = newVal;
          if (columnKey === "width" && key === "realWidth") {
            value = util.parseWidth(newVal);
          }
          if (columnKey === "minWidth" && key === "realMinWidth") {
            value = util.parseMinWidth(newVal);
          }
          instance.columnConfig.value[columnKey] = value;
          instance.columnConfig.value[key] = value;
          const updateColumns = columnKey === "fixed";
          owner.value.store.scheduleLayout(updateColumns);
        });
      }
    });
  };
  const registerNormalWatchers = () => {
    const props = [
      "label",
      "filters",
      "filterMultiple",
      "filteredValue",
      "sortable",
      "index",
      "formatter",
      "className",
      "labelClassName",
      "showOverflowTooltip"
    ];
    const aliases = {
      property: "prop",
      align: "realAlign",
      headerAlign: "realHeaderAlign"
    };
    const allAliases = getAllAliases(props, aliases);
    Object.keys(allAliases).forEach((key) => {
      const columnKey = aliases[key];
      if (shared.hasOwn(props_, columnKey)) {
        vue.watch(() => props_[columnKey], (newVal) => {
          instance.columnConfig.value[key] = newVal;
        });
      }
    });
  };
  return {
    registerComplexWatchers,
    registerNormalWatchers
  };
}

exports["default"] = useWatcher;
//# sourceMappingURL=watcher-helper.js.map

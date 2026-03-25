'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var panelDatePick = require('./date-picker-com/panel-date-pick.js');
var panelDateRange = require('./date-picker-com/panel-date-range.js');
var panelMonthRange = require('./date-picker-com/panel-month-range.js');

const getPanel = function(type) {
  switch (type) {
    case "daterange":
    case "datetimerange": {
      return panelDateRange["default"];
    }
    case "monthrange": {
      return panelMonthRange["default"];
    }
    default: {
      return panelDatePick["default"];
    }
  }
};

exports.getPanel = getPanel;
//# sourceMappingURL=panel-utils.js.map

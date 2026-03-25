import DatePickPanel from './date-picker-com/panel-date-pick.mjs';
import DateRangePickPanel from './date-picker-com/panel-date-range.mjs';
import MonthRangePickPanel from './date-picker-com/panel-month-range.mjs';

const getPanel = function(type) {
  switch (type) {
    case "daterange":
    case "datetimerange": {
      return DateRangePickPanel;
    }
    case "monthrange": {
      return MonthRangePickPanel;
    }
    default: {
      return DatePickPanel;
    }
  }
};

export { getPanel };
//# sourceMappingURL=panel-utils.mjs.map

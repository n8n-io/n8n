'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var vue = require('vue');
require('../../../../hooks/index.js');
var index = require('../../../../hooks/use-locale/index.js');

const useMonthRangeHeader = ({
  unlinkPanels,
  leftDate,
  rightDate
}) => {
  const { t } = index.useLocale();
  const leftPrevYear = () => {
    leftDate.value = leftDate.value.subtract(1, "year");
    if (!unlinkPanels.value) {
      rightDate.value = rightDate.value.subtract(1, "year");
    }
  };
  const rightNextYear = () => {
    if (!unlinkPanels.value) {
      leftDate.value = leftDate.value.add(1, "year");
    }
    rightDate.value = rightDate.value.add(1, "year");
  };
  const leftNextYear = () => {
    leftDate.value = leftDate.value.add(1, "year");
  };
  const rightPrevYear = () => {
    rightDate.value = rightDate.value.subtract(1, "year");
  };
  const leftLabel = vue.computed(() => {
    return `${leftDate.value.year()} ${t("el.datepicker.year")}`;
  });
  const rightLabel = vue.computed(() => {
    return `${rightDate.value.year()} ${t("el.datepicker.year")}`;
  });
  const leftYear = vue.computed(() => {
    return leftDate.value.year();
  });
  const rightYear = vue.computed(() => {
    return rightDate.value.year() === leftDate.value.year() ? leftDate.value.year() + 1 : rightDate.value.year();
  });
  return {
    leftPrevYear,
    rightNextYear,
    leftNextYear,
    rightPrevYear,
    leftLabel,
    rightLabel,
    leftYear,
    rightYear
  };
};

exports.useMonthRangeHeader = useMonthRangeHeader;
//# sourceMappingURL=use-month-range-header.js.map

export default (function (option, Dayjs, dayjs) {
  dayjs.updateLocale = function (locale, customConfig) {
    var localeList = dayjs.Ls;
    var localeConfig = localeList[locale];
    if (!localeConfig) return;
    var customConfigKeys = customConfig ? Object.keys(customConfig) : [];
    customConfigKeys.forEach(function (c) {
      localeConfig[c] = customConfig[c];
    });
    return localeConfig; // eslint-disable-line consistent-return
  };
});
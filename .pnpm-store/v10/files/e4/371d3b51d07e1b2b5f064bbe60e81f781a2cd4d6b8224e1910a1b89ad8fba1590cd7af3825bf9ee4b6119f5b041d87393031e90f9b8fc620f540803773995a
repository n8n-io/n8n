(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.fecha = {})));
}(this, (function (exports) { 'use strict';

  var token = /d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|ZZ|Z|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;
  var twoDigitsOptional = "\\d\\d?";
  var twoDigits = "\\d\\d";
  var threeDigits = "\\d{3}";
  var fourDigits = "\\d{4}";
  var word = "[^\\s]+";
  var literal = /\[([^]*?)\]/gm;
  function shorten(arr, sLen) {
      var newArr = [];
      for (var i = 0, len = arr.length; i < len; i++) {
          newArr.push(arr[i].substr(0, sLen));
      }
      return newArr;
  }
  var monthUpdate = function (arrName) { return function (v, i18n) {
      var lowerCaseArr = i18n[arrName].map(function (v) { return v.toLowerCase(); });
      var index = lowerCaseArr.indexOf(v.toLowerCase());
      if (index > -1) {
          return index;
      }
      return null;
  }; };
  function assign(origObj) {
      var args = [];
      for (var _i = 1; _i < arguments.length; _i++) {
          args[_i - 1] = arguments[_i];
      }
      for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
          var obj = args_1[_a];
          for (var key in obj) {
              // @ts-ignore ex
              origObj[key] = obj[key];
          }
      }
      return origObj;
  }
  var dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
  ];
  var monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
  ];
  var monthNamesShort = shorten(monthNames, 3);
  var dayNamesShort = shorten(dayNames, 3);
  var defaultI18n = {
      dayNamesShort: dayNamesShort,
      dayNames: dayNames,
      monthNamesShort: monthNamesShort,
      monthNames: monthNames,
      amPm: ["am", "pm"],
      DoFn: function (dayOfMonth) {
          return (dayOfMonth +
              ["th", "st", "nd", "rd"][dayOfMonth % 10 > 3
                  ? 0
                  : ((dayOfMonth - (dayOfMonth % 10) !== 10 ? 1 : 0) * dayOfMonth) % 10]);
      }
  };
  var globalI18n = assign({}, defaultI18n);
  var setGlobalDateI18n = function (i18n) {
      return (globalI18n = assign(globalI18n, i18n));
  };
  var regexEscape = function (str) {
      return str.replace(/[|\\{()[^$+*?.-]/g, "\\$&");
  };
  var pad = function (val, len) {
      if (len === void 0) { len = 2; }
      val = String(val);
      while (val.length < len) {
          val = "0" + val;
      }
      return val;
  };
  var formatFlags = {
      D: function (dateObj) { return String(dateObj.getDate()); },
      DD: function (dateObj) { return pad(dateObj.getDate()); },
      Do: function (dateObj, i18n) {
          return i18n.DoFn(dateObj.getDate());
      },
      d: function (dateObj) { return String(dateObj.getDay()); },
      dd: function (dateObj) { return pad(dateObj.getDay()); },
      ddd: function (dateObj, i18n) {
          return i18n.dayNamesShort[dateObj.getDay()];
      },
      dddd: function (dateObj, i18n) {
          return i18n.dayNames[dateObj.getDay()];
      },
      M: function (dateObj) { return String(dateObj.getMonth() + 1); },
      MM: function (dateObj) { return pad(dateObj.getMonth() + 1); },
      MMM: function (dateObj, i18n) {
          return i18n.monthNamesShort[dateObj.getMonth()];
      },
      MMMM: function (dateObj, i18n) {
          return i18n.monthNames[dateObj.getMonth()];
      },
      YY: function (dateObj) {
          return pad(String(dateObj.getFullYear()), 4).substr(2);
      },
      YYYY: function (dateObj) { return pad(dateObj.getFullYear(), 4); },
      h: function (dateObj) { return String(dateObj.getHours() % 12 || 12); },
      hh: function (dateObj) { return pad(dateObj.getHours() % 12 || 12); },
      H: function (dateObj) { return String(dateObj.getHours()); },
      HH: function (dateObj) { return pad(dateObj.getHours()); },
      m: function (dateObj) { return String(dateObj.getMinutes()); },
      mm: function (dateObj) { return pad(dateObj.getMinutes()); },
      s: function (dateObj) { return String(dateObj.getSeconds()); },
      ss: function (dateObj) { return pad(dateObj.getSeconds()); },
      S: function (dateObj) {
          return String(Math.round(dateObj.getMilliseconds() / 100));
      },
      SS: function (dateObj) {
          return pad(Math.round(dateObj.getMilliseconds() / 10), 2);
      },
      SSS: function (dateObj) { return pad(dateObj.getMilliseconds(), 3); },
      a: function (dateObj, i18n) {
          return dateObj.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1];
      },
      A: function (dateObj, i18n) {
          return dateObj.getHours() < 12
              ? i18n.amPm[0].toUpperCase()
              : i18n.amPm[1].toUpperCase();
      },
      ZZ: function (dateObj) {
          var offset = dateObj.getTimezoneOffset();
          return ((offset > 0 ? "-" : "+") +
              pad(Math.floor(Math.abs(offset) / 60) * 100 + (Math.abs(offset) % 60), 4));
      },
      Z: function (dateObj) {
          var offset = dateObj.getTimezoneOffset();
          return ((offset > 0 ? "-" : "+") +
              pad(Math.floor(Math.abs(offset) / 60), 2) +
              ":" +
              pad(Math.abs(offset) % 60, 2));
      }
  };
  var monthParse = function (v) { return +v - 1; };
  var emptyDigits = [null, twoDigitsOptional];
  var emptyWord = [null, word];
  var amPm = [
      "isPm",
      word,
      function (v, i18n) {
          var val = v.toLowerCase();
          if (val === i18n.amPm[0]) {
              return 0;
          }
          else if (val === i18n.amPm[1]) {
              return 1;
          }
          return null;
      }
  ];
  var timezoneOffset = [
      "timezoneOffset",
      "[^\\s]*?[\\+\\-]\\d\\d:?\\d\\d|[^\\s]*?Z?",
      function (v) {
          var parts = (v + "").match(/([+-]|\d\d)/gi);
          if (parts) {
              var minutes = +parts[1] * 60 + parseInt(parts[2], 10);
              return parts[0] === "+" ? minutes : -minutes;
          }
          return 0;
      }
  ];
  var parseFlags = {
      D: ["day", twoDigitsOptional],
      DD: ["day", twoDigits],
      Do: ["day", twoDigitsOptional + word, function (v) { return parseInt(v, 10); }],
      M: ["month", twoDigitsOptional, monthParse],
      MM: ["month", twoDigits, monthParse],
      YY: [
          "year",
          twoDigits,
          function (v) {
              var now = new Date();
              var cent = +("" + now.getFullYear()).substr(0, 2);
              return +("" + (+v > 68 ? cent - 1 : cent) + v);
          }
      ],
      h: ["hour", twoDigitsOptional, undefined, "isPm"],
      hh: ["hour", twoDigits, undefined, "isPm"],
      H: ["hour", twoDigitsOptional],
      HH: ["hour", twoDigits],
      m: ["minute", twoDigitsOptional],
      mm: ["minute", twoDigits],
      s: ["second", twoDigitsOptional],
      ss: ["second", twoDigits],
      YYYY: ["year", fourDigits],
      S: ["millisecond", "\\d", function (v) { return +v * 100; }],
      SS: ["millisecond", twoDigits, function (v) { return +v * 10; }],
      SSS: ["millisecond", threeDigits],
      d: emptyDigits,
      dd: emptyDigits,
      ddd: emptyWord,
      dddd: emptyWord,
      MMM: ["month", word, monthUpdate("monthNamesShort")],
      MMMM: ["month", word, monthUpdate("monthNames")],
      a: amPm,
      A: amPm,
      ZZ: timezoneOffset,
      Z: timezoneOffset
  };
  // Some common format strings
  var globalMasks = {
      default: "ddd MMM DD YYYY HH:mm:ss",
      shortDate: "M/D/YY",
      mediumDate: "MMM D, YYYY",
      longDate: "MMMM D, YYYY",
      fullDate: "dddd, MMMM D, YYYY",
      isoDate: "YYYY-MM-DD",
      isoDateTime: "YYYY-MM-DDTHH:mm:ssZ",
      shortTime: "HH:mm",
      mediumTime: "HH:mm:ss",
      longTime: "HH:mm:ss.SSS"
  };
  var setGlobalDateMasks = function (masks) { return assign(globalMasks, masks); };
  /***
   * Format a date
   * @method format
   * @param {Date|number} dateObj
   * @param {string} mask Format of the date, i.e. 'mm-dd-yy' or 'shortDate'
   * @returns {string} Formatted date string
   */
  var format = function (dateObj, mask, i18n) {
      if (mask === void 0) { mask = globalMasks["default"]; }
      if (i18n === void 0) { i18n = {}; }
      if (typeof dateObj === "number") {
          dateObj = new Date(dateObj);
      }
      if (Object.prototype.toString.call(dateObj) !== "[object Date]" ||
          isNaN(dateObj.getTime())) {
          throw new Error("Invalid Date pass to format");
      }
      mask = globalMasks[mask] || mask;
      var literals = [];
      // Make literals inactive by replacing them with @@@
      mask = mask.replace(literal, function ($0, $1) {
          literals.push($1);
          return "@@@";
      });
      var combinedI18nSettings = assign(assign({}, globalI18n), i18n);
      // Apply formatting rules
      mask = mask.replace(token, function ($0) {
          return formatFlags[$0](dateObj, combinedI18nSettings);
      });
      // Inline literal values back into the formatted value
      return mask.replace(/@@@/g, function () { return literals.shift(); });
  };
  /**
   * Parse a date string into a Javascript Date object /
   * @method parse
   * @param {string} dateStr Date string
   * @param {string} format Date parse format
   * @param {i18n} I18nSettingsOptional Full or subset of I18N settings
   * @returns {Date|null} Returns Date object. Returns null what date string is invalid or doesn't match format
   */
  function parse(dateStr, format, i18n) {
      if (i18n === void 0) { i18n = {}; }
      if (typeof format !== "string") {
          throw new Error("Invalid format in fecha parse");
      }
      // Check to see if the format is actually a mask
      format = globalMasks[format] || format;
      // Avoid regular expression denial of service, fail early for really long strings
      // https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS
      if (dateStr.length > 1000) {
          return null;
      }
      // Default to the beginning of the year.
      var today = new Date();
      var dateInfo = {
          year: today.getFullYear(),
          month: 0,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
          millisecond: 0,
          isPm: null,
          timezoneOffset: null
      };
      var parseInfo = [];
      var literals = [];
      // Replace all the literals with @@@. Hopefully a string that won't exist in the format
      var newFormat = format.replace(literal, function ($0, $1) {
          literals.push(regexEscape($1));
          return "@@@";
      });
      var specifiedFields = {};
      var requiredFields = {};
      // Change every token that we find into the correct regex
      newFormat = regexEscape(newFormat).replace(token, function ($0) {
          var info = parseFlags[$0];
          var field = info[0], regex = info[1], requiredField = info[3];
          // Check if the person has specified the same field twice. This will lead to confusing results.
          if (specifiedFields[field]) {
              throw new Error("Invalid format. " + field + " specified twice in format");
          }
          specifiedFields[field] = true;
          // Check if there are any required fields. For instance, 12 hour time requires AM/PM specified
          if (requiredField) {
              requiredFields[requiredField] = true;
          }
          parseInfo.push(info);
          return "(" + regex + ")";
      });
      // Check all the required fields are present
      Object.keys(requiredFields).forEach(function (field) {
          if (!specifiedFields[field]) {
              throw new Error("Invalid format. " + field + " is required in specified format");
          }
      });
      // Add back all the literals after
      newFormat = newFormat.replace(/@@@/g, function () { return literals.shift(); });
      // Check if the date string matches the format. If it doesn't return null
      var matches = dateStr.match(new RegExp(newFormat, "i"));
      if (!matches) {
          return null;
      }
      var combinedI18nSettings = assign(assign({}, globalI18n), i18n);
      // For each match, call the parser function for that date part
      for (var i = 1; i < matches.length; i++) {
          var _a = parseInfo[i - 1], field = _a[0], parser = _a[2];
          var value = parser
              ? parser(matches[i], combinedI18nSettings)
              : +matches[i];
          // If the parser can't make sense of the value, return null
          if (value == null) {
              return null;
          }
          dateInfo[field] = value;
      }
      if (dateInfo.isPm === 1 && dateInfo.hour != null && +dateInfo.hour !== 12) {
          dateInfo.hour = +dateInfo.hour + 12;
      }
      else if (dateInfo.isPm === 0 && +dateInfo.hour === 12) {
          dateInfo.hour = 0;
      }
      var dateTZ;
      if (dateInfo.timezoneOffset == null) {
          dateTZ = new Date(dateInfo.year, dateInfo.month, dateInfo.day, dateInfo.hour, dateInfo.minute, dateInfo.second, dateInfo.millisecond);
          var validateFields = [
              ["month", "getMonth"],
              ["day", "getDate"],
              ["hour", "getHours"],
              ["minute", "getMinutes"],
              ["second", "getSeconds"]
          ];
          for (var i = 0, len = validateFields.length; i < len; i++) {
              // Check to make sure the date field is within the allowed range. Javascript dates allows values
              // outside the allowed range. If the values don't match the value was invalid
              if (specifiedFields[validateFields[i][0]] &&
                  dateInfo[validateFields[i][0]] !== dateTZ[validateFields[i][1]]()) {
                  return null;
              }
          }
      }
      else {
          dateTZ = new Date(Date.UTC(dateInfo.year, dateInfo.month, dateInfo.day, dateInfo.hour, dateInfo.minute - dateInfo.timezoneOffset, dateInfo.second, dateInfo.millisecond));
          // We can't validate dates in another timezone unfortunately. Do a basic check instead
          if (dateInfo.month > 11 ||
              dateInfo.month < 0 ||
              dateInfo.day > 31 ||
              dateInfo.day < 1 ||
              dateInfo.hour > 23 ||
              dateInfo.hour < 0 ||
              dateInfo.minute > 59 ||
              dateInfo.minute < 0 ||
              dateInfo.second > 59 ||
              dateInfo.second < 0) {
              return null;
          }
      }
      // Don't allow invalid dates
      return dateTZ;
  }
  var fecha = {
      format: format,
      parse: parse,
      defaultI18n: defaultI18n,
      setGlobalDateI18n: setGlobalDateI18n,
      setGlobalDateMasks: setGlobalDateMasks
  };

  exports.assign = assign;
  exports.default = fecha;
  exports.format = format;
  exports.parse = parse;
  exports.defaultI18n = defaultI18n;
  exports.setGlobalDateI18n = setGlobalDateI18n;
  exports.setGlobalDateMasks = setGlobalDateMasks;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=fecha.umd.js.map

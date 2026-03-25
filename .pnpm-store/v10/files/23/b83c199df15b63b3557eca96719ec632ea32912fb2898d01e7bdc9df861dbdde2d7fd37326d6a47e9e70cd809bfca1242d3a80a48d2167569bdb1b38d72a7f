const token = /d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|ZZ|Z|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;
const twoDigitsOptional = "\\d\\d?";
const twoDigits = "\\d\\d";
const threeDigits = "\\d{3}";
const fourDigits = "\\d{4}";
const word = "[^\\s]+";
const literal = /\[([^]*?)\]/gm;

type DateInfo = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  isPm: number | null;
  timezoneOffset: number | null;
};

export type I18nSettings = {
  amPm: [string, string];
  dayNames: Days;
  dayNamesShort: Days;
  monthNames: Months;
  monthNamesShort: Months;
  DoFn(dayOfMonth: number): string;
};

export type I18nSettingsOptional = Partial<I18nSettings>;

export type Days = [string, string, string, string, string, string, string];
export type Months = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

function shorten<T extends string[]>(arr: T, sLen: number): string[] {
  const newArr: string[] = [];
  for (let i = 0, len = arr.length; i < len; i++) {
    newArr.push(arr[i].substr(0, sLen));
  }
  return newArr;
}

const monthUpdate = (
  arrName: "monthNames" | "monthNamesShort" | "dayNames" | "dayNamesShort"
) => (v: string, i18n: I18nSettings): number | null => {
  const lowerCaseArr = i18n[arrName].map(v => v.toLowerCase());
  const index = lowerCaseArr.indexOf(v.toLowerCase());
  if (index > -1) {
    return index;
  }
  return null;
};

export function assign<A>(a: A): A;
export function assign<A, B>(a: A, b: B): A & B;
export function assign<A, B, C>(a: A, b: B, c: C): A & B & C;
export function assign<A, B, C, D>(a: A, b: B, c: C, d: D): A & B & C & D;
export function assign(origObj: any, ...args: any[]): any {
  for (const obj of args) {
    for (const key in obj) {
      // @ts-ignore ex
      origObj[key] = obj[key];
    }
  }
  return origObj;
}

const dayNames: Days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
const monthNames: Months = [
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

const monthNamesShort: Months = shorten(monthNames, 3) as Months;
const dayNamesShort: Days = shorten(dayNames, 3) as Days;

const defaultI18n: I18nSettings = {
  dayNamesShort,
  dayNames,
  monthNamesShort,
  monthNames,
  amPm: ["am", "pm"],
  DoFn(dayOfMonth: number) {
    return (
      dayOfMonth +
      ["th", "st", "nd", "rd"][
        dayOfMonth % 10 > 3
          ? 0
          : ((dayOfMonth - (dayOfMonth % 10) !== 10 ? 1 : 0) * dayOfMonth) % 10
      ]
    );
  }
};
let globalI18n = assign({}, defaultI18n);
const setGlobalDateI18n = (i18n: I18nSettingsOptional): I18nSettings =>
  (globalI18n = assign(globalI18n, i18n));

const regexEscape = (str: string): string =>
  str.replace(/[|\\{()[^$+*?.-]/g, "\\$&");

const pad = (val: string | number, len = 2): string => {
  val = String(val);
  while (val.length < len) {
    val = "0" + val;
  }
  return val;
};

const formatFlags: Record<
  string,
  (dateObj: Date, i18n: I18nSettings) => string
> = {
  D: (dateObj: Date): string => String(dateObj.getDate()),
  DD: (dateObj: Date): string => pad(dateObj.getDate()),
  Do: (dateObj: Date, i18n: I18nSettings): string =>
    i18n.DoFn(dateObj.getDate()),
  d: (dateObj: Date): string => String(dateObj.getDay()),
  dd: (dateObj: Date): string => pad(dateObj.getDay()),
  ddd: (dateObj: Date, i18n: I18nSettings): string =>
    i18n.dayNamesShort[dateObj.getDay()],
  dddd: (dateObj: Date, i18n: I18nSettings): string =>
    i18n.dayNames[dateObj.getDay()],
  M: (dateObj: Date): string => String(dateObj.getMonth() + 1),
  MM: (dateObj: Date): string => pad(dateObj.getMonth() + 1),
  MMM: (dateObj: Date, i18n: I18nSettings): string =>
    i18n.monthNamesShort[dateObj.getMonth()],
  MMMM: (dateObj: Date, i18n: I18nSettings): string =>
    i18n.monthNames[dateObj.getMonth()],
  YY: (dateObj: Date): string =>
    pad(String(dateObj.getFullYear()), 4).substr(2),
  YYYY: (dateObj: Date): string => pad(dateObj.getFullYear(), 4),
  h: (dateObj: Date): string => String(dateObj.getHours() % 12 || 12),
  hh: (dateObj: Date): string => pad(dateObj.getHours() % 12 || 12),
  H: (dateObj: Date): string => String(dateObj.getHours()),
  HH: (dateObj: Date): string => pad(dateObj.getHours()),
  m: (dateObj: Date): string => String(dateObj.getMinutes()),
  mm: (dateObj: Date): string => pad(dateObj.getMinutes()),
  s: (dateObj: Date): string => String(dateObj.getSeconds()),
  ss: (dateObj: Date): string => pad(dateObj.getSeconds()),
  S: (dateObj: Date): string =>
    String(Math.round(dateObj.getMilliseconds() / 100)),
  SS: (dateObj: Date): string =>
    pad(Math.round(dateObj.getMilliseconds() / 10), 2),
  SSS: (dateObj: Date): string => pad(dateObj.getMilliseconds(), 3),
  a: (dateObj: Date, i18n: I18nSettings): string =>
    dateObj.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1],
  A: (dateObj: Date, i18n: I18nSettings): string =>
    dateObj.getHours() < 12
      ? i18n.amPm[0].toUpperCase()
      : i18n.amPm[1].toUpperCase(),
  ZZ(dateObj: Date): string {
    const offset = dateObj.getTimezoneOffset();
    return (
      (offset > 0 ? "-" : "+") +
      pad(Math.floor(Math.abs(offset) / 60) * 100 + (Math.abs(offset) % 60), 4)
    );
  },
  Z(dateObj: Date): string {
    const offset = dateObj.getTimezoneOffset();
    return (
      (offset > 0 ? "-" : "+") +
      pad(Math.floor(Math.abs(offset) / 60), 2) +
      ":" +
      pad(Math.abs(offset) % 60, 2)
    );
  }
};

type ParseInfo = [
  keyof DateInfo,
  string,
  ((v: string, i18n: I18nSettings) => number | null)?,
  string?
];
const monthParse = (v: string): number => +v - 1;
const emptyDigits: ParseInfo = [null, twoDigitsOptional];
const emptyWord: ParseInfo = [null, word];
const amPm: ParseInfo = [
  "isPm",
  word,
  (v: string, i18n: I18nSettings): number | null => {
    const val = v.toLowerCase();
    if (val === i18n.amPm[0]) {
      return 0;
    } else if (val === i18n.amPm[1]) {
      return 1;
    }
    return null;
  }
];
const timezoneOffset: ParseInfo = [
  "timezoneOffset",
  "[^\\s]*?[\\+\\-]\\d\\d:?\\d\\d|[^\\s]*?Z?",
  (v: string): number | null => {
    const parts = (v + "").match(/([+-]|\d\d)/gi);

    if (parts) {
      const minutes = +parts[1] * 60 + parseInt(parts[2], 10);
      return parts[0] === "+" ? minutes : -minutes;
    }

    return 0;
  }
];
const parseFlags: Record<string, ParseInfo> = {
  D: ["day", twoDigitsOptional],
  DD: ["day", twoDigits],
  Do: ["day", twoDigitsOptional + word, (v: string): number => parseInt(v, 10)],
  M: ["month", twoDigitsOptional, monthParse],
  MM: ["month", twoDigits, monthParse],
  YY: [
    "year",
    twoDigits,
    (v: string): number => {
      const now = new Date();
      const cent = +("" + now.getFullYear()).substr(0, 2);
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
  S: ["millisecond", "\\d", (v: string): number => +v * 100],
  SS: ["millisecond", twoDigits, (v: string): number => +v * 10],
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
const globalMasks: { [key: string]: string } = {
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
const setGlobalDateMasks = (masks: {
  [key: string]: string;
}): { [key: string]: string } => assign(globalMasks, masks);

/***
 * Format a date
 * @method format
 * @param {Date|number} dateObj
 * @param {string} mask Format of the date, i.e. 'mm-dd-yy' or 'shortDate'
 * @returns {string} Formatted date string
 */
const format = (
  dateObj: Date,
  mask: string = globalMasks["default"],
  i18n: I18nSettingsOptional = {}
): string => {
  if (typeof dateObj === "number") {
    dateObj = new Date(dateObj);
  }

  if (
    Object.prototype.toString.call(dateObj) !== "[object Date]" ||
    isNaN(dateObj.getTime())
  ) {
    throw new Error("Invalid Date pass to format");
  }

  mask = globalMasks[mask] || mask;

  const literals: string[] = [];

  // Make literals inactive by replacing them with @@@
  mask = mask.replace(literal, function($0, $1) {
    literals.push($1);
    return "@@@";
  });

  const combinedI18nSettings: I18nSettings = assign(
    assign({}, globalI18n),
    i18n
  );
  // Apply formatting rules
  mask = mask.replace(token, $0 =>
    formatFlags[$0](dateObj, combinedI18nSettings)
  );
  // Inline literal values back into the formatted value
  return mask.replace(/@@@/g, () => literals.shift());
};

/**
 * Parse a date string into a Javascript Date object /
 * @method parse
 * @param {string} dateStr Date string
 * @param {string} format Date parse format
 * @param {i18n} I18nSettingsOptional Full or subset of I18N settings
 * @returns {Date|null} Returns Date object. Returns null what date string is invalid or doesn't match format
 */
function parse(
  dateStr: string,
  format: string,
  i18n: I18nSettingsOptional = {}
): Date | null {
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
  const today = new Date();
  const dateInfo: DateInfo = {
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
  const parseInfo: ParseInfo[] = [];
  const literals: string[] = [];

  // Replace all the literals with @@@. Hopefully a string that won't exist in the format
  let newFormat = format.replace(literal, ($0, $1) => {
    literals.push(regexEscape($1));
    return "@@@";
  });
  const specifiedFields: { [field: string]: boolean } = {};
  const requiredFields: { [field: string]: boolean } = {};

  // Change every token that we find into the correct regex
  newFormat = regexEscape(newFormat).replace(token, $0 => {
    const info = parseFlags[$0];
    const [field, regex, , requiredField] = info;

    // Check if the person has specified the same field twice. This will lead to confusing results.
    if (specifiedFields[field]) {
      throw new Error(`Invalid format. ${field} specified twice in format`);
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
  Object.keys(requiredFields).forEach(field => {
    if (!specifiedFields[field]) {
      throw new Error(
        `Invalid format. ${field} is required in specified format`
      );
    }
  });

  // Add back all the literals after
  newFormat = newFormat.replace(/@@@/g, () => literals.shift());

  // Check if the date string matches the format. If it doesn't return null
  const matches = dateStr.match(new RegExp(newFormat, "i"));
  if (!matches) {
    return null;
  }

  const combinedI18nSettings: I18nSettings = assign(
    assign({}, globalI18n),
    i18n
  );

  // For each match, call the parser function for that date part
  for (let i = 1; i < matches.length; i++) {
    const [field, , parser] = parseInfo[i - 1];
    const value = parser
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
  } else if (dateInfo.isPm === 0 && +dateInfo.hour === 12) {
    dateInfo.hour = 0;
  }

  let dateTZ: Date;
  if (dateInfo.timezoneOffset == null) {
    dateTZ = new Date(
      dateInfo.year,
      dateInfo.month,
      dateInfo.day,
      dateInfo.hour,
      dateInfo.minute,
      dateInfo.second,
      dateInfo.millisecond
    );
    const validateFields: [
      "month" | "day" | "hour" | "minute" | "second",
      "getMonth" | "getDate" | "getHours" | "getMinutes" | "getSeconds"
    ][] = [
      ["month", "getMonth"],
      ["day", "getDate"],
      ["hour", "getHours"],
      ["minute", "getMinutes"],
      ["second", "getSeconds"]
    ];
    for (let i = 0, len = validateFields.length; i < len; i++) {
      // Check to make sure the date field is within the allowed range. Javascript dates allows values
      // outside the allowed range. If the values don't match the value was invalid
      if (
        specifiedFields[validateFields[i][0]] &&
        dateInfo[validateFields[i][0]] !== dateTZ[validateFields[i][1]]()
      ) {
        return null;
      }
    }
  } else {
    dateTZ = new Date(
      Date.UTC(
        dateInfo.year,
        dateInfo.month,
        dateInfo.day,
        dateInfo.hour,
        dateInfo.minute - dateInfo.timezoneOffset,
        dateInfo.second,
        dateInfo.millisecond
      )
    );

    // We can't validate dates in another timezone unfortunately. Do a basic check instead
    if (
      dateInfo.month > 11 ||
      dateInfo.month < 0 ||
      dateInfo.day > 31 ||
      dateInfo.day < 1 ||
      dateInfo.hour > 23 ||
      dateInfo.hour < 0 ||
      dateInfo.minute > 59 ||
      dateInfo.minute < 0 ||
      dateInfo.second > 59 ||
      dateInfo.second < 0
    ) {
      return null;
    }
  }

  // Don't allow invalid dates

  return dateTZ;
}
export default {
  format,
  parse,
  defaultI18n,
  setGlobalDateI18n,
  setGlobalDateMasks
};
export { format, parse, defaultI18n, setGlobalDateI18n, setGlobalDateMasks };

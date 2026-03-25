import { Buffer } from "node:buffer";
const regex = {
  backtick: /`/g,
  dot: /\./g,
  timezone: /([+\-\s])(\d\d):?(\d\d)?/,
  escapeChars: /[\0\b\t\n\r\x1a"'\\]/g
};
const CHARS_ESCAPE_MAP = {
  "\0": "\\0",
  "\b": "\\b",
  "	": "\\t",
  "\n": "\\n",
  "\r": "\\r",
  "": "\\Z",
  '"': '\\"',
  "'": "\\'",
  "\\": "\\\\"
};
const charCode = {
  singleQuote: 39,
  backtick: 96,
  backslash: 92,
  dash: 45,
  slash: 47,
  asterisk: 42,
  questionMark: 63,
  newline: 10,
  space: 32,
  tab: 9,
  carriageReturn: 13
};
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isWordChar = (code) => code >= 65 && code <= 90 || code >= 97 && code <= 122 || code >= 48 && code <= 57 || code === 95;
const isWhitespace = (code) => code === charCode.space || code === charCode.tab || code === charCode.newline || code === charCode.carriageReturn;
const hasOnlyWhitespaceBetween = (sql, start, end) => {
  if (start >= end) return true;
  for (let i = start; i < end; i++) {
    const code = sql.charCodeAt(i);
    if (code !== charCode.space && code !== charCode.tab && code !== charCode.newline && code !== charCode.carriageReturn)
      return false;
  }
  return true;
};
const toLower = (code) => code | 32;
const matchesWord = (sql, position, word, length) => {
  for (let offset = 0; offset < word.length; offset++)
    if (toLower(sql.charCodeAt(position + offset)) !== word.charCodeAt(offset))
      return false;
  return (position === 0 || !isWordChar(sql.charCodeAt(position - 1))) && (position + word.length >= length || !isWordChar(sql.charCodeAt(position + word.length)));
};
const skipSqlContext = (sql, position) => {
  const currentChar = sql.charCodeAt(position);
  const nextChar = sql.charCodeAt(position + 1);
  if (currentChar === charCode.singleQuote) {
    for (let cursor = position + 1; cursor < sql.length; cursor++) {
      if (sql.charCodeAt(cursor) === charCode.backslash) cursor++;
      else if (sql.charCodeAt(cursor) === charCode.singleQuote)
        return cursor + 1;
    }
    return sql.length;
  }
  if (currentChar === charCode.backtick) {
    const length = sql.length;
    for (let cursor = position + 1; cursor < length; cursor++) {
      if (sql.charCodeAt(cursor) !== charCode.backtick) continue;
      if (sql.charCodeAt(cursor + 1) === charCode.backtick) {
        cursor++;
        continue;
      }
      return cursor + 1;
    }
    return length;
  }
  if (currentChar === charCode.dash && nextChar === charCode.dash) {
    const lineBreak = sql.indexOf("\n", position + 2);
    return lineBreak === -1 ? sql.length : lineBreak + 1;
  }
  if (currentChar === charCode.slash && nextChar === charCode.asterisk) {
    const commentEnd = sql.indexOf("*/", position + 2);
    return commentEnd === -1 ? sql.length : commentEnd + 2;
  }
  return -1;
};
const findNextPlaceholder = (sql, start) => {
  const sqlLength = sql.length;
  for (let position = start; position < sqlLength; position++) {
    const code = sql.charCodeAt(position);
    if (code === charCode.questionMark) return position;
    if (code === charCode.singleQuote || code === charCode.backtick || code === charCode.dash || code === charCode.slash) {
      const contextEnd = skipSqlContext(sql, position);
      if (contextEnd !== -1) position = contextEnd - 1;
    }
  }
  return -1;
};
const findSetKeyword = (sql, startFrom = 0) => {
  const length = sql.length;
  for (let position = startFrom; position < length; position++) {
    const code = sql.charCodeAt(position);
    const lower = code | 32;
    if (code === charCode.singleQuote || code === charCode.backtick || code === charCode.dash || code === charCode.slash) {
      const contextEnd = skipSqlContext(sql, position);
      if (contextEnd !== -1) {
        position = contextEnd - 1;
        continue;
      }
    }
    if (lower === 115 && matchesWord(sql, position, "set", length))
      return position + 3;
    if (lower === 107 && matchesWord(sql, position, "key", length)) {
      let cursor = position + 3;
      while (cursor < length && isWhitespace(sql.charCodeAt(cursor))) cursor++;
      if (matchesWord(sql, cursor, "update", length)) return cursor + 6;
    }
  }
  return -1;
};
const isDate = (value) => Object.prototype.toString.call(value) === "[object Date]";
const hasSqlString = (value) => typeof value === "object" && value !== null && "toSqlString" in value && typeof value.toSqlString === "function";
const escapeString = (value) => {
  regex.escapeChars.lastIndex = 0;
  let chunkIndex = 0;
  let escapedValue = "";
  let match;
  for (match = regex.escapeChars.exec(value); match !== null; match = regex.escapeChars.exec(value)) {
    escapedValue += value.slice(chunkIndex, match.index);
    escapedValue += CHARS_ESCAPE_MAP[match[0]];
    chunkIndex = regex.escapeChars.lastIndex;
  }
  if (chunkIndex === 0) return `'${value}'`;
  if (chunkIndex < value.length)
    return `'${escapedValue}${value.slice(chunkIndex)}'`;
  return `'${escapedValue}'`;
};
const pad2 = (value) => value < 10 ? "0" + value : "" + value;
const pad3 = (value) => value < 10 ? "00" + value : value < 100 ? "0" + value : "" + value;
const pad4 = (value) => value < 10 ? "000" + value : value < 100 ? "00" + value : value < 1e3 ? "0" + value : "" + value;
const convertTimezone = (tz) => {
  if (tz === "Z") return 0;
  const timezoneMatch = tz.match(regex.timezone);
  if (timezoneMatch)
    return (timezoneMatch[1] === "-" ? -1 : 1) * (Number.parseInt(timezoneMatch[2], 10) + (timezoneMatch[3] ? Number.parseInt(timezoneMatch[3], 10) : 0) / 60) * 60;
  return false;
};
const dateToString = (date, timezone) => {
  if (Number.isNaN(date.getTime())) return "NULL";
  let year;
  let month;
  let day;
  let hour;
  let minute;
  let second;
  let millisecond;
  if (timezone === "local") {
    year = date.getFullYear();
    month = date.getMonth() + 1;
    day = date.getDate();
    hour = date.getHours();
    minute = date.getMinutes();
    second = date.getSeconds();
    millisecond = date.getMilliseconds();
  } else {
    const timezoneOffsetMinutes = convertTimezone(timezone);
    let time = date.getTime();
    if (timezoneOffsetMinutes !== false && timezoneOffsetMinutes !== 0)
      time += timezoneOffsetMinutes * 6e4;
    const adjustedDate = new Date(time);
    year = adjustedDate.getUTCFullYear();
    month = adjustedDate.getUTCMonth() + 1;
    day = adjustedDate.getUTCDate();
    hour = adjustedDate.getUTCHours();
    minute = adjustedDate.getUTCMinutes();
    second = adjustedDate.getUTCSeconds();
    millisecond = adjustedDate.getUTCMilliseconds();
  }
  return escapeString(
    pad4(year) + "-" + pad2(month) + "-" + pad2(day) + " " + pad2(hour) + ":" + pad2(minute) + ":" + pad2(second) + "." + pad3(millisecond)
  );
};
const escapeId = (value, forbidQualified) => {
  if (Array.isArray(value)) {
    const length = value.length;
    const parts = new Array(length);
    for (let i = 0; i < length; i++)
      parts[i] = escapeId(value[i], forbidQualified);
    return parts.join(", ");
  }
  const identifier = String(value);
  const hasJsonOperator = identifier.indexOf("->") !== -1;
  if (forbidQualified || hasJsonOperator) {
    if (identifier.indexOf("`") === -1) return `\`${identifier}\``;
    return `\`${identifier.replace(regex.backtick, "``")}\``;
  }
  if (identifier.indexOf("`") === -1 && identifier.indexOf(".") === -1)
    return `\`${identifier}\``;
  return `\`${identifier.replace(regex.backtick, "``").replace(regex.dot, "`.`")}\``;
};
const objectToValues = (object, timezone) => {
  const keys = Object.keys(object);
  const keysLength = keys.length;
  if (keysLength === 0) return "";
  let sql = "";
  for (let i = 0; i < keysLength; i++) {
    const key = keys[i];
    const value = object[key];
    if (typeof value === "function") continue;
    if (sql.length > 0) sql += ", ";
    sql += escapeId(key);
    sql += " = ";
    sql += escape(value, true, timezone);
  }
  return sql;
};
const bufferToString = (buffer) => `X${escapeString(buffer.toString("hex"))}`;
const arrayToList = (array, timezone) => {
  const length = array.length;
  const parts = new Array(length);
  for (let i = 0; i < length; i++) {
    const value = array[i];
    if (Array.isArray(value)) parts[i] = `(${arrayToList(value, timezone)})`;
    else parts[i] = escape(value, true, timezone);
  }
  return parts.join(", ");
};
const escape = (value, stringifyObjects, timezone) => {
  if (value === void 0 || value === null) return "NULL";
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "number":
    case "bigint":
      return value + "";
    case "object": {
      if (isDate(value)) return dateToString(value, timezone || "local");
      if (Array.isArray(value)) return arrayToList(value, timezone);
      if (Buffer.isBuffer(value)) return bufferToString(value);
      if (value instanceof Uint8Array)
        return bufferToString(Buffer.from(value));
      if (hasSqlString(value)) return String(value.toSqlString());
      if (!(stringifyObjects === void 0 || stringifyObjects === null))
        return escapeString(String(value));
      if (isRecord(value)) return objectToValues(value, timezone);
      return escapeString(String(value));
    }
    case "string":
      return escapeString(value);
    default:
      return escapeString(String(value));
  }
};
const format = (sql, values, stringifyObjects, timezone) => {
  if (values === void 0 || values === null) return sql;
  const valuesArray = Array.isArray(values) ? values : [values];
  const length = valuesArray.length;
  let setIndex = -2;
  let result = "";
  let chunkIndex = 0;
  let valuesIndex = 0;
  let placeholderPosition = findNextPlaceholder(sql, 0);
  while (valuesIndex < length && placeholderPosition !== -1) {
    let placeholderEnd = placeholderPosition + 1;
    let escapedValue;
    while (sql.charCodeAt(placeholderEnd) === 63) placeholderEnd++;
    const placeholderLength = placeholderEnd - placeholderPosition;
    const currentValue = valuesArray[valuesIndex];
    if (placeholderLength > 2) {
      placeholderPosition = findNextPlaceholder(sql, placeholderEnd);
      continue;
    }
    if (placeholderLength === 2) escapedValue = escapeId(currentValue);
    else if (typeof currentValue === "number") escapedValue = `${currentValue}`;
    else if (typeof currentValue === "object" && currentValue !== null && !stringifyObjects) {
      if (setIndex === -2) setIndex = findSetKeyword(sql);
      if (setIndex !== -1 && setIndex <= placeholderPosition && hasOnlyWhitespaceBetween(sql, setIndex, placeholderPosition) && !hasSqlString(currentValue) && !Array.isArray(currentValue) && !Buffer.isBuffer(currentValue) && !(currentValue instanceof Uint8Array) && !isDate(currentValue) && isRecord(currentValue)) {
        escapedValue = objectToValues(currentValue, timezone);
        setIndex = findSetKeyword(sql, placeholderEnd);
      } else escapedValue = escape(currentValue, true, timezone);
    } else escapedValue = escape(currentValue, stringifyObjects, timezone);
    result += sql.slice(chunkIndex, placeholderPosition);
    result += escapedValue;
    chunkIndex = placeholderEnd;
    valuesIndex++;
    placeholderPosition = findNextPlaceholder(sql, placeholderEnd);
  }
  if (chunkIndex === 0) return sql;
  if (chunkIndex < sql.length) return result + sql.slice(chunkIndex);
  return result;
};
const raw = (sql) => {
  if (typeof sql !== "string")
    throw new TypeError("argument sql must be a string");
  return {
    toSqlString: () => sql
  };
};
export {
  arrayToList,
  bufferToString,
  dateToString,
  escape,
  escapeId,
  format,
  objectToValues,
  raw
};

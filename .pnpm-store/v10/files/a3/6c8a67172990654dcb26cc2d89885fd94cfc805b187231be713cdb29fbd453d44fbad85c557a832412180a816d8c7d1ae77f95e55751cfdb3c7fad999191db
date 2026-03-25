"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWidthLimitedColumnsArray = exports.createHeaderAsRow = exports.renderTableHorizontalBorders = exports.findLenOfColumn = exports.createRow = exports.createColumFromOnlyName = exports.createTableHorizontalBorders = exports.convertRawRowOptionsToStandard = exports.cellText = void 0;
const console_utils_1 = require("./console-utils");
const string_utils_1 = require("./string-utils");
const table_constants_1 = require("./table-constants");
const max = (a, b) => Math.max(a, b);
// takes any input that is given by user and converts to string
const cellText = (text) => text === undefined || text === null ? '' : `${text}`;
exports.cellText = cellText;
const convertRawRowOptionsToStandard = (options) => {
    if (options) {
        return {
            color: options.color,
            separator: options.separator || table_constants_1.DEFAULT_ROW_SEPARATOR,
        };
    }
    return undefined;
};
exports.convertRawRowOptionsToStandard = convertRawRowOptionsToStandard;
const createTableHorizontalBorders = ({ left, mid, right, other, }, column_lengths) => {
    // ╚
    let ret = left;
    // ╚═══════╩═══════════════════════════════════════╩════════╩
    column_lengths.forEach((len) => {
        ret += other.repeat(len + 2);
        ret += mid;
    });
    // ╚═══════╩═══════════════════════════════════════╩════════
    ret = ret.slice(0, -mid.length);
    // ╚═══════╩═══════════════════════════════════════╩════════╝
    ret += right;
    return ret;
};
exports.createTableHorizontalBorders = createTableHorizontalBorders;
const createColumFromOnlyName = (name) => ({
    name,
    title: name,
});
exports.createColumFromOnlyName = createColumFromOnlyName;
const createRow = (color, text, separator) => ({
    color,
    separator,
    text,
});
exports.createRow = createRow;
const findLenOfColumn = (column, rows, charLength) => {
    const columnId = column.name;
    const columnTitle = column.title;
    let length = max(0, (column === null || column === void 0 ? void 0 : column.minLen) || 0);
    if (column.maxLen) {
        // if customer input is mentioned a max width, lets see if all other can fit here
        // if others cant fit find the max word length so that at least the table can be printed
        length = max(length, max(column.maxLen, (0, string_utils_1.biggestWordInSentence)(columnTitle, charLength)));
        length = rows.reduce((acc, row) => max(acc, (0, string_utils_1.biggestWordInSentence)((0, exports.cellText)(row.text[columnId]), charLength)), length);
        return length;
    }
    length = max(length, (0, console_utils_1.findWidthInConsole)(columnTitle, charLength));
    rows.forEach((row) => {
        length = max(length, (0, console_utils_1.findWidthInConsole)((0, exports.cellText)(row.text[columnId]), charLength));
    });
    return length;
};
exports.findLenOfColumn = findLenOfColumn;
const renderTableHorizontalBorders = (style, column_lengths) => {
    const str = (0, exports.createTableHorizontalBorders)(style, column_lengths);
    return str;
};
exports.renderTableHorizontalBorders = renderTableHorizontalBorders;
const createHeaderAsRow = (createRowFn, columns) => {
    const headerColor = table_constants_1.DEFAULT_HEADER_FONT_COLOR;
    const row = createRowFn(headerColor, {}, false);
    columns.forEach((column) => {
        row.text[column.name] = column.title;
    });
    return row;
};
exports.createHeaderAsRow = createHeaderAsRow;
// { col1: ['How', 'Is', 'Going'], col2: ['I am', 'Tom'],  }
const getWidthLimitedColumnsArray = (columns, row, charLength) => {
    const ret = {};
    columns.forEach((column) => {
        ret[column.name] = (0, string_utils_1.splitTextIntoTextsOfMinLen)((0, exports.cellText)(row.text[column.name]), column.length || table_constants_1.DEFAULT_COLUMN_LEN, charLength);
    });
    return ret;
};
exports.getWidthLimitedColumnsArray = getWidthLimitedColumnsArray;

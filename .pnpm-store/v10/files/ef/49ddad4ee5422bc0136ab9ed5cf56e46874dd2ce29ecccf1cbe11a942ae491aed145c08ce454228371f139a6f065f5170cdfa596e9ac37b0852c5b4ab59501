"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWidthLimitedColumnsArray = exports.createHeaderAsRow = exports.renderTableHorizontalBorders = exports.findLenOfColumn = exports.createRow = exports.createColumFromOnlyName = exports.createTableHorizontalBorders = exports.convertRawRowOptionsToStandard = exports.evaluateCellText = exports.cellText = void 0;
const console_utils_1 = require("./console-utils");
const string_utils_1 = require("./string-utils");
const table_constants_1 = require("./table-constants");
const max = (a, b) => Math.max(a, b);
// takes any input that is given by user and converts to string
const cellText = (text) => text === undefined || text === null ? '' : `${text}`;
exports.cellText = cellText;
// evaluate cell text with defined transform
const evaluateCellText = (text, transform) => (transform ? `${transform(text)}` : (0, exports.cellText)(text));
exports.evaluateCellText = evaluateCellText;
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
// ({ left: "╚", mid: "╩", right: "╝", other: "═" }, [5, 10, 7]) => "╚═══════╩════════════╩═════════╝"
const createTableHorizontalBorders = ({ left, mid, right, other }, column_lengths) => {
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
// ("id") => { name: "id", title: "id" }
const createColumFromOnlyName = (name) => ({
    name,
    title: name,
});
exports.createColumFromOnlyName = createColumFromOnlyName;
// ("green", { id: 1, name: "John" }, true) => { color: "green", separator: true, text: { id: 1, name: "John" } }
const createRow = (color, text, separator) => ({
    color,
    separator,
    text,
});
exports.createRow = createRow;
// ({ name: "id", title: "ID", minLen: 2 }, [{ text: { id: 1 } }, { text: { id: 100 } }]) => 3
// Calculates optimal column width based on content and constraints
const findLenOfColumn = (column, rows, charLength) => {
    const columnId = column.name;
    const columnTitle = column.title;
    const datatransform = column.transform;
    let length = max(0, (column === null || column === void 0 ? void 0 : column.minLen) || 0);
    if (column.maxLen) {
        // if customer input is mentioned a max width, lets see if all other can fit here
        // if others cant fit find the max word length so that at least the table can be printed
        length = max(length, max(column.maxLen, (0, string_utils_1.biggestWordInSentence)(columnTitle, charLength)));
        length = rows.reduce((acc, row) => max(acc, (0, string_utils_1.biggestWordInSentence)((0, exports.evaluateCellText)(row.text[columnId], datatransform), charLength)), length);
        return length;
    }
    length = max(length, (0, console_utils_1.findWidthInConsole)(columnTitle, charLength));
    rows.forEach((row) => {
        length = max(length, (0, console_utils_1.findWidthInConsole)((0, exports.evaluateCellText)(row.text[columnId], datatransform), charLength));
    });
    return length;
};
exports.findLenOfColumn = findLenOfColumn;
// ({ left: "╚", mid: "╩", right: "╝", other: "═" }, [5, 10, 7]) => "╚═══════╩════════════╩═════════╝"
// (undefined, [5, 10, 7]) => ""
const renderTableHorizontalBorders = (style, column_lengths) => {
    const str = (0, exports.createTableHorizontalBorders)(style, column_lengths);
    return str;
};
exports.renderTableHorizontalBorders = renderTableHorizontalBorders;
// (createRow, [{ name: "id", title: "ID" }, { name: "name", title: "Name" }]) =>
// { color: "white_bold", separator: false, text: { id: "ID", name: "Name" } }
const createHeaderAsRow = (createRowFn, columns) => {
    const headerColor = table_constants_1.DEFAULT_HEADER_FONT_COLOR;
    const row = createRowFn(headerColor, {}, false);
    columns.forEach((column) => {
        row.text[column.name] = column.title;
    });
    return row;
};
exports.createHeaderAsRow = createHeaderAsRow;
// ([{ name: "desc", length: 10 }], { text: { desc: "This is a long description" } })
// => { desc: ["This is a", "long", "description"] }
const getWidthLimitedColumnsArray = (columns, row, charLength) => {
    const ret = {};
    columns.forEach((column) => {
        ret[column.name] = (0, string_utils_1.splitTextIntoTextsOfMinLen)((0, exports.cellText)(row.text[column.name]), column.length || table_constants_1.DEFAULT_COLUMN_LEN, charLength);
    });
    return ret;
};
exports.getWidthLimitedColumnsArray = getWidthLimitedColumnsArray;

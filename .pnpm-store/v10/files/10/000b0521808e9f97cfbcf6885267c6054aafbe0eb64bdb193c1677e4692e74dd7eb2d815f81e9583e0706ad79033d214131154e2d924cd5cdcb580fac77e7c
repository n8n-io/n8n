"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printSimpleTable = exports.renderSimpleTable = exports.renderTable = void 0;
const colored_console_line_1 = __importDefault(require("../utils/colored-console-line"));
const string_utils_1 = require("../utils/string-utils");
const table_constants_1 = require("../utils/table-constants");
const table_helpers_1 = require("../utils/table-helpers");
const internal_table_1 = __importDefault(require("./internal-table"));
const table_pre_processors_1 = require("./table-pre-processors");
// ║ Index ║         ║        ║
const renderOneLine = (tableStyle, columns, currentLineIndex, widthLimitedColumnsArray, isHeader, row, colorMap, charLength) => {
    const line = new colored_console_line_1.default(colorMap);
    line.addCharsWithColor('', tableStyle.vertical); // dont Color the Column borders
    columns.forEach((column) => {
        const thisLineHasText = currentLineIndex < widthLimitedColumnsArray[column.name].length;
        const textForThisLine = thisLineHasText
            ? (0, table_helpers_1.cellText)(widthLimitedColumnsArray[column.name][currentLineIndex])
            : '';
        line.addCharsWithColor(table_constants_1.DEFAULT_ROW_FONT_COLOR, ' ');
        line.addCharsWithColor((isHeader && table_constants_1.DEFAULT_HEADER_FONT_COLOR) || column.color || row.color, (0, string_utils_1.textWithPadding)(textForThisLine, column.alignment || table_constants_1.DEFAULT_ROW_ALIGNMENT, column.length || table_constants_1.DEFAULT_COLUMN_LEN, charLength));
        line.addCharsWithColor('', ` ${tableStyle.vertical}`); // dont Color the Column borders
    });
    return line.renderConsole();
};
// ║ Bold  ║    text ║  value ║
// ║ Index ║         ║        ║
const renderWidthLimitedLines = (tableStyle, columns, row, colorMap, isHeader, charLength) => {
    // { col1: ['How', 'Is', 'Going'], col2: ['I am', 'Tom'],  }
    const widthLimitedColumnsArray = (0, table_helpers_1.getWidthLimitedColumnsArray)(columns, row, charLength);
    const totalLines = Object.values(widthLimitedColumnsArray).reduce((a, b) => Math.max(a, b.length), 0);
    const ret = [];
    for (let currentLineIndex = 0; currentLineIndex < totalLines; currentLineIndex += 1) {
        const singleLine = renderOneLine(tableStyle, columns, currentLineIndex, widthLimitedColumnsArray, isHeader, row, colorMap, charLength);
        ret.push(singleLine);
    }
    return ret;
};
const transformRow = (row, columns) => {
    const transformedRow = JSON.parse(JSON.stringify(row));
    const transforms = {};
    columns
        .filter((c) => {
        return !!c.transform;
    })
        .forEach((c) => {
        transforms[c.name] = c.transform;
    });
    Object.keys(transforms).forEach((t) => {
        transformedRow.text[t] = transforms[t](transformedRow.text[t]);
    });
    return transformedRow;
};
// ║ 1     ║     I would like some red wine please ║ 10.212 ║
const renderRow = (table, row) => {
    let ret = [];
    const transformedRow = transformRow(row, table.columns);
    ret = ret.concat(renderWidthLimitedLines(table.tableStyle, table.columns, transformedRow, table.colorMap, undefined, table.charLength));
    return ret;
};
/*
                  The analysis Result
 ╔═══════╦═══════════════════════════════════════╦════════╗
*/
const renderTableTitle = (table) => {
    const ret = [];
    if (table.title === undefined) {
        return ret;
    }
    const getTableWidth = () => {
        const reducer = (accumulator, currentValue) => 
        // ║ cell ║, 2 spaces + cellTextSize + one border on the left
        accumulator + currentValue + 2 + 1;
        return table.columns
            .map((m) => m.length || table_constants_1.DEFAULT_COLUMN_LEN)
            .reduce(reducer, 1);
    };
    const titleWithPadding = (0, string_utils_1.textWithPadding)(table.title, table_constants_1.DEFAULT_HEADER_ALIGNMENT, getTableWidth());
    const styledText = new colored_console_line_1.default(table.colorMap);
    styledText.addCharsWithColor(table_constants_1.DEFAULT_HEADER_FONT_COLOR, titleWithPadding);
    //                  The analysis Result
    ret.push(styledText.renderConsole());
    return ret;
};
/*
 ╔═══════╦═══════════════════════════════════════╦════════╗
 ║ index ║                                  text ║  value ║
 ╟═══════╬═══════════════════════════════════════╬════════╢
*/
const renderTableHeaders = (table) => {
    let ret = [];
    // ╔═══════╦═══════════════════════════════════════╦════════╗
    ret.push((0, table_helpers_1.renderTableHorizontalBorders)(table.tableStyle.headerTop, table.columns.map((m) => m.length || table_constants_1.DEFAULT_COLUMN_LEN)));
    // ║ index ║                                  text ║  value ║
    const row = (0, table_helpers_1.createHeaderAsRow)(table_helpers_1.createRow, table.columns);
    ret = ret.concat(renderWidthLimitedLines(table.tableStyle, table.columns, row, table.colorMap, true));
    // ╟═══════╬═══════════════════════════════════════╬════════╢
    ret.push((0, table_helpers_1.renderTableHorizontalBorders)(table.tableStyle.headerBottom, table.columns.map((m) => m.length || table_constants_1.DEFAULT_COLUMN_LEN)));
    return ret;
};
const renderTableEnding = (table) => {
    const ret = [];
    // ╚═══════╩═══════════════════════════════════════╩════════╝
    ret.push((0, table_helpers_1.renderTableHorizontalBorders)(table.tableStyle.tableBottom, table.columns.map((m) => m.length || table_constants_1.DEFAULT_COLUMN_LEN)));
    return ret;
};
const renderRowSeparator = (table, row) => {
    const ret = [];
    const lastRowIndex = table.rows.length - 1;
    const currentRowIndex = table.rows.indexOf(row);
    if (currentRowIndex !== lastRowIndex && row.separator) {
        // ╟═══════╬═══════════════════════════════════════╬════════╢
        ret.push((0, table_helpers_1.renderTableHorizontalBorders)(table.tableStyle.rowSeparator, table.columns.map((m) => m.length || table_constants_1.DEFAULT_COLUMN_LEN)));
    }
    return ret;
};
const renderTable = (table) => {
    (0, table_pre_processors_1.preProcessColumns)(table); // enable / disable cols, find maxLn of each col/ computed Columns
    (0, table_pre_processors_1.preProcessRows)(table); // sort and filter
    const ret = [];
    renderTableTitle(table).forEach((row) => ret.push(row));
    renderTableHeaders(table).forEach((row) => ret.push(row));
    table.rows.forEach((row) => {
        renderRow(table, row).forEach((row_) => ret.push(row_));
        renderRowSeparator(table, row).forEach((row_) => ret.push(row_));
    });
    renderTableEnding(table).forEach((row) => ret.push(row));
    return ret.join('\n');
};
exports.renderTable = renderTable;
const renderSimpleTable = (rows, tableOptions) => {
    const table = new internal_table_1.default(tableOptions);
    table.addRows(rows);
    return (0, exports.renderTable)(table);
};
exports.renderSimpleTable = renderSimpleTable;
const printSimpleTable = (rows, tableOptions) => {
    console.log((0, exports.renderSimpleTable)(rows, tableOptions));
};
exports.printSimpleTable = printSimpleTable;

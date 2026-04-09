"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colored_console_line_1 = require("../utils/colored-console-line");
const table_constants_1 = require("../utils/table-constants");
const table_helpers_1 = require("../utils/table-helpers");
const input_converter_1 = require("./input-converter");
const internal_table_printer_1 = require("./internal-table-printer");
const DEFAULT_ROW_SORT_FUNC = () => 0;
const DEFAULT_ROW_FILTER_FUNC = () => true;
class TableInternal {
    initSimple(columns) {
        this.columns = columns.map((column) => ({
            name: column,
            title: column,
            alignment: table_constants_1.DEFAULT_ROW_ALIGNMENT,
        }));
    }
    initDetailed(options) {
        var _a;
        this.title = (options === null || options === void 0 ? void 0 : options.title) || this.title;
        this.tableStyle = Object.assign(Object.assign({}, this.tableStyle), options === null || options === void 0 ? void 0 : options.style);
        this.sortFunction = (options === null || options === void 0 ? void 0 : options.sort) || this.sortFunction;
        this.filterFunction = (options === null || options === void 0 ? void 0 : options.filter) || this.filterFunction;
        this.enabledColumns = (options === null || options === void 0 ? void 0 : options.enabledColumns) || this.enabledColumns;
        this.disabledColumns = (options === null || options === void 0 ? void 0 : options.disabledColumns) || this.disabledColumns;
        this.computedColumns = (options === null || options === void 0 ? void 0 : options.computedColumns) || this.computedColumns;
        this.columns =
            ((_a = options === null || options === void 0 ? void 0 : options.columns) === null || _a === void 0 ? void 0 : _a.map((column) => (0, input_converter_1.rawColumnToInternalColumn)(column, options === null || options === void 0 ? void 0 : options.defaultColumnOptions))) || this.columns;
        this.rowSeparator = (options === null || options === void 0 ? void 0 : options.rowSeparator) || this.rowSeparator;
        this.charLength = (options === null || options === void 0 ? void 0 : options.charLength) || this.charLength;
        this.defaultColumnOptions =
            (options === null || options === void 0 ? void 0 : options.defaultColumnOptions) || this.defaultColumnOptions;
        if (options === null || options === void 0 ? void 0 : options.shouldDisableColors) {
            this.colorMap = {};
        }
        else if (options === null || options === void 0 ? void 0 : options.colorMap) {
            this.colorMap = Object.assign(Object.assign({}, this.colorMap), options.colorMap);
        }
        if (options.rows !== undefined) {
            this.addRows(options.rows);
        }
    }
    constructor(options) {
        // default construction
        this.rows = [];
        this.columns = [];
        this.title = undefined;
        this.tableStyle = table_constants_1.DEFAULT_TABLE_STYLE;
        this.filterFunction = DEFAULT_ROW_FILTER_FUNC;
        this.sortFunction = DEFAULT_ROW_SORT_FUNC;
        this.enabledColumns = [];
        this.disabledColumns = [];
        this.computedColumns = [];
        this.rowSeparator = table_constants_1.DEFAULT_ROW_SEPARATOR;
        this.colorMap = colored_console_line_1.DEFAULT_COLOR_MAP;
        this.charLength = {};
        this.defaultColumnOptions = undefined;
        this.transforms = {};
        if (options instanceof Array) {
            this.initSimple(options);
        }
        else if (typeof options === 'object') {
            this.initDetailed(options);
        }
    }
    createColumnFromRow(text) {
        const colNames = this.columns.map((col) => col.name);
        Object.keys(text).forEach((key) => {
            if (!colNames.includes(key)) {
                this.columns.push((0, input_converter_1.rawColumnToInternalColumn)((0, table_helpers_1.createColumFromOnlyName)(key), this.defaultColumnOptions));
            }
        });
    }
    addColumn(textOrObj) {
        const columnOptionsFromInput = typeof textOrObj === 'string'
            ? (0, table_helpers_1.createColumFromOnlyName)(textOrObj)
            : textOrObj;
        this.columns.push((0, input_converter_1.rawColumnToInternalColumn)(columnOptionsFromInput, this.defaultColumnOptions));
    }
    addColumns(toBeInsertedColumns) {
        toBeInsertedColumns.forEach((toBeInsertedColumn) => {
            this.addColumn(toBeInsertedColumn);
        });
    }
    addRow(text, options) {
        this.createColumnFromRow(text);
        this.rows.push((0, table_helpers_1.createRow)((options === null || options === void 0 ? void 0 : options.color) || table_constants_1.DEFAULT_ROW_FONT_COLOR, text, (options === null || options === void 0 ? void 0 : options.separator) !== undefined
            ? options === null || options === void 0 ? void 0 : options.separator
            : this.rowSeparator));
    }
    addRows(toBeInsertedRows, options) {
        toBeInsertedRows.forEach((toBeInsertedRow) => {
            this.addRow(toBeInsertedRow, options);
        });
    }
    renderTable() {
        return (0, internal_table_printer_1.renderTable)(this);
    }
}
exports.default = TableInternal;

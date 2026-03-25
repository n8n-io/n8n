"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const internal_table_1 = __importDefault(require("./internalTable/internal-table"));
const table_helpers_1 = require("./utils/table-helpers");
class Table {
    constructor(options) {
        this.table = new internal_table_1.default(options);
    }
    addColumn(column) {
        this.table.addColumn(column);
        return this;
    }
    addColumns(columns) {
        this.table.addColumns(columns);
        return this;
    }
    addRow(text, rowOptions) {
        this.table.addRow(text, (0, table_helpers_1.convertRawRowOptionsToStandard)(rowOptions));
        return this;
    }
    addRows(toBeInsertedRows, rowOptions) {
        this.table.addRows(toBeInsertedRows, (0, table_helpers_1.convertRawRowOptionsToStandard)(rowOptions));
        return this;
    }
    printTable() {
        const tableRendered = this.table.renderTable();
        console.log(tableRendered);
    }
    render() {
        return this.table.renderTable();
    }
}
exports.default = Table;

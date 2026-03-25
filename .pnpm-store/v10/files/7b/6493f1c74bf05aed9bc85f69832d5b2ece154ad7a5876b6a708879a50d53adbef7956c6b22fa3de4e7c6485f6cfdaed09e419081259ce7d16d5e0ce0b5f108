"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const chalk_1 = __importDefault(require("chalk"));
const format_1 = __importDefault(require("date-fns/format"));
const lodash_1 = __importDefault(require("lodash"));
const Rx = __importStar(require("rxjs"));
const defaults = __importStar(require("./defaults"));
class Logger {
    constructor({ hide, prefixFormat, prefixLength, raw = false, timestampFormat, }) {
        /**
         * Observable that emits when there's been output logged.
         * If `command` is is `undefined`, then the log is for a global event.
         */
        this.output = new Rx.Subject();
        // To avoid empty strings from hiding the output of commands that don't have a name,
        // keep in the list of commands to hide only strings with some length.
        // This might happen through the CLI when no `--hide` argument is specified, for example.
        this.hide = lodash_1.default.castArray(hide)
            .filter((name) => name || name === 0)
            .map(String);
        this.raw = raw;
        this.prefixFormat = prefixFormat;
        this.prefixLength = prefixLength || defaults.prefixLength;
        this.timestampFormat = timestampFormat || defaults.timestampFormat;
    }
    shortenText(text) {
        if (!text || text.length <= this.prefixLength) {
            return text;
        }
        const ellipsis = '..';
        const prefixLength = this.prefixLength - ellipsis.length;
        const endLength = Math.floor(prefixLength / 2);
        const beginningLength = prefixLength - endLength;
        const beginnning = text.slice(0, beginningLength);
        const end = text.slice(text.length - endLength, text.length);
        return beginnning + ellipsis + end;
    }
    getPrefixesFor(command) {
        return {
            pid: String(command.pid),
            index: String(command.index),
            name: command.name,
            command: this.shortenText(command.command),
            time: (0, format_1.default)(Date.now(), this.timestampFormat),
        };
    }
    getPrefix(command) {
        const prefix = this.prefixFormat || (command.name ? 'name' : 'index');
        if (prefix === 'none') {
            return '';
        }
        const prefixes = this.getPrefixesFor(command);
        if (Object.keys(prefixes).includes(prefix)) {
            return `[${prefixes[prefix]}]`;
        }
        return lodash_1.default.reduce(prefixes, (prev, val, key) => {
            const keyRegex = new RegExp(lodash_1.default.escapeRegExp(`{${key}}`), 'g');
            return prev.replace(keyRegex, String(val));
        }, prefix);
    }
    colorText(command, text) {
        let color;
        if (command.prefixColor && command.prefixColor.startsWith('#')) {
            color = chalk_1.default.hex(command.prefixColor);
        }
        else {
            const defaultColor = lodash_1.default.get(chalk_1.default, defaults.prefixColors, chalk_1.default.reset);
            color = lodash_1.default.get(chalk_1.default, command.prefixColor ?? '', defaultColor);
        }
        return color(text);
    }
    /**
     * Logs an event for a command (e.g. start, stop).
     *
     * If raw mode is on, then nothing is logged.
     */
    logCommandEvent(text, command) {
        if (this.raw) {
            return;
        }
        this.logCommandText(chalk_1.default.reset(text) + '\n', command);
    }
    logCommandText(text, command) {
        if (this.hide.includes(String(command.index)) || this.hide.includes(command.name)) {
            return;
        }
        const prefix = this.colorText(command, this.getPrefix(command));
        return this.log(prefix + (prefix ? ' ' : ''), text, command);
    }
    /**
     * Logs a global event (e.g. sending signals to processes).
     *
     * If raw mode is on, then nothing is logged.
     */
    logGlobalEvent(text) {
        if (this.raw) {
            return;
        }
        this.log(chalk_1.default.reset('-->') + ' ', chalk_1.default.reset(text) + '\n');
    }
    /**
     * Logs a table from an input object array, like `console.table`.
     *
     * Each row is a single input item, and they are presented in the input order.
     */
    logTable(tableContents) {
        // For now, can only print array tables with some content.
        if (this.raw || !Array.isArray(tableContents) || !tableContents.length) {
            return;
        }
        let nextColIndex = 0;
        const headers = {};
        const contentRows = tableContents.map((row) => {
            const rowContents = [];
            Object.keys(row).forEach((col) => {
                if (!headers[col]) {
                    headers[col] = {
                        index: nextColIndex++,
                        length: col.length,
                    };
                }
                const colIndex = headers[col].index;
                const formattedValue = String(row[col] == null ? '' : row[col]);
                // Update the column length in case this rows value is longer than the previous length for the column.
                headers[col].length = Math.max(formattedValue.length, headers[col].length);
                rowContents[colIndex] = formattedValue;
                return rowContents;
            });
            return rowContents;
        });
        const headersFormatted = Object.keys(headers).map((header) => header.padEnd(headers[header].length, ' '));
        if (!headersFormatted.length) {
            // No columns exist.
            return;
        }
        const borderRowFormatted = headersFormatted.map((header) => '─'.padEnd(header.length, '─'));
        this.logGlobalEvent(`┌─${borderRowFormatted.join('─┬─')}─┐`);
        this.logGlobalEvent(`│ ${headersFormatted.join(' │ ')} │`);
        this.logGlobalEvent(`├─${borderRowFormatted.join('─┼─')}─┤`);
        contentRows.forEach((contentRow) => {
            const contentRowFormatted = headersFormatted.map((header, colIndex) => {
                // If the table was expanded after this row was processed, it won't have this column.
                // Use an empty string in this case.
                const col = contentRow[colIndex] || '';
                return col.padEnd(header.length, ' ');
            });
            this.logGlobalEvent(`│ ${contentRowFormatted.join(' │ ')} │`);
        });
        this.logGlobalEvent(`└─${borderRowFormatted.join('─┴─')}─┘`);
    }
    log(prefix, text, command) {
        if (this.raw) {
            return this.emit(command, text);
        }
        // #70 - replace some ANSI code that would impact clearing lines
        text = text.replace(/\u2026/g, '...');
        const lines = text.split('\n').map((line, index, lines) => {
            // First line will write prefix only if we finished the last write with a LF.
            // Last line won't write prefix because it should be empty.
            if (index === 0 || index === lines.length - 1) {
                return line;
            }
            return prefix + line;
        });
        if (!this.lastChar || this.lastChar === '\n') {
            this.emit(command, prefix);
        }
        this.lastChar = text[text.length - 1];
        this.emit(command, lines.join('\n'));
    }
    emit(command, text) {
        this.output.next({ command, text });
    }
}
exports.Logger = Logger;

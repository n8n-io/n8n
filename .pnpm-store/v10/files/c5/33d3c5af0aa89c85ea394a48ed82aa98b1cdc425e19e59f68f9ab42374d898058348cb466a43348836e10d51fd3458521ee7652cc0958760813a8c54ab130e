"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliui = exports.UI = void 0;
const index_js_1 = require("./string-width/index.js");
const index_js_2 = require("./strip-ansi/index.js");
const index_js_3 = require("./wrap-ansi/index.js");
const align = {
    right: (str, width) => `${' '.repeat(Math.max(0, width - (0, index_js_1.stringWidth)(str)))}${str}`,
    center: (str, width) => `${' '.repeat(Math.max(0, width - (0, index_js_1.stringWidth)(str)) >> 1)}${str}`,
};
const top = 0;
const right = 1;
const bottom = 2;
const left = 3;
class UI {
    width;
    wrap;
    rows;
    constructor(opts) {
        this.width = opts.width;
        /* c8 ignore start */
        this.wrap = opts.wrap ?? true;
        /* c8 ignore stop */
        this.rows = [];
    }
    span(...args) {
        const cols = this.div(...args);
        cols.span = true;
    }
    resetOutput() {
        this.rows = [];
    }
    div(...args) {
        if (args.length === 0) {
            this.div('');
        }
        if (this.wrap &&
            this.shouldApplyLayoutDSL(...args) &&
            typeof args[0] === 'string') {
            return this.applyLayoutDSL(args[0]);
        }
        const cols = Object.assign(args.map(arg => {
            if (typeof arg === 'string') {
                return this.colFromString(arg);
            }
            return arg;
        }), { span: false });
        this.rows.push(cols);
        return cols;
    }
    shouldApplyLayoutDSL(...args) {
        return (args.length === 1 &&
            typeof args[0] === 'string' &&
            /[\t\n]/.test(args[0]));
    }
    applyLayoutDSL(str) {
        const rows = str.split('\n').map(row => row.split('\t'));
        let leftColumnWidth = 0;
        // simple heuristic for layout, make sure the
        // second column lines up along the left-hand.
        // don't allow the first column to take up more
        // than 50% of the screen.
        rows.forEach(columns => {
            if (columns.length > 1 &&
                (0, index_js_1.stringWidth)(String(columns[0])) > leftColumnWidth) {
                leftColumnWidth = Math.min(Math.floor(this.width * 0.5), (0, index_js_1.stringWidth)(String(columns[0])));
            }
        });
        // generate a table:
        //  replacing ' ' with padding calculations.
        //  using the algorithmically generated width.
        rows.forEach(columns => {
            this.div(...columns.map((r, i) => {
                return {
                    text: r.trim(),
                    padding: this.measurePadding(r),
                    width: i === 0 && columns.length > 1 ? leftColumnWidth : undefined,
                };
            }));
        });
        const row = this.rows[this.rows.length - 1];
        /* c8 ignore start */
        if (!row) {
            throw new Error('no rows found');
        }
        /* c8 ignore stop */
        return row;
    }
    colFromString(text) {
        return {
            text,
            padding: this.measurePadding(text),
        };
    }
    measurePadding(str) {
        // measure padding without ansi escape codes
        const noAnsi = (0, index_js_2.stripAnsi)(str);
        const [right = '', left = ''] = [
            noAnsi.match(/\s*$/)?.[0],
            noAnsi.match(/^\s*/)?.[0],
        ];
        return [0, right.length, 0, left.length];
    }
    toString() {
        const lines = [];
        this.rows.forEach(row => {
            this.rowToString(row, lines);
        });
        // don't display any lines with the
        // hidden flag set.
        return lines
            .filter(line => !line.hidden)
            .map(line => line.text)
            .join('\n');
    }
    rowToString(row, lines) {
        this.rasterize(row).forEach((rrow, r) => {
            let str = '';
            rrow.forEach((col, c) => {
                const column = row[c];
                const { width } = column; // the width with padding.
                const wrapWidth = this.negatePadding(column); // the width without padding.
                let ts = col; // temporary string used during alignment/padding.
                if (wrapWidth > (0, index_js_1.stringWidth)(col)) {
                    ts += ' '.repeat(wrapWidth - (0, index_js_1.stringWidth)(col));
                }
                // align the string within its column.
                if (column.align && column.align !== 'left' && this.wrap) {
                    const fn = align[column.align];
                    ts = fn(ts.trim(), wrapWidth);
                    if ((0, index_js_1.stringWidth)(ts) < wrapWidth) {
                        /* c8 ignore start */
                        const w = width || 0;
                        /* c8 ignore stop */
                        ts += ' '.repeat(w - (0, index_js_1.stringWidth)(ts) - 1);
                    }
                }
                // apply border and padding to string.
                const padding = column.padding || [0, 0, 0, 0];
                if (padding[left]) {
                    str += ' '.repeat(padding[left]);
                }
                str += addBorder(column, ts, '| ');
                str += ts;
                str += addBorder(column, ts, ' |');
                if (padding[right]) {
                    str += ' '.repeat(padding[right]);
                }
                // if prior row is span, try to render the
                // current row on the prior line.
                if (r === 0 && lines.length > 0) {
                    const lastLine = lines[lines.length - 1];
                    /* c8 ignore start */
                    if (!lastLine) {
                        throw new Error('last line not found');
                    }
                    /* c8 ignore stop */
                    str = this.renderInline(str, lastLine);
                }
            });
            // remove trailing whitespace.
            lines.push({
                text: str.replace(/ +$/, ''),
                span: row.span,
            });
        });
        return lines;
    }
    // if the full 'source' can render in
    // the target line, do so.
    renderInline(source, previousLine) {
        const match = source.match(/^ */);
        /* c8 ignore start */
        const leadingWhitespace = match ? match[0].length : 0;
        /* c8 ignore stop */
        const target = previousLine.text;
        const targetTextWidth = (0, index_js_1.stringWidth)(target.trimEnd());
        if (!previousLine.span) {
            return source;
        }
        // if we're not applying wrapping logic,
        // just always append to the span.
        if (!this.wrap) {
            previousLine.hidden = true;
            return target + source;
        }
        if (leadingWhitespace < targetTextWidth) {
            return source;
        }
        previousLine.hidden = true;
        return (target.trimEnd() +
            ' '.repeat(leadingWhitespace - targetTextWidth) +
            source.trimStart());
    }
    rasterize(row) {
        const rrows = [];
        const widths = this.columnWidths(row);
        let wrapped;
        // word wrap all columns, and create
        // a data-structure that is easy to rasterize.
        row.forEach((col, c) => {
            // leave room for left and right padding.
            col.width = widths[c];
            if (this.wrap) {
                wrapped = (0, index_js_3.wrap)(col.text, this.negatePadding(col), {
                    hard: true,
                }).split('\n');
            }
            else {
                wrapped = col.text.split('\n');
            }
            if (col.border) {
                wrapped.unshift('.' + '-'.repeat(this.negatePadding(col) + 2) + '.');
                wrapped.push("'" + '-'.repeat(this.negatePadding(col) + 2) + "'");
            }
            // add top and bottom padding.
            if (col.padding) {
                wrapped.unshift(...new Array(col.padding[top] || 0).fill(''));
                wrapped.push(...new Array(col.padding[bottom] || 0).fill(''));
            }
            wrapped.forEach((str, r) => {
                if (!rrows[r]) {
                    rrows.push([]);
                }
                /* c8 ignore start */
                const rrow = rrows[r] ?? [];
                /* c8 ignore stop */
                for (let i = 0; i < c; i++) {
                    if (rrow[i] === undefined) {
                        rrow.push('');
                    }
                }
                rrow.push(str);
            });
        });
        return rrows;
    }
    negatePadding(col) {
        /* c8 ignore start */
        let wrapWidth = col.width || 0;
        /* c8 ignore stop */
        if (col.padding) {
            wrapWidth -= (col.padding[left] || 0) + (col.padding[right] || 0);
        }
        if (col.border) {
            wrapWidth -= 4;
        }
        return wrapWidth;
    }
    columnWidths(row) {
        if (!this.wrap) {
            return row.map(col => {
                return col.width || (0, index_js_1.stringWidth)(col.text);
            });
        }
        let unset = row.length;
        let remainingWidth = this.width;
        // column widths can be set in config.
        const widths = row.map(col => {
            if (col.width) {
                unset--;
                remainingWidth -= col.width;
                return col.width;
            }
            return undefined;
        });
        // any unset widths should be calculated.
        /* c8 ignore start */
        const unsetWidth = unset ? Math.floor(remainingWidth / unset) : 0;
        /* c8 ignore stop */
        return widths.map((w, i) => {
            if (w === undefined) {
                /* c8 ignore start */
                const col = row[i] ?? { text: '', padding: [] };
                /* c8 ignore stop */
                return Math.max(unsetWidth, _minWidth(col));
            }
            return w;
        });
    }
}
exports.UI = UI;
const addBorder = (col, ts, style) => {
    if (col.border) {
        if (/[.']-+[.']/.test(ts)) {
            return '';
        }
        if (ts.trim().length !== 0) {
            return style;
        }
        return '  ';
    }
    return '';
};
// calculates the minimum width of
// a column, based on padding preferences.
const _minWidth = (col) => {
    const padding = col.padding || [];
    const minWidth = 1 + (padding[left] || 0) + (padding[right] || 0);
    if (col.border) {
        return minWidth + 4;
    }
    return minWidth;
};
const getWindowWidth = () => {
    /* c8 ignore start */
    if (typeof process === 'object' &&
        process.stdout &&
        process.stdout.columns) {
        return process.stdout.columns;
    }
    return 80;
};
/* c8 ignore stop */
const cliui = (opts = {}) => new UI({
    /* c8 ignore start */
    width: opts?.width || getWindowWidth(),
    wrap: opts?.wrap,
    /* c8 ignore stop */
});
exports.cliui = cliui;
//# sourceMappingURL=index.js.map
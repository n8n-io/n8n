"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const screen_1 = require("../screen");
const util_1 = require("../util/util");
const wordwrap = require('wordwrap');
function linewrap(length, s) {
    return wordwrap(length, screen_1.stdtermwidth, {
        skipScheme: 'ansi-color',
    })(s).trim();
}
function renderList(items) {
    if (items.length === 0) {
        return '';
    }
    const maxLength = (0, util_1.maxBy)(items, (item) => item[0].length)?.[0].length ?? 0;
    const lines = items.map((i) => {
        let left = i[0];
        let right = i[1];
        if (!right) {
            return left;
        }
        left = left.padEnd(maxLength);
        right = linewrap(maxLength + 2, right);
        return `${left}  ${right}`;
    });
    return lines.join('\n');
}
exports.default = renderList;

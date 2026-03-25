"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flagUsage = flagUsage;
exports.flagUsages = flagUsages;
const util_1 = require("../util/util");
const ux_1 = require("../ux");
function flagUsage(flag, options = {}) {
    const label = [];
    if (flag.helpLabel) {
        label.push(flag.helpLabel);
    }
    else {
        if (flag.char)
            label.push(`-${flag.char}`);
        if (flag.name)
            label.push(` --${flag.name}`);
    }
    const usage = flag.type === 'option' ? ` ${flag.name.toUpperCase()}` : '';
    let description = flag.summary || flag.description || '';
    if (options.displayRequired && flag.required)
        description = `(required) ${description}`;
    description = description ? (0, ux_1.colorize)('dim', description) : undefined;
    return [` ${label.join(',').trim()}${usage}`, description];
}
function flagUsages(flags, options = {}) {
    if (flags.length === 0)
        return [];
    return (0, util_1.sortBy)(flags, (f) => [f.char ? -1 : 1, f.char, f.name]).map((f) => flagUsage(f, options));
}

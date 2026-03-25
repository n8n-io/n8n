"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string = exports.url = exports.file = exports.directory = exports.integer = exports.boolean = exports.custom = void 0;
const node_url_1 = require("node:url");
const fs_1 = require("./util/fs");
const util_1 = require("./util/util");
function custom(defaults) {
    return (options = {}) => ({
        parse: async (i, _context, _opts) => i,
        ...defaults,
        ...options,
        input: [],
        type: 'option',
    });
}
exports.custom = custom;
exports.boolean = custom({
    parse: async (b) => Boolean(b) && (0, util_1.isNotFalsy)(b),
});
exports.integer = custom({
    async parse(input, _, opts) {
        if (!/^-?\d+$/.test(input))
            throw new Error(`Expected an integer but received: ${input}`);
        const num = Number.parseInt(input, 10);
        if (opts.min !== undefined && num < opts.min)
            throw new Error(`Expected an integer greater than or equal to ${opts.min} but received: ${input}`);
        if (opts.max !== undefined && num > opts.max)
            throw new Error(`Expected an integer less than or equal to ${opts.max} but received: ${input}`);
        return num;
    },
});
exports.directory = custom({
    async parse(input, _, opts) {
        if (opts.exists)
            return (0, fs_1.dirExists)(input);
        return input;
    },
});
exports.file = custom({
    async parse(input, _, opts) {
        if (opts.exists)
            return (0, fs_1.fileExists)(input);
        return input;
    },
});
/**
 * Initializes a string as a URL. Throws an error
 * if the string is not a valid URL.
 */
exports.url = custom({
    async parse(input) {
        try {
            return new node_url_1.URL(input);
        }
        catch {
            throw new Error(`Expected a valid url but received: ${input}`);
        }
    },
});
const stringArg = custom({});
exports.string = stringArg;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.help = exports.version = exports.string = exports.url = exports.file = exports.directory = exports.integer = void 0;
exports.custom = custom;
exports.boolean = boolean;
exports.option = option;
const node_url_1 = require("node:url");
const errors_1 = require("./errors");
const help_1 = require("./help");
const fs_1 = require("./util/fs");
function custom(defaults) {
    return (options = {}) => ({
        parse: async (input, _ctx, _opts) => input,
        ...defaults,
        ...options,
        input: [],
        multiple: Boolean(options.multiple === undefined ? (defaults?.multiple ?? false) : options.multiple),
        type: 'option',
    });
}
/**
 * A boolean flag. Defaults to `false` unless default is set to `true`.
 *
 * - `allowNo` option allows `--no-` prefix to negate boolean flag.
 */
function boolean(options = {}) {
    return {
        parse: async (b, _) => b,
        ...options,
        allowNo: Boolean(options.allowNo),
        type: 'boolean',
    };
}
/**
 * An integer flag. Throws an error if the provided value is not a valid integer.
 *
 * - `min` option allows to set a minimum value.
 * - `max` option allows to set a maximum value.
 */
exports.integer = custom({
    async parse(input, _, opts) {
        if (!/^-?\d+$/.test(input))
            throw new errors_1.CLIError(`Expected an integer but received: ${input}`);
        const num = Number.parseInt(input, 10);
        if (opts.min !== undefined && num < opts.min)
            throw new errors_1.CLIError(`Expected an integer greater than or equal to ${opts.min} but received: ${input}`);
        if (opts.max !== undefined && num > opts.max)
            throw new errors_1.CLIError(`Expected an integer less than or equal to ${opts.max} but received: ${input}`);
        return num;
    },
});
/**
 * A directory flag.
 *
 * - `exists` option allows you to throw an error if the directory does not exist.
 */
exports.directory = custom({
    async parse(input, _, opts) {
        if (opts.exists)
            return (0, fs_1.dirExists)(input);
        return input;
    },
});
/**
 * A file flag.
 *
 * - `exists` option allows you to throw an error if the file does not exist.
 */
exports.file = custom({
    async parse(input, _, opts) {
        if (opts.exists)
            return (0, fs_1.fileExists)(input);
        return input;
    },
});
/**
 * A URL flag that converts the provided value is a string.
 *
 * Throws an error if the string is not a valid URL.
 */
exports.url = custom({
    async parse(input) {
        try {
            return new node_url_1.URL(input);
        }
        catch {
            throw new errors_1.CLIError(`Expected a valid url but received: ${input}`);
        }
    },
});
/**
 * A string flag.
 */
exports.string = custom();
/**
 * Version flag that will print the CLI version and exit.
 */
const version = (opts = {}) => boolean({
    description: 'Show CLI version.',
    ...opts,
    async parse(_, ctx) {
        ctx.log(ctx.config.userAgent);
        ctx.exit(0);
    },
});
exports.version = version;
/**
 * A help flag that will print the CLI help and exit.
 */
const help = (opts = {}) => boolean({
    description: 'Show CLI help.',
    ...opts,
    async parse(_, cmd) {
        const Help = await (0, help_1.loadHelpClass)(cmd.config);
        await new Help(cmd.config, cmd.config.pjson.oclif.helpOptions ?? cmd.config.pjson.helpOptions).showHelp(cmd.id ? [cmd.id, ...cmd.argv] : cmd.argv);
        cmd.exit(0);
    },
});
exports.help = help;
function option(defaults) {
    return (options = {}) => ({
        parse: async (input, _ctx, _opts) => input,
        ...defaults,
        ...options,
        input: [],
        multiple: Boolean(options.multiple === undefined ? defaults.multiple : options.multiple),
        type: 'option',
    });
}

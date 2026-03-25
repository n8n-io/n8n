"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.flagUsages = void 0;
const parse_1 = require("./parse");
const validate_1 = require("./validate");
var help_1 = require("./help");
Object.defineProperty(exports, "flagUsages", { enumerable: true, get: function () { return help_1.flagUsages; } });
async function parse(argv, options) {
    const input = {
        '--': options['--'],
        args: (options.args ?? {}),
        argv,
        context: options.context,
        flags: (options.flags ?? {}),
        strict: options.strict !== false,
    };
    const parser = new parse_1.Parser(input);
    const output = await parser.parse();
    await (0, validate_1.validate)({ input, output });
    return output;
}
exports.parse = parse;

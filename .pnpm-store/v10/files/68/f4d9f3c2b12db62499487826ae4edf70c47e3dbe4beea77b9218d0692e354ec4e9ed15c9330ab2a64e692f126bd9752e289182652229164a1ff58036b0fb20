"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processArgv = processArgv;
const bs_logger_1 = require("bs-logger");
const yargs_parser_1 = __importDefault(require("yargs-parser"));
const utils_1 = require("../utils");
const VALID_COMMANDS = ['help', 'config:migrate', 'config:init'];
const logger = utils_1.rootLogger.child({ [bs_logger_1.LogContexts.namespace]: 'cli', [bs_logger_1.LogContexts.application]: 'ts-jest' });
async function cli(args) {
    const parsedArgv = (0, yargs_parser_1.default)(args, {
        boolean: ['dry-run', 'jest-preset', 'allow-js', 'diff', 'babel', 'force', 'jsdom'],
        string: ['tsconfig', 'js'],
        count: ['verbose'],
        alias: { verbose: ['v'] },
        default: { jestPreset: true, verbose: 0 },
        coerce: {
            js(val) {
                const res = val.trim().toLowerCase();
                if (!['babel', 'ts'].includes(res))
                    throw new Error(`The 'js' option must be 'babel' or 'ts', given: '${val}'.`);
                return res;
            },
        },
    });
    // deprecated
    if (parsedArgv.allowJs != null) {
        if (parsedArgv.js)
            throw new Error("The 'allowJs' and 'js' options cannot be set together.");
        parsedArgv.js = parsedArgv.allowJs ? 'ts' : undefined;
    }
    let command = parsedArgv._.shift();
    const isHelp = command === 'help';
    if (isHelp)
        command = parsedArgv._.shift();
    if (!VALID_COMMANDS.includes(command))
        command = 'help';
    const { run, help } = require(`./${command.replace(/:/g, '/')}`);
    const cmd = isHelp && command !== 'help' ? help : run;
    return cmd(parsedArgv, logger);
}
const errorHasMessage = (err) => {
    if (typeof err !== 'object' || err === null)
        return false;
    return 'message' in err;
};
/**
 * @internal
 */
async function processArgv() {
    try {
        await cli(process.argv.slice(2));
        process.exit(0);
    }
    catch (err) {
        if (errorHasMessage(err)) {
            logger.fatal(err.message);
            process.exit(1);
        }
    }
}

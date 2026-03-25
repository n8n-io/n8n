"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handle = exports.Exit = void 0;
const clean_stack_1 = __importDefault(require("clean-stack"));
const cache_1 = __importDefault(require("../cache"));
const index_1 = require("../help/index");
const logger_1 = require("../logger");
const cli_1 = require("./errors/cli");
const exit_1 = require("./errors/exit");
const pretty_print_1 = __importDefault(require("./errors/pretty-print"));
/**
 * This is an odd abstraction for process.exit, but it allows us to stub it in tests.
 *
 * https://github.com/sinonjs/sinon/issues/562
 */
exports.Exit = {
    exit(code = 0) {
        // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
        process.exit(code);
    },
};
async function handle(err) {
    try {
        if (!err)
            err = new cli_1.CLIError('no error?');
        if (err.message === 'SIGINT')
            exports.Exit.exit(1);
        const shouldPrint = !(err instanceof exit_1.ExitError) && !err.skipOclifErrorHandling;
        const pretty = (0, pretty_print_1.default)(err);
        const stack = (0, clean_stack_1.default)(err.stack || '', { pretty: true });
        if (shouldPrint) {
            console.error(pretty ?? stack);
            const config = cache_1.default.getInstance().get('config');
            if (err.showHelp && err.parse?.input?.argv && config) {
                const options = {
                    ...(config.pjson.oclif.helpOptions ?? config.pjson.helpOptions),
                    sections: ['flags', 'usage', 'arguments'],
                    sendToStderr: true,
                };
                const help = new index_1.Help(config, options);
                console.error();
                await help.showHelp(process.argv.slice(2));
            }
        }
        const exitCode = err.oclif?.exit ?? 1;
        if (err.code !== 'EEXIT' && stack) {
            (0, logger_1.getLogger)().error(stack);
        }
        exports.Exit.exit(exitCode);
    }
    catch (error) {
        console.error(err.stack);
        console.error(error.stack);
        exports.Exit.exit(1);
    }
}
exports.handle = handle;

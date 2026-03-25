"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionAddition = exports.helpAddition = void 0;
exports.run = run;
const node_url_1 = require("node:url");
const cache_1 = __importDefault(require("./cache"));
const config_1 = require("./config");
const help_1 = require("./help");
const logger_1 = require("./logger");
const performance_1 = require("./performance");
const symbols_1 = require("./symbols");
const ux_1 = require("./ux");
const helpAddition = (argv, config) => {
    if (argv.length === 0 && !config.isSingleCommandCLI)
        return true;
    const mergedHelpFlags = (0, help_1.getHelpFlagAdditions)(config);
    for (const arg of argv) {
        if (mergedHelpFlags.includes(arg))
            return true;
        if (arg === '--')
            return false;
    }
    return false;
};
exports.helpAddition = helpAddition;
const versionAddition = (argv, config) => {
    const additionalVersionFlags = config?.pjson.oclif.additionalVersionFlags ?? [];
    const mergedVersionFlags = [...new Set(['--version', ...additionalVersionFlags]).values()];
    if (mergedVersionFlags.includes(argv[0]))
        return true;
    return false;
};
exports.versionAddition = versionAddition;
async function run(argv, options) {
    const marker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'main.run');
    const initMarker = performance_1.Performance.mark(performance_1.OCLIF_MARKER_OWNER, 'main.run#init');
    const showHelp = async (argv) => {
        const Help = await (0, help_1.loadHelpClass)(config);
        const help = new Help(config, config.pjson.oclif.helpOptions ?? config.pjson.helpOptions);
        await help.showHelp(argv);
    };
    (0, logger_1.setLogger)(options);
    const { debug } = (0, logger_1.getLogger)('main');
    debug(`process.execPath: ${process.execPath}`);
    debug(`process.execArgv: ${process.execArgv}`);
    debug('process.argv: %O', process.argv);
    argv = argv ?? process.argv.slice(2);
    // Handle the case when a file URL string or URL is passed in such as 'import.meta.url'; covert to file path.
    if (options && ((typeof options === 'string' && options.startsWith('file://')) || options instanceof node_url_1.URL)) {
        options = (0, node_url_1.fileURLToPath)(options);
    }
    const config = await config_1.Config.load(options ?? require.main?.filename ?? __dirname);
    cache_1.default.getInstance().set('config', config);
    // If this is a single command CLI, then insert the SINGLE_COMMAND_CLI_SYMBOL into the argv array to serve as the command id.
    if (config.isSingleCommandCLI) {
        argv = [symbols_1.SINGLE_COMMAND_CLI_SYMBOL, ...argv];
    }
    const [id, ...argvSlice] = (0, help_1.normalizeArgv)(config, argv);
    const runFinally = async (cmd, error) => {
        marker?.stop();
        if (!initMarker?.stopped)
            initMarker?.stop();
        await performance_1.Performance.collect();
        performance_1.Performance.debug();
        await config.runHook('finally', { argv: argvSlice, Command: cmd, error, id });
    };
    // run init hook
    await config.runHook('init', { argv: argvSlice, id });
    // display version if applicable
    if ((0, exports.versionAddition)(argv, config)) {
        ux_1.ux.stdout(config.userAgent);
        await runFinally();
        return;
    }
    // display help version if applicable
    if ((0, exports.helpAddition)(argv, config)) {
        await showHelp(argv);
        await runFinally();
        return;
    }
    // find & run command
    const cmd = config.findCommand(id);
    if (!cmd) {
        const topic = config.flexibleTaxonomy ? null : config.findTopic(id);
        if (topic) {
            await showHelp([id]);
            await runFinally();
            return;
        }
    }
    initMarker?.stop();
    let err;
    try {
        return await config.runCommand(id, argvSlice, cmd);
    }
    catch (error) {
        err = error;
        throw error;
    }
    finally {
        await runFinally(cmd, err);
    }
}

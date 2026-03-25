"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestartProcess = exports.LogTimings = exports.LogOutput = exports.Logger = exports.LogExit = exports.LogError = exports.KillOthers = exports.KillOnSignal = exports.InputHandler = exports.concurrently = exports.Command = void 0;
const command_1 = require("./command");
Object.defineProperty(exports, "Command", { enumerable: true, get: function () { return command_1.Command; } });
const concurrently_1 = require("./concurrently");
Object.defineProperty(exports, "concurrently", { enumerable: true, get: function () { return concurrently_1.concurrently; } });
const input_handler_1 = require("./flow-control/input-handler");
Object.defineProperty(exports, "InputHandler", { enumerable: true, get: function () { return input_handler_1.InputHandler; } });
const kill_on_signal_1 = require("./flow-control/kill-on-signal");
Object.defineProperty(exports, "KillOnSignal", { enumerable: true, get: function () { return kill_on_signal_1.KillOnSignal; } });
const kill_others_1 = require("./flow-control/kill-others");
Object.defineProperty(exports, "KillOthers", { enumerable: true, get: function () { return kill_others_1.KillOthers; } });
const log_error_1 = require("./flow-control/log-error");
Object.defineProperty(exports, "LogError", { enumerable: true, get: function () { return log_error_1.LogError; } });
const log_exit_1 = require("./flow-control/log-exit");
Object.defineProperty(exports, "LogExit", { enumerable: true, get: function () { return log_exit_1.LogExit; } });
const log_output_1 = require("./flow-control/log-output");
Object.defineProperty(exports, "LogOutput", { enumerable: true, get: function () { return log_output_1.LogOutput; } });
const log_timings_1 = require("./flow-control/log-timings");
Object.defineProperty(exports, "LogTimings", { enumerable: true, get: function () { return log_timings_1.LogTimings; } });
const restart_process_1 = require("./flow-control/restart-process");
Object.defineProperty(exports, "RestartProcess", { enumerable: true, get: function () { return restart_process_1.RestartProcess; } });
const logger_1 = require("./logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
exports.default = (commands, options = {}) => {
    const logger = new logger_1.Logger({
        hide: options.hide,
        prefixFormat: options.prefix,
        prefixLength: options.prefixLength,
        raw: options.raw,
        timestampFormat: options.timestampFormat,
    });
    return (0, concurrently_1.concurrently)(commands, {
        maxProcesses: options.maxProcesses,
        raw: options.raw,
        successCondition: options.successCondition,
        cwd: options.cwd,
        logger,
        outputStream: options.outputStream || process.stdout,
        group: options.group,
        controllers: [
            new log_error_1.LogError({ logger }),
            new log_output_1.LogOutput({ logger }),
            new log_exit_1.LogExit({ logger }),
            new input_handler_1.InputHandler({
                logger,
                defaultInputTarget: options.defaultInputTarget,
                inputStream: options.inputStream || (options.handleInput ? process.stdin : undefined),
                pauseInputStreamOnFinish: options.pauseInputStreamOnFinish,
            }),
            new kill_on_signal_1.KillOnSignal({ process }),
            new restart_process_1.RestartProcess({
                logger,
                delay: options.restartDelay,
                tries: options.restartTries,
            }),
            new kill_others_1.KillOthers({
                logger,
                conditions: options.killOthers || [],
                killSignal: options.killSignal,
            }),
            new log_timings_1.LogTimings({
                logger: options.timings ? logger : undefined,
                timestampFormat: options.timestampFormat,
            }),
        ],
        prefixColors: options.prefixColors || [],
        additionalArguments: options.additionalArguments,
    });
};

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogTimings = void 0;
const assert = __importStar(require("assert"));
const format_1 = __importDefault(require("date-fns/format"));
const lodash_1 = __importDefault(require("lodash"));
const Rx = __importStar(require("rxjs"));
const operators_1 = require("rxjs/operators");
const defaults = __importStar(require("../defaults"));
/**
 * Logs timing information about commands as they start/stop and then a summary when all commands finish.
 */
class LogTimings {
    static mapCloseEventToTimingInfo({ command, timings, killed, exitCode, }) {
        const readableDurationMs = (timings.endDate.getTime() - timings.startDate.getTime()).toLocaleString();
        return {
            name: command.name,
            duration: readableDurationMs,
            'exit code': exitCode,
            killed,
            command: command.command,
        };
    }
    constructor({ logger, timestampFormat = defaults.timestampFormat, }) {
        this.logger = logger;
        this.timestampFormat = timestampFormat;
    }
    printExitInfoTimingTable(exitInfos) {
        assert.ok(this.logger);
        const exitInfoTable = (0, lodash_1.default)(exitInfos)
            .sortBy(({ timings }) => timings.durationSeconds)
            .reverse()
            .map(LogTimings.mapCloseEventToTimingInfo)
            .value();
        this.logger.logGlobalEvent('Timings:');
        this.logger.logTable(exitInfoTable);
        return exitInfos;
    }
    handle(commands) {
        const { logger } = this;
        if (!logger) {
            return { commands };
        }
        // individual process timings
        commands.forEach((command) => {
            command.timer.subscribe(({ startDate, endDate }) => {
                if (!endDate) {
                    const formattedStartDate = (0, format_1.default)(startDate, this.timestampFormat);
                    logger.logCommandEvent(`${command.command} started at ${formattedStartDate}`, command);
                }
                else {
                    const durationMs = endDate.getTime() - startDate.getTime();
                    const formattedEndDate = (0, format_1.default)(endDate, this.timestampFormat);
                    logger.logCommandEvent(`${command.command} stopped at ${formattedEndDate} after ${durationMs.toLocaleString()}ms`, command);
                }
            });
        });
        // overall summary timings
        const closeStreams = commands.map((command) => command.close);
        const allProcessesClosed = Rx.merge(...closeStreams).pipe((0, operators_1.bufferCount)(closeStreams.length), (0, operators_1.take)(1));
        allProcessesClosed.subscribe((exitInfos) => this.printExitInfoTimingTable(exitInfos));
        return { commands };
    }
}
exports.LogTimings = LogTimings;

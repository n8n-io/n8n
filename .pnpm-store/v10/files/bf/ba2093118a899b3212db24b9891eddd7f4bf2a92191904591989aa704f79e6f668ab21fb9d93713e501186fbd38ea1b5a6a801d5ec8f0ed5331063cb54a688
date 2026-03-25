"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileLogger = void 0;
const tslib_1 = require("tslib");
const app_root_path_1 = tslib_1.__importDefault(require("app-root-path"));
const PlatformTools_1 = require("../platform/PlatformTools");
const AbstractLogger_1 = require("./AbstractLogger");
/**
 * Performs logging of the events in TypeORM.
 * This version of logger logs everything into ormlogs.log file.
 */
class FileLogger extends AbstractLogger_1.AbstractLogger {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(options, fileLoggerOptions) {
        super(options);
        this.fileLoggerOptions = fileLoggerOptions;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Write log to specific output.
     */
    writeLog(level, logMessage, queryRunner) {
        const messages = this.prepareLogMessages(logMessage, {
            addColonToPrefix: false,
        });
        const strings = [];
        for (let message of messages) {
            switch (message.type ?? level) {
                case "log":
                    strings.push(`[LOG]: ${message.message}`);
                    break;
                case "schema-build":
                case "migration":
                    strings.push(String(message.message));
                    break;
                case "info":
                    strings.push(`[INFO]: ${message.message}`);
                    break;
                case "query":
                    strings.push(`[QUERY]: ${message.message}`);
                    break;
                case "warn":
                    strings.push(`[WARN]: ${message.message}`);
                    break;
                case "query-slow":
                    if (message.prefix === "execution time") {
                        continue;
                    }
                    this.write(`[SLOW QUERY: ${message.additionalInfo?.time} ms]: ${message.message}`);
                    break;
                case "error":
                case "query-error":
                    if (message.prefix === "query failed") {
                        strings.push(`[FAILED QUERY]: ${message.message}`);
                    }
                    else if (message.type === "query-error") {
                        strings.push(`[QUERY ERROR]: ${message.message}`);
                    }
                    else {
                        strings.push(`[ERROR]: ${message.message}`);
                    }
                    break;
            }
        }
        this.write(strings);
    }
    /**
     * Writes given strings into the log file.
     */
    write(strings) {
        strings = Array.isArray(strings) ? strings : [strings];
        const basePath = app_root_path_1.default.path + "/";
        let logPath = "ormlogs.log";
        if (this.fileLoggerOptions && this.fileLoggerOptions.logPath) {
            logPath = PlatformTools_1.PlatformTools.pathNormalize(this.fileLoggerOptions.logPath);
        }
        strings = strings.map((str) => "[" + new Date().toISOString() + "]" + str);
        PlatformTools_1.PlatformTools.appendFileSync(basePath + logPath, strings.join("\r\n") + "\r\n"); // todo: use async or implement promises?
    }
}
exports.FileLogger = FileLogger;

//# sourceMappingURL=FileLogger.js.map

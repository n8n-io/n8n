"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugLogger = void 0;
const AbstractLogger_1 = require("./AbstractLogger");
const debug_1 = require("debug");
/**
 * Performs logging of the events in TypeORM via debug library.
 */
class DebugLogger extends AbstractLogger_1.AbstractLogger {
    constructor() {
        super(...arguments);
        /**
         * Object with all debug logger.
         */
        this.logger = {
            log: (0, debug_1.debug)("typeorm:log"),
            info: (0, debug_1.debug)("typeorm:info"),
            warn: (0, debug_1.debug)("typeorm:warn"),
            error: (0, debug_1.debug)("typeorm:error"),
            query: (0, debug_1.debug)("typeorm:query:log"),
            "query-error": (0, debug_1.debug)("typeorm:query:error"),
            "query-slow": (0, debug_1.debug)("typeorm:query:slow"),
            "schema-build": (0, debug_1.debug)("typeorm:schema"),
            migration: (0, debug_1.debug)("typeorm:migration"),
        };
    }
    /**
     * Check is logging for level or message type is enabled.
     */
    isLogEnabledFor(type) {
        switch (type) {
            case "query":
                return this.logger["query"].enabled;
            case "query-error":
                return this.logger["query-error"].enabled;
            case "query-slow":
                return true;
            case "schema":
            case "schema-build":
                return this.logger["schema-build"].enabled;
            case "migration":
                return this.logger["migration"].enabled;
            case "log":
                return this.logger["log"].enabled;
            case "info":
                return this.logger["info"].enabled;
            case "warn":
                return this.logger["warn"].enabled;
            default:
                return false;
        }
    }
    /**
     * Write log to specific output.
     */
    writeLog(level, logMessage, queryRunner) {
        const messages = this.prepareLogMessages(logMessage);
        for (let message of messages) {
            const messageTypeOrLevel = message.type ?? level;
            if (messageTypeOrLevel in this.logger) {
                if (message.prefix) {
                    this.logger[messageTypeOrLevel](message.prefix, message.message);
                }
                else {
                    this.logger[messageTypeOrLevel](message.message);
                }
                if (message.parameters && message.parameters.length) {
                    this.logger[messageTypeOrLevel]("parameters:", message.parameters);
                }
            }
        }
    }
}
exports.DebugLogger = DebugLogger;

//# sourceMappingURL=DebugLogger.js.map

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleConsoleLogger = void 0;
const AbstractLogger_1 = require("./AbstractLogger");
/**
 * Performs logging of the events in TypeORM.
 * This version of logger uses console to log events and does not use syntax highlighting.
 */
class SimpleConsoleLogger extends AbstractLogger_1.AbstractLogger {
    /**
     * Write log to specific output.
     */
    writeLog(level, logMessage, queryRunner) {
        const messages = this.prepareLogMessages(logMessage);
        for (let message of messages) {
            switch (message.type ?? level) {
                case "log":
                case "schema-build":
                case "migration":
                    console.log(message.message);
                    break;
                case "info":
                case "query":
                    if (message.prefix) {
                        console.info(message.prefix, message.message);
                    }
                    else {
                        console.info(message.message);
                    }
                    break;
                case "warn":
                case "query-slow":
                    if (message.prefix) {
                        console.warn(message.prefix, message.message);
                    }
                    else {
                        console.warn(message.message);
                    }
                    break;
                case "error":
                case "query-error":
                    if (message.prefix) {
                        console.error(message.prefix, message.message);
                    }
                    else {
                        console.error(message.message);
                    }
                    break;
            }
        }
    }
}
exports.SimpleConsoleLogger = SimpleConsoleLogger;

//# sourceMappingURL=SimpleConsoleLogger.js.map

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execLog = exports.pullLog = exports.buildLog = exports.composeLog = exports.containerLog = exports.log = exports.Logger = void 0;
const debug_1 = __importDefault(require("debug"));
class Logger {
    showLevel;
    logger;
    constructor(namespace, showLevel = true) {
        this.showLevel = showLevel;
        this.logger = (0, debug_1.default)(namespace);
        if (process.env.NODE_ENV === "test") {
            this.logger.log = console.log.bind(console);
        }
    }
    enabled() {
        return this.logger.enabled;
    }
    trace(message, options) {
        this.logger(this.formatMessage(message, "TRACE", options));
    }
    debug(message, options) {
        this.logger(this.formatMessage(message, "DEBUG", options));
    }
    info(message, options) {
        this.logger(this.formatMessage(message, "INFO", options));
    }
    warn(message, options) {
        this.logger(this.formatMessage(message, "WARN", options));
    }
    error(message, options) {
        this.logger(this.formatMessage(message, "ERROR", options));
    }
    formatMessage(message, level, options) {
        return `${this.showLevel ? `[${level}] ` : ""}${this.renderOptions(options)}${message}`;
    }
    renderOptions(options) {
        let str = "";
        if (options?.containerId) {
            str += `[${options.containerId.substring(0, 12)}] `;
        }
        if (options?.imageName) {
            str += `[${options.imageName}] `;
        }
        return str;
    }
}
exports.Logger = Logger;
exports.log = new Logger("testcontainers");
exports.containerLog = new Logger("testcontainers:containers", false);
exports.composeLog = new Logger("testcontainers:compose", false);
exports.buildLog = new Logger("testcontainers:build", false);
exports.pullLog = new Logger("testcontainers:pull", false);
exports.execLog = new Logger("testcontainers:exec", false);
//# sourceMappingURL=logger.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultLogger = void 0;
const colorette_1 = require("colorette");
const RESET_ESCAPE_CODE_IN_TERMINAL = process.env.NO_COLOR ? '' : '\x1B[0m';
class DefaultLogger {
    static instance;
    constructor() { }
    static getInstance() {
        if (!DefaultLogger.instance) {
            DefaultLogger.instance = new DefaultLogger();
        }
        return DefaultLogger.instance;
    }
    error(message) {
        process.stderr.write(`${message}\n`);
    }
    log(message) {
        process.stdout.write(`${message}`);
    }
    printNewLine() {
        process.stdout.write(`${RESET_ESCAPE_CODE_IN_TERMINAL}\n`);
    }
    printSeparator(separator) {
        const windowWidth = process.stdout.columns || 80;
        const separatorLine = separator
            .repeat(Math.ceil(windowWidth / separator.length))
            .slice(0, windowWidth);
        process.stdout.write((0, colorette_1.gray)(`${separatorLine}`));
    }
}
exports.DefaultLogger = DefaultLogger;
//# sourceMappingURL=logger.js.map
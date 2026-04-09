"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exitWithError = void 0;
const colorette_1 = require("colorette");
const logger_1 = require("../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
const exitWithError = (message) => {
    logger.error((0, colorette_1.bgRed)(message));
    logger.printNewLine();
    throw new Error(message);
};
exports.exitWithError = exitWithError;
//# sourceMappingURL=exit-with-error.js.map
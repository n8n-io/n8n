"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogUtil = void 0;
const loglevel_1 = __importDefault(require("loglevel"));
const logger = loglevel_1.default.getLogger('wiremock-rest-client');
class LogUtil {
    static logger() {
        return logger;
    }
    static handleError(errorMessage) {
        logger.error(errorMessage);
        if (!LogUtil.continueOnFailure) {
            process.exit(1);
        }
    }
}
exports.LogUtil = LogUtil;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rootLogger = void 0;
const bs_logger_1 = require("bs-logger");
const backports_1 = require("./backports");
const original = process.env.TS_JEST_LOG;
const buildOptions = () => ({
    context: {
        [bs_logger_1.LogContexts.package]: 'ts-jest',
        [bs_logger_1.LogContexts.logLevel]: bs_logger_1.LogLevels.trace,
        version: require('../../package.json').version,
    },
    targets: process.env.TS_JEST_LOG ?? undefined,
});
exports.rootLogger = (0, bs_logger_1.createLogger)(buildOptions());
(0, backports_1.backportTsJestDebugEnvVar)(exports.rootLogger);
// re-create the logger if the env var has been backported
if (original !== process.env.TS_JEST_LOG) {
    exports.rootLogger = (0, bs_logger_1.createLogger)(buildOptions());
}

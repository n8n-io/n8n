"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLogger = getLogger;
/**
 * Compatibility matrix
 *
  | Library  |  log  |  info  | warn  |  error  | \<interpolation\> |
  |----------|:------|:-------|:------|:--------|:------------------|
  | console  |   ✅   |  ✅   |   ✅   |   ✅    |   ✅ (%s %o %O)   |
  | bunyan   |   ❌   |  ✅   |   ✅   |   ✅    |   ✅ (%s %o %O)   |
  | pino     |   ❌   |  ✅   |   ✅   |   ✅    |   ✅ (%s %o %O)   |
  | winston  |   ❌   |  ✅   |   ✅   |   ✅    |   ✅ (%s %o %O)^1 |
  | log4js   |   ❌   |  ✅   |   ✅   |   ✅    |   ✅ (%s %o %O)   |
 *
 * ^1: https://github.com/winstonjs/winston#string-interpolation
 */
const noopLogger = {
    info: () => { },
    warn: () => { },
    error: () => { },
};
function getLogger(options) {
    return options.logger || noopLogger;
}

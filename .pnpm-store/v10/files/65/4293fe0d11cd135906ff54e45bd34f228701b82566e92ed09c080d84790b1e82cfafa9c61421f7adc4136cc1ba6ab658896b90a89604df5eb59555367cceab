"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExecutionTime = getExecutionTime;
// Function from @redocly/cli
function getExecutionTime(startedAt) {
    return process.env.NODE_ENV === 'test'
        ? '<test>ms'
        : `${Math.ceil(performance.now() - startedAt)}ms`;
}
//# sourceMappingURL=time.js.map
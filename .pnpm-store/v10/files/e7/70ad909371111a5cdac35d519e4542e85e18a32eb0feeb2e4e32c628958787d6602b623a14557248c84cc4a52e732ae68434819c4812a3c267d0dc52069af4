"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CwdError = void 0;
class CwdError extends Error {
    path;
    code;
    syscall = 'chdir';
    constructor(path, code) {
        super(`${code}: Cannot cd into '${path}'`);
        this.path = path;
        this.code = code;
    }
    get name() {
        return 'CwdError';
    }
}
exports.CwdError = CwdError;
//# sourceMappingURL=cwd-error.js.map
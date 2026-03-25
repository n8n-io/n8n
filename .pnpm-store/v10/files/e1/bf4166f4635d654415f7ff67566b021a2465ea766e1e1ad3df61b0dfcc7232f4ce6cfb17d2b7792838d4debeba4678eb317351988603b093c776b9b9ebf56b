export class CwdError extends Error {
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
//# sourceMappingURL=cwd-error.js.map
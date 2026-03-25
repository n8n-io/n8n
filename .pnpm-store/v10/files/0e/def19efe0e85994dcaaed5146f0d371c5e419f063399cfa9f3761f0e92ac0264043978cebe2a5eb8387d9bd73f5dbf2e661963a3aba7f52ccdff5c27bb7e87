"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnMethod = void 0;
const warnMethod = (self, code, message, data = {}) => {
    if (self.file) {
        data.file = self.file;
    }
    if (self.cwd) {
        data.cwd = self.cwd;
    }
    data.code =
        (message instanceof Error &&
            message.code) ||
            code;
    data.tarCode = code;
    if (!self.strict && data.recoverable !== false) {
        if (message instanceof Error) {
            data = Object.assign(message, data);
            message = message.message;
        }
        self.emit('warn', code, message, data);
    }
    else if (message instanceof Error) {
        self.emit('error', Object.assign(message, data));
    }
    else {
        self.emit('error', Object.assign(new Error(`${code}: ${message}`), data));
    }
};
exports.warnMethod = warnMethod;
//# sourceMappingURL=warn-method.js.map
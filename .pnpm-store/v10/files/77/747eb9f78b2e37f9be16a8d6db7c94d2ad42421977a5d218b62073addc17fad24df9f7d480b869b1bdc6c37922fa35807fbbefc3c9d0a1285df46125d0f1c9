"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformArguments = void 0;
function transformArguments({ username, password }) {
    if (!username) {
        return ['AUTH', password];
    }
    return ['AUTH', username, password];
}
exports.transformArguments = transformArguments;

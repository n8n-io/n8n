"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZepClient = void 0;
const Client_1 = require("../Client");
const memory_1 = require("./memory");
class ZepClient extends Client_1.ZepClient {
    get memory() {
        return new memory_1.Memory(this._options);
    }
}
exports.ZepClient = ZepClient;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomUuid = exports.RandomUuid = void 0;
const crypto_1 = __importDefault(require("crypto"));
const hash_1 = require("./hash");
class RandomUuid {
    nextUuid() {
        return (0, hash_1.hash)(crypto_1.default.randomUUID()).substring(0, 12);
    }
}
exports.RandomUuid = RandomUuid;
const randomUuidGen = new RandomUuid();
const randomUuid = () => randomUuidGen.nextUuid();
exports.randomUuid = randomUuid;
//# sourceMappingURL=uuid.js.map
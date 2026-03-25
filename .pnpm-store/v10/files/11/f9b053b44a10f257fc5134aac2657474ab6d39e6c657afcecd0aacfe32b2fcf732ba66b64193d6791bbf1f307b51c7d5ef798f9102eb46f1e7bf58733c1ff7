"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = convertPathToPosix;
const path_1 = __importDefault(require("path"));
function convertPathToPosix(filePath) {
    const isExtendedLengthPath = filePath.startsWith("\\\\?\\");
    if (isExtendedLengthPath) {
        return filePath;
    }
    return filePath.split(path_1.default?.win32?.sep).join(path_1.default?.posix?.sep ?? "/");
}

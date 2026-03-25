"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFileLike = void 0;
const isFunction_1 = __importDefault(require("./isFunction"));
const isFileLike = (value) => Boolean(value
    && typeof value === "object"
    && (0, isFunction_1.default)(value.constructor)
    && value[Symbol.toStringTag] === "File"
    && (0, isFunction_1.default)(value.stream)
    && value.name != null
    && value.size != null
    && value.lastModified != null);
exports.isFileLike = isFileLike;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFormDataLike = exports.isFormData = void 0;
const isFunction_1 = __importDefault(require("./isFunction"));
const isFormData = (value) => Boolean(value
    && (0, isFunction_1.default)(value.constructor)
    && value[Symbol.toStringTag] === "FormData"
    && (0, isFunction_1.default)(value.append)
    && (0, isFunction_1.default)(value.getAll)
    && (0, isFunction_1.default)(value.entries)
    && (0, isFunction_1.default)(value[Symbol.iterator]));
exports.isFormData = isFormData;
exports.isFormDataLike = exports.isFormData;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequestUrl = void 0;
const qs_1 = __importDefault(require("qs"));
function createRequestUrl(baseUrl, queryParameters) {
    return Object.keys(queryParameters !== null && queryParameters !== void 0 ? queryParameters : {}).length > 0
        ? `${baseUrl}?${qs_1.default.stringify(queryParameters, { arrayFormat: "repeat" })}`
        : baseUrl;
}
exports.createRequestUrl = createRequestUrl;

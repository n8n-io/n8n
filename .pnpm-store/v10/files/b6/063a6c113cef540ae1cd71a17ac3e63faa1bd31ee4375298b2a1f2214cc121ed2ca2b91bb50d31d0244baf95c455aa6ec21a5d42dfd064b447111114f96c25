"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductInfo = void 0;
const package_json_1 = require("../package.json");
const os_1 = __importDefault(require("os"));
/**
 * Generates a string containing information about the SDK version and runtime environment.
 * This is used for telemetry and User-Agent headers in HTTP requests.
 *
 * @returns A formatted string containing the SDK version, Node.js version, and OS details
 */
const getProductInfo = () => `agents-sdk-js/${package_json_1.version} nodejs/${process.version} ${os_1.default.platform()}-${os_1.default.arch()}/${os_1.default.release()}`;
exports.getProductInfo = getProductInfo;
//# sourceMappingURL=getProductInfo.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeDir = getHomeDir;
exports.getPlatform = getPlatform;
const is_wsl_1 = __importDefault(require("is-wsl"));
const node_os_1 = require("node:os");
/**
 * Call os.homedir() and return the result
 *
 * Wrapping this allows us to stub these in tests since os.homedir() is
 * non-configurable and non-writable.
 *
 * @returns The user's home directory
 */
function getHomeDir() {
    return (0, node_os_1.homedir)();
}
/**
 * Call os.platform() and return the result
 *
 * Wrapping this allows us to stub these in tests since os.platform() is
 * non-configurable and non-writable.
 *
 * @returns The process' platform
 */
function getPlatform() {
    return is_wsl_1.default ? 'wsl' : (0, node_os_1.platform)();
}

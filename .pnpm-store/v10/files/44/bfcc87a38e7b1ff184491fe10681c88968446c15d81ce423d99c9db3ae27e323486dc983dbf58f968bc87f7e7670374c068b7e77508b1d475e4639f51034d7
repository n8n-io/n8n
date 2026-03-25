"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHomeDir = getHomeDir;
exports.getPlatform = getPlatform;
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
    return (0, node_os_1.platform)();
}

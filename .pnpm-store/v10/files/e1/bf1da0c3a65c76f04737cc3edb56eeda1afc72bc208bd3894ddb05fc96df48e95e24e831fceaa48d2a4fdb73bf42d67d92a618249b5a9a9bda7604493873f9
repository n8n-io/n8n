"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageVersion = getPackageVersion;
/**
 * @internal
 */
function getPackageVersion(moduleName) {
    try {
        return require(`${moduleName}/package.json`).version;
    }
    catch {
        return undefined;
    }
}

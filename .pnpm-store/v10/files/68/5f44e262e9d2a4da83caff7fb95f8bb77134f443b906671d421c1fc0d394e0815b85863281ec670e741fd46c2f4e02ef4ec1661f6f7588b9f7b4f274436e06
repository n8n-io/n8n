"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformTools = exports.ReadStream = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
var fs_1 = require("fs");
Object.defineProperty(exports, "ReadStream", { enumerable: true, get: function () { return fs_1.ReadStream; } });
/**
 * Platform-specific tools.
 */
class PlatformTools {
    /**
     * Normalizes given path. Does "path.normalize" and replaces backslashes with forward slashes on Windows.
     */
    static pathNormalize(pathStr) {
        let normalizedPath = path.normalize(pathStr);
        if (process.platform === "win32")
            normalizedPath = normalizedPath.replace(/\\/g, "/");
        return normalizedPath;
    }
    /**
     * Gets file extension. Does "path.extname".
     */
    static pathExtname(pathStr) {
        return path.extname(pathStr);
    }
    /**
     * Resolved given path. Does "path.resolve".
     */
    static pathResolve(pathStr) {
        return path.resolve(pathStr);
    }
    /**
     * Synchronously checks if file exist. Does "fs.existsSync".
     */
    static fileExist(pathStr) {
        return fs.existsSync(pathStr);
    }
    static readFileSync(filename) {
        return fs.readFileSync(filename);
    }
    static appendFileSync(filename, data) {
        fs.appendFileSync(filename, data);
    }
    static async writeFile(path, data) {
        return new Promise((ok, fail) => {
            fs.writeFile(path, data, (err) => {
                if (err)
                    fail(err);
                ok();
            });
        });
    }
    /**
     * Loads a dotenv file into the environment variables.
     *
     * @param path The file to load as a dotenv configuration
     */
    static dotenv(pathStr) {
        dotenv_1.default.config({ path: pathStr });
    }
    /**
     * Gets environment variable.
     */
    static getEnvVariable(name) {
        return process.env[name];
    }
    /**
     * Logging functions needed by AdvancedConsoleLogger
     */
    static logInfo(prefix, info) {
        console.log(chalk_1.default.gray.underline(prefix), info);
    }
    static logError(prefix, error) {
        console.log(chalk_1.default.underline.red(prefix), error);
    }
    static logWarn(prefix, warning) {
        console.log(chalk_1.default.underline.yellow(prefix), warning);
    }
    static log(message) {
        console.log(chalk_1.default.underline(message));
    }
    static info(info) {
        return chalk_1.default.gray(info);
    }
    static error(error) {
        return chalk_1.default.red(error);
    }
    static warn(message) {
        return chalk_1.default.yellow(message);
    }
    static logCmdErr(prefix, err) {
        console.log(chalk_1.default.black.bgRed(prefix));
        if (err)
            console.error(err);
    }
}
exports.PlatformTools = PlatformTools;

//# sourceMappingURL=PlatformTools.js.map

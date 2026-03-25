"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUtil = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const log_util_1 = require("./log.util");
class FileUtil {
    static getFileContent(fileName) {
        try {
            return fs.readFileSync(path.join(process.cwd(), fileName), 'utf8');
        }
        catch (error) {
            log_util_1.LogUtil.handleError(`Error: ${error}`);
            return '';
        }
    }
    static getFilesFromDir(directoryName, files = []) {
        const fullDirectoryPath = path.join(process.cwd(), directoryName);
        try {
            fs.readdirSync(fullDirectoryPath).forEach((fileName) => {
                const fullPath = path.join(fullDirectoryPath, fileName);
                if (fs.lstatSync(fullPath).isDirectory()) {
                    this.getFilesFromDir(path.join(directoryName, fileName), files);
                }
                else {
                    files.push(path.join(directoryName, fileName));
                }
            });
        }
        catch (error) {
            log_util_1.LogUtil.handleError(`Error: ${error}`);
        }
        return files;
    }
}
exports.FileUtil = FileUtil;

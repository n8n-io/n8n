"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withFileLock = withFileLock;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const proper_lockfile_1 = __importDefault(require("proper-lockfile"));
const logger_1 = require("./logger");
async function withFileLock(fileName, fn) {
    const file = await createEmptyTmpFile(fileName);
    let releaseLockFn;
    try {
        logger_1.log.debug(`Acquiring lock file "${file}"...`);
        releaseLockFn = await proper_lockfile_1.default.lock(file, {
            retries: { forever: true, factor: 1, minTimeout: 500, maxTimeout: 3000, randomize: true },
        });
        logger_1.log.debug(`Acquired lock file "${file}"`);
        return await fn();
    }
    finally {
        if (releaseLockFn) {
            logger_1.log.debug(`Releasing lock file "${file}"...`);
            await releaseLockFn();
            logger_1.log.debug(`Released lock file "${file}"`);
        }
    }
}
async function createEmptyTmpFile(fileName) {
    const tmp = await Promise.resolve().then(() => __importStar(require("tmp")));
    const file = path_1.default.resolve(tmp.tmpdir, fileName);
    await (0, promises_1.writeFile)(file, "");
    return file;
}
//# sourceMappingURL=file-lock.js.map
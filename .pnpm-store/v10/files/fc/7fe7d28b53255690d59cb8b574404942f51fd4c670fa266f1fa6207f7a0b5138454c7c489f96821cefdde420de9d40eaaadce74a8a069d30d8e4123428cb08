"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUtils = void 0;
const tslib_1 = require("tslib");
const node_child_process_1 = tslib_1.__importDefault(require("node:child_process"));
/**
 * Easy to mock childProcess utils.
 * @internal
 */
exports.processUtils = {
    /**
     * Promisifying childProcess.execFile
     * @internal
     */
    execFile(file, params, options) {
        return new Promise((resolve, reject) => {
            node_child_process_1.default.execFile(file, params, options, (error, stdout, stderr) => {
                if (Buffer.isBuffer(stdout)) {
                    stdout = stdout.toString("utf8");
                }
                if (Buffer.isBuffer(stderr)) {
                    stderr = stderr.toString("utf8");
                }
                if (stderr || error) {
                    reject(stderr ? new Error(stderr) : error);
                }
                else {
                    resolve(stdout);
                }
            });
        });
    },
};
//# sourceMappingURL=processUtils.js.map
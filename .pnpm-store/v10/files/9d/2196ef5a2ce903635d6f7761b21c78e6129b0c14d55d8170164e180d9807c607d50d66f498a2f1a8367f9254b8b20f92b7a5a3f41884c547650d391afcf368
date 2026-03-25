// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import childProcess from "node:child_process";
/**
 * Easy to mock childProcess utils.
 * @internal
 */
export const processUtils = {
    /**
     * Promisifying childProcess.execFile
     * @internal
     */
    execFile(file, params, options) {
        return new Promise((resolve, reject) => {
            childProcess.execFile(file, params, options, (error, stdout, stderr) => {
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
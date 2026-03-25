// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
export function log(...args) {
    if (args.length > 0) {
        const firstArg = String(args[0]);
        if (firstArg.includes(":error")) {
            console.error(...args);
        }
        else if (firstArg.includes(":warning")) {
            console.warn(...args);
        }
        else if (firstArg.includes(":info")) {
            console.info(...args);
        }
        else if (firstArg.includes(":verbose")) {
            console.debug(...args);
        }
        else {
            console.debug(...args);
        }
    }
}
//# sourceMappingURL=log.common.js.map
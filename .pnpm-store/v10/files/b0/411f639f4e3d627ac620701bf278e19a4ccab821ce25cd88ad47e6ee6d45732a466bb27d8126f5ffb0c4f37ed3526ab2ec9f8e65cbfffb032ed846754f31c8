"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
const tslib_1 = require("tslib");
const node_os_1 = require("node:os");
const node_util_1 = tslib_1.__importDefault(require("node:util"));
const node_process_1 = tslib_1.__importDefault(require("node:process"));
function log(message, ...args) {
    node_process_1.default.stderr.write(`${node_util_1.default.format(message, ...args)}${node_os_1.EOL}`);
}
//# sourceMappingURL=log.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntime = getRuntime;
const web_runtime_1 = require("./web-runtime.js");
const node_fs_1 = require("node:fs");
function getRuntime() {
    const runtime = (0, web_runtime_1.getRuntime)();
    function isFsReadStream(value) {
        return value instanceof node_fs_1.ReadStream;
    }
    return { ...runtime, isFsReadStream };
}
//# sourceMappingURL=bun-runtime.js.map
// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    indentRecursive: function() {
        return indentRecursive;
    },
    formatNodes: function() {
        return formatNodes;
    },
    readFileWithRetries: function() {
        return readFileWithRetries;
    },
    drainStdin: function() {
        return drainStdin;
    },
    outputFile: function() {
        return outputFile;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function indentRecursive(node, indent = 0) {
    node.each && node.each((child, i)=>{
        if (!child.raws.before || !child.raws.before.trim() || child.raws.before.includes("\n")) {
            child.raws.before = `\n${node.type !== "rule" && i > 0 ? "\n" : ""}${"  ".repeat(indent)}`;
        }
        child.raws.after = `\n${"  ".repeat(indent)}`;
        indentRecursive(child, indent + 1);
    });
}
function formatNodes(root) {
    indentRecursive(root);
    if (root.first) {
        root.first.raws.before = "";
    }
}
async function readFileWithRetries(path, tries = 5) {
    for(let n = 0; n <= tries; n++){
        try {
            return await _fs.default.promises.readFile(path, "utf8");
        } catch (err) {
            if (n !== tries) {
                if (err.code === "ENOENT" || err.code === "EBUSY") {
                    await new Promise((resolve)=>setTimeout(resolve, 10));
                    continue;
                }
            }
            throw err;
        }
    }
}
function drainStdin() {
    return new Promise((resolve, reject)=>{
        let result = "";
        process.stdin.on("data", (chunk)=>{
            result += chunk;
        });
        process.stdin.on("end", ()=>resolve(result));
        process.stdin.on("error", (err)=>reject(err));
    });
}
async function outputFile(file, newContents) {
    try {
        let currentContents = await _fs.default.promises.readFile(file, "utf8");
        if (currentContents === newContents) {
            return; // Skip writing the file
        }
    } catch  {}
    // Write the file
    await _fs.default.promises.mkdir(_path.default.dirname(file), {
        recursive: true
    });
    await _fs.default.promises.writeFile(file, newContents, "utf8");
}

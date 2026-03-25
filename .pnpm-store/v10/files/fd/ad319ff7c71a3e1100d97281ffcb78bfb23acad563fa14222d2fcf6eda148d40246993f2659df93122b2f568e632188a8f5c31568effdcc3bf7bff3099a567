// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "build", {
    enumerable: true,
    get: function() {
        return build;
    }
});
const _fs = /*#__PURE__*/ _interop_require_default(require("fs"));
const _path = /*#__PURE__*/ _interop_require_default(require("path"));
const _resolveConfigPath = require("../../util/resolveConfigPath.js");
const _plugin = require("./plugin.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
async function build(args) {
    let input = args["--input"];
    let shouldWatch = args["--watch"];
    // TODO: Deprecate this in future versions
    if (!input && args["_"][1]) {
        console.error("[deprecation] Running tailwindcss without -i, please provide an input file.");
        input = args["--input"] = args["_"][1];
    }
    if (input && input !== "-" && !_fs.default.existsSync(input = _path.default.resolve(input))) {
        console.error(`Specified input file ${args["--input"]} does not exist.`);
        process.exit(9);
    }
    if (args["--config"] && !_fs.default.existsSync(args["--config"] = _path.default.resolve(args["--config"]))) {
        console.error(`Specified config file ${args["--config"]} does not exist.`);
        process.exit(9);
    }
    // TODO: Reference the @config path here if exists
    let configPath = args["--config"] ? args["--config"] : (0, _resolveConfigPath.resolveDefaultConfigPath)();
    let processor = await (0, _plugin.createProcessor)(args, configPath);
    if (shouldWatch) {
        // Abort the watcher if stdin is closed to avoid zombie processes
        // You can disable this behavior with --watch=always
        if (args["--watch"] !== "always") {
            process.stdin.on("end", ()=>process.exit(0));
        }
        process.stdin.resume();
        await processor.watch();
    } else {
        await processor.build().catch((e)=>{
            console.error(e);
            process.exit(1);
        });
    }
}

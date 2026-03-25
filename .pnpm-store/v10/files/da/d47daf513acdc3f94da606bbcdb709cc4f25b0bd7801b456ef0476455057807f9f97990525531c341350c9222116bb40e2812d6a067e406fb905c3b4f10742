// @ts-check
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "help", {
    enumerable: true,
    get: function() {
        return help;
    }
});
const _packagejson = /*#__PURE__*/ _interop_require_default(require("../../../package.json"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function help({ message , usage , commands , options  }) {
    let indent = 2;
    // Render header
    console.log();
    console.log(`${_packagejson.default.name} v${_packagejson.default.version}`);
    // Render message
    if (message) {
        console.log();
        for (let msg of message.split("\n")){
            console.log(msg);
        }
    }
    // Render usage
    if (usage && usage.length > 0) {
        console.log();
        console.log("Usage:");
        for (let example of usage){
            console.log(" ".repeat(indent), example);
        }
    }
    // Render commands
    if (commands && commands.length > 0) {
        console.log();
        console.log("Commands:");
        for (let command of commands){
            console.log(" ".repeat(indent), command);
        }
    }
    // Render options
    if (options) {
        let groupedOptions = {};
        for (let [key, value] of Object.entries(options)){
            if (typeof value === "object") {
                groupedOptions[key] = {
                    ...value,
                    flags: [
                        key
                    ]
                };
            } else {
                groupedOptions[value].flags.push(key);
            }
        }
        console.log();
        console.log("Options:");
        for (let { flags , description , deprecated  } of Object.values(groupedOptions)){
            if (deprecated) continue;
            if (flags.length === 1) {
                console.log(" ".repeat(indent + 4 /* 4 = "-i, ".length */ ), flags.slice().reverse().join(", ").padEnd(20, " "), description);
            } else {
                console.log(" ".repeat(indent), flags.slice().reverse().join(", ").padEnd(24, " "), description);
            }
        }
    }
    console.log();
}

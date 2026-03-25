"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Output = void 0;
const util_1 = require("util");
class Output {
    constructor(verb = false, debugMode = false) {
        this.verb = verb;
        this.debug = (message, obj) => { };
        if (debugMode) {
            this.debug = (message, obj) => {
                console.debug(`tsc-alias debug: ${message} ${obj
                    ? (0, util_1.inspect)(obj, {
                        showHidden: true,
                        depth: Infinity,
                        colors: true
                    })
                    : ''}`);
            };
        }
    }
    set verbose(value) {
        if (value) {
            this.verb = value;
        }
    }
    info(message) {
        if (!this.verb)
            return;
        console.log(`tsc-alias info: ${message}`);
    }
    error(message, exitProcess = false) {
        console.error(`\x1b[41mtsc-alias error:\x1b[0m \x1b[31m${message}\x1b[0m`);
        if (exitProcess)
            process.exit(1);
    }
    clear() {
        console.clear();
    }
    assert(claim, message) {
        claim || this.error(message, true);
    }
}
exports.Output = Output;
//# sourceMappingURL=output.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.colorize = exports.colorOptions = void 0;
const colorette = require("colorette");
const env_1 = require("./env");
const utils_1 = require("./utils");
var colorette_1 = require("colorette");
Object.defineProperty(exports, "colorOptions", { enumerable: true, get: function () { return colorette_1.options; } });
exports.colorize = new Proxy(colorette, {
    get(target, prop) {
        if (env_1.isBrowser) {
            return utils_1.identity;
        }
        return target[prop];
    },
});
class Logger {
    stderr(str) {
        return process.stderr.write(str);
    }
    info(str) {
        return env_1.isBrowser ? console.log(str) : this.stderr(str);
    }
    warn(str) {
        return env_1.isBrowser ? console.warn(str) : this.stderr(exports.colorize.yellow(str));
    }
    error(str) {
        return env_1.isBrowser ? console.error(str) : this.stderr(exports.colorize.red(str));
    }
}
exports.logger = new Logger();

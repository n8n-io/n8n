"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = void 0;
const logger_1 = require("../logger");
const write_1 = require("../ux/write");
const cli_1 = require("./errors/cli");
const pretty_print_1 = __importStar(require("./errors/pretty-print"));
function error(input, options = {}) {
    let err;
    if (typeof input === 'string') {
        err = new cli_1.CLIError(input, options);
    }
    else if (input instanceof Error) {
        err = (0, cli_1.addOclifExitCode)(input, options);
    }
    else {
        throw new TypeError('first argument must be a string or instance of Error');
    }
    err = (0, pretty_print_1.applyPrettyPrintOptions)(err, options);
    if (options.exit === false) {
        const message = (0, pretty_print_1.default)(err);
        if (message)
            (0, write_1.stderr)(message);
        if (err?.stack)
            (0, logger_1.getLogger)().error(err.stack);
    }
    else
        throw err;
}
exports.error = error;
exports.default = error;

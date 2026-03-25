"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExitError = void 0;
const cli_1 = require("./cli");
class ExitError extends cli_1.CLIError {
    code = 'EEXIT';
    constructor(exitCode = 1) {
        super(`EEXIT: ${exitCode}`, { exit: exitCode });
    }
    render() {
        return '';
    }
}
exports.ExitError = ExitError;

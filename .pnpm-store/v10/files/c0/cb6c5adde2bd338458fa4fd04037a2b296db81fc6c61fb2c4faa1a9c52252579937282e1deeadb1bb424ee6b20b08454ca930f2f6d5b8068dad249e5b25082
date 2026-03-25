"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errtermwidth = exports.stdtermwidth = void 0;
const settings_1 = require("./settings");
function termwidth(stream) {
    if (!stream.isTTY) {
        return 80;
    }
    const width = stream.getWindowSize()[0];
    if (width < 1) {
        return 80;
    }
    if (width < 40) {
        return 40;
    }
    return width;
}
const columns = Number.parseInt(process.env.OCLIF_COLUMNS, 10) || settings_1.settings.columns;
exports.stdtermwidth = columns || termwidth(process.stdout);
exports.errtermwidth = columns || termwidth(process.stderr);

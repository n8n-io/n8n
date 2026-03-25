"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.segment = void 0;
function segment(...args) {
    const text = args[0];
    if (args.length === 1) {
        return text;
    }
    let source;
    let start;
    let end;
    let hasData = false;
    let data;
    if (typeof args[1] !== 'number') {
        source = args[1];
        start = typeof args[2] == 'number' ? args[2] : args[2][0];
        end = typeof args[2] == 'number' ? args[2] + text.length : args[2][1];
        hasData = args.length >= 4;
        if (hasData) {
            data = args[3];
        }
    }
    else {
        start = typeof args[1] == 'number' ? args[1] : args[1][0];
        end = typeof args[1] == 'number' ? args[1] + text.length : args[1][1];
        hasData = args.length >= 3;
        if (hasData) {
            data = args[2];
        }
    }
    if (hasData) {
        return [text, source, [start, end], data];
    }
    else {
        return [text, source, [start, end]];
    }
}
exports.segment = segment;
//# sourceMappingURL=segment.js.map
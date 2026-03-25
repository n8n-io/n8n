"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function makeError(code, message, options) {
    var line = options.line;
    var column = options.column;
    var filename = options.filename;
    var src = options.src;
    var fullMessage;
    var location = line + (column ? ':' + column : '');
    if (src && line >= 1 && line <= src.split('\n').length) {
        var lines = src.split('\n');
        var start_1 = Math.max(line - 3, 0);
        var end = Math.min(lines.length, line + 3);
        // Error context
        var context = lines
            .slice(start_1, end)
            .map(function (text, i) {
            var curr = i + start_1 + 1;
            var preamble = (curr == line ? '  > ' : '    ') + curr + '| ';
            var out = preamble + text;
            if (curr === line && column > 0) {
                out += '\n';
                out += Array(preamble.length + column).join('-') + '^';
            }
            return out;
        })
            .join('\n');
        fullMessage =
            (filename || 'Pug') + ':' + location + '\n' + context + '\n\n' + message;
    }
    else {
        fullMessage = (filename || 'Pug') + ':' + location + '\n\n' + message;
    }
    var err = new Error(fullMessage);
    err.code = 'PUG:' + code;
    err.msg = message;
    err.line = line;
    err.column = column;
    err.filename = filename;
    err.src = src;
    err.toJSON = function () {
        return {
            code: this.code,
            msg: this.msg,
            line: this.line,
            column: this.column,
            filename: this.filename,
        };
    };
    return err;
}
exports.default = makeError;
// Make this easier to use from CommonJS
module.exports = makeError;
module.exports.default = makeError;
//# sourceMappingURL=index.js.map
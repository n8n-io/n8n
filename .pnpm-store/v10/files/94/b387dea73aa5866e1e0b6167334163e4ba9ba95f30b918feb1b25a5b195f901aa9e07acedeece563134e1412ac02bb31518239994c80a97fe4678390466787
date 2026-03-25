"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var assert_1 = tslib_1.__importDefault(require("assert"));
var util_1 = require("./util");
var Mapping = /** @class */ (function () {
    function Mapping(sourceLines, sourceLoc, targetLoc) {
        if (targetLoc === void 0) { targetLoc = sourceLoc; }
        this.sourceLines = sourceLines;
        this.sourceLoc = sourceLoc;
        this.targetLoc = targetLoc;
    }
    Mapping.prototype.slice = function (lines, start, end) {
        if (end === void 0) { end = lines.lastPos(); }
        var sourceLines = this.sourceLines;
        var sourceLoc = this.sourceLoc;
        var targetLoc = this.targetLoc;
        function skip(name) {
            var sourceFromPos = sourceLoc[name];
            var targetFromPos = targetLoc[name];
            var targetToPos = start;
            if (name === "end") {
                targetToPos = end;
            }
            else {
                assert_1.default.strictEqual(name, "start");
            }
            return skipChars(sourceLines, sourceFromPos, lines, targetFromPos, targetToPos);
        }
        if (util_1.comparePos(start, targetLoc.start) <= 0) {
            if (util_1.comparePos(targetLoc.end, end) <= 0) {
                targetLoc = {
                    start: subtractPos(targetLoc.start, start.line, start.column),
                    end: subtractPos(targetLoc.end, start.line, start.column),
                };
                // The sourceLoc can stay the same because the contents of the
                // targetLoc have not changed.
            }
            else if (util_1.comparePos(end, targetLoc.start) <= 0) {
                return null;
            }
            else {
                sourceLoc = {
                    start: sourceLoc.start,
                    end: skip("end"),
                };
                targetLoc = {
                    start: subtractPos(targetLoc.start, start.line, start.column),
                    end: subtractPos(end, start.line, start.column),
                };
            }
        }
        else {
            if (util_1.comparePos(targetLoc.end, start) <= 0) {
                return null;
            }
            if (util_1.comparePos(targetLoc.end, end) <= 0) {
                sourceLoc = {
                    start: skip("start"),
                    end: sourceLoc.end,
                };
                targetLoc = {
                    // Same as subtractPos(start, start.line, start.column):
                    start: { line: 1, column: 0 },
                    end: subtractPos(targetLoc.end, start.line, start.column),
                };
            }
            else {
                sourceLoc = {
                    start: skip("start"),
                    end: skip("end"),
                };
                targetLoc = {
                    // Same as subtractPos(start, start.line, start.column):
                    start: { line: 1, column: 0 },
                    end: subtractPos(end, start.line, start.column),
                };
            }
        }
        return new Mapping(this.sourceLines, sourceLoc, targetLoc);
    };
    Mapping.prototype.add = function (line, column) {
        return new Mapping(this.sourceLines, this.sourceLoc, {
            start: addPos(this.targetLoc.start, line, column),
            end: addPos(this.targetLoc.end, line, column),
        });
    };
    Mapping.prototype.subtract = function (line, column) {
        return new Mapping(this.sourceLines, this.sourceLoc, {
            start: subtractPos(this.targetLoc.start, line, column),
            end: subtractPos(this.targetLoc.end, line, column),
        });
    };
    Mapping.prototype.indent = function (by, skipFirstLine, noNegativeColumns) {
        if (skipFirstLine === void 0) { skipFirstLine = false; }
        if (noNegativeColumns === void 0) { noNegativeColumns = false; }
        if (by === 0) {
            return this;
        }
        var targetLoc = this.targetLoc;
        var startLine = targetLoc.start.line;
        var endLine = targetLoc.end.line;
        if (skipFirstLine && startLine === 1 && endLine === 1) {
            return this;
        }
        targetLoc = {
            start: targetLoc.start,
            end: targetLoc.end,
        };
        if (!skipFirstLine || startLine > 1) {
            var startColumn = targetLoc.start.column + by;
            targetLoc.start = {
                line: startLine,
                column: noNegativeColumns ? Math.max(0, startColumn) : startColumn,
            };
        }
        if (!skipFirstLine || endLine > 1) {
            var endColumn = targetLoc.end.column + by;
            targetLoc.end = {
                line: endLine,
                column: noNegativeColumns ? Math.max(0, endColumn) : endColumn,
            };
        }
        return new Mapping(this.sourceLines, this.sourceLoc, targetLoc);
    };
    return Mapping;
}());
exports.default = Mapping;
function addPos(toPos, line, column) {
    return {
        line: toPos.line + line - 1,
        column: toPos.line === 1 ? toPos.column + column : toPos.column,
    };
}
function subtractPos(fromPos, line, column) {
    return {
        line: fromPos.line - line + 1,
        column: fromPos.line === line ? fromPos.column - column : fromPos.column,
    };
}
function skipChars(sourceLines, sourceFromPos, targetLines, targetFromPos, targetToPos) {
    var targetComparison = util_1.comparePos(targetFromPos, targetToPos);
    if (targetComparison === 0) {
        // Trivial case: no characters to skip.
        return sourceFromPos;
    }
    var sourceCursor, targetCursor;
    if (targetComparison < 0) {
        // Skipping forward.
        sourceCursor =
            sourceLines.skipSpaces(sourceFromPos) || sourceLines.lastPos();
        targetCursor =
            targetLines.skipSpaces(targetFromPos) || targetLines.lastPos();
        var lineDiff = targetToPos.line - targetCursor.line;
        sourceCursor.line += lineDiff;
        targetCursor.line += lineDiff;
        if (lineDiff > 0) {
            // If jumping to later lines, reset columns to the beginnings
            // of those lines.
            sourceCursor.column = 0;
            targetCursor.column = 0;
        }
        else {
            assert_1.default.strictEqual(lineDiff, 0);
        }
        while (util_1.comparePos(targetCursor, targetToPos) < 0 &&
            targetLines.nextPos(targetCursor, true)) {
            assert_1.default.ok(sourceLines.nextPos(sourceCursor, true));
            assert_1.default.strictEqual(sourceLines.charAt(sourceCursor), targetLines.charAt(targetCursor));
        }
    }
    else {
        // Skipping backward.
        sourceCursor =
            sourceLines.skipSpaces(sourceFromPos, true) || sourceLines.firstPos();
        targetCursor =
            targetLines.skipSpaces(targetFromPos, true) || targetLines.firstPos();
        var lineDiff = targetToPos.line - targetCursor.line;
        sourceCursor.line += lineDiff;
        targetCursor.line += lineDiff;
        if (lineDiff < 0) {
            // If jumping to earlier lines, reset columns to the ends of
            // those lines.
            sourceCursor.column = sourceLines.getLineLength(sourceCursor.line);
            targetCursor.column = targetLines.getLineLength(targetCursor.line);
        }
        else {
            assert_1.default.strictEqual(lineDiff, 0);
        }
        while (util_1.comparePos(targetToPos, targetCursor) < 0 &&
            targetLines.prevPos(targetCursor, true)) {
            assert_1.default.ok(sourceLines.prevPos(sourceCursor, true));
            assert_1.default.strictEqual(sourceLines.charAt(sourceCursor), targetLines.charAt(targetCursor));
        }
    }
    return sourceCursor;
}

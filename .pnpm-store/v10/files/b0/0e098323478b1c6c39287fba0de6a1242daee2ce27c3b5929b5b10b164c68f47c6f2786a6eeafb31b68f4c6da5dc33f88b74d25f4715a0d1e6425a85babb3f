"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTrailingCommaEnabled = exports.getParentExportDeclaration = exports.isExportDeclaration = exports.fixFaultyLocations = exports.getTrueLoc = exports.composeSourceMaps = exports.copyPos = exports.comparePos = exports.getUnionOfKeys = exports.getOption = exports.isBrowser = exports.getLineTerminator = void 0;
var tslib_1 = require("tslib");
var tiny_invariant_1 = tslib_1.__importDefault(require("tiny-invariant"));
var types = tslib_1.__importStar(require("ast-types"));
var n = types.namedTypes;
var source_map_1 = tslib_1.__importDefault(require("source-map"));
var SourceMapConsumer = source_map_1.default.SourceMapConsumer;
var SourceMapGenerator = source_map_1.default.SourceMapGenerator;
var hasOwn = Object.prototype.hasOwnProperty;
function getLineTerminator() {
    return isBrowser() ? "\n" : require("os").EOL || "\n";
}
exports.getLineTerminator = getLineTerminator;
function isBrowser() {
    return (typeof window !== "undefined" && typeof window.document !== "undefined");
}
exports.isBrowser = isBrowser;
function getOption(options, key, defaultValue) {
    if (options && hasOwn.call(options, key)) {
        return options[key];
    }
    return defaultValue;
}
exports.getOption = getOption;
function getUnionOfKeys() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var result = {};
    var argc = args.length;
    for (var i = 0; i < argc; ++i) {
        var keys = Object.keys(args[i]);
        var keyCount = keys.length;
        for (var j = 0; j < keyCount; ++j) {
            result[keys[j]] = true;
        }
    }
    return result;
}
exports.getUnionOfKeys = getUnionOfKeys;
function comparePos(pos1, pos2) {
    return pos1.line - pos2.line || pos1.column - pos2.column;
}
exports.comparePos = comparePos;
function copyPos(pos) {
    return {
        line: pos.line,
        column: pos.column,
    };
}
exports.copyPos = copyPos;
function composeSourceMaps(formerMap, latterMap) {
    if (formerMap) {
        if (!latterMap) {
            return formerMap;
        }
    }
    else {
        return latterMap || null;
    }
    var smcFormer = new SourceMapConsumer(formerMap);
    var smcLatter = new SourceMapConsumer(latterMap);
    var smg = new SourceMapGenerator({
        file: latterMap.file,
        sourceRoot: latterMap.sourceRoot,
    });
    var sourcesToContents = {};
    smcLatter.eachMapping(function (mapping) {
        var origPos = smcFormer.originalPositionFor({
            line: mapping.originalLine,
            column: mapping.originalColumn,
        });
        var sourceName = origPos.source;
        if (sourceName === null) {
            return;
        }
        smg.addMapping({
            source: sourceName,
            original: copyPos(origPos),
            generated: {
                line: mapping.generatedLine,
                column: mapping.generatedColumn,
            },
            name: mapping.name,
        });
        var sourceContent = smcFormer.sourceContentFor(sourceName);
        if (sourceContent && !hasOwn.call(sourcesToContents, sourceName)) {
            sourcesToContents[sourceName] = sourceContent;
            smg.setSourceContent(sourceName, sourceContent);
        }
    });
    return smg.toJSON();
}
exports.composeSourceMaps = composeSourceMaps;
function getTrueLoc(node, lines) {
    // It's possible that node is newly-created (not parsed by Esprima),
    // in which case it probably won't have a .loc property (or an
    // .original property for that matter). That's fine; we'll just
    // pretty-print it as usual.
    if (!node.loc) {
        return null;
    }
    var result = {
        start: node.loc.start,
        end: node.loc.end,
    };
    function include(node) {
        expandLoc(result, node.loc);
    }
    // If the node is an export declaration and its .declaration has any
    // decorators, their locations might contribute to the true start/end
    // positions of the export declaration node.
    if (node.declaration &&
        node.declaration.decorators &&
        isExportDeclaration(node)) {
        node.declaration.decorators.forEach(include);
    }
    if (comparePos(result.start, result.end) < 0) {
        // Trim leading whitespace.
        result.start = copyPos(result.start);
        lines.skipSpaces(result.start, false, true);
        if (comparePos(result.start, result.end) < 0) {
            // Trim trailing whitespace, if the end location is not already the
            // same as the start location.
            result.end = copyPos(result.end);
            lines.skipSpaces(result.end, true, true);
        }
    }
    // If the node has any comments, their locations might contribute to
    // the true start/end positions of the node.
    if (node.comments) {
        node.comments.forEach(include);
    }
    return result;
}
exports.getTrueLoc = getTrueLoc;
function expandLoc(parentLoc, childLoc) {
    if (parentLoc && childLoc) {
        if (comparePos(childLoc.start, parentLoc.start) < 0) {
            parentLoc.start = childLoc.start;
        }
        if (comparePos(parentLoc.end, childLoc.end) < 0) {
            parentLoc.end = childLoc.end;
        }
    }
}
function fixFaultyLocations(node, lines) {
    var loc = node.loc;
    if (loc) {
        if (loc.start.line < 1) {
            loc.start.line = 1;
        }
        if (loc.end.line < 1) {
            loc.end.line = 1;
        }
    }
    if (node.type === "File") {
        // Babylon returns File nodes whose .loc.{start,end} do not include
        // leading or trailing whitespace.
        loc.start = lines.firstPos();
        loc.end = lines.lastPos();
    }
    fixForLoopHead(node, lines);
    fixTemplateLiteral(node, lines);
    if (loc && node.decorators) {
        // Expand the .loc of the node responsible for printing the decorators
        // (here, the decorated node) so that it includes node.decorators.
        node.decorators.forEach(function (decorator) {
            expandLoc(loc, decorator.loc);
        });
    }
    else if (node.declaration && isExportDeclaration(node)) {
        // Nullify .loc information for the child declaration so that we never
        // try to reprint it without also reprinting the export declaration.
        node.declaration.loc = null;
        // Expand the .loc of the node responsible for printing the decorators
        // (here, the export declaration) so that it includes node.decorators.
        var decorators = node.declaration.decorators;
        if (decorators) {
            decorators.forEach(function (decorator) {
                expandLoc(loc, decorator.loc);
            });
        }
    }
    else if ((n.MethodDefinition && n.MethodDefinition.check(node)) ||
        (n.Property.check(node) && (node.method || node.shorthand))) {
        // If the node is a MethodDefinition or a .method or .shorthand
        // Property, then the location information stored in
        // node.value.loc is very likely untrustworthy (just the {body}
        // part of a method, or nothing in the case of shorthand
        // properties), so we null out that information to prevent
        // accidental reuse of bogus source code during reprinting.
        node.value.loc = null;
        if (n.FunctionExpression.check(node.value)) {
            // FunctionExpression method values should be anonymous,
            // because their .id fields are ignored anyway.
            node.value.id = null;
        }
    }
    else if (node.type === "ObjectTypeProperty") {
        var loc_1 = node.loc;
        var end = loc_1 && loc_1.end;
        if (end) {
            end = copyPos(end);
            if (lines.prevPos(end) && lines.charAt(end) === ",") {
                // Some parsers accidentally include trailing commas in the
                // .loc.end information for ObjectTypeProperty nodes.
                if ((end = lines.skipSpaces(end, true, true))) {
                    loc_1.end = end;
                }
            }
        }
    }
}
exports.fixFaultyLocations = fixFaultyLocations;
function fixForLoopHead(node, lines) {
    if (node.type !== "ForStatement") {
        return;
    }
    function fix(child) {
        var loc = child && child.loc;
        var start = loc && loc.start;
        var end = loc && copyPos(loc.end);
        while (start && end && comparePos(start, end) < 0) {
            lines.prevPos(end);
            if (lines.charAt(end) === ";") {
                // Update child.loc.end to *exclude* the ';' character.
                loc.end.line = end.line;
                loc.end.column = end.column;
            }
            else {
                break;
            }
        }
    }
    fix(node.init);
    fix(node.test);
    fix(node.update);
}
function fixTemplateLiteral(node, lines) {
    if (node.type !== "TemplateLiteral") {
        return;
    }
    if (node.quasis.length === 0) {
        // If there are no quasi elements, then there is nothing to fix.
        return;
    }
    // node.loc is not present when using export default with a template literal
    if (node.loc) {
        // First we need to exclude the opening ` from the .loc of the first
        // quasi element, in case the parser accidentally decided to include it.
        var afterLeftBackTickPos = copyPos(node.loc.start);
        (0, tiny_invariant_1.default)(lines.charAt(afterLeftBackTickPos) === "`");
        (0, tiny_invariant_1.default)(lines.nextPos(afterLeftBackTickPos));
        var firstQuasi = node.quasis[0];
        if (comparePos(firstQuasi.loc.start, afterLeftBackTickPos) < 0) {
            firstQuasi.loc.start = afterLeftBackTickPos;
        }
        // Next we need to exclude the closing ` from the .loc of the last quasi
        // element, in case the parser accidentally decided to include it.
        var rightBackTickPos = copyPos(node.loc.end);
        (0, tiny_invariant_1.default)(lines.prevPos(rightBackTickPos));
        (0, tiny_invariant_1.default)(lines.charAt(rightBackTickPos) === "`");
        var lastQuasi = node.quasis[node.quasis.length - 1];
        if (comparePos(rightBackTickPos, lastQuasi.loc.end) < 0) {
            lastQuasi.loc.end = rightBackTickPos;
        }
    }
    // Now we need to exclude ${ and } characters from the .loc's of all
    // quasi elements, since some parsers accidentally include them.
    node.expressions.forEach(function (expr, i) {
        // Rewind from expr.loc.start over any whitespace and the ${ that
        // precedes the expression. The position of the $ should be the same
        // as the .loc.end of the preceding quasi element, but some parsers
        // accidentally include the ${ in the .loc of the quasi element.
        var dollarCurlyPos = lines.skipSpaces(expr.loc.start, true, false);
        if (lines.prevPos(dollarCurlyPos) &&
            lines.charAt(dollarCurlyPos) === "{" &&
            lines.prevPos(dollarCurlyPos) &&
            lines.charAt(dollarCurlyPos) === "$") {
            var quasiBefore = node.quasis[i];
            if (comparePos(dollarCurlyPos, quasiBefore.loc.end) < 0) {
                quasiBefore.loc.end = dollarCurlyPos;
            }
        }
        // Likewise, some parsers accidentally include the } that follows
        // the expression in the .loc of the following quasi element.
        var rightCurlyPos = lines.skipSpaces(expr.loc.end, false, false);
        if (lines.charAt(rightCurlyPos) === "}") {
            (0, tiny_invariant_1.default)(lines.nextPos(rightCurlyPos));
            // Now rightCurlyPos is technically the position just after the }.
            var quasiAfter = node.quasis[i + 1];
            if (comparePos(quasiAfter.loc.start, rightCurlyPos) < 0) {
                quasiAfter.loc.start = rightCurlyPos;
            }
        }
    });
}
function isExportDeclaration(node) {
    if (node)
        switch (node.type) {
            case "ExportDeclaration":
            case "ExportDefaultDeclaration":
            case "ExportDefaultSpecifier":
            case "DeclareExportDeclaration":
            case "ExportNamedDeclaration":
            case "ExportAllDeclaration":
                return true;
        }
    return false;
}
exports.isExportDeclaration = isExportDeclaration;
function getParentExportDeclaration(path) {
    var parentNode = path.getParentNode();
    if (path.getName() === "declaration" && isExportDeclaration(parentNode)) {
        return parentNode;
    }
    return null;
}
exports.getParentExportDeclaration = getParentExportDeclaration;
function isTrailingCommaEnabled(options, context) {
    var trailingComma = options.trailingComma;
    if (typeof trailingComma === "object") {
        return !!trailingComma[context];
    }
    return !!trailingComma;
}
exports.isTrailingCommaEnabled = isTrailingCommaEnabled;

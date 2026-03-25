"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Printer = void 0;
var tslib_1 = require("tslib");
var tiny_invariant_1 = tslib_1.__importDefault(require("tiny-invariant"));
var types = tslib_1.__importStar(require("ast-types"));
var comments_1 = require("./comments");
var fast_path_1 = tslib_1.__importDefault(require("./fast-path"));
var lines_1 = require("./lines");
var options_1 = require("./options");
var patcher_1 = require("./patcher");
var util = tslib_1.__importStar(require("./util"));
var namedTypes = types.namedTypes;
var isString = types.builtInTypes.string;
var isObject = types.builtInTypes.object;
var PrintResult = function PrintResult(code, sourceMap) {
    (0, tiny_invariant_1.default)(this instanceof PrintResult);
    isString.assert(code);
    this.code = code;
    if (sourceMap) {
        isObject.assert(sourceMap);
        this.map = sourceMap;
    }
};
var PRp = PrintResult.prototype;
var warnedAboutToString = false;
PRp.toString = function () {
    if (!warnedAboutToString) {
        console.warn("Deprecation warning: recast.print now returns an object with " +
            "a .code property. You appear to be treating the object as a " +
            "string, which might still work but is strongly discouraged.");
        warnedAboutToString = true;
    }
    return this.code;
};
var emptyPrintResult = new PrintResult("");
var Printer = function Printer(config) {
    (0, tiny_invariant_1.default)(this instanceof Printer);
    var explicitTabWidth = config && config.tabWidth;
    config = (0, options_1.normalize)(config);
    // It's common for client code to pass the same options into both
    // recast.parse and recast.print, but the Printer doesn't need (and
    // can be confused by) config.sourceFileName, so we null it out.
    config.sourceFileName = null;
    // Non-destructively modifies options with overrides, and returns a
    // new print function that uses the modified options.
    function makePrintFunctionWith(options, overrides) {
        options = Object.assign({}, options, overrides);
        return function (path) { return print(path, options); };
    }
    function print(path, options) {
        (0, tiny_invariant_1.default)(path instanceof fast_path_1.default);
        options = options || {};
        if (options.includeComments) {
            return (0, comments_1.printComments)(path, makePrintFunctionWith(options, {
                includeComments: false,
            }));
        }
        var oldTabWidth = config.tabWidth;
        if (!explicitTabWidth) {
            var loc = path.getNode().loc;
            if (loc && loc.lines && loc.lines.guessTabWidth) {
                config.tabWidth = loc.lines.guessTabWidth();
            }
        }
        var reprinter = (0, patcher_1.getReprinter)(path);
        var lines = reprinter
            ? // Since the print function that we pass to the reprinter will
                // be used to print "new" nodes, it's tempting to think we
                // should pass printRootGenerically instead of print, to avoid
                // calling maybeReprint again, but that would be a mistake
                // because the new nodes might not be entirely new, but merely
                // moved from elsewhere in the AST. The print function is the
                // right choice because it gives us the opportunity to reprint
                // such nodes using their original source.
                reprinter(print)
            : genericPrint(path, config, options, makePrintFunctionWith(options, {
                includeComments: true,
                avoidRootParens: false,
            }));
        config.tabWidth = oldTabWidth;
        return lines;
    }
    this.print = function (ast) {
        if (!ast) {
            return emptyPrintResult;
        }
        var lines = print(fast_path_1.default.from(ast), {
            includeComments: true,
            avoidRootParens: false,
        });
        return new PrintResult(lines.toString(config), util.composeSourceMaps(config.inputSourceMap, lines.getSourceMap(config.sourceMapName, config.sourceRoot)));
    };
    this.printGenerically = function (ast) {
        if (!ast) {
            return emptyPrintResult;
        }
        // Print the entire AST generically.
        function printGenerically(path) {
            return (0, comments_1.printComments)(path, function (path) {
                return genericPrint(path, config, {
                    includeComments: true,
                    avoidRootParens: false,
                }, printGenerically);
            });
        }
        var path = fast_path_1.default.from(ast);
        var oldReuseWhitespace = config.reuseWhitespace;
        // Do not reuse whitespace (or anything else, for that matter)
        // when printing generically.
        config.reuseWhitespace = false;
        // TODO Allow printing of comments?
        var pr = new PrintResult(printGenerically(path).toString(config));
        config.reuseWhitespace = oldReuseWhitespace;
        return pr;
    };
};
exports.Printer = Printer;
function genericPrint(path, config, options, printPath) {
    (0, tiny_invariant_1.default)(path instanceof fast_path_1.default);
    var node = path.getValue();
    var parts = [];
    var linesWithoutParens = genericPrintNoParens(path, config, printPath);
    if (!node || linesWithoutParens.isEmpty()) {
        return linesWithoutParens;
    }
    var shouldAddParens = false;
    var decoratorsLines = printDecorators(path, printPath);
    if (decoratorsLines.isEmpty()) {
        // Nodes with decorators can't have parentheses, so we can avoid
        // computing path.needsParens() except in this case.
        if (!options.avoidRootParens) {
            shouldAddParens = path.needsParens();
        }
    }
    else {
        parts.push(decoratorsLines);
    }
    if (shouldAddParens) {
        parts.unshift("(");
    }
    parts.push(linesWithoutParens);
    if (shouldAddParens) {
        parts.push(")");
    }
    return (0, lines_1.concat)(parts);
}
// Note that the `options` parameter of this function is what other
// functions in this file call the `config` object (that is, the
// configuration object originally passed into the Printer constructor).
// Its properties are documented in lib/options.js.
function genericPrintNoParens(path, options, print) {
    var n = path.getValue();
    if (!n) {
        return (0, lines_1.fromString)("");
    }
    if (typeof n === "string") {
        return (0, lines_1.fromString)(n, options);
    }
    namedTypes.Printable.assert(n);
    var parts = [];
    switch (n.type) {
        case "File":
            return path.call(print, "program");
        case "Program":
            // Babel 6
            if (n.directives) {
                path.each(function (childPath) {
                    parts.push(print(childPath), ";\n");
                }, "directives");
            }
            if (n.interpreter) {
                parts.push(path.call(print, "interpreter"));
            }
            parts.push(path.call(function (bodyPath) { return printStatementSequence(bodyPath, options, print); }, "body"));
            return (0, lines_1.concat)(parts);
        case "Noop": // Babel extension.
        case "EmptyStatement":
            return (0, lines_1.fromString)("");
        case "ExpressionStatement":
            return (0, lines_1.concat)([path.call(print, "expression"), ";"]);
        case "ParenthesizedExpression": // Babel extension.
            return (0, lines_1.concat)(["(", path.call(print, "expression"), ")"]);
        case "BinaryExpression":
        case "LogicalExpression":
        case "AssignmentExpression":
            return (0, lines_1.fromString)(" ").join([
                path.call(print, "left"),
                n.operator,
                path.call(print, "right"),
            ]);
        case "AssignmentPattern":
            return (0, lines_1.concat)([
                path.call(print, "left"),
                " = ",
                path.call(print, "right"),
            ]);
        case "MemberExpression":
        case "OptionalMemberExpression": {
            parts.push(path.call(print, "object"));
            var property = path.call(print, "property");
            // Like n.optional, except with defaults applied, so optional
            // defaults to true for OptionalMemberExpression nodes.
            var optional = types.getFieldValue(n, "optional");
            if (n.computed) {
                parts.push(optional ? "?.[" : "[", property, "]");
            }
            else {
                parts.push(optional ? "?." : ".", property);
            }
            return (0, lines_1.concat)(parts);
        }
        case "ChainExpression":
            return path.call(print, "expression");
        case "MetaProperty":
            return (0, lines_1.concat)([
                path.call(print, "meta"),
                ".",
                path.call(print, "property"),
            ]);
        case "BindExpression":
            if (n.object) {
                parts.push(path.call(print, "object"));
            }
            parts.push("::", path.call(print, "callee"));
            return (0, lines_1.concat)(parts);
        case "Path":
            return (0, lines_1.fromString)(".").join(n.body);
        case "Identifier":
            return (0, lines_1.concat)([
                (0, lines_1.fromString)(n.name, options),
                n.optional ? "?" : "",
                path.call(print, "typeAnnotation"),
            ]);
        case "SpreadElement":
        case "SpreadElementPattern":
        case "RestProperty": // Babel 6 for ObjectPattern
        case "SpreadProperty":
        case "SpreadPropertyPattern":
        case "ObjectTypeSpreadProperty":
        case "RestElement":
            return (0, lines_1.concat)([
                "...",
                path.call(print, "argument"),
                path.call(print, "typeAnnotation"),
            ]);
        case "FunctionDeclaration":
        case "FunctionExpression":
        case "TSDeclareFunction":
            if (n.declare) {
                parts.push("declare ");
            }
            if (n.async) {
                parts.push("async ");
            }
            parts.push("function");
            if (n.generator)
                parts.push("*");
            if (n.id) {
                parts.push(" ", path.call(print, "id"), path.call(print, "typeParameters"));
            }
            else {
                if (n.typeParameters) {
                    parts.push(path.call(print, "typeParameters"));
                }
            }
            parts.push("(", printFunctionParams(path, options, print), ")", path.call(print, "returnType"));
            if (n.body) {
                parts.push(" ", path.call(print, "body"));
            }
            return (0, lines_1.concat)(parts);
        case "ArrowFunctionExpression":
            if (n.async) {
                parts.push("async ");
            }
            if (n.typeParameters) {
                parts.push(path.call(print, "typeParameters"));
            }
            if (!options.arrowParensAlways &&
                n.params.length === 1 &&
                !n.rest &&
                n.params[0].type === "Identifier" &&
                !n.params[0].typeAnnotation &&
                !n.returnType) {
                parts.push(path.call(print, "params", 0));
            }
            else {
                parts.push("(", printFunctionParams(path, options, print), ")", path.call(print, "returnType"));
            }
            parts.push(" => ", path.call(print, "body"));
            return (0, lines_1.concat)(parts);
        case "MethodDefinition":
            return printMethod(path, options, print);
        case "YieldExpression":
            parts.push("yield");
            if (n.delegate)
                parts.push("*");
            if (n.argument)
                parts.push(" ", path.call(print, "argument"));
            return (0, lines_1.concat)(parts);
        case "AwaitExpression":
            parts.push("await");
            if (n.all)
                parts.push("*");
            if (n.argument)
                parts.push(" ", path.call(print, "argument"));
            return (0, lines_1.concat)(parts);
        case "ModuleExpression":
            return (0, lines_1.concat)([
                "module {\n",
                path.call(print, "body").indent(options.tabWidth),
                "\n}",
            ]);
        case "ModuleDeclaration":
            parts.push("module", path.call(print, "id"));
            if (n.source) {
                (0, tiny_invariant_1.default)(!n.body);
                parts.push("from", path.call(print, "source"));
            }
            else {
                parts.push(path.call(print, "body"));
            }
            return (0, lines_1.fromString)(" ").join(parts);
        case "ImportSpecifier":
            if (n.importKind && n.importKind !== "value") {
                parts.push(n.importKind + " ");
            }
            if (n.imported) {
                parts.push(path.call(print, "imported"));
                if (n.local && n.local.name !== n.imported.name) {
                    parts.push(" as ", path.call(print, "local"));
                }
            }
            else if (n.id) {
                parts.push(path.call(print, "id"));
                if (n.name) {
                    parts.push(" as ", path.call(print, "name"));
                }
            }
            return (0, lines_1.concat)(parts);
        case "ExportSpecifier":
            if (n.exportKind && n.exportKind !== "value") {
                parts.push(n.exportKind + " ");
            }
            if (n.local) {
                parts.push(path.call(print, "local"));
                if (n.exported && n.exported.name !== n.local.name) {
                    parts.push(" as ", path.call(print, "exported"));
                }
            }
            else if (n.id) {
                parts.push(path.call(print, "id"));
                if (n.name) {
                    parts.push(" as ", path.call(print, "name"));
                }
            }
            return (0, lines_1.concat)(parts);
        case "ExportBatchSpecifier":
            return (0, lines_1.fromString)("*");
        case "ImportNamespaceSpecifier":
            parts.push("* as ");
            if (n.local) {
                parts.push(path.call(print, "local"));
            }
            else if (n.id) {
                parts.push(path.call(print, "id"));
            }
            return (0, lines_1.concat)(parts);
        case "ImportDefaultSpecifier":
            if (n.local) {
                return path.call(print, "local");
            }
            return path.call(print, "id");
        case "TSExportAssignment":
            return (0, lines_1.concat)(["export = ", path.call(print, "expression")]);
        case "ExportDeclaration":
        case "ExportDefaultDeclaration":
        case "ExportNamedDeclaration":
            return printExportDeclaration(path, options, print);
        case "ExportAllDeclaration":
            parts.push("export *");
            if (n.exported) {
                parts.push(" as ", path.call(print, "exported"));
            }
            parts.push(" from ", path.call(print, "source"), ";");
            return (0, lines_1.concat)(parts);
        case "TSNamespaceExportDeclaration":
            parts.push("export as namespace ", path.call(print, "id"));
            return maybeAddSemicolon((0, lines_1.concat)(parts));
        case "ExportNamespaceSpecifier":
            return (0, lines_1.concat)(["* as ", path.call(print, "exported")]);
        case "ExportDefaultSpecifier":
            return path.call(print, "exported");
        case "Import":
            return (0, lines_1.fromString)("import", options);
        // Recast and ast-types currently support dynamic import(...) using
        // either this dedicated ImportExpression type or a CallExpression
        // whose callee has type Import.
        // https://github.com/benjamn/ast-types/pull/365#issuecomment-605214486
        case "ImportExpression":
            return (0, lines_1.concat)(["import(", path.call(print, "source"), ")"]);
        case "ImportDeclaration": {
            parts.push("import ");
            if (n.importKind && n.importKind !== "value") {
                parts.push(n.importKind + " ");
            }
            if (n.specifiers && n.specifiers.length > 0) {
                var unbracedSpecifiers_1 = [];
                var bracedSpecifiers_1 = [];
                path.each(function (specifierPath) {
                    var spec = specifierPath.getValue();
                    if (spec.type === "ImportSpecifier") {
                        bracedSpecifiers_1.push(print(specifierPath));
                    }
                    else if (spec.type === "ImportDefaultSpecifier" ||
                        spec.type === "ImportNamespaceSpecifier") {
                        unbracedSpecifiers_1.push(print(specifierPath));
                    }
                }, "specifiers");
                unbracedSpecifiers_1.forEach(function (lines, i) {
                    if (i > 0) {
                        parts.push(", ");
                    }
                    parts.push(lines);
                });
                if (bracedSpecifiers_1.length > 0) {
                    var lines = (0, lines_1.fromString)(", ").join(bracedSpecifiers_1);
                    if (lines.getLineLength(1) > options.wrapColumn) {
                        lines = (0, lines_1.concat)([
                            (0, lines_1.fromString)(",\n").join(bracedSpecifiers_1).indent(options.tabWidth),
                            ",",
                        ]);
                    }
                    if (unbracedSpecifiers_1.length > 0) {
                        parts.push(", ");
                    }
                    if (lines.length > 1) {
                        parts.push("{\n", lines, "\n}");
                    }
                    else if (options.objectCurlySpacing) {
                        parts.push("{ ", lines, " }");
                    }
                    else {
                        parts.push("{", lines, "}");
                    }
                }
                parts.push(" from ");
            }
            parts.push(path.call(print, "source"), maybePrintImportAssertions(path, options, print), ";");
            return (0, lines_1.concat)(parts);
        }
        case "ImportAttribute":
            return (0, lines_1.concat)([path.call(print, "key"), ": ", path.call(print, "value")]);
        case "StaticBlock":
            parts.push("static ");
        // Intentionally fall through to BlockStatement below.
        case "BlockStatement": {
            var naked_1 = path.call(function (bodyPath) { return printStatementSequence(bodyPath, options, print); }, "body");
            if (naked_1.isEmpty()) {
                if (!n.directives || n.directives.length === 0) {
                    parts.push("{}");
                    return (0, lines_1.concat)(parts);
                }
            }
            parts.push("{\n");
            // Babel 6
            if (n.directives) {
                path.each(function (childPath) {
                    parts.push(maybeAddSemicolon(print(childPath).indent(options.tabWidth)), n.directives.length > 1 || !naked_1.isEmpty() ? "\n" : "");
                }, "directives");
            }
            parts.push(naked_1.indent(options.tabWidth));
            parts.push("\n}");
            return (0, lines_1.concat)(parts);
        }
        case "ReturnStatement": {
            parts.push("return");
            if (n.argument) {
                var argLines = path.call(print, "argument");
                if (argLines.startsWithComment() ||
                    (argLines.length > 1 &&
                        namedTypes.JSXElement &&
                        namedTypes.JSXElement.check(n.argument))) {
                    parts.push(" (\n", argLines.indent(options.tabWidth), "\n)");
                }
                else {
                    parts.push(" ", argLines);
                }
            }
            parts.push(";");
            return (0, lines_1.concat)(parts);
        }
        case "CallExpression":
        case "OptionalCallExpression":
            parts.push(path.call(print, "callee"));
            if (n.typeParameters) {
                parts.push(path.call(print, "typeParameters"));
            }
            if (n.typeArguments) {
                parts.push(path.call(print, "typeArguments"));
            }
            // Like n.optional, but defaults to true for OptionalCallExpression
            // nodes that are missing an n.optional property (unusual),
            // according to the OptionalCallExpression definition in ast-types.
            if (types.getFieldValue(n, "optional")) {
                parts.push("?.");
            }
            parts.push(printArgumentsList(path, options, print));
            return (0, lines_1.concat)(parts);
        case "RecordExpression":
            parts.push("#");
        // Intentionally fall through to printing the object literal...
        case "ObjectExpression":
        case "ObjectPattern":
        case "ObjectTypeAnnotation": {
            var isTypeAnnotation_1 = n.type === "ObjectTypeAnnotation";
            var separator_1 = options.flowObjectCommas
                ? ","
                : isTypeAnnotation_1
                    ? ";"
                    : ",";
            var fields = [];
            var allowBreak_1 = false;
            if (isTypeAnnotation_1) {
                fields.push("indexers", "callProperties");
                if (n.internalSlots != null) {
                    fields.push("internalSlots");
                }
            }
            fields.push("properties");
            var len_1 = 0;
            fields.forEach(function (field) {
                len_1 += n[field].length;
            });
            var oneLine_1 = (isTypeAnnotation_1 && len_1 === 1) || len_1 === 0;
            var leftBrace = n.exact ? "{|" : "{";
            var rightBrace = n.exact ? "|}" : "}";
            parts.push(oneLine_1 ? leftBrace : leftBrace + "\n");
            var leftBraceIndex = parts.length - 1;
            var i_1 = 0;
            fields.forEach(function (field) {
                path.each(function (childPath) {
                    var lines = print(childPath);
                    if (!oneLine_1) {
                        lines = lines.indent(options.tabWidth);
                    }
                    var multiLine = !isTypeAnnotation_1 && lines.length > 1;
                    if (multiLine && allowBreak_1) {
                        // Similar to the logic for BlockStatement.
                        parts.push("\n");
                    }
                    parts.push(lines);
                    if (i_1 < len_1 - 1) {
                        // Add an extra line break if the previous object property
                        // had a multi-line value.
                        parts.push(separator_1 + (multiLine ? "\n\n" : "\n"));
                        allowBreak_1 = !multiLine;
                    }
                    else if (len_1 !== 1 && isTypeAnnotation_1) {
                        parts.push(separator_1);
                    }
                    else if (!oneLine_1 &&
                        util.isTrailingCommaEnabled(options, "objects") &&
                        childPath.getValue().type !== "RestElement") {
                        parts.push(separator_1);
                    }
                    i_1++;
                }, field);
            });
            if (n.inexact) {
                var line = (0, lines_1.fromString)("...", options);
                if (oneLine_1) {
                    if (len_1 > 0) {
                        parts.push(separator_1, " ");
                    }
                    parts.push(line);
                }
                else {
                    // No trailing separator after ... to maintain parity with prettier.
                    parts.push("\n", line.indent(options.tabWidth));
                }
            }
            parts.push(oneLine_1 ? rightBrace : "\n" + rightBrace);
            if (i_1 !== 0 && oneLine_1 && options.objectCurlySpacing) {
                parts[leftBraceIndex] = leftBrace + " ";
                parts[parts.length - 1] = " " + rightBrace;
            }
            if (n.typeAnnotation) {
                parts.push(path.call(print, "typeAnnotation"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "PropertyPattern":
            return (0, lines_1.concat)([
                path.call(print, "key"),
                ": ",
                path.call(print, "pattern"),
            ]);
        case "ObjectProperty": // Babel 6
        case "Property": {
            // Non-standard AST node type.
            if (n.method || n.kind === "get" || n.kind === "set") {
                return printMethod(path, options, print);
            }
            if (n.shorthand && n.value.type === "AssignmentPattern") {
                return path.call(print, "value");
            }
            var key = path.call(print, "key");
            if (n.computed) {
                parts.push("[", key, "]");
            }
            else {
                parts.push(key);
            }
            if (!n.shorthand || n.key.name !== n.value.name) {
                parts.push(": ", path.call(print, "value"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "ClassMethod": // Babel 6
        case "ObjectMethod": // Babel 6
        case "ClassPrivateMethod":
        case "TSDeclareMethod":
            return printMethod(path, options, print);
        case "PrivateName":
            return (0, lines_1.concat)(["#", path.call(print, "id")]);
        case "Decorator":
            return (0, lines_1.concat)(["@", path.call(print, "expression")]);
        case "TupleExpression":
            parts.push("#");
        // Intentionally fall through to printing the tuple elements...
        case "ArrayExpression":
        case "ArrayPattern": {
            var elems = n.elements;
            var len_2 = elems.length;
            var printed_1 = path.map(print, "elements");
            var joined = (0, lines_1.fromString)(", ").join(printed_1);
            var oneLine_2 = joined.getLineLength(1) <= options.wrapColumn;
            if (oneLine_2) {
                if (options.arrayBracketSpacing) {
                    parts.push("[ ");
                }
                else {
                    parts.push("[");
                }
            }
            else {
                parts.push("[\n");
            }
            path.each(function (elemPath) {
                var i = elemPath.getName();
                var elem = elemPath.getValue();
                if (!elem) {
                    // If the array expression ends with a hole, that hole
                    // will be ignored by the interpreter, but if it ends with
                    // two (or more) holes, we need to write out two (or more)
                    // commas so that the resulting code is interpreted with
                    // both (all) of the holes.
                    parts.push(",");
                }
                else {
                    var lines = printed_1[i];
                    if (oneLine_2) {
                        if (i > 0)
                            parts.push(" ");
                    }
                    else {
                        lines = lines.indent(options.tabWidth);
                    }
                    parts.push(lines);
                    if (i < len_2 - 1 ||
                        (!oneLine_2 && util.isTrailingCommaEnabled(options, "arrays")))
                        parts.push(",");
                    if (!oneLine_2)
                        parts.push("\n");
                }
            }, "elements");
            if (oneLine_2 && options.arrayBracketSpacing) {
                parts.push(" ]");
            }
            else {
                parts.push("]");
            }
            if (n.typeAnnotation) {
                parts.push(path.call(print, "typeAnnotation"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "SequenceExpression":
            return (0, lines_1.fromString)(", ").join(path.map(print, "expressions"));
        case "ThisExpression":
            return (0, lines_1.fromString)("this");
        case "Super":
            return (0, lines_1.fromString)("super");
        case "NullLiteral": // Babel 6 Literal split
            return (0, lines_1.fromString)("null");
        case "RegExpLiteral": // Babel 6 Literal split
            return (0, lines_1.fromString)(getPossibleRaw(n) || "/".concat(n.pattern, "/").concat(n.flags || ""), options);
        case "BigIntLiteral": // Babel 7 Literal split
            return (0, lines_1.fromString)(getPossibleRaw(n) || n.value + "n", options);
        case "NumericLiteral": // Babel 6 Literal Split
            return (0, lines_1.fromString)(getPossibleRaw(n) || n.value, options);
        case "DecimalLiteral":
            return (0, lines_1.fromString)(getPossibleRaw(n) || n.value + "m", options);
        case "StringLiteral":
            return (0, lines_1.fromString)(nodeStr(n.value, options));
        case "BooleanLiteral": // Babel 6 Literal split
        case "Literal":
            return (0, lines_1.fromString)(getPossibleRaw(n) ||
                (typeof n.value === "string" ? nodeStr(n.value, options) : n.value), options);
        case "Directive": // Babel 6
            return path.call(print, "value");
        case "DirectiveLiteral": // Babel 6
            return (0, lines_1.fromString)(getPossibleRaw(n) || nodeStr(n.value, options), options);
        case "InterpreterDirective":
            return (0, lines_1.fromString)("#!".concat(n.value, "\n"), options);
        case "ModuleSpecifier":
            if (n.local) {
                throw new Error("The ESTree ModuleSpecifier type should be abstract");
            }
            // The Esprima ModuleSpecifier type is just a string-valued
            // Literal identifying the imported-from module.
            return (0, lines_1.fromString)(nodeStr(n.value, options), options);
        case "UnaryExpression":
            parts.push(n.operator);
            if (/[a-z]$/.test(n.operator))
                parts.push(" ");
            parts.push(path.call(print, "argument"));
            return (0, lines_1.concat)(parts);
        case "UpdateExpression":
            parts.push(path.call(print, "argument"), n.operator);
            if (n.prefix)
                parts.reverse();
            return (0, lines_1.concat)(parts);
        case "ConditionalExpression":
            return (0, lines_1.concat)([
                path.call(print, "test"),
                " ? ",
                path.call(print, "consequent"),
                " : ",
                path.call(print, "alternate"),
            ]);
        case "NewExpression": {
            parts.push("new ", path.call(print, "callee"));
            if (n.typeParameters) {
                parts.push(path.call(print, "typeParameters"));
            }
            if (n.typeArguments) {
                parts.push(path.call(print, "typeArguments"));
            }
            var args = n.arguments;
            if (args) {
                parts.push(printArgumentsList(path, options, print));
            }
            return (0, lines_1.concat)(parts);
        }
        case "VariableDeclaration": {
            if (n.declare) {
                parts.push("declare ");
            }
            parts.push(n.kind, " ");
            var maxLen_1 = 0;
            var printed = path.map(function (childPath) {
                var lines = print(childPath);
                maxLen_1 = Math.max(lines.length, maxLen_1);
                return lines;
            }, "declarations");
            if (maxLen_1 === 1) {
                parts.push((0, lines_1.fromString)(", ").join(printed));
            }
            else if (printed.length > 1) {
                parts.push((0, lines_1.fromString)(",\n")
                    .join(printed)
                    .indentTail(n.kind.length + 1));
            }
            else {
                parts.push(printed[0]);
            }
            // We generally want to terminate all variable declarations with a
            // semicolon, except when they are children of for loops.
            var parentNode = path.getParentNode();
            if (!namedTypes.ForStatement.check(parentNode) &&
                !namedTypes.ForInStatement.check(parentNode) &&
                !(namedTypes.ForOfStatement &&
                    namedTypes.ForOfStatement.check(parentNode)) &&
                !(namedTypes.ForAwaitStatement &&
                    namedTypes.ForAwaitStatement.check(parentNode))) {
                parts.push(";");
            }
            return (0, lines_1.concat)(parts);
        }
        case "VariableDeclarator":
            return n.init
                ? (0, lines_1.fromString)(" = ").join([
                    path.call(print, "id"),
                    path.call(print, "init"),
                ])
                : path.call(print, "id");
        case "WithStatement":
            return (0, lines_1.concat)([
                "with (",
                path.call(print, "object"),
                ") ",
                path.call(print, "body"),
            ]);
        case "IfStatement": {
            var con = adjustClause(path.call(print, "consequent"), options);
            parts.push("if (", path.call(print, "test"), ")", con);
            if (n.alternate)
                parts.push(endsWithBrace(con) ? " else" : "\nelse", adjustClause(path.call(print, "alternate"), options));
            return (0, lines_1.concat)(parts);
        }
        case "ForStatement": {
            // TODO Get the for (;;) case right.
            var init = path.call(print, "init");
            var sep = init.length > 1 ? ";\n" : "; ";
            var forParen = "for (";
            var indented = (0, lines_1.fromString)(sep)
                .join([init, path.call(print, "test"), path.call(print, "update")])
                .indentTail(forParen.length);
            var head = (0, lines_1.concat)([forParen, indented, ")"]);
            var clause = adjustClause(path.call(print, "body"), options);
            parts.push(head);
            if (head.length > 1) {
                parts.push("\n");
                clause = clause.trimLeft();
            }
            parts.push(clause);
            return (0, lines_1.concat)(parts);
        }
        case "WhileStatement":
            return (0, lines_1.concat)([
                "while (",
                path.call(print, "test"),
                ")",
                adjustClause(path.call(print, "body"), options),
            ]);
        case "ForInStatement":
            // Note: esprima can't actually parse "for each (".
            return (0, lines_1.concat)([
                n.each ? "for each (" : "for (",
                path.call(print, "left"),
                " in ",
                path.call(print, "right"),
                ")",
                adjustClause(path.call(print, "body"), options),
            ]);
        case "ForOfStatement":
        case "ForAwaitStatement":
            parts.push("for ");
            if (n.await || n.type === "ForAwaitStatement") {
                parts.push("await ");
            }
            parts.push("(", path.call(print, "left"), " of ", path.call(print, "right"), ")", adjustClause(path.call(print, "body"), options));
            return (0, lines_1.concat)(parts);
        case "DoWhileStatement": {
            var doBody = (0, lines_1.concat)([
                "do",
                adjustClause(path.call(print, "body"), options),
            ]);
            parts.push(doBody);
            if (endsWithBrace(doBody))
                parts.push(" while");
            else
                parts.push("\nwhile");
            parts.push(" (", path.call(print, "test"), ");");
            return (0, lines_1.concat)(parts);
        }
        case "DoExpression": {
            var statements = path.call(function (bodyPath) { return printStatementSequence(bodyPath, options, print); }, "body");
            return (0, lines_1.concat)(["do {\n", statements.indent(options.tabWidth), "\n}"]);
        }
        case "BreakStatement":
            parts.push("break");
            if (n.label)
                parts.push(" ", path.call(print, "label"));
            parts.push(";");
            return (0, lines_1.concat)(parts);
        case "ContinueStatement":
            parts.push("continue");
            if (n.label)
                parts.push(" ", path.call(print, "label"));
            parts.push(";");
            return (0, lines_1.concat)(parts);
        case "LabeledStatement":
            return (0, lines_1.concat)([
                path.call(print, "label"),
                ":\n",
                path.call(print, "body"),
            ]);
        case "TryStatement":
            parts.push("try ", path.call(print, "block"));
            if (n.handler) {
                parts.push(" ", path.call(print, "handler"));
            }
            else if (n.handlers) {
                path.each(function (handlerPath) {
                    parts.push(" ", print(handlerPath));
                }, "handlers");
            }
            if (n.finalizer) {
                parts.push(" finally ", path.call(print, "finalizer"));
            }
            return (0, lines_1.concat)(parts);
        case "CatchClause":
            parts.push("catch ");
            if (n.param) {
                parts.push("(", path.call(print, "param"));
            }
            if (n.guard) {
                // Note: esprima does not recognize conditional catch clauses.
                parts.push(" if ", path.call(print, "guard"));
            }
            if (n.param) {
                parts.push(") ");
            }
            parts.push(path.call(print, "body"));
            return (0, lines_1.concat)(parts);
        case "ThrowStatement":
            return (0, lines_1.concat)(["throw ", path.call(print, "argument"), ";"]);
        case "SwitchStatement":
            return (0, lines_1.concat)([
                "switch (",
                path.call(print, "discriminant"),
                ") {\n",
                (0, lines_1.fromString)("\n").join(path.map(print, "cases")),
                "\n}",
            ]);
        // Note: ignoring n.lexical because it has no printing consequences.
        case "SwitchCase":
            if (n.test)
                parts.push("case ", path.call(print, "test"), ":");
            else
                parts.push("default:");
            if (n.consequent.length > 0) {
                parts.push("\n", path
                    .call(function (consequentPath) {
                    return printStatementSequence(consequentPath, options, print);
                }, "consequent")
                    .indent(options.tabWidth));
            }
            return (0, lines_1.concat)(parts);
        case "DebuggerStatement":
            return (0, lines_1.fromString)("debugger;");
        // JSX extensions below.
        case "JSXAttribute":
            parts.push(path.call(print, "name"));
            if (n.value)
                parts.push("=", path.call(print, "value"));
            return (0, lines_1.concat)(parts);
        case "JSXIdentifier":
            return (0, lines_1.fromString)(n.name, options);
        case "JSXNamespacedName":
            return (0, lines_1.fromString)(":").join([
                path.call(print, "namespace"),
                path.call(print, "name"),
            ]);
        case "JSXMemberExpression":
            return (0, lines_1.fromString)(".").join([
                path.call(print, "object"),
                path.call(print, "property"),
            ]);
        case "JSXSpreadAttribute":
            return (0, lines_1.concat)(["{...", path.call(print, "argument"), "}"]);
        case "JSXSpreadChild":
            return (0, lines_1.concat)(["{...", path.call(print, "expression"), "}"]);
        case "JSXExpressionContainer":
            return (0, lines_1.concat)(["{", path.call(print, "expression"), "}"]);
        case "JSXElement":
        case "JSXFragment": {
            var openingPropName = "opening" + (n.type === "JSXElement" ? "Element" : "Fragment");
            var closingPropName = "closing" + (n.type === "JSXElement" ? "Element" : "Fragment");
            var openingLines = path.call(print, openingPropName);
            if (n[openingPropName].selfClosing) {
                (0, tiny_invariant_1.default)(!n[closingPropName], "unexpected " +
                    closingPropName +
                    " element in self-closing " +
                    n.type);
                return openingLines;
            }
            var childLines = (0, lines_1.concat)(path.map(function (childPath) {
                var child = childPath.getValue();
                if (namedTypes.Literal.check(child) &&
                    typeof child.value === "string") {
                    if (/\S/.test(child.value)) {
                        return child.value.replace(/^\s+|\s+$/g, "");
                    }
                    else if (/\n/.test(child.value)) {
                        return "\n";
                    }
                }
                return print(childPath);
            }, "children")).indentTail(options.tabWidth);
            var closingLines = path.call(print, closingPropName);
            return (0, lines_1.concat)([openingLines, childLines, closingLines]);
        }
        case "JSXOpeningElement": {
            parts.push("<", path.call(print, "name"));
            var attrParts_1 = [];
            path.each(function (attrPath) {
                attrParts_1.push(" ", print(attrPath));
            }, "attributes");
            var attrLines = (0, lines_1.concat)(attrParts_1);
            var needLineWrap = attrLines.length > 1 || attrLines.getLineLength(1) > options.wrapColumn;
            if (needLineWrap) {
                attrParts_1.forEach(function (part, i) {
                    if (part === " ") {
                        (0, tiny_invariant_1.default)(i % 2 === 0);
                        attrParts_1[i] = "\n";
                    }
                });
                attrLines = (0, lines_1.concat)(attrParts_1).indentTail(options.tabWidth);
            }
            parts.push(attrLines, n.selfClosing ? " />" : ">");
            return (0, lines_1.concat)(parts);
        }
        case "JSXClosingElement":
            return (0, lines_1.concat)(["</", path.call(print, "name"), ">"]);
        case "JSXOpeningFragment":
            return (0, lines_1.fromString)("<>");
        case "JSXClosingFragment":
            return (0, lines_1.fromString)("</>");
        case "JSXText":
            return (0, lines_1.fromString)(n.value, options);
        case "JSXEmptyExpression":
            return (0, lines_1.fromString)("");
        case "TypeAnnotatedIdentifier":
            return (0, lines_1.concat)([
                path.call(print, "annotation"),
                " ",
                path.call(print, "identifier"),
            ]);
        case "ClassBody":
            if (n.body.length === 0) {
                return (0, lines_1.fromString)("{}");
            }
            return (0, lines_1.concat)([
                "{\n",
                path
                    .call(function (bodyPath) { return printStatementSequence(bodyPath, options, print); }, "body")
                    .indent(options.tabWidth),
                "\n}",
            ]);
        case "ClassPropertyDefinition":
            parts.push("static ", path.call(print, "definition"));
            if (!namedTypes.MethodDefinition.check(n.definition))
                parts.push(";");
            return (0, lines_1.concat)(parts);
        case "ClassProperty": {
            if (n.declare) {
                parts.push("declare ");
            }
            var access = n.accessibility || n.access;
            if (typeof access === "string") {
                parts.push(access, " ");
            }
            if (n.static) {
                parts.push("static ");
            }
            if (n.abstract) {
                parts.push("abstract ");
            }
            if (n.readonly) {
                parts.push("readonly ");
            }
            var key = path.call(print, "key");
            if (n.computed) {
                key = (0, lines_1.concat)(["[", key, "]"]);
            }
            if (n.variance) {
                key = (0, lines_1.concat)([printVariance(path, print), key]);
            }
            parts.push(key);
            if (n.optional) {
                parts.push("?");
            }
            if (n.definite) {
                parts.push("!");
            }
            if (n.typeAnnotation) {
                parts.push(path.call(print, "typeAnnotation"));
            }
            if (n.value) {
                parts.push(" = ", path.call(print, "value"));
            }
            parts.push(";");
            return (0, lines_1.concat)(parts);
        }
        case "ClassPrivateProperty":
            if (n.static) {
                parts.push("static ");
            }
            parts.push(path.call(print, "key"));
            if (n.typeAnnotation) {
                parts.push(path.call(print, "typeAnnotation"));
            }
            if (n.value) {
                parts.push(" = ", path.call(print, "value"));
            }
            parts.push(";");
            return (0, lines_1.concat)(parts);
        case "ClassAccessorProperty": {
            parts.push.apply(parts, tslib_1.__spreadArray(tslib_1.__spreadArray([], printClassMemberModifiers(n), false), ["accessor "], false));
            if (n.computed) {
                parts.push("[", path.call(print, "key"), "]");
            }
            else {
                parts.push(path.call(print, "key"));
            }
            if (n.optional) {
                parts.push("?");
            }
            if (n.definite) {
                parts.push("!");
            }
            if (n.typeAnnotation) {
                parts.push(path.call(print, "typeAnnotation"));
            }
            if (n.value) {
                parts.push(" = ", path.call(print, "value"));
            }
            parts.push(";");
            return (0, lines_1.concat)(parts);
        }
        case "ClassDeclaration":
        case "ClassExpression":
        case "DeclareClass":
            if (n.declare) {
                parts.push("declare ");
            }
            if (n.abstract) {
                parts.push("abstract ");
            }
            parts.push("class");
            if (n.id) {
                parts.push(" ", path.call(print, "id"));
            }
            if (n.typeParameters) {
                parts.push(path.call(print, "typeParameters"));
            }
            if (n.superClass) {
                // ClassDeclaration and ClassExpression only
                parts.push(" extends ", path.call(print, "superClass"), path.call(print, "superTypeParameters"));
            }
            if (n.extends && n.extends.length > 0) {
                // DeclareClass only
                parts.push(" extends ", (0, lines_1.fromString)(", ").join(path.map(print, "extends")));
            }
            if (n["implements"] && n["implements"].length > 0) {
                parts.push(" implements ", (0, lines_1.fromString)(", ").join(path.map(print, "implements")));
            }
            parts.push(" ", path.call(print, "body"));
            if (n.type === "DeclareClass") {
                return printFlowDeclaration(path, parts);
            }
            else {
                return (0, lines_1.concat)(parts);
            }
        case "TemplateElement":
            return (0, lines_1.fromString)(n.value.raw, options).lockIndentTail();
        case "TemplateLiteral": {
            var expressions_1 = path.map(print, "expressions");
            parts.push("`");
            path.each(function (childPath) {
                var i = childPath.getName();
                parts.push(print(childPath));
                if (i < expressions_1.length) {
                    parts.push("${", expressions_1[i], "}");
                }
            }, "quasis");
            parts.push("`");
            return (0, lines_1.concat)(parts).lockIndentTail();
        }
        case "TaggedTemplateExpression":
            return (0, lines_1.concat)([path.call(print, "tag"), path.call(print, "quasi")]);
        // These types are unprintable because they serve as abstract
        // supertypes for other (printable) types.
        case "Node":
        case "Printable":
        case "SourceLocation":
        case "Position":
        case "Statement":
        case "Function":
        case "Pattern":
        case "Expression":
        case "Declaration":
        case "Specifier":
        case "NamedSpecifier":
        case "Comment": // Supertype of Block and Line
        case "Flow": // Supertype of all Flow AST node types
        case "FlowType": // Supertype of all Flow types
        case "FlowPredicate": // Supertype of InferredPredicate and DeclaredPredicate
        case "MemberTypeAnnotation": // Flow
        case "Type": // Flow
        case "TSHasOptionalTypeParameterInstantiation":
        case "TSHasOptionalTypeParameters":
        case "TSHasOptionalTypeAnnotation":
        case "ChainElement": // Supertype of MemberExpression and CallExpression
            throw new Error("unprintable type: " + JSON.stringify(n.type));
        case "CommentBlock": // Babel block comment.
        case "Block": // Esprima block comment.
            return (0, lines_1.concat)(["/*", (0, lines_1.fromString)(n.value, options), "*/"]);
        case "CommentLine": // Babel line comment.
        case "Line": // Esprima line comment.
            return (0, lines_1.concat)(["//", (0, lines_1.fromString)(n.value, options)]);
        // Type Annotations for Facebook Flow, typically stripped out or
        // transformed away before printing.
        case "TypeAnnotation":
            if (n.typeAnnotation) {
                if (n.typeAnnotation.type !== "FunctionTypeAnnotation") {
                    parts.push(": ");
                }
                parts.push(path.call(print, "typeAnnotation"));
                return (0, lines_1.concat)(parts);
            }
            return (0, lines_1.fromString)("");
        case "ExistentialTypeParam":
        case "ExistsTypeAnnotation":
            return (0, lines_1.fromString)("*", options);
        case "EmptyTypeAnnotation":
            return (0, lines_1.fromString)("empty", options);
        case "AnyTypeAnnotation":
            return (0, lines_1.fromString)("any", options);
        case "MixedTypeAnnotation":
            return (0, lines_1.fromString)("mixed", options);
        case "ArrayTypeAnnotation":
            return (0, lines_1.concat)([path.call(print, "elementType"), "[]"]);
        case "TupleTypeAnnotation": {
            var printed_2 = path.map(print, "types");
            var joined = (0, lines_1.fromString)(", ").join(printed_2);
            var oneLine_3 = joined.getLineLength(1) <= options.wrapColumn;
            if (oneLine_3) {
                if (options.arrayBracketSpacing) {
                    parts.push("[ ");
                }
                else {
                    parts.push("[");
                }
            }
            else {
                parts.push("[\n");
            }
            path.each(function (elemPath) {
                var i = elemPath.getName();
                var elem = elemPath.getValue();
                if (!elem) {
                    // If the array expression ends with a hole, that hole
                    // will be ignored by the interpreter, but if it ends with
                    // two (or more) holes, we need to write out two (or more)
                    // commas so that the resulting code is interpreted with
                    // both (all) of the holes.
                    parts.push(",");
                }
                else {
                    var lines = printed_2[i];
                    if (oneLine_3) {
                        if (i > 0)
                            parts.push(" ");
                    }
                    else {
                        lines = lines.indent(options.tabWidth);
                    }
                    parts.push(lines);
                    if (i < n.types.length - 1 ||
                        (!oneLine_3 && util.isTrailingCommaEnabled(options, "arrays")))
                        parts.push(",");
                    if (!oneLine_3)
                        parts.push("\n");
                }
            }, "types");
            if (oneLine_3 && options.arrayBracketSpacing) {
                parts.push(" ]");
            }
            else {
                parts.push("]");
            }
            return (0, lines_1.concat)(parts);
        }
        case "BooleanTypeAnnotation":
            return (0, lines_1.fromString)("boolean", options);
        case "BooleanLiteralTypeAnnotation":
            (0, tiny_invariant_1.default)(typeof n.value === "boolean");
            return (0, lines_1.fromString)("" + n.value, options);
        case "InterfaceTypeAnnotation":
            parts.push("interface");
            if (n.extends && n.extends.length > 0) {
                parts.push(" extends ", (0, lines_1.fromString)(", ").join(path.map(print, "extends")));
            }
            parts.push(" ", path.call(print, "body"));
            return (0, lines_1.concat)(parts);
        case "DeclareFunction":
            return printFlowDeclaration(path, [
                "function ",
                path.call(print, "id"),
                ";",
            ]);
        case "DeclareModule":
            return printFlowDeclaration(path, [
                "module ",
                path.call(print, "id"),
                " ",
                path.call(print, "body"),
            ]);
        case "DeclareModuleExports":
            return printFlowDeclaration(path, [
                "module.exports",
                path.call(print, "typeAnnotation"),
            ]);
        case "DeclareVariable":
            return printFlowDeclaration(path, ["var ", path.call(print, "id"), ";"]);
        case "DeclareExportDeclaration":
        case "DeclareExportAllDeclaration":
            return (0, lines_1.concat)(["declare ", printExportDeclaration(path, options, print)]);
        case "EnumDeclaration":
            return (0, lines_1.concat)([
                "enum ",
                path.call(print, "id"),
                path.call(print, "body"),
            ]);
        case "EnumBooleanBody":
        case "EnumNumberBody":
        case "EnumStringBody":
        case "EnumSymbolBody": {
            if (n.type === "EnumSymbolBody" || n.explicitType) {
                parts.push(" of ", 
                // EnumBooleanBody => boolean, etc.
                n.type.slice(4, -4).toLowerCase());
            }
            parts.push(" {\n", (0, lines_1.fromString)("\n")
                .join(path.map(print, "members"))
                .indent(options.tabWidth), "\n}");
            return (0, lines_1.concat)(parts);
        }
        case "EnumDefaultedMember":
            return (0, lines_1.concat)([path.call(print, "id"), ","]);
        case "EnumBooleanMember":
        case "EnumNumberMember":
        case "EnumStringMember":
            return (0, lines_1.concat)([
                path.call(print, "id"),
                " = ",
                path.call(print, "init"),
                ",",
            ]);
        case "InferredPredicate":
            return (0, lines_1.fromString)("%checks", options);
        case "DeclaredPredicate":
            return (0, lines_1.concat)(["%checks(", path.call(print, "value"), ")"]);
        case "FunctionTypeAnnotation": {
            // FunctionTypeAnnotation is ambiguous:
            // declare function(a: B): void; OR
            // const A: (a: B) => void;
            var parent = path.getParentNode(0);
            var isArrowFunctionTypeAnnotation = !(namedTypes.ObjectTypeCallProperty.check(parent) ||
                (namedTypes.ObjectTypeInternalSlot.check(parent) && parent.method) ||
                namedTypes.DeclareFunction.check(path.getParentNode(2)));
            var needsColon = isArrowFunctionTypeAnnotation &&
                !namedTypes.FunctionTypeParam.check(parent) &&
                !namedTypes.TypeAlias.check(parent);
            if (needsColon) {
                parts.push(": ");
            }
            var hasTypeParameters = !!n.typeParameters;
            var needsParens = hasTypeParameters || n.params.length !== 1 || n.params[0].name;
            parts.push(hasTypeParameters ? path.call(print, "typeParameters") : "", needsParens ? "(" : "", printFunctionParams(path, options, print), needsParens ? ")" : "");
            // The returnType is not wrapped in a TypeAnnotation, so the colon
            // needs to be added separately.
            if (n.returnType) {
                parts.push(isArrowFunctionTypeAnnotation ? " => " : ": ", path.call(print, "returnType"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "FunctionTypeParam": {
            var name = path.call(print, "name");
            parts.push(name);
            if (n.optional) {
                parts.push("?");
            }
            if (name.infos[0].line) {
                parts.push(": ");
            }
            parts.push(path.call(print, "typeAnnotation"));
            return (0, lines_1.concat)(parts);
        }
        case "GenericTypeAnnotation":
            return (0, lines_1.concat)([
                path.call(print, "id"),
                path.call(print, "typeParameters"),
            ]);
        case "DeclareInterface":
            parts.push("declare ");
        // Fall through to InterfaceDeclaration...
        case "InterfaceDeclaration":
        case "TSInterfaceDeclaration":
            if (n.declare) {
                parts.push("declare ");
            }
            parts.push("interface ", path.call(print, "id"), path.call(print, "typeParameters"), " ");
            if (n["extends"] && n["extends"].length > 0) {
                parts.push("extends ", (0, lines_1.fromString)(", ").join(path.map(print, "extends")), " ");
            }
            if (n.body) {
                parts.push(path.call(print, "body"));
            }
            return (0, lines_1.concat)(parts);
        case "ClassImplements":
        case "InterfaceExtends":
            return (0, lines_1.concat)([
                path.call(print, "id"),
                path.call(print, "typeParameters"),
            ]);
        case "IntersectionTypeAnnotation":
            return (0, lines_1.fromString)(" & ").join(path.map(print, "types"));
        case "NullableTypeAnnotation":
            return (0, lines_1.concat)(["?", path.call(print, "typeAnnotation")]);
        case "NullLiteralTypeAnnotation":
            return (0, lines_1.fromString)("null", options);
        case "ThisTypeAnnotation":
            return (0, lines_1.fromString)("this", options);
        case "NumberTypeAnnotation":
            return (0, lines_1.fromString)("number", options);
        case "ObjectTypeCallProperty":
            return path.call(print, "value");
        case "ObjectTypeIndexer":
            if (n.static) {
                parts.push("static ");
            }
            parts.push(printVariance(path, print), "[");
            if (n.id) {
                parts.push(path.call(print, "id"), ": ");
            }
            parts.push(path.call(print, "key"), "]: ", path.call(print, "value"));
            return (0, lines_1.concat)(parts);
        case "ObjectTypeProperty":
            return (0, lines_1.concat)([
                printVariance(path, print),
                path.call(print, "key"),
                n.optional ? "?" : "",
                ": ",
                path.call(print, "value"),
            ]);
        case "ObjectTypeInternalSlot":
            return (0, lines_1.concat)([
                n.static ? "static " : "",
                "[[",
                path.call(print, "id"),
                "]]",
                n.optional ? "?" : "",
                n.value.type !== "FunctionTypeAnnotation" ? ": " : "",
                path.call(print, "value"),
            ]);
        case "QualifiedTypeIdentifier":
            return (0, lines_1.concat)([
                path.call(print, "qualification"),
                ".",
                path.call(print, "id"),
            ]);
        case "StringLiteralTypeAnnotation":
            return (0, lines_1.fromString)(nodeStr(n.value, options), options);
        case "NumberLiteralTypeAnnotation":
        case "NumericLiteralTypeAnnotation":
            (0, tiny_invariant_1.default)(typeof n.value === "number");
            return (0, lines_1.fromString)(JSON.stringify(n.value), options);
        case "BigIntLiteralTypeAnnotation":
            return (0, lines_1.fromString)(n.raw, options);
        case "StringTypeAnnotation":
            return (0, lines_1.fromString)("string", options);
        case "DeclareTypeAlias":
            parts.push("declare ");
        // Fall through to TypeAlias...
        case "TypeAlias":
            return (0, lines_1.concat)([
                "type ",
                path.call(print, "id"),
                path.call(print, "typeParameters"),
                " = ",
                path.call(print, "right"),
                ";",
            ]);
        case "DeclareOpaqueType":
            parts.push("declare ");
        // Fall through to OpaqueType...
        case "OpaqueType":
            parts.push("opaque type ", path.call(print, "id"), path.call(print, "typeParameters"));
            if (n["supertype"]) {
                parts.push(": ", path.call(print, "supertype"));
            }
            if (n["impltype"]) {
                parts.push(" = ", path.call(print, "impltype"));
            }
            parts.push(";");
            return (0, lines_1.concat)(parts);
        case "TypeCastExpression":
            return (0, lines_1.concat)([
                "(",
                path.call(print, "expression"),
                path.call(print, "typeAnnotation"),
                ")",
            ]);
        case "TypeParameterDeclaration":
        case "TypeParameterInstantiation":
            return (0, lines_1.concat)([
                "<",
                (0, lines_1.fromString)(", ").join(path.map(print, "params")),
                ">",
            ]);
        case "Variance":
            if (n.kind === "plus") {
                return (0, lines_1.fromString)("+");
            }
            if (n.kind === "minus") {
                return (0, lines_1.fromString)("-");
            }
            return (0, lines_1.fromString)("");
        case "TypeParameter":
            if (n.variance) {
                parts.push(printVariance(path, print));
            }
            parts.push(path.call(print, "name"));
            if (n.bound) {
                parts.push(path.call(print, "bound"));
            }
            if (n["default"]) {
                parts.push("=", path.call(print, "default"));
            }
            return (0, lines_1.concat)(parts);
        case "TypeofTypeAnnotation":
            return (0, lines_1.concat)([
                (0, lines_1.fromString)("typeof ", options),
                path.call(print, "argument"),
            ]);
        case "IndexedAccessType":
        case "OptionalIndexedAccessType":
            return (0, lines_1.concat)([
                path.call(print, "objectType"),
                n.optional ? "?." : "",
                "[",
                path.call(print, "indexType"),
                "]",
            ]);
        case "UnionTypeAnnotation":
            return (0, lines_1.fromString)(" | ").join(path.map(print, "types"));
        case "VoidTypeAnnotation":
            return (0, lines_1.fromString)("void", options);
        case "NullTypeAnnotation":
            return (0, lines_1.fromString)("null", options);
        case "SymbolTypeAnnotation":
            return (0, lines_1.fromString)("symbol", options);
        case "BigIntTypeAnnotation":
            return (0, lines_1.fromString)("bigint", options);
        // Type Annotations for TypeScript (when using Babylon as parser)
        case "TSType":
            throw new Error("unprintable type: " + JSON.stringify(n.type));
        case "TSNumberKeyword":
            return (0, lines_1.fromString)("number", options);
        case "TSBigIntKeyword":
            return (0, lines_1.fromString)("bigint", options);
        case "TSObjectKeyword":
            return (0, lines_1.fromString)("object", options);
        case "TSBooleanKeyword":
            return (0, lines_1.fromString)("boolean", options);
        case "TSStringKeyword":
            return (0, lines_1.fromString)("string", options);
        case "TSSymbolKeyword":
            return (0, lines_1.fromString)("symbol", options);
        case "TSAnyKeyword":
            return (0, lines_1.fromString)("any", options);
        case "TSVoidKeyword":
            return (0, lines_1.fromString)("void", options);
        case "TSIntrinsicKeyword":
            return (0, lines_1.fromString)("intrinsic", options);
        case "TSThisType":
            return (0, lines_1.fromString)("this", options);
        case "TSNullKeyword":
            return (0, lines_1.fromString)("null", options);
        case "TSUndefinedKeyword":
            return (0, lines_1.fromString)("undefined", options);
        case "TSUnknownKeyword":
            return (0, lines_1.fromString)("unknown", options);
        case "TSNeverKeyword":
            return (0, lines_1.fromString)("never", options);
        case "TSArrayType":
            return (0, lines_1.concat)([path.call(print, "elementType"), "[]"]);
        case "TSLiteralType":
            return path.call(print, "literal");
        case "TSUnionType":
            return (0, lines_1.fromString)(" | ").join(path.map(print, "types"));
        case "TSIntersectionType":
            return (0, lines_1.fromString)(" & ").join(path.map(print, "types"));
        case "TSConditionalType":
            parts.push(path.call(print, "checkType"), " extends ", path.call(print, "extendsType"), " ? ", path.call(print, "trueType"), " : ", path.call(print, "falseType"));
            return (0, lines_1.concat)(parts);
        case "TSInferType":
            parts.push("infer ", path.call(print, "typeParameter"));
            return (0, lines_1.concat)(parts);
        case "TSParenthesizedType":
            return (0, lines_1.concat)(["(", path.call(print, "typeAnnotation"), ")"]);
        case "TSFunctionType":
            return (0, lines_1.concat)([
                path.call(print, "typeParameters"),
                "(",
                printFunctionParams(path, options, print),
                ") => ",
                path.call(print, "typeAnnotation", "typeAnnotation"),
            ]);
        case "TSConstructorType":
            return (0, lines_1.concat)([
                "new ",
                path.call(print, "typeParameters"),
                "(",
                printFunctionParams(path, options, print),
                ") => ",
                path.call(print, "typeAnnotation", "typeAnnotation"),
            ]);
        case "TSMappedType": {
            parts.push(n.readonly ? "readonly " : "", "[", path.call(print, "typeParameter"), "]", n.optional ? "?" : "");
            if (n.typeAnnotation) {
                parts.push(": ", path.call(print, "typeAnnotation"), ";");
            }
            return (0, lines_1.concat)(["{\n", (0, lines_1.concat)(parts).indent(options.tabWidth), "\n}"]);
        }
        case "TSTupleType":
            return (0, lines_1.concat)([
                "[",
                (0, lines_1.fromString)(", ").join(path.map(print, "elementTypes")),
                "]",
            ]);
        case "TSNamedTupleMember":
            parts.push(path.call(print, "label"));
            if (n.optional) {
                parts.push("?");
            }
            parts.push(": ", path.call(print, "elementType"));
            return (0, lines_1.concat)(parts);
        case "TSRestType":
            return (0, lines_1.concat)(["...", path.call(print, "typeAnnotation")]);
        case "TSOptionalType":
            return (0, lines_1.concat)([path.call(print, "typeAnnotation"), "?"]);
        case "TSIndexedAccessType":
            return (0, lines_1.concat)([
                path.call(print, "objectType"),
                "[",
                path.call(print, "indexType"),
                "]",
            ]);
        case "TSTypeOperator":
            return (0, lines_1.concat)([
                path.call(print, "operator"),
                " ",
                path.call(print, "typeAnnotation"),
            ]);
        case "TSTypeLiteral": {
            var members = (0, lines_1.fromString)("\n").join(path.map(print, "members").map(function (member) {
                if (lastNonSpaceCharacter(member) !== ";") {
                    return member.concat(";");
                }
                return member;
            }));
            if (members.isEmpty()) {
                return (0, lines_1.fromString)("{}", options);
            }
            parts.push("{\n", members.indent(options.tabWidth), "\n}");
            return (0, lines_1.concat)(parts);
        }
        case "TSEnumMember":
            parts.push(path.call(print, "id"));
            if (n.initializer) {
                parts.push(" = ", path.call(print, "initializer"));
            }
            return (0, lines_1.concat)(parts);
        case "TSTypeQuery":
            return (0, lines_1.concat)(["typeof ", path.call(print, "exprName")]);
        case "TSParameterProperty":
            if (n.accessibility) {
                parts.push(n.accessibility, " ");
            }
            if (n.export) {
                parts.push("export ");
            }
            if (n.static) {
                parts.push("static ");
            }
            if (n.readonly) {
                parts.push("readonly ");
            }
            parts.push(path.call(print, "parameter"));
            return (0, lines_1.concat)(parts);
        case "TSTypeReference":
            return (0, lines_1.concat)([
                path.call(print, "typeName"),
                path.call(print, "typeParameters"),
            ]);
        case "TSQualifiedName":
            return (0, lines_1.concat)([path.call(print, "left"), ".", path.call(print, "right")]);
        case "TSAsExpression":
        case "TSSatisfiesExpression": {
            var expression = path.call(print, "expression");
            parts.push(expression, n.type === "TSSatisfiesExpression" ? " satisfies " : " as ", path.call(print, "typeAnnotation"));
            return (0, lines_1.concat)(parts);
        }
        case "TSTypeCastExpression":
            return (0, lines_1.concat)([
                path.call(print, "expression"),
                path.call(print, "typeAnnotation"),
            ]);
        case "TSNonNullExpression":
            return (0, lines_1.concat)([path.call(print, "expression"), "!"]);
        case "TSTypeAnnotation":
            return (0, lines_1.concat)([": ", path.call(print, "typeAnnotation")]);
        case "TSIndexSignature":
            return (0, lines_1.concat)([
                n.readonly ? "readonly " : "",
                "[",
                path.map(print, "parameters"),
                "]",
                path.call(print, "typeAnnotation"),
            ]);
        case "TSPropertySignature":
            parts.push(printVariance(path, print), n.readonly ? "readonly " : "");
            if (n.computed) {
                parts.push("[", path.call(print, "key"), "]");
            }
            else {
                parts.push(path.call(print, "key"));
            }
            parts.push(n.optional ? "?" : "", path.call(print, "typeAnnotation"));
            return (0, lines_1.concat)(parts);
        case "TSMethodSignature":
            if (n.computed) {
                parts.push("[", path.call(print, "key"), "]");
            }
            else {
                parts.push(path.call(print, "key"));
            }
            if (n.optional) {
                parts.push("?");
            }
            parts.push(path.call(print, "typeParameters"), "(", printFunctionParams(path, options, print), ")", path.call(print, "typeAnnotation"));
            return (0, lines_1.concat)(parts);
        case "TSTypePredicate":
            if (n.asserts) {
                parts.push("asserts ");
            }
            parts.push(path.call(print, "parameterName"));
            if (n.typeAnnotation) {
                parts.push(" is ", path.call(print, "typeAnnotation", "typeAnnotation"));
            }
            return (0, lines_1.concat)(parts);
        case "TSCallSignatureDeclaration":
            return (0, lines_1.concat)([
                path.call(print, "typeParameters"),
                "(",
                printFunctionParams(path, options, print),
                ")",
                path.call(print, "typeAnnotation"),
            ]);
        case "TSConstructSignatureDeclaration":
            if (n.typeParameters) {
                parts.push("new", path.call(print, "typeParameters"));
            }
            else {
                parts.push("new ");
            }
            parts.push("(", printFunctionParams(path, options, print), ")", path.call(print, "typeAnnotation"));
            return (0, lines_1.concat)(parts);
        case "TSTypeAliasDeclaration":
            return (0, lines_1.concat)([
                n.declare ? "declare " : "",
                "type ",
                path.call(print, "id"),
                path.call(print, "typeParameters"),
                " = ",
                path.call(print, "typeAnnotation"),
                ";",
            ]);
        case "TSTypeParameter": {
            parts.push(path.call(print, "name"));
            // ambiguous because of TSMappedType
            var parent = path.getParentNode(0);
            var isInMappedType = namedTypes.TSMappedType.check(parent);
            if (n.constraint) {
                parts.push(isInMappedType ? " in " : " extends ", path.call(print, "constraint"));
            }
            if (n["default"]) {
                parts.push(" = ", path.call(print, "default"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "TSTypeAssertion": {
            parts.push("<", path.call(print, "typeAnnotation"), "> ", path.call(print, "expression"));
            return (0, lines_1.concat)(parts);
        }
        case "TSTypeParameterDeclaration":
        case "TSTypeParameterInstantiation":
            return (0, lines_1.concat)([
                "<",
                (0, lines_1.fromString)(", ").join(path.map(print, "params")),
                ">",
            ]);
        case "TSEnumDeclaration": {
            parts.push(n.declare ? "declare " : "", n.const ? "const " : "", "enum ", path.call(print, "id"));
            var memberLines = (0, lines_1.fromString)(",\n").join(path.map(print, "members"));
            if (memberLines.isEmpty()) {
                parts.push(" {}");
            }
            else {
                parts.push(" {\n", memberLines.indent(options.tabWidth), "\n}");
            }
            return (0, lines_1.concat)(parts);
        }
        case "TSExpressionWithTypeArguments":
            return (0, lines_1.concat)([
                path.call(print, "expression"),
                path.call(print, "typeParameters"),
            ]);
        case "TSInterfaceBody": {
            var lines = (0, lines_1.fromString)("\n").join(path.map(print, "body").map(function (element) {
                if (lastNonSpaceCharacter(element) !== ";") {
                    return element.concat(";");
                }
                return element;
            }));
            if (lines.isEmpty()) {
                return (0, lines_1.fromString)("{}", options);
            }
            return (0, lines_1.concat)(["{\n", lines.indent(options.tabWidth), "\n}"]);
        }
        case "TSImportType":
            parts.push("import(", path.call(print, "argument"), ")");
            if (n.qualifier) {
                parts.push(".", path.call(print, "qualifier"));
            }
            if (n.typeParameters) {
                parts.push(path.call(print, "typeParameters"));
            }
            return (0, lines_1.concat)(parts);
        case "TSImportEqualsDeclaration":
            if (n.isExport) {
                parts.push("export ");
            }
            parts.push("import ", path.call(print, "id"), " = ", path.call(print, "moduleReference"));
            return maybeAddSemicolon((0, lines_1.concat)(parts));
        case "TSExternalModuleReference":
            return (0, lines_1.concat)(["require(", path.call(print, "expression"), ")"]);
        case "TSModuleDeclaration": {
            var parent = path.getParentNode();
            if (parent.type === "TSModuleDeclaration") {
                parts.push(".");
            }
            else {
                if (n.declare) {
                    parts.push("declare ");
                }
                if (!n.global) {
                    var isExternal = n.id.type === "StringLiteral" ||
                        (n.id.type === "Literal" && typeof n.id.value === "string");
                    if (isExternal) {
                        parts.push("module ");
                    }
                    else if (n.loc && n.loc.lines && n.id.loc) {
                        var prefix = n.loc.lines.sliceString(n.loc.start, n.id.loc.start);
                        // These keywords are fundamentally ambiguous in the
                        // Babylon parser, and not reflected in the AST, so
                        // the best we can do is to match the original code,
                        // when possible.
                        if (prefix.indexOf("module") >= 0) {
                            parts.push("module ");
                        }
                        else {
                            parts.push("namespace ");
                        }
                    }
                    else {
                        parts.push("namespace ");
                    }
                }
            }
            parts.push(path.call(print, "id"));
            if (n.body) {
                parts.push(" ");
                parts.push(path.call(print, "body"));
            }
            return (0, lines_1.concat)(parts);
        }
        case "TSModuleBlock": {
            var naked = path.call(function (bodyPath) { return printStatementSequence(bodyPath, options, print); }, "body");
            if (naked.isEmpty()) {
                parts.push("{}");
            }
            else {
                parts.push("{\n", naked.indent(options.tabWidth), "\n}");
            }
            return (0, lines_1.concat)(parts);
        }
        case "TSInstantiationExpression": {
            parts.push(path.call(print, "expression"), path.call(print, "typeParameters"));
            return (0, lines_1.concat)(parts);
        }
        // https://github.com/babel/babel/pull/10148
        case "V8IntrinsicIdentifier":
            return (0, lines_1.concat)(["%", path.call(print, "name")]);
        // https://github.com/babel/babel/pull/13191
        case "TopicReference":
            return (0, lines_1.fromString)("#");
        // Unhandled types below. If encountered, nodes of these types should
        // be either left alone or desugared into AST types that are fully
        // supported by the pretty-printer.
        case "ClassHeritage": // TODO
        case "ComprehensionBlock": // TODO
        case "ComprehensionExpression": // TODO
        case "Glob": // TODO
        case "GeneratorExpression": // TODO
        case "LetStatement": // TODO
        case "LetExpression": // TODO
        case "GraphExpression": // TODO
        case "GraphIndexExpression": // TODO
        case "XMLDefaultDeclaration":
        case "XMLAnyName":
        case "XMLQualifiedIdentifier":
        case "XMLFunctionQualifiedIdentifier":
        case "XMLAttributeSelector":
        case "XMLFilterExpression":
        case "XML":
        case "XMLElement":
        case "XMLList":
        case "XMLEscape":
        case "XMLText":
        case "XMLStartTag":
        case "XMLEndTag":
        case "XMLPointTag":
        case "XMLName":
        case "XMLAttribute":
        case "XMLCdata":
        case "XMLComment":
        case "XMLProcessingInstruction":
        default:
            debugger;
            throw new Error("unknown type: " + JSON.stringify(n.type));
    }
}
function printDecorators(path, printPath) {
    var parts = [];
    var node = path.getValue();
    if (node.decorators &&
        node.decorators.length > 0 &&
        // If the parent node is an export declaration, it will be
        // responsible for printing node.decorators.
        !util.getParentExportDeclaration(path)) {
        path.each(function (decoratorPath) {
            parts.push(printPath(decoratorPath), "\n");
        }, "decorators");
    }
    else if (util.isExportDeclaration(node) &&
        node.declaration &&
        node.declaration.decorators) {
        // Export declarations are responsible for printing any decorators
        // that logically apply to node.declaration.
        path.each(function (decoratorPath) {
            parts.push(printPath(decoratorPath), "\n");
        }, "declaration", "decorators");
    }
    return (0, lines_1.concat)(parts);
}
function printStatementSequence(path, options, print) {
    var filtered = [];
    var sawComment = false;
    var sawStatement = false;
    path.each(function (stmtPath) {
        var stmt = stmtPath.getValue();
        // Just in case the AST has been modified to contain falsy
        // "statements," it's safer simply to skip them.
        if (!stmt) {
            return;
        }
        // Skip printing EmptyStatement nodes to avoid leaving stray
        // semicolons lying around.
        if (stmt.type === "EmptyStatement" &&
            !(stmt.comments && stmt.comments.length > 0)) {
            return;
        }
        if (namedTypes.Comment.check(stmt)) {
            // The pretty printer allows a dangling Comment node to act as
            // a Statement when the Comment can't be attached to any other
            // non-Comment node in the tree.
            sawComment = true;
        }
        else if (namedTypes.Statement.check(stmt)) {
            sawStatement = true;
        }
        else {
            // When the pretty printer encounters a string instead of an
            // AST node, it just prints the string. This behavior can be
            // useful for fine-grained formatting decisions like inserting
            // blank lines.
            isString.assert(stmt);
        }
        // We can't hang onto stmtPath outside of this function, because
        // it's just a reference to a mutable FastPath object, so we have
        // to go ahead and print it here.
        filtered.push({
            node: stmt,
            printed: print(stmtPath),
        });
    });
    if (sawComment) {
        (0, tiny_invariant_1.default)(sawStatement === false, "Comments may appear as statements in otherwise empty statement " +
            "lists, but may not coexist with non-Comment nodes.");
    }
    var prevTrailingSpace = null;
    var len = filtered.length;
    var parts = [];
    filtered.forEach(function (info, i) {
        var printed = info.printed;
        var stmt = info.node;
        var multiLine = printed.length > 1;
        var notFirst = i > 0;
        var notLast = i < len - 1;
        var leadingSpace;
        var trailingSpace;
        var lines = stmt && stmt.loc && stmt.loc.lines;
        var trueLoc = lines && options.reuseWhitespace && util.getTrueLoc(stmt, lines);
        if (notFirst) {
            if (trueLoc) {
                var beforeStart = lines.skipSpaces(trueLoc.start, true);
                var beforeStartLine = beforeStart ? beforeStart.line : 1;
                var leadingGap = trueLoc.start.line - beforeStartLine;
                leadingSpace = Array(leadingGap + 1).join("\n");
            }
            else {
                leadingSpace = multiLine ? "\n\n" : "\n";
            }
        }
        else {
            leadingSpace = "";
        }
        if (notLast) {
            if (trueLoc) {
                var afterEnd = lines.skipSpaces(trueLoc.end);
                var afterEndLine = afterEnd ? afterEnd.line : lines.length;
                var trailingGap = afterEndLine - trueLoc.end.line;
                trailingSpace = Array(trailingGap + 1).join("\n");
            }
            else {
                trailingSpace = multiLine ? "\n\n" : "\n";
            }
        }
        else {
            trailingSpace = "";
        }
        parts.push(maxSpace(prevTrailingSpace, leadingSpace), printed);
        if (notLast) {
            prevTrailingSpace = trailingSpace;
        }
        else if (trailingSpace) {
            parts.push(trailingSpace);
        }
    });
    return (0, lines_1.concat)(parts);
}
function maxSpace(s1, s2) {
    if (!s1 && !s2) {
        return (0, lines_1.fromString)("");
    }
    if (!s1) {
        return (0, lines_1.fromString)(s2);
    }
    if (!s2) {
        return (0, lines_1.fromString)(s1);
    }
    var spaceLines1 = (0, lines_1.fromString)(s1);
    var spaceLines2 = (0, lines_1.fromString)(s2);
    if (spaceLines2.length > spaceLines1.length) {
        return spaceLines2;
    }
    return spaceLines1;
}
function printClassMemberModifiers(node) {
    var parts = [];
    if (node.declare) {
        parts.push("declare ");
    }
    var access = node.accessibility || node.access;
    if (typeof access === "string") {
        parts.push(access, " ");
    }
    if (node.static) {
        parts.push("static ");
    }
    if (node.override) {
        parts.push("override ");
    }
    if (node.abstract) {
        parts.push("abstract ");
    }
    if (node.readonly) {
        parts.push("readonly ");
    }
    return parts;
}
function printMethod(path, options, print) {
    var node = path.getNode();
    var kind = node.kind;
    var parts = [];
    var nodeValue = node.value;
    if (!namedTypes.FunctionExpression.check(nodeValue)) {
        nodeValue = node;
    }
    parts.push.apply(parts, printClassMemberModifiers(node));
    if (nodeValue.async) {
        parts.push("async ");
    }
    if (nodeValue.generator) {
        parts.push("*");
    }
    if (kind === "get" || kind === "set") {
        parts.push(kind, " ");
    }
    var key = path.call(print, "key");
    if (node.computed) {
        key = (0, lines_1.concat)(["[", key, "]"]);
    }
    parts.push(key);
    if (node.optional) {
        parts.push("?");
    }
    if (node === nodeValue) {
        parts.push(path.call(print, "typeParameters"), "(", printFunctionParams(path, options, print), ")", path.call(print, "returnType"));
        if (node.body) {
            parts.push(" ", path.call(print, "body"));
        }
        else {
            parts.push(";");
        }
    }
    else {
        parts.push(path.call(print, "value", "typeParameters"), "(", path.call(function (valuePath) { return printFunctionParams(valuePath, options, print); }, "value"), ")", path.call(print, "value", "returnType"));
        if (nodeValue.body) {
            parts.push(" ", path.call(print, "value", "body"));
        }
        else {
            parts.push(";");
        }
    }
    return (0, lines_1.concat)(parts);
}
function printArgumentsList(path, options, print) {
    var printed = path.map(print, "arguments");
    var trailingComma = util.isTrailingCommaEnabled(options, "parameters");
    var joined = (0, lines_1.fromString)(", ").join(printed);
    if (joined.getLineLength(1) > options.wrapColumn) {
        joined = (0, lines_1.fromString)(",\n").join(printed);
        return (0, lines_1.concat)([
            "(\n",
            joined.indent(options.tabWidth),
            trailingComma ? ",\n)" : "\n)",
        ]);
    }
    return (0, lines_1.concat)(["(", joined, ")"]);
}
function printFunctionParams(path, options, print) {
    var fun = path.getValue();
    var params;
    var printed = [];
    if (fun.params) {
        params = fun.params;
        printed = path.map(print, "params");
    }
    else if (fun.parameters) {
        params = fun.parameters;
        printed = path.map(print, "parameters");
    }
    if (fun.defaults) {
        path.each(function (defExprPath) {
            var i = defExprPath.getName();
            var p = printed[i];
            if (p && defExprPath.getValue()) {
                printed[i] = (0, lines_1.concat)([p, " = ", print(defExprPath)]);
            }
        }, "defaults");
    }
    if (fun.rest) {
        printed.push((0, lines_1.concat)(["...", path.call(print, "rest")]));
    }
    var joined = (0, lines_1.fromString)(", ").join(printed);
    if (joined.length > 1 || joined.getLineLength(1) > options.wrapColumn) {
        joined = (0, lines_1.fromString)(",\n").join(printed);
        if (util.isTrailingCommaEnabled(options, "parameters") &&
            !fun.rest &&
            params[params.length - 1].type !== "RestElement") {
            joined = (0, lines_1.concat)([joined, ",\n"]);
        }
        else {
            joined = (0, lines_1.concat)([joined, "\n"]);
        }
        return (0, lines_1.concat)(["\n", joined.indent(options.tabWidth)]);
    }
    return joined;
}
function maybePrintImportAssertions(path, options, print) {
    var n = path.getValue();
    if (n.assertions && n.assertions.length > 0) {
        var parts = [" assert {"];
        var printed = path.map(print, "assertions");
        var flat = (0, lines_1.fromString)(", ").join(printed);
        if (flat.length > 1 || flat.getLineLength(1) > options.wrapColumn) {
            parts.push("\n", (0, lines_1.fromString)(",\n").join(printed).indent(options.tabWidth), "\n}");
        }
        else {
            parts.push(" ", flat, " }");
        }
        return (0, lines_1.concat)(parts);
    }
    return (0, lines_1.fromString)("");
}
function printExportDeclaration(path, options, print) {
    var decl = path.getValue();
    var parts = ["export "];
    if (decl.exportKind && decl.exportKind === "type") {
        if (!decl.declaration) {
            parts.push("type ");
        }
    }
    var shouldPrintSpaces = options.objectCurlySpacing;
    namedTypes.Declaration.assert(decl);
    if (decl["default"] || decl.type === "ExportDefaultDeclaration") {
        parts.push("default ");
    }
    if (decl.declaration) {
        parts.push(path.call(print, "declaration"));
    }
    else if (decl.specifiers) {
        if (decl.specifiers.length === 1 &&
            decl.specifiers[0].type === "ExportBatchSpecifier") {
            parts.push("*");
        }
        else if (decl.specifiers.length === 0) {
            parts.push("{}");
        }
        else if (decl.specifiers[0].type === "ExportDefaultSpecifier" ||
            decl.specifiers[0].type === "ExportNamespaceSpecifier") {
            var unbracedSpecifiers_2 = [];
            var bracedSpecifiers_2 = [];
            path.each(function (specifierPath) {
                var spec = specifierPath.getValue();
                if (spec.type === "ExportDefaultSpecifier" ||
                    spec.type === "ExportNamespaceSpecifier") {
                    unbracedSpecifiers_2.push(print(specifierPath));
                }
                else {
                    bracedSpecifiers_2.push(print(specifierPath));
                }
            }, "specifiers");
            unbracedSpecifiers_2.forEach(function (lines, i) {
                if (i > 0) {
                    parts.push(", ");
                }
                parts.push(lines);
            });
            if (bracedSpecifiers_2.length > 0) {
                var lines_2 = (0, lines_1.fromString)(", ").join(bracedSpecifiers_2);
                if (lines_2.getLineLength(1) > options.wrapColumn) {
                    lines_2 = (0, lines_1.concat)([
                        (0, lines_1.fromString)(",\n").join(bracedSpecifiers_2).indent(options.tabWidth),
                        ",",
                    ]);
                }
                if (unbracedSpecifiers_2.length > 0) {
                    parts.push(", ");
                }
                if (lines_2.length > 1) {
                    parts.push("{\n", lines_2, "\n}");
                }
                else if (options.objectCurlySpacing) {
                    parts.push("{ ", lines_2, " }");
                }
                else {
                    parts.push("{", lines_2, "}");
                }
            }
        }
        else {
            parts.push(shouldPrintSpaces ? "{ " : "{", (0, lines_1.fromString)(", ").join(path.map(print, "specifiers")), shouldPrintSpaces ? " }" : "}");
        }
        if (decl.source) {
            parts.push(" from ", path.call(print, "source"), maybePrintImportAssertions(path, options, print));
        }
    }
    var lines = (0, lines_1.concat)(parts);
    if (lastNonSpaceCharacter(lines) !== ";" &&
        !(decl.declaration &&
            (decl.declaration.type === "FunctionDeclaration" ||
                decl.declaration.type === "ClassDeclaration" ||
                decl.declaration.type === "TSModuleDeclaration" ||
                decl.declaration.type === "TSInterfaceDeclaration" ||
                decl.declaration.type === "TSEnumDeclaration"))) {
        lines = (0, lines_1.concat)([lines, ";"]);
    }
    return lines;
}
function printFlowDeclaration(path, parts) {
    var parentExportDecl = util.getParentExportDeclaration(path);
    if (parentExportDecl) {
        (0, tiny_invariant_1.default)(parentExportDecl.type === "DeclareExportDeclaration");
    }
    else {
        // If the parent node has type DeclareExportDeclaration, then it
        // will be responsible for printing the "declare" token. Otherwise
        // it needs to be printed with this non-exported declaration node.
        parts.unshift("declare ");
    }
    return (0, lines_1.concat)(parts);
}
function printVariance(path, print) {
    return path.call(function (variancePath) {
        var value = variancePath.getValue();
        if (value) {
            if (value === "plus") {
                return (0, lines_1.fromString)("+");
            }
            if (value === "minus") {
                return (0, lines_1.fromString)("-");
            }
            return print(variancePath);
        }
        return (0, lines_1.fromString)("");
    }, "variance");
}
function adjustClause(clause, options) {
    if (clause.length > 1)
        return (0, lines_1.concat)([" ", clause]);
    return (0, lines_1.concat)(["\n", maybeAddSemicolon(clause).indent(options.tabWidth)]);
}
function lastNonSpaceCharacter(lines) {
    var pos = lines.lastPos();
    do {
        var ch = lines.charAt(pos);
        if (/\S/.test(ch))
            return ch;
    } while (lines.prevPos(pos));
}
function endsWithBrace(lines) {
    return lastNonSpaceCharacter(lines) === "}";
}
function swapQuotes(str) {
    return str.replace(/['"]/g, function (m) { return (m === '"' ? "'" : '"'); });
}
function getPossibleRaw(node) {
    var value = types.getFieldValue(node, "value");
    var extra = types.getFieldValue(node, "extra");
    if (extra && typeof extra.raw === "string" && value == extra.rawValue) {
        return extra.raw;
    }
    if (node.type === "Literal") {
        var raw = node.raw;
        if (typeof raw === "string" && value == raw) {
            return raw;
        }
    }
}
function jsSafeStringify(str) {
    return JSON.stringify(str).replace(/[\u2028\u2029]/g, function (m) {
        return "\\u" + m.charCodeAt(0).toString(16);
    });
}
function nodeStr(str, options) {
    isString.assert(str);
    switch (options.quote) {
        case "auto": {
            var double = jsSafeStringify(str);
            var single = swapQuotes(jsSafeStringify(swapQuotes(str)));
            return double.length > single.length ? single : double;
        }
        case "single":
            return swapQuotes(jsSafeStringify(swapQuotes(str)));
        case "double":
        default:
            return jsSafeStringify(str);
    }
}
function maybeAddSemicolon(lines) {
    var eoc = lastNonSpaceCharacter(lines);
    if (!eoc || "\n};".indexOf(eoc) < 0)
        return (0, lines_1.concat)([lines, ";"]);
    return lines;
}

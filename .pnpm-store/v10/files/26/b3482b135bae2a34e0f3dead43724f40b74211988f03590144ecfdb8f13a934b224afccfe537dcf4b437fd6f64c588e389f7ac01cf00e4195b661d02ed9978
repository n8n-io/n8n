'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var path = require('path');
var ts = require('typescript');
var module$1 = require('module');
var MagicString = require('magic-string');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () {
                        return e[k];
                    }
                });
            }
        });
    }
    n['default'] = e;
    return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespace(path);
var ts__default = /*#__PURE__*/_interopDefaultLegacy(ts);
var MagicString__default = /*#__PURE__*/_interopDefaultLegacy(MagicString);

const dts = ".d.ts";
const formatHost = {
    getCurrentDirectory: () => ts__default['default'].sys.getCurrentDirectory(),
    getNewLine: () => ts__default['default'].sys.newLine,
    getCanonicalFileName: ts__default['default'].sys.useCaseSensitiveFileNames ? (f) => f : (f) => f.toLowerCase(),
};
const OPTIONS_OVERRIDE = {
    // Ensure ".d.ts" modules are generated
    declaration: true,
    // Skip ".js" generation
    noEmit: false,
    emitDeclarationOnly: true,
    // Skip code generation when error occurs
    noEmitOnError: true,
    // Avoid extra work
    checkJs: false,
    declarationMap: false,
    skipLibCheck: true,
    // Ensure TS2742 errors are visible
    preserveSymlinks: true,
    // Ensure we can parse the latest code
    target: ts__default['default'].ScriptTarget.ESNext,
};
function getCompilerOptions(input, overrideOptions) {
    const compilerOptions = { ...overrideOptions, ...OPTIONS_OVERRIDE };
    let dirName = path__namespace.dirname(input);
    let dtsFiles = [];
    const configPath = ts__default['default'].findConfigFile(dirName, ts__default['default'].sys.fileExists);
    if (!configPath) {
        return { dtsFiles, dirName, compilerOptions };
    }
    dirName = path__namespace.dirname(configPath);
    const { config, error } = ts__default['default'].readConfigFile(configPath, ts__default['default'].sys.readFile);
    if (error) {
        console.error(ts__default['default'].formatDiagnostic(error, formatHost));
        return { dtsFiles, dirName, compilerOptions };
    }
    const { fileNames, options, errors } = ts__default['default'].parseJsonConfigFileContent(config, ts__default['default'].sys, dirName);
    dtsFiles = fileNames.filter((name) => name.endsWith(dts));
    if (errors.length) {
        console.error(ts__default['default'].formatDiagnostics(errors, formatHost));
        return { dtsFiles, dirName, compilerOptions };
    }
    return {
        dtsFiles,
        dirName,
        compilerOptions: {
            ...options,
            ...compilerOptions,
        },
    };
}
function createProgram$1(fileName, overrideOptions) {
    const { dtsFiles, compilerOptions } = getCompilerOptions(fileName, overrideOptions);
    return ts__default['default'].createProgram([fileName].concat(Array.from(dtsFiles)), compilerOptions, ts__default['default'].createCompilerHost(compilerOptions, true));
}
function createPrograms(input, overrideOptions) {
    const programs = [];
    let inputs = [];
    let dtsFiles = new Set();
    let dirName = "";
    let compilerOptions = {};
    for (let main of input) {
        if (main.endsWith(dts)) {
            continue;
        }
        main = path__namespace.resolve(main);
        const options = getCompilerOptions(main, overrideOptions);
        options.dtsFiles.forEach(dtsFiles.add, dtsFiles);
        if (!inputs.length) {
            inputs.push(main);
            ({ dirName, compilerOptions } = options);
            continue;
        }
        if (options.dirName === dirName) {
            inputs.push(main);
        }
        else {
            const host = ts__default['default'].createCompilerHost(compilerOptions, true);
            const program = ts__default['default'].createProgram(inputs.concat(Array.from(dtsFiles)), compilerOptions, host);
            programs.push(program);
            inputs = [main];
            ({ dirName, compilerOptions } = options);
        }
    }
    if (inputs.length) {
        const host = ts__default['default'].createCompilerHost(compilerOptions, true);
        const program = ts__default['default'].createProgram(inputs.concat(Array.from(dtsFiles)), compilerOptions, host);
        programs.push(program);
    }
    return programs;
}

function getCodeFrame() {
    let codeFrameColumns = undefined;
    try {
        ({ codeFrameColumns } = require("@babel/code-frame"));
        return codeFrameColumns;
    }
    catch {
        try {
            const esmRequire = module$1.createRequire((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('rollup-plugin-dts.cjs', document.baseURI).href)));
            ({ codeFrameColumns } = esmRequire("@babel/code-frame"));
            return codeFrameColumns;
        }
        catch { }
    }
    return undefined;
}
function getLocation(node) {
    const sourceFile = node.getSourceFile();
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return {
        start: { line: start.line + 1, column: start.character + 1 },
        end: { line: end.line + 1, column: end.character + 1 },
    };
}
function frameNode(node) {
    const codeFrame = getCodeFrame();
    const sourceFile = node.getSourceFile();
    const code = sourceFile.getFullText();
    const location = getLocation(node);
    if (codeFrame) {
        return ("\n" +
            codeFrame(code, location, {
                highlightCode: true,
            }));
    }
    else {
        return `\n${location.start.line}:${location.start.column}: \`${node.getFullText().trim()}\``;
    }
}
class UnsupportedSyntaxError extends Error {
    constructor(node, message = "Syntax not yet supported") {
        super(`${message}\n${frameNode(node)}`);
    }
}

class NamespaceFixer {
    constructor(sourceFile) {
        this.sourceFile = sourceFile;
    }
    findNamespaces() {
        const namespaces = [];
        const items = {};
        for (const node of this.sourceFile.statements) {
            const location = {
                start: node.getStart(),
                end: node.getEnd(),
            };
            // Well, this is a big hack:
            // For some global `namespace` and `module` declarations, we generate
            // some fake IIFE code, so rollup can correctly scan its scope.
            // However, rollup will then insert bogus semicolons,
            // these `EmptyStatement`s, which are a syntax error and we want to
            // remove them. Well, we do that here…
            if (ts__default['default'].isEmptyStatement(node)) {
                namespaces.unshift({
                    name: "",
                    exports: [],
                    location,
                });
                continue;
            }
            // When generating multiple chunks, rollup links those via import
            // statements, obviously. But rollup uses full filenames with extension,
            // which typescript does not like. So make sure to remove those here.
            if ((ts__default['default'].isImportDeclaration(node) || ts__default['default'].isExportDeclaration(node)) &&
                node.moduleSpecifier &&
                ts__default['default'].isStringLiteral(node.moduleSpecifier)) {
                let { text } = node.moduleSpecifier;
                if (text.startsWith(".") && text.endsWith(".d.ts")) {
                    let end = node.moduleSpecifier.getEnd() - 1; // -1 to account for the quote
                    namespaces.unshift({
                        name: "",
                        exports: [],
                        location: {
                            start: end - 5,
                            end,
                        },
                    });
                }
            }
            if (ts__default['default'].isClassDeclaration(node)) {
                items[node.name.getText()] = { type: "class", generics: node.typeParameters && node.typeParameters.length };
            }
            else if (ts__default['default'].isFunctionDeclaration(node)) {
                // a function has generics, but these don’t need to be specified explicitly,
                // since functions are treated as values.
                items[node.name.getText()] = { type: "function" };
            }
            else if (ts__default['default'].isInterfaceDeclaration(node)) {
                items[node.name.getText()] = {
                    type: "interface",
                    generics: node.typeParameters && node.typeParameters.length,
                };
            }
            else if (ts__default['default'].isTypeAliasDeclaration(node)) {
                items[node.name.getText()] = { type: "type", generics: node.typeParameters && node.typeParameters.length };
            }
            else if (ts__default['default'].isModuleDeclaration(node) && ts__default['default'].isIdentifier(node.name)) {
                items[node.name.getText()] = { type: "namespace" };
            }
            else if (ts__default['default'].isEnumDeclaration(node)) {
                items[node.name.getText()] = { type: "enum" };
            }
            if (!ts__default['default'].isVariableStatement(node)) {
                continue;
            }
            const { declarations } = node.declarationList;
            if (declarations.length !== 1) {
                continue;
            }
            const decl = declarations[0];
            const name = decl.name.getText();
            if (!decl.initializer || !ts__default['default'].isCallExpression(decl.initializer)) {
                items[name] = { type: "var" };
                continue;
            }
            const obj = decl.initializer.arguments[0];
            if (!decl.initializer.expression.getFullText().includes("/*#__PURE__*/Object.freeze") ||
                !ts__default['default'].isObjectLiteralExpression(obj)) {
                continue;
            }
            const exports = [];
            for (const prop of obj.properties) {
                if (!ts__default['default'].isPropertyAssignment(prop) ||
                    !(ts__default['default'].isIdentifier(prop.name) || ts__default['default'].isStringLiteral(prop.name)) ||
                    (prop.name.text !== "__proto__" && !ts__default['default'].isIdentifier(prop.initializer))) {
                    throw new UnsupportedSyntaxError(prop, "Expected a property assignment");
                }
                if (prop.name.text === "__proto__") {
                    continue;
                }
                exports.push({
                    exportedName: prop.name.text,
                    localName: prop.initializer.getText(),
                });
            }
            // sort in reverse order, since we will do string manipulation
            namespaces.unshift({
                name,
                exports,
                location,
            });
        }
        return { namespaces, itemTypes: items };
    }
    fix() {
        let code = this.sourceFile.getFullText();
        const { namespaces, itemTypes } = this.findNamespaces();
        for (const ns of namespaces) {
            const codeAfter = code.slice(ns.location.end);
            code = code.slice(0, ns.location.start);
            for (const { exportedName, localName } of ns.exports) {
                if (exportedName === localName) {
                    const { type, generics } = itemTypes[localName] || {};
                    if (type === "interface" || type === "type") {
                        // an interface is just a type
                        const typeParams = renderTypeParams(generics);
                        code += `type ${ns.name}_${exportedName}${typeParams} = ${localName}${typeParams};\n`;
                    }
                    else if (type === "enum" || type === "class") {
                        // enums and classes are both types and values
                        const typeParams = renderTypeParams(generics);
                        code += `type ${ns.name}_${exportedName}${typeParams} = ${localName}${typeParams};\n`;
                        code += `declare const ${ns.name}_${exportedName}: typeof ${localName};\n`;
                    }
                    else {
                        // functions and vars are just values
                        code += `declare const ${ns.name}_${exportedName}: typeof ${localName};\n`;
                    }
                }
            }
            if (ns.name) {
                code += `declare namespace ${ns.name} {\n`;
                code += `  export {\n`;
                for (const { exportedName, localName } of ns.exports) {
                    if (exportedName === localName) {
                        code += `    ${ns.name}_${exportedName} as ${exportedName},\n`;
                    }
                    else {
                        code += `    ${localName} as ${exportedName},\n`;
                    }
                }
                code += `  };\n`;
                code += `}`;
            }
            code += codeAfter;
        }
        return code;
    }
}
function renderTypeParams(num) {
    if (!num) {
        return "";
    }
    return `<${Array.from({ length: num }, (_, i) => `_${i}`).join(", ")}>`;
}

let IDs = 1;
/**
 * Create a new `Program` for the given `node`:
 */
function createProgram(node) {
    return withStartEnd({
        type: "Program",
        sourceType: "module",
        body: [],
    }, { start: node.getFullStart(), end: node.getEnd() });
}
/**
 * Creates a reference to `id`:
 * `_ = ${id}`
 */
function createReference(id) {
    return {
        type: "AssignmentPattern",
        left: {
            type: "Identifier",
            name: String(IDs++),
        },
        right: id,
    };
}
function createIdentifier(node) {
    return withStartEnd({
        type: "Identifier",
        name: node.getText(),
    }, node);
}
/**
 * Create a new Scope which is always included
 * `(function (_ = MARKER) {})()`
 */
function createIIFE(range) {
    const fn = withStartEnd({
        type: "FunctionExpression",
        id: null,
        params: [],
        body: { type: "BlockStatement", body: [] },
    }, range);
    const iife = withStartEnd({
        type: "ExpressionStatement",
        expression: {
            type: "CallExpression",
            callee: { type: "Identifier", name: String(IDs++) },
            arguments: [fn],
            optional: false,
        },
    }, range);
    return { fn, iife };
}
/**
 * Create a new Declaration and Scope for `id`:
 * `function ${id}(_ = MARKER) {}`
 */
function createDeclaration(id, range) {
    return withStartEnd({
        type: "FunctionDeclaration",
        id: withStartEnd({
            type: "Identifier",
            name: ts__default['default'].idText(id),
        }, id),
        params: [],
        body: { type: "BlockStatement", body: [] },
    }, range);
}
function convertExpression(node) {
    if (ts__default['default'].isLiteralExpression(node)) {
        return { type: "Literal", value: node.text };
    }
    if (ts__default['default'].isPropertyAccessExpression(node)) {
        if (ts__default['default'].isPrivateIdentifier(node.name)) {
            throw new UnsupportedSyntaxError(node.name);
        }
        return withStartEnd({
            type: "MemberExpression",
            computed: false,
            optional: false,
            object: convertExpression(node.expression),
            property: convertExpression(node.name),
        }, {
            start: node.expression.getStart(),
            end: node.name.getEnd(),
        });
    }
    if (ts__default['default'].isIdentifier(node)) {
        return createIdentifier(node);
    }
    else {
        throw new UnsupportedSyntaxError(node);
    }
}
function withStartEnd(esNode, nodeOrRange) {
    let range = "start" in nodeOrRange ? nodeOrRange : { start: nodeOrRange.getStart(), end: nodeOrRange.getEnd() };
    return Object.assign(esNode, range);
}
function matchesModifier(node, flags) {
    const nodeFlags = ts__default['default'].getCombinedModifierFlags(node);
    return (nodeFlags & flags) === flags;
}

/**
 * The pre-process step has the following goals:
 * - [x] Fixes the "modifiers", removing any `export` modifier and adding any
 *   missing `declare` modifier.
 * - [x] Splitting compound `VariableStatement` into its parts.
 * - [x] Moving declarations for the same "name" to be next to each other.
 * - [x] Removing any triple-slash directives and recording them.
 * - [x] Create a synthetic name for any nameless "export default".
 * - [x] Resolve inline `import()` statements and generate top-level imports for
 *   them.
 * - [x] Generate a separate `export {}` statement for any item which had its
 *   modifiers rewritten.
 */
function preProcess({ sourceFile }) {
    const code = new MagicString__default['default'](sourceFile.getFullText());
    /** All the names that are declared in the `SourceFile`. */
    const declaredNames = new Set();
    /** All the names that are exported. */
    const exportedNames = new Set();
    /** The name of the default export. */
    let defaultExport = "";
    /** Inlined exports from `fileId` -> <synthetic name>. */
    const inlineImports = new Map();
    /** The ranges that each name covers, for re-ordering. */
    const nameRanges = new Map();
    /**
     * Pass 1:
     *
     * - Remove statements that we can’t handle.
     * - Collect a `Set` of all the declared names.
     * - Collect a `Set` of all the exported names.
     * - Maybe collect the name of the default export if present.
     * - Fix the modifiers of all the items.
     * - Collect the ranges of each named statement.
     */
    for (const node of sourceFile.statements) {
        if (ts__default['default'].isEmptyStatement(node)) {
            code.remove(node.getStart(), node.getEnd());
            continue;
        }
        if (ts__default['default'].isEnumDeclaration(node) ||
            ts__default['default'].isFunctionDeclaration(node) ||
            ts__default['default'].isInterfaceDeclaration(node) ||
            ts__default['default'].isClassDeclaration(node) ||
            ts__default['default'].isTypeAliasDeclaration(node) ||
            ts__default['default'].isModuleDeclaration(node)) {
            // collect the declared name
            if (node.name) {
                const name = node.name.getText();
                declaredNames.add(name);
                // collect the exported name, maybe as `default`.
                if (matchesModifier(node, ts__default['default'].ModifierFlags.ExportDefault)) {
                    defaultExport = name;
                }
                else if (matchesModifier(node, ts__default['default'].ModifierFlags.Export)) {
                    exportedNames.add(name);
                }
                if (!(node.flags & ts__default['default'].NodeFlags.GlobalAugmentation)) {
                    pushNamedNode(name, [getStart(node), getEnd(node)]);
                }
            }
            fixModifiers(code, node);
        }
        else if (ts__default['default'].isVariableStatement(node)) {
            const { declarations } = node.declarationList;
            // collect all the names, also check if they are exported
            const isExport = matchesModifier(node, ts__default['default'].ModifierFlags.Export);
            for (const decl of node.declarationList.declarations) {
                if (ts__default['default'].isIdentifier(decl.name)) {
                    const name = decl.name.getText();
                    declaredNames.add(name);
                    if (isExport) {
                        exportedNames.add(name);
                    }
                }
            }
            fixModifiers(code, node);
            // collect the ranges for re-ordering
            if (declarations.length == 1) {
                const decl = declarations[0];
                if (ts__default['default'].isIdentifier(decl.name)) {
                    pushNamedNode(decl.name.getText(), [getStart(node), getEnd(node)]);
                }
            }
            else {
                // we do reordering after splitting
                const decls = declarations.slice();
                const first = decls.shift();
                pushNamedNode(first.name.getText(), [getStart(node), first.getEnd()]);
                for (const decl of decls) {
                    if (ts__default['default'].isIdentifier(decl.name)) {
                        pushNamedNode(decl.name.getText(), [decl.getFullStart(), decl.getEnd()]);
                    }
                }
            }
            // split the variable declaration into different statements
            const { flags } = node.declarationList;
            const type = flags & ts__default['default'].NodeFlags.Let ? "let" : flags & ts__default['default'].NodeFlags.Const ? "const" : "var";
            const prefix = `declare ${type} `;
            const list = node.declarationList
                .getChildren()
                .find((c) => c.kind === ts__default['default'].SyntaxKind.SyntaxList)
                .getChildren();
            let commaPos = 0;
            for (const node of list) {
                if (node.kind === ts__default['default'].SyntaxKind.CommaToken) {
                    commaPos = node.getStart();
                    code.remove(commaPos, node.getEnd());
                }
                else if (commaPos) {
                    code.appendLeft(commaPos, ";\n");
                    const start = node.getFullStart();
                    const slice = code.slice(start, node.getStart());
                    let whitespace = slice.length - slice.trimStart().length;
                    if (whitespace) {
                        code.overwrite(start, start + whitespace, prefix);
                    }
                    else {
                        code.appendLeft(start, prefix);
                    }
                }
            }
        }
    }
    /**
     * Pass 2:
     *
     * Now that we have a Set of all the declared names, we can use that to
     * generate and de-conflict names for the following steps:
     *
     * - Resolve all the inline imports.
     * - Give any name-less `default export` a name.
     */
    for (const node of sourceFile.statements) {
        // recursively check inline imports
        checkInlineImport(node);
        if (!matchesModifier(node, ts__default['default'].ModifierFlags.ExportDefault)) {
            continue;
        }
        // only function and class can be default exported, and be missing a name
        if (ts__default['default'].isFunctionDeclaration(node) || ts__default['default'].isClassDeclaration(node)) {
            if (node.name) {
                continue;
            }
            if (!defaultExport) {
                defaultExport = uniqName("export_default");
            }
            const children = node.getChildren();
            const idx = children.findIndex((node) => node.kind === ts__default['default'].SyntaxKind.ClassKeyword || node.kind === ts__default['default'].SyntaxKind.FunctionKeyword);
            const token = children[idx];
            const nextToken = children[idx + 1];
            const isPunctuation = nextToken.kind >= ts__default['default'].SyntaxKind.FirstPunctuation && nextToken.kind <= ts__default['default'].SyntaxKind.LastPunctuation;
            if (isPunctuation) {
                code.appendLeft(nextToken.getStart(), defaultExport);
            }
            else {
                code.appendRight(token.getEnd(), ` ${defaultExport}`);
            }
        }
    }
    // and re-order all the name ranges to be contiguous
    for (const ranges of nameRanges.values()) {
        // we have to move all the nodes in front of the *last* one, which is a bit
        // unintuitive but is a workaround for:
        // https://github.com/Rich-Harris/magic-string/issues/180
        const last = ranges.pop();
        const start = last[0];
        for (const node of ranges) {
            code.move(node[0], node[1], start);
        }
    }
    // render all the inline imports, and all the exports
    if (defaultExport) {
        code.append(`\nexport default ${defaultExport};\n`);
    }
    if (exportedNames.size) {
        code.append(`\nexport { ${[...exportedNames].join(", ")} };\n`);
    }
    for (const [fileId, importName] of inlineImports.entries()) {
        code.prepend(`import * as ${importName} from "${fileId}";\n`);
    }
    // and collect/remove all the typeReferenceDirectives
    const typeReferences = new Set();
    const lineStarts = sourceFile.getLineStarts();
    for (const ref of sourceFile.typeReferenceDirectives) {
        typeReferences.add(ref.fileName);
        const { line } = sourceFile.getLineAndCharacterOfPosition(ref.pos);
        const start = lineStarts[line];
        let end = sourceFile.getLineEndOfPosition(ref.pos);
        if (code.slice(end, end + 1) == "\n") {
            end += 1;
        }
        code.remove(start, end);
    }
    return {
        code,
        typeReferences,
    };
    function checkInlineImport(node) {
        ts__default['default'].forEachChild(node, checkInlineImport);
        if (ts__default['default'].isImportTypeNode(node)) {
            if (!ts__default['default'].isLiteralTypeNode(node.argument) || !ts__default['default'].isStringLiteral(node.argument.literal)) {
                throw new UnsupportedSyntaxError(node, "inline imports should have a literal argument");
            }
            const fileId = node.argument.literal.text;
            const children = node.getChildren();
            const start = children.find((t) => t.kind === ts__default['default'].SyntaxKind.ImportKeyword).getStart();
            let end = node.getEnd();
            const token = children.find((t) => t.kind === ts__default['default'].SyntaxKind.DotToken || t.kind === ts__default['default'].SyntaxKind.LessThanToken);
            if (token) {
                end = token.getStart();
            }
            const importName = createNamespaceImport(fileId);
            code.overwrite(start, end, importName);
        }
    }
    function createNamespaceImport(fileId) {
        let importName = inlineImports.get(fileId);
        if (!importName) {
            importName = uniqName(fileId.replace(/[^a-zA-Z0-9_$]/g, () => "_"));
            inlineImports.set(fileId, importName);
        }
        return importName;
    }
    function uniqName(hint) {
        let name = hint;
        while (declaredNames.has(name)) {
            name = `_${name}`;
        }
        declaredNames.add(name);
        return name;
    }
    function pushNamedNode(name, range) {
        let nodes = nameRanges.get(name);
        if (!nodes) {
            nodes = [range];
            nameRanges.set(name, nodes);
        }
        else {
            const last = nodes[nodes.length - 1];
            if (last[1] === range[0]) {
                last[1] = range[1];
            }
            else {
                nodes.push(range);
            }
        }
    }
}
function fixModifiers(code, node) {
    var _a;
    // remove the `export` and `default` modifier, add a `declare` if its missing.
    let hasDeclare = false;
    const needsDeclare = ts__default['default'].isClassDeclaration(node) ||
        ts__default['default'].isFunctionDeclaration(node) ||
        ts__default['default'].isModuleDeclaration(node) ||
        ts__default['default'].isVariableStatement(node);
    for (const mod of (_a = node.modifiers) !== null && _a !== void 0 ? _a : []) {
        switch (mod.kind) {
            case ts__default['default'].SyntaxKind.ExportKeyword: // fall through
            case ts__default['default'].SyntaxKind.DefaultKeyword:
                // TODO: be careful about that `+ 1`
                code.remove(mod.getStart(), mod.getEnd() + 1);
                break;
            case ts__default['default'].SyntaxKind.DeclareKeyword:
                hasDeclare = true;
        }
    }
    if (needsDeclare && !hasDeclare) {
        code.appendRight(node.getStart(), "declare ");
    }
}
function getStart(node) {
    const start = node.getFullStart();
    return start + (newlineAt(node, start) ? 1 : 0);
}
function getEnd(node) {
    const end = node.getEnd();
    return end + (newlineAt(node, end) ? 1 : 0);
}
function newlineAt(node, idx) {
    return node.getSourceFile().getFullText()[idx] == "\n";
}

const IGNORE_TYPENODES = new Set([
    ts__default['default'].SyntaxKind.LiteralType,
    ts__default['default'].SyntaxKind.VoidKeyword,
    ts__default['default'].SyntaxKind.UnknownKeyword,
    ts__default['default'].SyntaxKind.AnyKeyword,
    ts__default['default'].SyntaxKind.BooleanKeyword,
    ts__default['default'].SyntaxKind.NumberKeyword,
    ts__default['default'].SyntaxKind.StringKeyword,
    ts__default['default'].SyntaxKind.ObjectKeyword,
    ts__default['default'].SyntaxKind.NullKeyword,
    ts__default['default'].SyntaxKind.UndefinedKeyword,
    ts__default['default'].SyntaxKind.SymbolKeyword,
    ts__default['default'].SyntaxKind.NeverKeyword,
    ts__default['default'].SyntaxKind.ThisKeyword,
    ts__default['default'].SyntaxKind.ThisType,
    ts__default['default'].SyntaxKind.BigIntKeyword,
]);
class DeclarationScope {
    constructor({ id, range }) {
        /**
         * As we walk the AST, we need to keep track of type variable bindings that
         * shadow the outer identifiers. To achieve this, we keep a stack of scopes,
         * represented as Sets of variable names.
         */
        this.scopes = [];
        if (id) {
            this.declaration = createDeclaration(id, range);
        }
        else {
            const { iife, fn } = createIIFE(range);
            this.iife = iife;
            this.declaration = fn;
        }
    }
    pushScope() {
        this.scopes.push(new Set());
    }
    popScope(n = 1) {
        for (let i = 0; i < n; i++) {
            this.scopes.pop();
        }
    }
    pushTypeVariable(id) {
        var _a;
        const name = id.getText();
        (_a = this.scopes[this.scopes.length - 1]) === null || _a === void 0 ? void 0 : _a.add(name);
    }
    pushRaw(expr) {
        this.declaration.params.push(expr);
    }
    pushReference(id) {
        let name;
        // We convert references from TS AST to ESTree
        // to hand them off to rollup.
        // This means we have to check the left-most identifier inside our scope
        // tree and avoid to create the reference in that case
        if (id.type === "Identifier") {
            name = id.name;
        }
        else if (id.type === "MemberExpression") {
            if (id.object.type === "Identifier") {
                name = id.object.name;
            }
        }
        if (name) {
            for (const scope of this.scopes) {
                if (scope.has(name)) {
                    return;
                }
            }
        }
        this.pushRaw(createReference(id));
    }
    pushIdentifierReference(id) {
        this.pushReference(createIdentifier(id));
    }
    convertEntityName(node) {
        if (ts__default['default'].isIdentifier(node)) {
            return createIdentifier(node);
        }
        return withStartEnd({
            type: "MemberExpression",
            computed: false,
            optional: false,
            object: this.convertEntityName(node.left),
            property: createIdentifier(node.right),
        }, node);
    }
    convertPropertyAccess(node) {
        // hm, we only care about property access expressions here…
        if (!ts__default['default'].isIdentifier(node.expression) && !ts__default['default'].isPropertyAccessExpression(node.expression)) {
            throw new UnsupportedSyntaxError(node.expression);
        }
        if (ts__default['default'].isPrivateIdentifier(node.name)) {
            throw new UnsupportedSyntaxError(node.name);
        }
        let object = ts__default['default'].isIdentifier(node.expression)
            ? createIdentifier(node.expression)
            : this.convertPropertyAccess(node.expression);
        return withStartEnd({
            type: "MemberExpression",
            computed: false,
            optional: false,
            object,
            property: createIdentifier(node.name),
        }, node);
    }
    convertComputedPropertyName(node) {
        if (!node.name || !ts__default['default'].isComputedPropertyName(node.name)) {
            return;
        }
        const { expression } = node.name;
        if (ts__default['default'].isLiteralExpression(expression)) {
            return;
        }
        if (ts__default['default'].isIdentifier(expression)) {
            return this.pushReference(createIdentifier(expression));
        }
        if (ts__default['default'].isPropertyAccessExpression(expression)) {
            return this.pushReference(this.convertPropertyAccess(expression));
        }
        throw new UnsupportedSyntaxError(expression);
    }
    convertParametersAndType(node) {
        this.convertComputedPropertyName(node);
        const typeVariables = this.convertTypeParameters(node.typeParameters);
        for (const param of node.parameters) {
            this.convertTypeNode(param.type);
        }
        this.convertTypeNode(node.type);
        this.popScope(typeVariables);
    }
    convertHeritageClauses(node) {
        for (const heritage of node.heritageClauses || []) {
            for (const type of heritage.types) {
                this.pushReference(convertExpression(type.expression));
                this.convertTypeArguments(type);
            }
        }
    }
    convertTypeArguments(node) {
        if (!node.typeArguments) {
            return;
        }
        for (const arg of node.typeArguments) {
            this.convertTypeNode(arg);
        }
    }
    convertMembers(members) {
        for (const node of members) {
            if (ts__default['default'].isPropertyDeclaration(node) || ts__default['default'].isPropertySignature(node) || ts__default['default'].isIndexSignatureDeclaration(node)) {
                this.convertComputedPropertyName(node);
                this.convertTypeNode(node.type);
                continue;
            }
            if (ts__default['default'].isMethodDeclaration(node) ||
                ts__default['default'].isMethodSignature(node) ||
                ts__default['default'].isConstructorDeclaration(node) ||
                ts__default['default'].isConstructSignatureDeclaration(node) ||
                ts__default['default'].isCallSignatureDeclaration(node) ||
                ts__default['default'].isGetAccessorDeclaration(node) ||
                ts__default['default'].isSetAccessorDeclaration(node)) {
                this.convertParametersAndType(node);
            }
            else {
                throw new UnsupportedSyntaxError(node);
            }
        }
    }
    convertTypeParameters(params) {
        if (!params) {
            return 0;
        }
        for (const node of params) {
            this.convertTypeNode(node.constraint);
            this.convertTypeNode(node.default);
            this.pushScope();
            this.pushTypeVariable(node.name);
        }
        return params.length;
    }
    convertTypeNode(node) {
        if (!node) {
            return;
        }
        if (IGNORE_TYPENODES.has(node.kind)) {
            return;
        }
        if (ts__default['default'].isTypeReferenceNode(node)) {
            this.pushReference(this.convertEntityName(node.typeName));
            this.convertTypeArguments(node);
            return;
        }
        if (ts__default['default'].isTypeLiteralNode(node)) {
            return this.convertMembers(node.members);
        }
        if (ts__default['default'].isArrayTypeNode(node)) {
            return this.convertTypeNode(node.elementType);
        }
        if (ts__default['default'].isTupleTypeNode(node)) {
            for (const type of node.elements) {
                this.convertTypeNode(type);
            }
            return;
        }
        if (ts__default['default'].isNamedTupleMember(node) ||
            ts__default['default'].isParenthesizedTypeNode(node) ||
            ts__default['default'].isTypeOperatorNode(node) ||
            ts__default['default'].isTypePredicateNode(node)) {
            return this.convertTypeNode(node.type);
        }
        if (ts__default['default'].isUnionTypeNode(node) || ts__default['default'].isIntersectionTypeNode(node)) {
            for (const type of node.types) {
                this.convertTypeNode(type);
            }
            return;
        }
        if (ts__default['default'].isMappedTypeNode(node)) {
            const { typeParameter, type, nameType } = node;
            this.convertTypeNode(typeParameter.constraint);
            this.pushScope();
            this.pushTypeVariable(typeParameter.name);
            this.convertTypeNode(type);
            if (nameType) {
                this.convertTypeNode(nameType);
            }
            this.popScope();
            return;
        }
        if (ts__default['default'].isConditionalTypeNode(node)) {
            this.convertTypeNode(node.checkType);
            this.pushScope();
            this.convertTypeNode(node.extendsType);
            this.convertTypeNode(node.trueType);
            this.convertTypeNode(node.falseType);
            this.popScope();
            return;
        }
        if (ts__default['default'].isIndexedAccessTypeNode(node)) {
            this.convertTypeNode(node.objectType);
            this.convertTypeNode(node.indexType);
            return;
        }
        if (ts__default['default'].isFunctionOrConstructorTypeNode(node)) {
            this.convertParametersAndType(node);
            return;
        }
        if (ts__default['default'].isTypeQueryNode(node)) {
            this.pushReference(this.convertEntityName(node.exprName));
            return;
        }
        if (ts__default['default'].isRestTypeNode(node)) {
            this.convertTypeNode(node.type);
            return;
        }
        if (ts__default['default'].isOptionalTypeNode(node)) {
            this.convertTypeNode(node.type);
            return;
        }
        if (ts__default['default'].isTemplateLiteralTypeNode(node)) {
            for (const span of node.templateSpans) {
                this.convertTypeNode(span.type);
            }
            return;
        }
        if (ts__default['default'].isInferTypeNode(node)) {
            this.pushTypeVariable(node.typeParameter.name);
            return;
        }
        else {
            throw new UnsupportedSyntaxError(node);
        }
    }
    convertNamespace(node) {
        this.pushScope();
        if (!node.body || !ts__default['default'].isModuleBlock(node.body)) {
            throw new UnsupportedSyntaxError(node, `namespace must have a "ModuleBlock" body.`);
        }
        const { statements } = node.body;
        // first, hoist all the declarations for correct shadowing
        for (const stmt of statements) {
            if (ts__default['default'].isEnumDeclaration(stmt) ||
                ts__default['default'].isFunctionDeclaration(stmt) ||
                ts__default['default'].isClassDeclaration(stmt) ||
                ts__default['default'].isInterfaceDeclaration(stmt) ||
                ts__default['default'].isTypeAliasDeclaration(stmt) ||
                ts__default['default'].isModuleDeclaration(stmt)) {
                if (stmt.name && ts__default['default'].isIdentifier(stmt.name)) {
                    this.pushTypeVariable(stmt.name);
                }
                else {
                    throw new UnsupportedSyntaxError(stmt, `non-Identifier name not supported`);
                }
                continue;
            }
            if (ts__default['default'].isVariableStatement(stmt)) {
                for (const decl of stmt.declarationList.declarations) {
                    if (ts__default['default'].isIdentifier(decl.name)) {
                        this.pushTypeVariable(decl.name);
                    }
                    else {
                        throw new UnsupportedSyntaxError(decl, `non-Identifier name not supported`);
                    }
                }
                continue;
            }
            if (ts__default['default'].isExportDeclaration(stmt)) ;
            else {
                throw new UnsupportedSyntaxError(stmt, `namespace child (hoisting) not supported yet`);
            }
        }
        // and then walk all the children like normal…
        for (const stmt of statements) {
            if (ts__default['default'].isVariableStatement(stmt)) {
                for (const decl of stmt.declarationList.declarations) {
                    if (decl.type) {
                        this.convertTypeNode(decl.type);
                    }
                }
                continue;
            }
            if (ts__default['default'].isFunctionDeclaration(stmt)) {
                this.convertParametersAndType(stmt);
                continue;
            }
            if (ts__default['default'].isInterfaceDeclaration(stmt) || ts__default['default'].isClassDeclaration(stmt)) {
                const typeVariables = this.convertTypeParameters(stmt.typeParameters);
                this.convertHeritageClauses(stmt);
                this.convertMembers(stmt.members);
                this.popScope(typeVariables);
                continue;
            }
            if (ts__default['default'].isTypeAliasDeclaration(stmt)) {
                const typeVariables = this.convertTypeParameters(stmt.typeParameters);
                this.convertTypeNode(stmt.type);
                this.popScope(typeVariables);
                continue;
            }
            if (ts__default['default'].isModuleDeclaration(stmt)) {
                this.convertNamespace(stmt);
                continue;
            }
            if (ts__default['default'].isEnumDeclaration(stmt)) {
                // noop
                continue;
            }
            if (ts__default['default'].isExportDeclaration(stmt)) {
                if (stmt.exportClause) {
                    if (ts__default['default'].isNamespaceExport(stmt.exportClause)) {
                        throw new UnsupportedSyntaxError(stmt.exportClause);
                    }
                    for (const decl of stmt.exportClause.elements) {
                        const id = decl.propertyName || decl.name;
                        this.pushIdentifierReference(id);
                    }
                }
            }
            else {
                throw new UnsupportedSyntaxError(stmt, `namespace child (walking) not supported yet`);
            }
        }
        this.popScope();
    }
}

function convert({ sourceFile }) {
    const transformer = new Transformer(sourceFile);
    return transformer.transform();
}
class Transformer {
    constructor(sourceFile) {
        this.sourceFile = sourceFile;
        this.declarations = new Map();
        this.ast = createProgram(sourceFile);
        for (const stmt of sourceFile.statements) {
            this.convertStatement(stmt);
        }
    }
    transform() {
        return {
            ast: this.ast,
        };
    }
    pushStatement(node) {
        this.ast.body.push(node);
    }
    createDeclaration(node, id) {
        const range = { start: node.getFullStart(), end: node.getEnd() };
        if (!id) {
            const scope = new DeclarationScope({ range });
            this.pushStatement(scope.iife);
            return scope;
        }
        const name = id.getText();
        // We have re-ordered and grouped declarations in `reorderStatements`,
        // so we can assume same-name statements are next to each other, so we just
        // bump the `end` range.
        const scope = new DeclarationScope({ id, range });
        const existingScope = this.declarations.get(name);
        if (existingScope) {
            existingScope.pushIdentifierReference(id);
            existingScope.declaration.end = range.end;
            // we possibly have other declarations, such as an ExportDeclaration in
            // between, which should also be updated to the correct start/end.
            let selfIdx = this.ast.body.findIndex((node) => node == existingScope.declaration);
            for (let i = selfIdx + 1; i < this.ast.body.length; i++) {
                const decl = this.ast.body[i];
                decl.start = decl.end = range.end;
            }
        }
        else {
            this.pushStatement(scope.declaration);
            this.declarations.set(name, scope);
        }
        return existingScope || scope;
    }
    convertStatement(node) {
        if (ts__default['default'].isEnumDeclaration(node)) {
            return this.convertEnumDeclaration(node);
        }
        if (ts__default['default'].isFunctionDeclaration(node)) {
            return this.convertFunctionDeclaration(node);
        }
        if (ts__default['default'].isInterfaceDeclaration(node) || ts__default['default'].isClassDeclaration(node)) {
            return this.convertClassOrInterfaceDeclaration(node);
        }
        if (ts__default['default'].isTypeAliasDeclaration(node)) {
            return this.convertTypeAliasDeclaration(node);
        }
        if (ts__default['default'].isVariableStatement(node)) {
            return this.convertVariableStatement(node);
        }
        if (ts__default['default'].isExportDeclaration(node) || ts__default['default'].isExportAssignment(node)) {
            return this.convertExportDeclaration(node);
        }
        if (ts__default['default'].isModuleDeclaration(node)) {
            return this.convertNamespaceDeclaration(node);
        }
        if (node.kind == ts__default['default'].SyntaxKind.NamespaceExportDeclaration) {
            // just ignore `export as namespace FOO` statements…
            return this.removeStatement(node);
        }
        if (ts__default['default'].isImportDeclaration(node) || ts__default['default'].isImportEqualsDeclaration(node)) {
            return this.convertImportDeclaration(node);
        }
        else {
            throw new UnsupportedSyntaxError(node);
        }
    }
    removeStatement(node) {
        this.pushStatement(withStartEnd({
            type: "ExpressionStatement",
            expression: { type: "Literal", value: "pls remove me" },
        }, node));
    }
    convertNamespaceDeclaration(node) {
        // we want to keep `declare global` augmentations, and we want to
        // pull in all the things referenced inside.
        // so for this case, we need to figure out some way so that rollup does
        // the right thing and not rename these…
        const isGlobalAugmentation = node.flags & ts__default['default'].NodeFlags.GlobalAugmentation;
        if (isGlobalAugmentation || !ts__default['default'].isIdentifier(node.name)) {
            const scope = this.createDeclaration(node);
            scope.convertNamespace(node);
            return;
        }
        const scope = this.createDeclaration(node, node.name);
        scope.pushIdentifierReference(node.name);
        scope.convertNamespace(node);
    }
    convertEnumDeclaration(node) {
        const scope = this.createDeclaration(node, node.name);
        scope.pushIdentifierReference(node.name);
    }
    convertFunctionDeclaration(node) {
        if (!node.name) {
            throw new UnsupportedSyntaxError(node, `FunctionDeclaration should have a name`);
        }
        const scope = this.createDeclaration(node, node.name);
        scope.pushIdentifierReference(node.name);
        scope.convertParametersAndType(node);
    }
    convertClassOrInterfaceDeclaration(node) {
        if (!node.name) {
            throw new UnsupportedSyntaxError(node, `ClassDeclaration / InterfaceDeclaration should have a name`);
        }
        const scope = this.createDeclaration(node, node.name);
        const typeVariables = scope.convertTypeParameters(node.typeParameters);
        scope.convertHeritageClauses(node);
        scope.convertMembers(node.members);
        scope.popScope(typeVariables);
    }
    convertTypeAliasDeclaration(node) {
        const scope = this.createDeclaration(node, node.name);
        const typeVariables = scope.convertTypeParameters(node.typeParameters);
        scope.convertTypeNode(node.type);
        scope.popScope(typeVariables);
    }
    convertVariableStatement(node) {
        const { declarations } = node.declarationList;
        if (declarations.length !== 1) {
            throw new UnsupportedSyntaxError(node, `VariableStatement with more than one declaration not yet supported`);
        }
        for (const decl of declarations) {
            if (!ts__default['default'].isIdentifier(decl.name)) {
                throw new UnsupportedSyntaxError(node, `VariableDeclaration must have a name`);
            }
            const scope = this.createDeclaration(node, decl.name);
            scope.convertTypeNode(decl.type);
        }
    }
    convertExportDeclaration(node) {
        if (ts__default['default'].isExportAssignment(node)) {
            this.pushStatement(withStartEnd({
                type: "ExportDefaultDeclaration",
                declaration: convertExpression(node.expression),
            }, node));
            return;
        }
        const source = node.moduleSpecifier ? convertExpression(node.moduleSpecifier) : undefined;
        if (!node.exportClause) {
            // export * from './other'
            this.pushStatement(withStartEnd({
                type: "ExportAllDeclaration",
                source,
                exported: null,
            }, node));
        }
        else if (ts__default['default'].isNamespaceExport(node.exportClause)) {
            // export * as name from './other'
            this.pushStatement(withStartEnd({
                type: "ExportAllDeclaration",
                source,
                exported: createIdentifier(node.exportClause.name),
            }, node));
        }
        else {
            // export { name } from './other'
            const specifiers = [];
            for (const elem of node.exportClause.elements) {
                specifiers.push(this.convertExportSpecifier(elem));
            }
            this.pushStatement(withStartEnd({
                type: "ExportNamedDeclaration",
                declaration: null,
                specifiers,
                source,
            }, node));
        }
    }
    convertImportDeclaration(node) {
        if (ts__default['default'].isImportEqualsDeclaration(node)) {
            // assume its like `import default`
            if (!ts__default['default'].isExternalModuleReference(node.moduleReference)) {
                throw new UnsupportedSyntaxError(node, "ImportEquals should have a literal source.");
            }
            this.pushStatement(withStartEnd({
                type: "ImportDeclaration",
                specifiers: [
                    {
                        type: "ImportDefaultSpecifier",
                        local: createIdentifier(node.name),
                    },
                ],
                source: convertExpression(node.moduleReference.expression),
            }, node));
            return;
        }
        const source = convertExpression(node.moduleSpecifier);
        const specifiers = node.importClause && node.importClause.namedBindings
            ? this.convertNamedImportBindings(node.importClause.namedBindings)
            : [];
        if (node.importClause && node.importClause.name) {
            specifiers.push({
                type: "ImportDefaultSpecifier",
                local: createIdentifier(node.importClause.name),
            });
        }
        this.pushStatement(withStartEnd({
            type: "ImportDeclaration",
            specifiers,
            source,
        }, node));
    }
    convertNamedImportBindings(node) {
        if (ts__default['default'].isNamedImports(node)) {
            return node.elements.map((el) => {
                const local = createIdentifier(el.name);
                const imported = el.propertyName ? createIdentifier(el.propertyName) : local;
                return {
                    type: "ImportSpecifier",
                    local,
                    imported,
                };
            });
        }
        return [
            {
                type: "ImportNamespaceSpecifier",
                local: createIdentifier(node.name),
            },
        ];
    }
    convertExportSpecifier(node) {
        const exported = createIdentifier(node.name);
        return {
            type: "ExportSpecifier",
            exported: exported,
            local: node.propertyName ? createIdentifier(node.propertyName) : exported,
        };
    }
}

function parse(fileName, code) {
    return ts__default['default'].createSourceFile(fileName, code, ts__default['default'].ScriptTarget.Latest, true);
}
/**
 * This is the *transform* part of `rollup-plugin-dts`.
 *
 * It sets a few input and output options, and otherwise is the core part of the
 * plugin responsible for bundling `.d.ts` files.
 *
 * That itself is a multi-step process:
 *
 * 1. The plugin has a preprocessing step that moves code around and cleans it
 *    up a bit, so that later steps can work with it easier. See `preprocess.ts`.
 * 2. It then converts the TypeScript AST into a ESTree-like AST that rollup
 *    understands. See `Transformer.ts`.
 * 3. After rollup is finished, the plugin will postprocess the output in a
 *    `renderChunk` hook. As rollup usually outputs javascript, it can output
 *    some code that is invalid in the context of a `.d.ts` file. In particular,
 *    the postprocess convert any javascript code that was created for namespace
 *    exports into TypeScript namespaces. See `NamespaceFixer.ts`.
 */
const transform = () => {
    const allTypeReferences = new Map();
    return {
        name: "dts-transform",
        options(options) {
            const { onwarn } = options;
            return {
                ...options,
                onwarn(warning, warn) {
                    if (warning.code != "CIRCULAR_DEPENDENCY") {
                        if (onwarn) {
                            onwarn(warning, warn);
                        }
                        else {
                            warn(warning);
                        }
                    }
                },
                treeshake: {
                    moduleSideEffects: "no-external",
                    propertyReadSideEffects: true,
                    unknownGlobalSideEffects: false,
                },
            };
        },
        outputOptions(options) {
            return {
                ...options,
                chunkFileNames: options.chunkFileNames || "[name]-[hash].d.ts",
                entryFileNames: options.entryFileNames || "[name].d.ts",
                format: "es",
                exports: "named",
                compact: false,
                freeze: true,
                interop: false,
                namespaceToStringTag: false,
                strict: false,
            };
        },
        transform(code, fileName) {
            let sourceFile = parse(fileName, code);
            const preprocessed = preProcess({ sourceFile });
            // `sourceFile.fileName` here uses forward slashes
            allTypeReferences.set(sourceFile.fileName, preprocessed.typeReferences);
            code = preprocessed.code.toString();
            sourceFile = parse(fileName, code);
            const converted = convert({ sourceFile });
            if (process.env.DTS_DUMP_AST) {
                console.log(fileName);
                console.log(code);
                console.log(JSON.stringify(converted.ast.body, undefined, 2));
            }
            return { code, ast: converted.ast, map: preprocessed.code.generateMap() };
        },
        renderChunk(code, chunk) {
            const source = parse(chunk.fileName, code);
            const fixer = new NamespaceFixer(source);
            const typeReferences = new Set();
            for (const fileName of Object.keys(chunk.modules)) {
                for (const ref of allTypeReferences.get(fileName.split("\\").join("/")) || []) {
                    typeReferences.add(ref);
                }
            }
            code = writeBlock(Array.from(typeReferences, (ref) => `/// <reference types="${ref}" />`));
            code += fixer.fix();
            return { code, map: { mappings: "" } };
        },
    };
};
function writeBlock(codes) {
    if (codes.length) {
        return codes.join("\n") + "\n";
    }
    return "";
}

const tsx = /\.(t|j)sx?$/;
const plugin = (options = {}) => {
    const transformPlugin = transform();
    const { respectExternal = false, compilerOptions = {} } = options;
    // There exists one Program object per entry point,
    // except when all entry points are ".d.ts" modules.
    let programs = [];
    function getModule(fileName) {
        let source;
        let program;
        // Create any `ts.SourceFile` objects on-demand for ".d.ts" modules,
        // but only when there are zero ".ts" entry points.
        if (!programs.length && fileName.endsWith(dts)) {
            source = true;
        }
        else {
            // Rollup doesn't tell you the entry point of each module in the bundle,
            // so we need to ask every TypeScript program for the given filename.
            program = programs.find((p) => (source = p.getSourceFile(fileName)));
            if (!program && ts__default['default'].sys.fileExists(fileName)) {
                programs.push((program = createProgram$1(fileName, compilerOptions)));
                source = program.getSourceFile(fileName);
            }
        }
        return { source, program };
    }
    return {
        name: "dts",
        options(options) {
            let { input = [] } = options;
            if (!Array.isArray(input)) {
                input = typeof input === "string" ? [input] : Object.values(input);
            }
            else if (input.length > 1) {
                // when dealing with multiple unnamed inputs, transform the inputs into
                // an explicit object, which strips the file extension
                options.input = {};
                for (const filename of input) {
                    const name = path__namespace.basename(filename).replace(/((\.d)?\.(t|j)sx?)$/, "");
                    options.input[name] = filename;
                }
            }
            programs = createPrograms(Object.values(input), compilerOptions);
            return transformPlugin.options.call(this, options);
        },
        outputOptions: transformPlugin.outputOptions,
        transform(code, id) {
            const transformFile = (source, id) => {
                if (typeof source === "object") {
                    code = source.getFullText();
                }
                return transformPlugin.transform.call(this, code, id);
            };
            if (!tsx.test(id)) {
                return null;
            }
            if (id.endsWith(dts)) {
                const { source } = getModule(id);
                return source ? transformFile(source, id) : null;
            }
            // Always try ".d.ts" before ".tsx?"
            const declarationId = id.replace(tsx, dts);
            let module = getModule(declarationId);
            if (module.source) {
                return transformFile(module.source, declarationId);
            }
            // Generate in-memory ".d.ts" modules from ".tsx?" modules!
            module = getModule(id);
            if (typeof module.source != "object" || !module.program) {
                return null;
            }
            let generated;
            const { emitSkipped, diagnostics } = module.program.emit(module.source, (_, declarationText) => {
                code = declarationText;
                generated = transformFile(true, declarationId);
            }, undefined, // cancellationToken
            true);
            if (emitSkipped) {
                const errors = diagnostics.filter((diag) => diag.category === ts__default['default'].DiagnosticCategory.Error);
                if (errors.length) {
                    console.error(ts__default['default'].formatDiagnostics(errors, formatHost));
                    this.error("Failed to compile. Check the logs above.");
                }
            }
            return generated;
        },
        resolveId(source, importer) {
            if (!importer) {
                return;
            }
            // normalize directory separators to forward slashes, as apparently typescript expects that?
            importer = importer.split("\\").join("/");
            // resolve this via typescript
            const { resolvedModule } = ts__default['default'].nodeModuleNameResolver(source, importer, compilerOptions, ts__default['default'].sys);
            if (!resolvedModule) {
                return;
            }
            if (!respectExternal && resolvedModule.isExternalLibraryImport) {
                // here, we define everything that comes from `node_modules` as `external`.
                return { id: source, external: true };
            }
            else {
                // using `path.resolve` here converts paths back to the system specific separators
                return { id: path__namespace.resolve(resolvedModule.resolvedFileName) };
            }
        },
        renderChunk: transformPlugin.renderChunk,
    };
};

exports.default = plugin;

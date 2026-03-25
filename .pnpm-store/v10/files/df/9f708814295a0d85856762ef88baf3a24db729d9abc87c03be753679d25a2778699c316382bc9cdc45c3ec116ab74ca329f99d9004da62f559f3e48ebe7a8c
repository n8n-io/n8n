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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckerByJsonConfigBase = createCheckerByJsonConfigBase;
exports.createCheckerBase = createCheckerBase;
exports.baseCreate = baseCreate;
const typescript_1 = require("@volar/typescript");
const vue = require("@vue/language-core");
const path_browserify_1 = require("path-browserify");
const vue_component_type_helpers_1 = require("vue-component-type-helpers");
const vue2_1 = require("vue-component-type-helpers/vue2");
__exportStar(require("./types"), exports);
const windowsPathReg = /\\/g;
function createCheckerByJsonConfigBase(ts, rootDir, json, checkerOptions = {}) {
    rootDir = rootDir.replace(windowsPathReg, '/');
    return baseCreate(ts, () => vue.createParsedCommandLineByJson(ts, ts.sys, rootDir, json, undefined, true), checkerOptions, rootDir, path_browserify_1.posix.join(rootDir, 'jsconfig.json.global.vue'));
}
function createCheckerBase(ts, tsconfig, checkerOptions = {}) {
    tsconfig = tsconfig.replace(windowsPathReg, '/');
    return baseCreate(ts, () => vue.createParsedCommandLine(ts, ts.sys, tsconfig, true), checkerOptions, path_browserify_1.posix.dirname(tsconfig), tsconfig + '.global.vue');
}
function baseCreate(ts, getCommandLine, checkerOptions, rootPath, globalComponentName) {
    let commandLine = getCommandLine();
    let fileNames = commandLine.fileNames.map(path => path.replace(windowsPathReg, '/'));
    let projectVersion = 0;
    const projectHost = {
        getCurrentDirectory: () => rootPath,
        getProjectVersion: () => projectVersion.toString(),
        getCompilationSettings: () => commandLine.options,
        getScriptFileNames: () => fileNames,
        getProjectReferences: () => commandLine.projectReferences,
    };
    const globalComponentSnapshot = ts.ScriptSnapshot.fromString('<script setup lang="ts"></script>');
    const scriptSnapshots = new Map();
    const metaSnapshots = new Map();
    const getScriptFileNames = projectHost.getScriptFileNames;
    projectHost.getScriptFileNames = () => {
        const names = getScriptFileNames();
        return [
            ...names,
            ...names.map(getMetaFileName),
            globalComponentName,
            getMetaFileName(globalComponentName),
        ];
    };
    const vueLanguagePlugin = vue.createVueLanguagePlugin(ts, projectHost.getCompilationSettings(), commandLine.vueOptions, id => id);
    const language = vue.createLanguage([
        vueLanguagePlugin,
        {
            getLanguageId(fileName) {
                return (0, typescript_1.resolveFileLanguageId)(fileName);
            },
        },
    ], new vue.FileMap(ts.sys.useCaseSensitiveFileNames), fileName => {
        let snapshot = scriptSnapshots.get(fileName);
        if (fileName === globalComponentName) {
            snapshot = globalComponentSnapshot;
        }
        else if (isMetaFileName(fileName)) {
            if (!metaSnapshots.has(fileName)) {
                metaSnapshots.set(fileName, ts.ScriptSnapshot.fromString(getMetaScriptContent(fileName)));
            }
            snapshot = metaSnapshots.get(fileName);
        }
        else {
            if (!scriptSnapshots.has(fileName)) {
                const fileText = ts.sys.readFile(fileName);
                if (fileText !== undefined) {
                    scriptSnapshots.set(fileName, ts.ScriptSnapshot.fromString(fileText));
                }
                else {
                    scriptSnapshots.set(fileName, undefined);
                }
            }
            snapshot = scriptSnapshots.get(fileName);
        }
        if (snapshot) {
            language.scripts.set(fileName, snapshot);
        }
        else {
            language.scripts.delete(fileName);
        }
    });
    const { languageServiceHost } = (0, typescript_1.createLanguageServiceHost)(ts, ts.sys, language, s => s, projectHost);
    const tsLs = ts.createLanguageService(languageServiceHost);
    const directoryExists = languageServiceHost.directoryExists?.bind(languageServiceHost);
    const fileExists = languageServiceHost.fileExists.bind(languageServiceHost);
    const getScriptSnapshot = languageServiceHost.getScriptSnapshot.bind(languageServiceHost);
    const globalTypesName = `${commandLine.vueOptions.lib}_${commandLine.vueOptions.target}_${commandLine.vueOptions.strictTemplates}.d.ts`;
    const globalTypesContents = `// @ts-nocheck\nexport {};\n` + vue.generateGlobalTypes(commandLine.vueOptions.lib, commandLine.vueOptions.target, commandLine.vueOptions.strictTemplates);
    const globalTypesSnapshot = {
        getText: (start, end) => globalTypesContents.substring(start, end),
        getLength: () => globalTypesContents.length,
        getChangeRange: () => undefined,
    };
    if (directoryExists) {
        languageServiceHost.directoryExists = path => {
            if (path.endsWith('.vue-global-types')) {
                return true;
            }
            return directoryExists(path);
        };
    }
    languageServiceHost.fileExists = path => {
        if (path.endsWith(`.vue-global-types/${globalTypesName}`) || path.endsWith(`.vue-global-types\\${globalTypesName}`)) {
            return true;
        }
        return fileExists(path);
    };
    languageServiceHost.getScriptSnapshot = path => {
        if (path.endsWith(`.vue-global-types/${globalTypesName}`) || path.endsWith(`.vue-global-types\\${globalTypesName}`)) {
            return globalTypesSnapshot;
        }
        return getScriptSnapshot(path);
    };
    if (checkerOptions.forceUseTs) {
        const getScriptKind = languageServiceHost.getScriptKind?.bind(languageServiceHost);
        languageServiceHost.getScriptKind = fileName => {
            const scriptKind = getScriptKind(fileName);
            if (commandLine.vueOptions.extensions.some(ext => fileName.endsWith(ext))) {
                if (scriptKind === ts.ScriptKind.JS) {
                    return ts.ScriptKind.TS;
                }
                if (scriptKind === ts.ScriptKind.JSX) {
                    return ts.ScriptKind.TSX;
                }
            }
            return scriptKind;
        };
    }
    let globalPropNames;
    return {
        getExportNames,
        getComponentMeta,
        updateFile(fileName, text) {
            fileName = fileName.replace(windowsPathReg, '/');
            scriptSnapshots.set(fileName, ts.ScriptSnapshot.fromString(text));
            projectVersion++;
        },
        deleteFile(fileName) {
            fileName = fileName.replace(windowsPathReg, '/');
            fileNames = fileNames.filter(f => f !== fileName);
            projectVersion++;
        },
        reload() {
            commandLine = getCommandLine();
            fileNames = commandLine.fileNames.map(path => path.replace(windowsPathReg, '/'));
            this.clearCache();
        },
        clearCache() {
            scriptSnapshots.clear();
            projectVersion++;
        },
        __internal__: {
            tsLs,
        },
    };
    function isMetaFileName(fileName) {
        return fileName.endsWith('.meta.ts');
    }
    function getMetaFileName(fileName) {
        return (commandLine.vueOptions.extensions.some(ext => fileName.endsWith(ext))
            ? fileName
            : fileName.substring(0, fileName.lastIndexOf('.'))) + '.meta.ts';
    }
    function getMetaScriptContent(fileName) {
        let code = `
import * as Components from '${fileName.substring(0, fileName.length - '.meta.ts'.length)}';
export default {} as { [K in keyof typeof Components]: ComponentMeta<typeof Components[K]>; };

interface ComponentMeta<T> {
	type: ComponentType<T>;
	props: ComponentProps<T>;
	emit: ComponentEmit<T>;
	slots: ComponentSlots<T>;
	exposed: ComponentExposed<T>;
};

${commandLine.vueOptions.target < 3 ? vue2_1.code : vue_component_type_helpers_1.code}
`.trim();
        return code;
    }
    function getExportNames(componentPath) {
        const program = tsLs.getProgram();
        const typeChecker = program.getTypeChecker();
        return _getExports(program, typeChecker, componentPath).exports.map(e => e.getName());
    }
    function getComponentMeta(componentPath, exportName = 'default') {
        const program = tsLs.getProgram();
        const typeChecker = program.getTypeChecker();
        const { symbolNode, exports } = _getExports(program, typeChecker, componentPath);
        const _export = exports.find(property => property.getName() === exportName);
        if (!_export) {
            throw `Could not find export ${exportName}`;
        }
        const componentType = typeChecker.getTypeOfSymbolAtLocation(_export, symbolNode);
        const symbolProperties = componentType.getProperties() ?? [];
        let _type;
        let _props;
        let _events;
        let _slots;
        let _exposed;
        return {
            get type() {
                return _type ?? (_type = getType());
            },
            get props() {
                return _props ?? (_props = getProps());
            },
            get events() {
                return _events ?? (_events = getEvents());
            },
            get slots() {
                return _slots ?? (_slots = getSlots());
            },
            get exposed() {
                return _exposed ?? (_exposed = getExposed());
            },
        };
        function getType() {
            const $type = symbolProperties.find(prop => prop.escapedName === 'type');
            if ($type) {
                const type = typeChecker.getTypeOfSymbolAtLocation($type, symbolNode);
                return Number(typeChecker.typeToString(type));
            }
            return 0;
        }
        function getProps() {
            const $props = symbolProperties.find(prop => prop.escapedName === 'props');
            const propEventRegex = /^(on[A-Z])/;
            let result = [];
            if ($props) {
                const type = typeChecker.getTypeOfSymbolAtLocation($props, symbolNode);
                const properties = type.getProperties();
                result = properties
                    .map(prop => {
                    const { resolveNestedProperties, } = createSchemaResolvers(typeChecker, symbolNode, checkerOptions, ts, language);
                    return resolveNestedProperties(prop);
                })
                    .filter(prop => !prop.name.match(propEventRegex));
            }
            // fill global
            if (componentPath !== globalComponentName) {
                globalPropNames ??= getComponentMeta(globalComponentName).props.map(prop => prop.name);
                for (const prop of result) {
                    prop.global = globalPropNames.includes(prop.name);
                }
            }
            // fill defaults
            const printer = ts.createPrinter(checkerOptions.printer);
            const snapshot = language.scripts.get(componentPath)?.snapshot;
            const vueFile = language.scripts.get(componentPath)?.generated?.root;
            const vueDefaults = vueFile && exportName === 'default'
                ? (vueFile instanceof vue.VueVirtualCode ? readVueComponentDefaultProps(vueFile, printer, ts, commandLine.vueOptions) : {})
                : {};
            const tsDefaults = !vueFile ? readTsComponentDefaultProps(componentPath.substring(componentPath.lastIndexOf('.') + 1), // ts | js | tsx | jsx
            snapshot.getText(0, snapshot.getLength()), exportName, printer, ts) : {};
            for (const [propName, defaultExp] of Object.entries({
                ...vueDefaults,
                ...tsDefaults,
            })) {
                const prop = result.find(p => p.name === propName);
                if (prop) {
                    prop.default = defaultExp.default;
                    if (defaultExp.required !== undefined) {
                        prop.required = defaultExp.required;
                    }
                    if (prop.default !== undefined) {
                        prop.required = false; // props with default are always optional
                    }
                }
            }
            return result;
        }
        function getEvents() {
            const $emit = symbolProperties.find(prop => prop.escapedName === 'emit');
            if ($emit) {
                const type = typeChecker.getTypeOfSymbolAtLocation($emit, symbolNode);
                const calls = type.getCallSignatures();
                return calls.map(call => {
                    const { resolveEventSignature, } = createSchemaResolvers(typeChecker, symbolNode, checkerOptions, ts, language);
                    return resolveEventSignature(call);
                }).filter(event => event.name);
            }
            return [];
        }
        function getSlots() {
            const $slots = symbolProperties.find(prop => prop.escapedName === 'slots');
            if ($slots) {
                const type = typeChecker.getTypeOfSymbolAtLocation($slots, symbolNode);
                const properties = type.getProperties();
                return properties.map(prop => {
                    const { resolveSlotProperties, } = createSchemaResolvers(typeChecker, symbolNode, checkerOptions, ts, language);
                    return resolveSlotProperties(prop);
                });
            }
            return [];
        }
        function getExposed() {
            const $exposed = symbolProperties.find(prop => prop.escapedName === 'exposed');
            if ($exposed) {
                const type = typeChecker.getTypeOfSymbolAtLocation($exposed, symbolNode);
                const properties = type.getProperties().filter(prop => 
                // only exposed props will not have a valueDeclaration
                !prop.valueDeclaration);
                return properties.map(prop => {
                    const { resolveExposedProperties, } = createSchemaResolvers(typeChecker, symbolNode, checkerOptions, ts, language);
                    return resolveExposedProperties(prop);
                });
            }
            return [];
        }
    }
    function _getExports(program, typeChecker, componentPath) {
        const sourceFile = program?.getSourceFile(getMetaFileName(componentPath));
        if (!sourceFile) {
            throw 'Could not find main source file';
        }
        const moduleSymbol = typeChecker.getSymbolAtLocation(sourceFile);
        if (!moduleSymbol) {
            throw 'Could not find module symbol';
        }
        const exportedSymbols = typeChecker.getExportsOfModule(moduleSymbol);
        let symbolNode;
        for (const symbol of exportedSymbols) {
            const [declaration] = symbol.getDeclarations() ?? [];
            if (ts.isExportAssignment(declaration)) {
                symbolNode = declaration.expression;
            }
        }
        if (!symbolNode) {
            throw 'Could not find symbol node';
        }
        const exportDefaultType = typeChecker.getTypeAtLocation(symbolNode);
        const exports = exportDefaultType.getProperties();
        return {
            symbolNode,
            exports,
        };
    }
}
function createSchemaResolvers(typeChecker, symbolNode, { rawType, schema: options, noDeclarations }, ts, language) {
    const visited = new Set();
    function shouldIgnore(subtype) {
        const name = typeChecker.typeToString(subtype);
        if (name === 'any') {
            return true;
        }
        if (visited.has(subtype)) {
            return true;
        }
        if (typeof options === 'object') {
            for (const item of options.ignore ?? []) {
                if (typeof item === 'function') {
                    const result = item(name, subtype, typeChecker);
                    if (typeof result === 'boolean') {
                        return result;
                    }
                }
                else if (name === item) {
                    return true;
                }
            }
        }
        return false;
    }
    function reducer(acc, cur) {
        acc[cur.name] = cur;
        return acc;
    }
    function resolveNestedProperties(prop) {
        const subtype = typeChecker.getTypeOfSymbolAtLocation(prop, symbolNode);
        let schema;
        let declarations;
        return {
            name: prop.getEscapedName().toString(),
            global: false,
            description: ts.displayPartsToString(prop.getDocumentationComment(typeChecker)),
            tags: prop.getJsDocTags(typeChecker).map(tag => ({
                name: tag.name,
                text: tag.text !== undefined ? ts.displayPartsToString(tag.text) : undefined,
            })),
            required: !(prop.flags & ts.SymbolFlags.Optional),
            type: typeChecker.typeToString(subtype),
            rawType: rawType ? subtype : undefined,
            get declarations() {
                return declarations ??= getDeclarations(prop.declarations ?? []);
            },
            get schema() {
                return schema ??= resolveSchema(subtype);
            },
        };
    }
    function resolveSlotProperties(prop) {
        const propType = typeChecker.getNonNullableType(typeChecker.getTypeOfSymbolAtLocation(prop, symbolNode));
        const signatures = propType.getCallSignatures();
        const paramType = signatures[0]?.parameters[0];
        const subtype = paramType ? typeChecker.getTypeOfSymbolAtLocation(paramType, symbolNode) : typeChecker.getAnyType();
        let schema;
        let declarations;
        return {
            name: prop.getName(),
            type: typeChecker.typeToString(subtype),
            rawType: rawType ? subtype : undefined,
            description: ts.displayPartsToString(prop.getDocumentationComment(typeChecker)),
            get declarations() {
                return declarations ??= getDeclarations(prop.declarations ?? []);
            },
            get schema() {
                return schema ??= resolveSchema(subtype);
            },
        };
    }
    function resolveExposedProperties(expose) {
        const subtype = typeChecker.getTypeOfSymbolAtLocation(expose, symbolNode);
        let schema;
        let declarations;
        return {
            name: expose.getName(),
            type: typeChecker.typeToString(subtype),
            rawType: rawType ? subtype : undefined,
            description: ts.displayPartsToString(expose.getDocumentationComment(typeChecker)),
            get declarations() {
                return declarations ??= getDeclarations(expose.declarations ?? []);
            },
            get schema() {
                return schema ??= resolveSchema(subtype);
            },
        };
    }
    function resolveEventSignature(call) {
        const subtype = typeChecker.getTypeOfSymbolAtLocation(call.parameters[1], symbolNode);
        let schema;
        let declarations;
        return {
            name: typeChecker.getTypeOfSymbolAtLocation(call.parameters[0], symbolNode).value,
            description: ts.displayPartsToString(call.getDocumentationComment(typeChecker)),
            tags: call.getJsDocTags().map(tag => ({
                name: tag.name,
                text: tag.text !== undefined ? ts.displayPartsToString(tag.text) : undefined,
            })),
            type: typeChecker.typeToString(subtype),
            rawType: rawType ? subtype : undefined,
            signature: typeChecker.signatureToString(call),
            get declarations() {
                return declarations ??= call.declaration ? getDeclarations([call.declaration]) : [];
            },
            get schema() {
                return schema ??= typeChecker.getTypeArguments(subtype).map(resolveSchema);
            },
        };
    }
    function resolveCallbackSchema(signature) {
        let schema;
        return {
            kind: 'event',
            type: typeChecker.signatureToString(signature),
            get schema() {
                return schema ??= signature.parameters.length > 0
                    ? typeChecker
                        .getTypeArguments(typeChecker.getTypeOfSymbolAtLocation(signature.parameters[0], symbolNode))
                        .map(resolveSchema)
                    : undefined;
            },
        };
    }
    function resolveSchema(subtype) {
        const type = typeChecker.typeToString(subtype);
        if (shouldIgnore(subtype)) {
            return type;
        }
        visited.add(subtype);
        if (subtype.isUnion()) {
            let schema;
            return {
                kind: 'enum',
                type,
                get schema() {
                    return schema ??= subtype.types.map(resolveSchema);
                },
            };
        }
        // @ts-ignore - typescript internal, isArrayLikeType exists
        else if (typeChecker.isArrayLikeType(subtype)) {
            let schema;
            return {
                kind: 'array',
                type,
                get schema() {
                    return schema ??= typeChecker.getTypeArguments(subtype).map(resolveSchema);
                },
            };
        }
        else if (subtype.getCallSignatures().length === 0 &&
            (subtype.isClassOrInterface() || subtype.isIntersection() || subtype.objectFlags & ts.ObjectFlags.Anonymous)) {
            let schema;
            return {
                kind: 'object',
                type,
                get schema() {
                    return schema ??= subtype.getProperties().map(resolveNestedProperties).reduce(reducer, {});
                },
            };
        }
        else if (subtype.getCallSignatures().length === 1) {
            return resolveCallbackSchema(subtype.getCallSignatures()[0]);
        }
        return type;
    }
    function getDeclarations(declaration) {
        if (noDeclarations) {
            return [];
        }
        return declaration.map(getDeclaration).filter(d => !!d);
    }
    function getDeclaration(declaration) {
        const fileName = declaration.getSourceFile().fileName;
        const sourceFile = language.scripts.get(fileName);
        if (sourceFile?.generated) {
            const script = sourceFile.generated.languagePlugin.typescript?.getServiceScript(sourceFile.generated.root);
            if (script) {
                for (const [sourceScript, map] of language.maps.forEach(script.code)) {
                    for (const [start] of map.toSourceLocation(declaration.getStart())) {
                        for (const [end] of map.toSourceLocation(declaration.getEnd())) {
                            return {
                                file: sourceScript.id,
                                range: [start, end],
                            };
                        }
                    }
                }
            }
            return undefined;
        }
        return {
            file: declaration.getSourceFile().fileName,
            range: [declaration.getStart(), declaration.getEnd()],
        };
    }
    return {
        resolveNestedProperties,
        resolveSlotProperties,
        resolveEventSignature,
        resolveExposedProperties,
        resolveSchema,
    };
}
function readVueComponentDefaultProps(vueSourceFile, printer, ts, vueCompilerOptions) {
    let result = {};
    scriptSetupWorker();
    scriptWorker();
    return result;
    function scriptSetupWorker() {
        const descriptor = vueSourceFile._sfc;
        const scriptSetupRanges = descriptor.scriptSetup ? vue.parseScriptSetupRanges(ts, descriptor.scriptSetup.ast, vueCompilerOptions) : undefined;
        if (descriptor.scriptSetup && scriptSetupRanges?.props.withDefaults?.arg) {
            const defaultsText = descriptor.scriptSetup.content.substring(scriptSetupRanges.props.withDefaults.arg.start, scriptSetupRanges.props.withDefaults.arg.end);
            const ast = ts.createSourceFile('/tmp.' + descriptor.scriptSetup.lang, '(' + defaultsText + ')', ts.ScriptTarget.Latest);
            const obj = findObjectLiteralExpression(ast);
            if (obj) {
                for (const prop of obj.properties) {
                    if (ts.isPropertyAssignment(prop)) {
                        const name = prop.name.getText(ast);
                        const expNode = resolveDefaultOptionExpression(prop.initializer, ts);
                        const expText = printer?.printNode(ts.EmitHint.Expression, expNode, ast) ?? expNode.getText(ast);
                        result[name] = {
                            default: expText,
                        };
                    }
                }
            }
        }
        else if (descriptor.scriptSetup && scriptSetupRanges?.props.define?.arg) {
            const defaultsText = descriptor.scriptSetup.content.substring(scriptSetupRanges.props.define.arg.start, scriptSetupRanges.props.define.arg.end);
            const ast = ts.createSourceFile('/tmp.' + descriptor.scriptSetup.lang, '(' + defaultsText + ')', ts.ScriptTarget.Latest);
            const obj = findObjectLiteralExpression(ast);
            if (obj) {
                result = {
                    ...result,
                    ...resolvePropsOption(ast, obj, printer, ts),
                };
            }
        }
        function findObjectLiteralExpression(node) {
            if (ts.isObjectLiteralExpression(node)) {
                return node;
            }
            let result;
            node.forEachChild(child => {
                if (!result) {
                    result = findObjectLiteralExpression(child);
                }
            });
            return result;
        }
    }
    function scriptWorker() {
        const descriptor = vueSourceFile._sfc;
        if (descriptor.script) {
            const scriptResult = readTsComponentDefaultProps(descriptor.script.lang, descriptor.script.content, 'default', printer, ts);
            for (const [key, value] of Object.entries(scriptResult)) {
                result[key] = value;
            }
        }
    }
}
function readTsComponentDefaultProps(lang, tsFileText, exportName, printer, ts) {
    const ast = ts.createSourceFile('/tmp.' + lang, tsFileText, ts.ScriptTarget.Latest);
    const props = getPropsNode();
    if (props) {
        return resolvePropsOption(ast, props, printer, ts);
    }
    return {};
    function getComponentNode() {
        let result;
        if (exportName === 'default') {
            ast.forEachChild(child => {
                if (ts.isExportAssignment(child)) {
                    result = child.expression;
                }
            });
        }
        else {
            ast.forEachChild(child => {
                if (ts.isVariableStatement(child)
                    && child.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword)) {
                    for (const dec of child.declarationList.declarations) {
                        if (dec.name.getText(ast) === exportName) {
                            result = dec.initializer;
                        }
                    }
                }
            });
        }
        return result;
    }
    function getComponentOptionsNode() {
        const component = getComponentNode();
        if (component) {
            // export default { ... }
            if (ts.isObjectLiteralExpression(component)) {
                return component;
            }
            // export default defineComponent({ ... })
            // export default Vue.extend({ ... })
            else if (ts.isCallExpression(component)) {
                if (component.arguments.length) {
                    const arg = component.arguments[0];
                    if (ts.isObjectLiteralExpression(arg)) {
                        return arg;
                    }
                }
            }
        }
    }
    function getPropsNode() {
        const options = getComponentOptionsNode();
        const props = options?.properties.find(prop => prop.name?.getText(ast) === 'props');
        if (props && ts.isPropertyAssignment(props)) {
            if (ts.isObjectLiteralExpression(props.initializer)) {
                return props.initializer;
            }
        }
    }
}
function resolvePropsOption(ast, props, printer, ts) {
    const result = {};
    for (const prop of props.properties) {
        if (ts.isPropertyAssignment(prop)) {
            const name = prop.name?.getText(ast);
            if (ts.isObjectLiteralExpression(prop.initializer)) {
                const defaultProp = prop.initializer.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'default');
                const requiredProp = prop.initializer.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'required');
                result[name] = {};
                if (requiredProp) {
                    const exp = requiredProp.initializer.getText(ast);
                    result[name].required = exp === 'true';
                }
                if (defaultProp) {
                    const expNode = resolveDefaultOptionExpression(defaultProp.initializer, ts);
                    const expText = printer?.printNode(ts.EmitHint.Expression, expNode, ast) ?? expNode.getText(ast);
                    result[name].default = expText;
                }
            }
        }
    }
    return result;
}
function resolveDefaultOptionExpression(_default, ts) {
    if (ts.isArrowFunction(_default)) {
        if (ts.isBlock(_default.body)) {
            return _default; // TODO
        }
        else if (ts.isParenthesizedExpression(_default.body)) {
            return _default.body.expression;
        }
        else {
            return _default.body;
        }
    }
    return _default;
}
//# sourceMappingURL=base.js.map
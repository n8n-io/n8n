"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tsTranspileModule = exports.isModernNodeModuleKind = void 0;
const node_path_1 = __importDefault(require("node:path"));
const typescript_1 = __importDefault(require("typescript"));
const utils_1 = require("../../utils");
const barebonesLibContent = `/// <reference no-default-lib="true"/>
interface Boolean {}
interface Function {}
interface CallableFunction {}
interface NewableFunction {}
interface IArguments {}
interface Number {}
interface Object {}
interface RegExp {}
interface String {}
interface Array<T> { length: number; [n: number]: T; }
interface SymbolConstructor {
    (desc?: string | number): symbol;
    for(name: string): symbol;
    readonly toStringTag: symbol;
}
declare var Symbol: SymbolConstructor;
interface Symbol {
    readonly [Symbol.toStringTag]: string;
}`;
const barebonesLibName = 'lib.d.ts';
let barebonesLibSourceFile;
const carriageReturnLineFeed = '\r\n';
const lineFeed = '\n';
function getNewLineCharacter(options) {
    switch (options.newLine) {
        case typescript_1.default.NewLineKind.CarriageReturnLineFeed:
            return carriageReturnLineFeed;
        case typescript_1.default.NewLineKind.LineFeed:
        default:
            return lineFeed;
    }
}
const isModernNodeModuleKind = (module) => {
    return module
        ? [typescript_1.default.ModuleKind.Node16, /* ModuleKind.Node18 */ 101, /* ModuleKind.Node20 */ 102, typescript_1.default.ModuleKind.NodeNext].includes(module)
        : false;
};
exports.isModernNodeModuleKind = isModernNodeModuleKind;
const shouldCheckProjectPkgJsonContent = (fileName, moduleKind) => {
    return fileName.endsWith('package.json') && (0, exports.isModernNodeModuleKind)(moduleKind);
};
/**
 * Copy source code of {@link ts.transpileModule} from {@link https://github.com/microsoft/TypeScript/blob/main/src/services/transpile.ts}
 * with extra modifications:
 * - Remove generation of declaration files
 * - Allow using custom AST transformers with the internal created {@link Program}
 */
const transpileWorker = (input, transpileOptions) => {
    if (!barebonesLibSourceFile) {
        barebonesLibSourceFile = typescript_1.default.createSourceFile(barebonesLibName, barebonesLibContent, {
            languageVersion: typescript_1.default.ScriptTarget.Latest,
        });
    }
    const diagnostics = [];
    const options = transpileOptions.compilerOptions
        ? // @ts-expect-error internal TypeScript API
            typescript_1.default.fixupCompilerOptions(transpileOptions.compilerOptions, diagnostics)
        : {};
    // mix in default options
    const defaultOptions = typescript_1.default.getDefaultCompilerOptions();
    for (const key in defaultOptions) {
        if (Object.hasOwn(defaultOptions, key) && options[key] === undefined) {
            options[key] = defaultOptions[key];
        }
    }
    // @ts-expect-error internal TypeScript API
    for (const option of typescript_1.default.transpileOptionValueCompilerOptions) {
        // Do not set redundant config options if `verbatimModuleSyntax` was supplied.
        if (options.verbatimModuleSyntax && new Set(['isolatedModules']).has(option.name)) {
            continue;
        }
        options[option.name] = option.transpileOptionValue;
    }
    // transpileModule does not write anything to disk so there is no need to verify that there are no conflicts between input and output paths.
    options.suppressOutputPathCheck = true;
    // Filename can be non-ts file.
    options.allowNonTsExtensions = true;
    options.declaration = false;
    options.declarationMap = false;
    const newLine = getNewLineCharacter(options);
    // if jsx is specified then treat file as .tsx
    const inputFileName = transpileOptions.fileName ?? (transpileOptions.compilerOptions?.jsx ? 'module.tsx' : 'module.ts');
    // Create a compilerHost object to allow the compiler to read and write files
    const compilerHost = {
        getSourceFile: (fileName) => {
            // @ts-expect-error internal TypeScript API
            if (fileName === typescript_1.default.normalizePath(inputFileName)) {
                return sourceFile;
            }
            // @ts-expect-error internal TypeScript API
            return fileName === typescript_1.default.normalizePath(barebonesLibName) ? barebonesLibSourceFile : undefined;
        },
        writeFile: (name, text) => {
            if (node_path_1.default.extname(name) === '.map') {
                sourceMapText = text;
            }
            else {
                outputText = text;
            }
        },
        getDefaultLibFileName: () => barebonesLibName,
        useCaseSensitiveFileNames: () => false,
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => '',
        getNewLine: () => newLine,
        fileExists: (fileName) => {
            if (shouldCheckProjectPkgJsonContent(fileName, options.module)) {
                return typescript_1.default.sys.fileExists(fileName);
            }
            return fileName === inputFileName;
        },
        readFile: (fileName) => {
            if (shouldCheckProjectPkgJsonContent(fileName, options.module)) {
                return typescript_1.default.sys.readFile(fileName);
            }
            return '';
        },
        directoryExists: () => true,
        getDirectories: () => [],
    };
    const sourceFile = typescript_1.default.createSourceFile(inputFileName, input, {
        languageVersion: options.target ?? typescript_1.default.ScriptTarget.ESNext,
        impliedNodeFormat: typescript_1.default.getImpliedNodeFormatForFile(inputFileName, 
        /*packageJsonInfoCache*/ undefined, compilerHost, options),
        // @ts-expect-error internal TypeScript API
        setExternalModuleIndicator: typescript_1.default.getSetExternalModuleIndicator(options),
        jsDocParsingMode: transpileOptions.jsDocParsingMode ?? typescript_1.default.JSDocParsingMode.ParseAll,
    });
    if (transpileOptions.moduleName) {
        sourceFile.moduleName = transpileOptions.moduleName;
    }
    if (transpileOptions.renamedDependencies) {
        // @ts-expect-error internal TypeScript API
        sourceFile.renamedDependencies = new Map(Object.entries(transpileOptions.renamedDependencies));
    }
    // Output
    let outputText;
    let sourceMapText;
    const inputs = [inputFileName];
    const program = typescript_1.default.createProgram(inputs, options, compilerHost);
    if (transpileOptions.reportDiagnostics) {
        diagnostics.push(...program.getSyntacticDiagnostics(sourceFile));
    }
    diagnostics.push(...program.getOptionsDiagnostics());
    // Emit
    const result = program.emit(
    /*targetSourceFile*/ undefined, 
    /*writeFile*/ undefined, 
    /*cancellationToken*/ undefined, 
    /*emitOnlyDtsFiles*/ undefined, transpileOptions.transformers?.(program));
    diagnostics.push(...result.diagnostics);
    if (outputText === undefined) {
        diagnostics.push({
            category: typescript_1.default.DiagnosticCategory.Error,
            code: utils_1.TsJestDiagnosticCodes.Generic,
            messageText: 'No output generated',
            file: sourceFile,
            start: 0,
            length: 0,
        });
    }
    return { outputText: outputText ?? '', diagnostics, sourceMapText };
};
exports.tsTranspileModule = transpileWorker;

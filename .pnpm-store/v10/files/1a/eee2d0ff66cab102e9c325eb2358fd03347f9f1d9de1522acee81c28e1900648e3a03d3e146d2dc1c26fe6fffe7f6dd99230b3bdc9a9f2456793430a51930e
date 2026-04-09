"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerState = void 0;
const path = __importStar(require("node:path"));
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const terminal_1 = require("@rushstack/terminal");
const ExtractorConfig_1 = require("./ExtractorConfig");
/**
 * This class represents the TypeScript compiler state.  This allows an optimization where multiple invocations
 * of API Extractor can reuse the same TypeScript compiler analysis.
 *
 * @public
 */
class CompilerState {
    constructor(properties) {
        this.program = properties.program;
    }
    /**
     * Create a compiler state for use with the specified `IExtractorInvokeOptions`.
     */
    static create(extractorConfig, options) {
        let tsconfig = extractorConfig.overrideTsconfig;
        let configBasePath = extractorConfig.projectFolder;
        if (!tsconfig) {
            // If it wasn't overridden, then load it from disk
            tsconfig = node_core_library_1.JsonFile.load(extractorConfig.tsconfigFilePath);
            configBasePath = path.resolve(path.dirname(extractorConfig.tsconfigFilePath));
        }
        const commandLine = ts.parseJsonConfigFileContent(tsconfig, ts.sys, configBasePath);
        if (!commandLine.options.skipLibCheck && extractorConfig.skipLibCheck) {
            commandLine.options.skipLibCheck = true;
            console.log(terminal_1.Colorize.cyan('API Extractor was invoked with skipLibCheck. This is not recommended and may cause ' +
                'incorrect type analysis.'));
        }
        // Delete outDir and declarationDir to prevent TypeScript from redirecting self-package
        // imports to source files. When these options are set, TypeScript's module resolution
        // tries to map output .d.ts files back to their source .ts files to avoid analyzing
        // build outputs during compilation. However, API Extractor specifically wants to analyze
        // the .d.ts build artifacts, not the source files. Since API Extractor doesn't emit any
        // files, these options are unnecessary and interfere with correct module resolution.
        delete commandLine.options.outDir;
        delete commandLine.options.declarationDir;
        const inputFilePaths = commandLine.fileNames.concat(extractorConfig.mainEntryPointFilePath);
        if (options && options.additionalEntryPoints) {
            inputFilePaths.push(...options.additionalEntryPoints);
        }
        // Append the entry points and remove any non-declaration files from the list
        const analysisFilePaths = CompilerState._generateFilePathsForAnalysis(inputFilePaths);
        const compilerHost = CompilerState._createCompilerHost(commandLine, options);
        const program = ts.createProgram(analysisFilePaths, commandLine.options, compilerHost);
        if (commandLine.errors.length > 0) {
            const errorText = ts.flattenDiagnosticMessageText(commandLine.errors[0].messageText, '\n');
            throw new Error(`Error parsing tsconfig.json content: ${errorText}`);
        }
        return new CompilerState({
            program
        });
    }
    /**
     * Given a list of absolute file paths, return a list containing only the declaration
     * files.  Duplicates are also eliminated.
     *
     * @remarks
     * The tsconfig.json settings specify the compiler's input (a set of *.ts source files,
     * plus some *.d.ts declaration files used for legacy typings).  However API Extractor
     * analyzes the compiler's output (a set of *.d.ts entry point files, plus any legacy
     * typings).  This requires API Extractor to generate a special file list when it invokes
     * the compiler.
     *
     * Duplicates are removed so that entry points can be appended without worrying whether they
     * may already appear in the tsconfig.json file list.
     */
    static _generateFilePathsForAnalysis(inputFilePaths) {
        const analysisFilePaths = [];
        const seenFiles = new Set();
        for (const inputFilePath of inputFilePaths) {
            const inputFileToUpper = inputFilePath.toUpperCase();
            if (!seenFiles.has(inputFileToUpper)) {
                seenFiles.add(inputFileToUpper);
                if (!path.isAbsolute(inputFilePath)) {
                    throw new Error('Input file is not an absolute path: ' + inputFilePath);
                }
                if (ExtractorConfig_1.ExtractorConfig.hasDtsFileExtension(inputFilePath)) {
                    analysisFilePaths.push(inputFilePath);
                }
            }
        }
        return analysisFilePaths;
    }
    static _createCompilerHost(commandLine, options) {
        // Create a default CompilerHost that we will override
        const compilerHost = ts.createCompilerHost(commandLine.options);
        // Save a copy of the original members.  Note that "compilerHost" cannot be the copy, because
        // createCompilerHost() captures that instance in a closure that is used by the members.
        const defaultCompilerHost = { ...compilerHost };
        if (options && options.typescriptCompilerFolder) {
            // Prevent a closure parameter
            const typescriptCompilerLibFolder = path.join(options.typescriptCompilerFolder, 'lib');
            compilerHost.getDefaultLibLocation = () => typescriptCompilerLibFolder;
        }
        // Used by compilerHost.fileExists()
        // .d.ts file path --> whether the file exists
        const dtsExistsCache = new Map();
        // Used by compilerHost.fileExists()
        // Example: "c:/folder/file.part.ts"
        const fileExtensionRegExp = /^(.+)(\.[a-z0-9_]+)$/i;
        compilerHost.fileExists = (fileName) => {
            // In certain deprecated setups, the compiler may write its output files (.js and .d.ts)
            // in the same folder as the corresponding input file (.ts or .tsx).  When following imports,
            // API Extractor wants to analyze the .d.ts file; however recent versions of the compiler engine
            // will instead choose the .ts file.  To work around this, we hook fileExists() to hide the
            // existence of those files.
            // Is "fileName" a .d.ts file?  The double extension ".d.ts" needs to be matched specially.
            if (!ExtractorConfig_1.ExtractorConfig.hasDtsFileExtension(fileName)) {
                // It's not a .d.ts file.  Is the file extension a potential source file?
                const match = fileExtensionRegExp.exec(fileName);
                if (match) {
                    // Example: "c:/folder/file.part"
                    const pathWithoutExtension = match[1];
                    // Example: ".ts"
                    const fileExtension = match[2];
                    switch (fileExtension.toLocaleLowerCase()) {
                        case '.ts':
                        case '.tsx':
                        case '.js':
                        case '.jsx':
                            // Yes, this is a possible source file.  Is there a corresponding .d.ts file in the same folder?
                            const dtsFileName = `${pathWithoutExtension}.d.ts`;
                            let dtsFileExists = dtsExistsCache.get(dtsFileName);
                            if (dtsFileExists === undefined) {
                                dtsFileExists = defaultCompilerHost.fileExists(dtsFileName);
                                dtsExistsCache.set(dtsFileName, dtsFileExists);
                            }
                            if (dtsFileExists) {
                                // fileName is a potential source file and a corresponding .d.ts file exists.
                                // Thus, API Extractor should ignore this file (so the .d.ts file will get analyzed instead).
                                return false;
                            }
                            break;
                    }
                }
            }
            // Fall through to the default implementation
            return defaultCompilerHost.fileExists(fileName);
        };
        return compilerHost;
    }
}
exports.CompilerState = CompilerState;
//# sourceMappingURL=CompilerState.js.map
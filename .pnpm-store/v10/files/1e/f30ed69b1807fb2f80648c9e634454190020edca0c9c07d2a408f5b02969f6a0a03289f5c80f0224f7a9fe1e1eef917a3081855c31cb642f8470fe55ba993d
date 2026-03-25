"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTsTranspileModule = void 0;
/** @internal */
function createTsTranspileModule(ts, transpileOptions) {
    const { createProgram, createSourceFile, getDefaultCompilerOptions, getImpliedNodeFormatForFile, fixupCompilerOptions, transpileOptionValueCompilerOptions, getNewLineCharacter, fileExtensionIs, normalizePath, Debug, toPath, getSetExternalModuleIndicator, getEntries, addRange, hasProperty, getEmitScriptTarget, getDirectoryPath, } = ts;
    const compilerOptionsDiagnostics = [];
    const options = transpileOptions.compilerOptions
        ? fixupCompilerOptions(transpileOptions.compilerOptions, compilerOptionsDiagnostics)
        : {};
    // mix in default options
    const defaultOptions = getDefaultCompilerOptions();
    for (const key in defaultOptions) {
        if (hasProperty(defaultOptions, key) && options[key] === undefined) {
            options[key] = defaultOptions[key];
        }
    }
    for (const option of transpileOptionValueCompilerOptions) {
        options[option.name] = option.transpileOptionValue;
    }
    // transpileModule does not write anything to disk so there is no need to verify that there are no conflicts between input and output paths.
    options.suppressOutputPathCheck = true;
    // Filename can be non-ts file.
    options.allowNonTsExtensions = true;
    const newLine = getNewLineCharacter(options);
    // Create a compilerHost object to allow the compiler to read and write files
    const compilerHost = {
        getSourceFile: (fileName) => fileName === normalizePath(inputFileName) ? sourceFile : undefined,
        writeFile: (name, text) => {
            if (fileExtensionIs(name, '.map')) {
                Debug.assertEqual(sourceMapText, undefined, 'Unexpected multiple source map outputs, file:', name);
                sourceMapText = text;
            }
            else {
                Debug.assertEqual(outputText, undefined, 'Unexpected multiple outputs, file:', name);
                outputText = text;
            }
        },
        getDefaultLibFileName: () => 'lib.d.ts',
        useCaseSensitiveFileNames: () => true,
        getCanonicalFileName: (fileName) => fileName,
        getCurrentDirectory: () => '',
        getNewLine: () => newLine,
        fileExists: (fileName) => fileName === inputFileName || fileName === packageJsonFileName,
        readFile: (fileName) => fileName === packageJsonFileName ? `{"type": "${_packageJsonType}"}` : '',
        directoryExists: () => true,
        getDirectories: () => [],
    };
    let inputFileName;
    let packageJsonFileName;
    let _packageJsonType;
    let sourceFile;
    let outputText;
    let sourceMapText;
    return transpileModule;
    function transpileModule(input, transpileOptions2, packageJsonType = 'commonjs') {
        // if jsx is specified then treat file as .tsx
        inputFileName =
            transpileOptions2.fileName ||
                (transpileOptions.compilerOptions && transpileOptions.compilerOptions.jsx
                    ? 'module.tsx'
                    : 'module.ts');
        packageJsonFileName = getDirectoryPath(inputFileName) + '/package.json';
        _packageJsonType = packageJsonType;
        sourceFile = createSourceFile(inputFileName, input, {
            languageVersion: getEmitScriptTarget(options),
            impliedNodeFormat: getImpliedNodeFormatForFile(toPath(inputFileName, '', compilerHost.getCanonicalFileName), 
            /*cache*/ undefined, compilerHost, options),
            setExternalModuleIndicator: getSetExternalModuleIndicator(options),
        });
        if (transpileOptions2.moduleName) {
            sourceFile.moduleName = transpileOptions2.moduleName;
        }
        if (transpileOptions2.renamedDependencies) {
            sourceFile.renamedDependencies = new Map(getEntries(transpileOptions2.renamedDependencies));
        }
        // Output
        outputText = undefined;
        sourceMapText = undefined;
        const program = createProgram([inputFileName], options, compilerHost);
        const diagnostics = compilerOptionsDiagnostics.slice();
        if (transpileOptions.reportDiagnostics) {
            addRange(
            /*to*/ diagnostics, 
            /*from*/ program.getSyntacticDiagnostics(sourceFile));
            addRange(/*to*/ diagnostics, /*from*/ program.getOptionsDiagnostics());
        }
        // Emit
        program.emit(
        /*targetSourceFile*/ undefined, 
        /*writeFile*/ undefined, 
        /*cancellationToken*/ undefined, 
        /*emitOnlyDtsFiles*/ undefined, transpileOptions.transformers);
        if (outputText === undefined)
            return Debug.fail('Output generation failed');
        return { outputText, diagnostics, sourceMapText };
    }
}
exports.createTsTranspileModule = createTsTranspileModule;
//# sourceMappingURL=ts-transpile-module.js.map
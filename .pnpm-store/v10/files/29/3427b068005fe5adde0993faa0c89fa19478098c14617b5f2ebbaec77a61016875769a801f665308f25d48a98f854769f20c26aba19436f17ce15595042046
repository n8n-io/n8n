"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decorateProgram = decorateProgram;
const transform_1 = require("./transform");
const utils_1 = require("./utils");
function decorateProgram(language, program) {
    const emit = program.emit;
    // for tsc --noEmit
    const getSyntacticDiagnostics = program.getSyntacticDiagnostics;
    const getSemanticDiagnostics = program.getSemanticDiagnostics;
    const getGlobalDiagnostics = program.getGlobalDiagnostics;
    const getSourceFileByPath = program.getSourceFileByPath;
    // for tsc --noEmit --watch
    // @ts-ignore
    const getBindAndCheckDiagnostics = program.getBindAndCheckDiagnostics;
    program.emit = (...args) => {
        const result = emit(...args);
        return {
            ...result,
            diagnostics: result.diagnostics
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d),
        };
    };
    program.getSyntacticDiagnostics = (sourceFile, cancellationToken) => {
        if (!sourceFile) {
            return getSyntacticDiagnostics(undefined, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d);
        }
        else {
            const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, sourceFile.fileName);
            const actualSourceFile = targetScript ? program.getSourceFile(targetScript.id) : sourceFile;
            return getSyntacticDiagnostics(actualSourceFile, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d)
                .filter(d => !serviceScript || !d.file || language.scripts.get(d.file.fileName) === sourceScript);
        }
    };
    program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
        if (!sourceFile) {
            return getSemanticDiagnostics(undefined, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d);
        }
        else {
            const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, sourceFile.fileName);
            const actualSourceFile = targetScript ? program.getSourceFile(targetScript.id) : sourceFile;
            return getSemanticDiagnostics(actualSourceFile, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d)
                .filter(d => !serviceScript || !d.file || language.scripts.get(d.file.fileName) === sourceScript);
        }
    };
    program.getGlobalDiagnostics = cancellationToken => {
        return getGlobalDiagnostics(cancellationToken)
            .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
            .filter(d => !!d);
    };
    // @ts-ignore
    program.getBindAndCheckDiagnostics = (sourceFile, cancellationToken) => {
        if (!sourceFile) {
            return getBindAndCheckDiagnostics(undefined, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d);
        }
        else {
            const [serviceScript, targetScript, sourceScript] = (0, utils_1.getServiceScript)(language, sourceFile.fileName);
            const actualSourceFile = targetScript ? program.getSourceFile(targetScript.id) : sourceFile;
            return getBindAndCheckDiagnostics(actualSourceFile, cancellationToken)
                .map(d => (0, transform_1.transformDiagnostic)(language, d, program, true))
                .filter(d => !!d)
                .filter(d => !serviceScript || language.scripts.get(d.file.fileName) === sourceScript);
        }
    };
    // fix https://github.com/vuejs/language-tools/issues/4099 with `incremental`
    program.getSourceFileByPath = path => {
        const sourceFile = getSourceFileByPath(path);
        if (sourceFile) {
            (0, transform_1.fillSourceFileText)(language, sourceFile);
        }
        return sourceFile;
    };
}
//# sourceMappingURL=decorateProgram.js.map
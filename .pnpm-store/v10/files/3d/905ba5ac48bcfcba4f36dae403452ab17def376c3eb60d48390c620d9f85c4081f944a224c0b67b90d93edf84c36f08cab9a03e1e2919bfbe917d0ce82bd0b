"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProgramFromProjectService = void 0;
const minimatch_1 = require("minimatch");
const createProjectProgram_1 = require("./create-program/createProjectProgram");
const shared_1 = require("./create-program/shared");
function useProgramFromProjectService({ allowDefaultProjectForFiles, service }, parseSettings, hasFullTypeInformation) {
    const filePath = (0, shared_1.getCanonicalFileName)(parseSettings.filePath);
    const opened = service.openClientFile((0, shared_1.ensureAbsolutePath)(filePath, service.host.getCurrentDirectory()), parseSettings.codeFullText, 
    /* scriptKind */ undefined, parseSettings.tsconfigRootDir);
    if (hasFullTypeInformation) {
        if (opened.configFileName) {
            if (filePathMatchedBy(filePath, allowDefaultProjectForFiles)) {
                throw new Error(`${filePath} was included by allowDefaultProjectForFiles but also was found in the project service. Consider removing it from allowDefaultProjectForFiles.`);
            }
        }
        else if (!filePathMatchedBy(filePath, allowDefaultProjectForFiles)) {
            throw new Error(`${filePath} was not found by the project service. Consider either including it in the tsconfig.json or including it in allowDefaultProjectForFiles.`);
        }
    }
    const scriptInfo = service.getScriptInfo(filePath);
    const program = service
        .getDefaultProjectForFile(scriptInfo.fileName, true)
        .getLanguageService(/*ensureSynchronized*/ true)
        .getProgram();
    if (!program) {
        return undefined;
    }
    return (0, createProjectProgram_1.createProjectProgram)(parseSettings, [program]);
}
exports.useProgramFromProjectService = useProgramFromProjectService;
function filePathMatchedBy(filePath, allowDefaultProjectForFiles) {
    return !!allowDefaultProjectForFiles?.some(pattern => (0, minimatch_1.minimatch)(filePath, pattern));
}
//# sourceMappingURL=useProgramFromProjectService.js.map
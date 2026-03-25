"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importClassesFromDirectories = void 0;
const tslib_1 = require("tslib");
const glob = tslib_1.__importStar(require("glob"));
const PlatformTools_1 = require("../platform/PlatformTools");
const ImportUtils_1 = require("./ImportUtils");
const ObjectUtils_1 = require("./ObjectUtils");
const InstanceChecker_1 = require("./InstanceChecker");
/**
 * Loads all exported classes from the given directory.
 */
async function importClassesFromDirectories(logger, directories, formats = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]) {
    const logLevel = "info";
    const classesNotFoundMessage = "No classes were found using the provided glob pattern: ";
    const classesFoundMessage = "All classes found using provided glob pattern";
    function loadFileClasses(exported, allLoaded) {
        if (typeof exported === "function" ||
            InstanceChecker_1.InstanceChecker.isEntitySchema(exported)) {
            allLoaded.push(exported);
        }
        else if (Array.isArray(exported)) {
            exported.forEach((i) => loadFileClasses(i, allLoaded));
        }
        else if (ObjectUtils_1.ObjectUtils.isObject(exported)) {
            Object.keys(exported).forEach((key) => loadFileClasses(exported[key], allLoaded));
        }
        return allLoaded;
    }
    const allFiles = directories.reduce((allDirs, dir) => {
        return allDirs.concat(glob.sync(PlatformTools_1.PlatformTools.pathNormalize(dir)));
    }, []);
    if (directories.length > 0 && allFiles.length === 0) {
        logger.log(logLevel, `${classesNotFoundMessage} "${directories}"`);
    }
    else if (allFiles.length > 0) {
        logger.log(logLevel, `${classesFoundMessage} "${directories}" : "${allFiles}"`);
    }
    const dirPromises = allFiles
        .filter((file) => {
        const dtsExtension = file.substring(file.length - 5, file.length);
        return (formats.indexOf(PlatformTools_1.PlatformTools.pathExtname(file)) !== -1 &&
            dtsExtension !== ".d.ts");
    })
        .map(async (file) => {
        const [importOrRequireResult] = await (0, ImportUtils_1.importOrRequireFile)(PlatformTools_1.PlatformTools.pathResolve(file));
        return importOrRequireResult;
    });
    const dirs = await Promise.all(dirPromises);
    return loadFileClasses(dirs, []);
}
exports.importClassesFromDirectories = importClassesFromDirectories;

//# sourceMappingURL=DirectoryExportedClassesLoader.js.map

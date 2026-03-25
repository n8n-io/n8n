"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBasePathOfAlias = exports.relativeOutPathToConfigDir = void 0;
const normalizePath = require("normalize-path");
const globby_1 = require("globby");
const path_1 = require("path");
function getProjectDirPathInOutDir(outDir, projectDir) {
    const posixOutput = outDir.replace(/\\/g, '/');
    const dirs = (0, globby_1.sync)([
        `${posixOutput}/**/${projectDir}`,
        `!${posixOutput}/**/${projectDir}/**/${projectDir}`,
        `!${posixOutput}/**/node_modules`
    ], {
        dot: true,
        onlyDirectories: true
    });
    return dirs.reduce((prev, curr) => prev.split('/').length > curr.split('/').length ? prev : curr, dirs[0]);
}
function relativeOutPathToConfigDir(config) {
    config.configDirInOutPath = getProjectDirPathInOutDir(config.outPath, config.confDirParentFolderName);
    if (config.configDirInOutPath) {
        config.hasExtraModule = true;
        const stepsbackPath = (0, path_1.relative)(config.configDirInOutPath, config.outPath);
        const splitStepBackPath = normalizePath(stepsbackPath).split('/');
        const nbOfStepBack = splitStepBackPath.length;
        const splitConfDirInOutPath = config.configDirInOutPath.split('/');
        let i = 1;
        const splitRelPath = [];
        while (i <= nbOfStepBack) {
            splitRelPath.unshift(splitConfDirInOutPath[splitConfDirInOutPath.length - i]);
            i++;
        }
        config.relConfDirPathInOutPath = splitRelPath.join('/');
    }
}
exports.relativeOutPathToConfigDir = relativeOutPathToConfigDir;
function findBasePathOfAlias(config) {
    return (path) => {
        const aliasPath = { path };
        if ((0, path_1.normalize)(aliasPath.path).includes('..')) {
            const tempBasePath = normalizePath((0, path_1.normalize)(`${config.outDir}/` +
                `${config.hasExtraModule && config.relConfDirPathInOutPath
                    ? config.relConfDirPathInOutPath
                    : ''}/${config.baseUrl}`));
            const absoluteBasePath = normalizePath((0, path_1.normalize)(`${tempBasePath}/${aliasPath.path}`));
            if (config.pathCache.existsResolvedAlias(absoluteBasePath)) {
                aliasPath.isExtra = false;
                aliasPath.basePath = tempBasePath;
            }
            else {
                aliasPath.isExtra = true;
                aliasPath.basePath = absoluteBasePath;
            }
            return aliasPath;
        }
        if (aliasPath.path.match(/^(\.\/|)node_modules/g)) {
            aliasPath.basePath = (0, path_1.resolve)(config.baseUrl, 'node_modules');
            aliasPath.isExtra = false;
            return aliasPath;
        }
        if (config.hasExtraModule) {
            aliasPath.isExtra = false;
            aliasPath.basePath = normalizePath((0, path_1.normalize)(`${config.outDir}/` +
                `${config.relConfDirPathInOutPath}/${config.baseUrl}`));
            return aliasPath;
        }
        aliasPath.basePath = config.outDir;
        aliasPath.isExtra = false;
        return aliasPath;
    };
}
exports.findBasePathOfAlias = findBasePathOfAlias;
//# sourceMappingURL=path.js.map
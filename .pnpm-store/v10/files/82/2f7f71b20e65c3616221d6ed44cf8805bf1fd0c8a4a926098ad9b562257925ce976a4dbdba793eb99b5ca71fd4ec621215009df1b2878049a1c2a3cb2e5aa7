"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importOrRequireFile = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const url_1 = require("url");
async function importOrRequireFile(filePath) {
    const tryToImport = async () => {
        // `Function` is required to make sure the `import` statement wil stay `import` after
        // transpilation and won't be converted to `require`
        return [
            await Function("return filePath => import(filePath)")()(filePath.startsWith("file://")
                ? filePath
                : (0, url_1.pathToFileURL)(filePath).toString()),
            "esm",
        ];
    };
    const tryToRequire = async () => {
        return [require(filePath), "commonjs"];
    };
    const extension = filePath.substring(filePath.lastIndexOf(".") + ".".length);
    if (extension === "mjs" || extension === "mts")
        return tryToImport();
    else if (extension === "cjs" || extension === "cts")
        return tryToRequire();
    else if (extension === "js" || extension === "ts") {
        const packageJson = await getNearestPackageJson(filePath);
        if (packageJson != null) {
            const isModule = packageJson?.type === "module";
            if (isModule)
                return tryToImport();
            else
                return tryToRequire();
        }
        else
            return tryToRequire();
    }
    return tryToRequire();
}
exports.importOrRequireFile = importOrRequireFile;
function getNearestPackageJson(filePath) {
    return new Promise((accept) => {
        let currentPath = filePath;
        function searchPackageJson() {
            const nextPath = path_1.default.dirname(currentPath);
            if (currentPath === nextPath)
                // the top of the file tree is reached
                accept(null);
            else {
                currentPath = nextPath;
                const potentialPackageJson = path_1.default.join(currentPath, "package.json");
                fs_1.default.stat(potentialPackageJson, (err, stats) => {
                    if (err != null)
                        searchPackageJson();
                    else if (stats.isFile()) {
                        fs_1.default.readFile(potentialPackageJson, "utf8", (err, data) => {
                            if (err != null)
                                accept(null);
                            else {
                                try {
                                    accept(JSON.parse(data));
                                }
                                catch (err) {
                                    accept(null);
                                }
                            }
                        });
                    }
                    else
                        searchPackageJson();
                });
            }
        }
        searchPackageJson();
    });
}

//# sourceMappingURL=ImportUtils.js.map

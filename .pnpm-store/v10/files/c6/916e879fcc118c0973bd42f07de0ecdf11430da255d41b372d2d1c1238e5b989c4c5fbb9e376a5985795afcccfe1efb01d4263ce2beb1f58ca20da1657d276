"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareSingleFileReplaceTscAliasPaths = exports.replaceTscAliasPaths = void 0;
const chokidar_1 = require("chokidar");
const globby_1 = require("globby");
const plimit_lit_1 = require("plimit-lit");
const helpers_1 = require("./helpers");
const defaultConfig = {
    watch: false,
    verbose: false,
    debug: false,
    declarationDir: undefined,
    output: undefined,
    aliasTrie: undefined
};
const OpenFilesLimit = (0, plimit_lit_1.pLimit)(500);
function replaceTscAliasPaths(options = Object.assign({}, defaultConfig)) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield (0, helpers_1.prepareConfig)(options);
        const output = config.output;
        const posixOutput = config.outPath.replace(/\\/g, '/').replace(/\/+$/g, '');
        const globPattern = [
            `${posixOutput}/**/*.${config.inputGlob}`,
            `!${posixOutput}/**/node_modules`
        ];
        output.debug('Search pattern:', globPattern);
        const files = (0, globby_1.sync)(globPattern, {
            dot: true,
            onlyFiles: true
        });
        output.debug('Found files:', files);
        const replaceList = yield Promise.all(files.map((file) => OpenFilesLimit(() => (0, helpers_1.replaceAlias)(config, file, options === null || options === void 0 ? void 0 : options.resolveFullPaths, options === null || options === void 0 ? void 0 : options.resolveFullExtension))));
        const replaceCount = replaceList.filter(Boolean).length;
        output.info(`${replaceCount} files were affected!`);
        if (options.watch) {
            output.verbose = true;
            output.info('[Watching for file changes...]');
            const filesWatcher = (0, chokidar_1.watch)(globPattern);
            const tsconfigWatcher = (0, chokidar_1.watch)(config.configFile);
            const onFileChange = (file) => __awaiter(this, void 0, void 0, function* () { return yield (0, helpers_1.replaceAlias)(config, file, options === null || options === void 0 ? void 0 : options.resolveFullPaths); });
            filesWatcher.on('add', onFileChange);
            filesWatcher.on('change', onFileChange);
            tsconfigWatcher.on('change', () => {
                output.clear();
                filesWatcher.close();
                tsconfigWatcher.close();
                replaceTscAliasPaths(options);
            });
        }
        if (options.declarationDir) {
            replaceTscAliasPaths(Object.assign(Object.assign({}, options), { outDir: options.declarationDir, declarationDir: undefined, output: config.output, aliasTrie: undefined }));
        }
    });
}
exports.replaceTscAliasPaths = replaceTscAliasPaths;
function prepareSingleFileReplaceTscAliasPaths(options = Object.assign({}, defaultConfig)) {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield (0, helpers_1.prepareConfig)(options);
        return ({ fileContents, filePath }) => {
            return (0, helpers_1.replaceAliasString)(config, filePath, fileContents, options === null || options === void 0 ? void 0 : options.resolveFullPaths, options === null || options === void 0 ? void 0 : options.resolveFullExtension);
        };
    });
}
exports.prepareSingleFileReplaceTscAliasPaths = prepareSingleFileReplaceTscAliasPaths;
//# sourceMappingURL=index.js.map
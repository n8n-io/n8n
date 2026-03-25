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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceAliasString = exports.replaceAlias = exports.importReplacers = void 0;
const fs_1 = require("fs");
const mylas_1 = require("mylas");
const path_1 = require("path");
const utils_1 = require("../utils");
const normalizePath = require("normalize-path");
function importReplacers(config, replacers, cmdReplacers) {
    var e_1, _a;
    var _b;
    return __awaiter(this, void 0, void 0, function* () {
        config.output.debug('Started loading replacers');
        const dir = process.cwd();
        const node_modules = mylas_1.Dir.nodeModules({ cwd: dir });
        config.output.debug('Found node_modules:', node_modules);
        const defaultReplacers = {
            default: {
                enabled: true
            },
            'base-url': {
                enabled: !!config.baseUrl
            }
        };
        let merged = Object.assign(Object.assign({}, defaultReplacers), replacers);
        config.output.debug('Added replacers to list from command-line filepaths:', cmdReplacers);
        cmdReplacers === null || cmdReplacers === void 0 ? void 0 : cmdReplacers.forEach((v) => {
            merged[v] = {
                enabled: true,
                file: v
            };
        });
        config.output.debug('Reading replacers config');
        const entries = Object.entries(merged);
        try {
            for (var entries_1 = __asyncValues(entries), entries_1_1; entries_1_1 = yield entries_1.next(), !entries_1_1.done;) {
                const replacer = entries_1_1.value;
                if (replacer[1].enabled) {
                    if (Object.keys(defaultReplacers).includes(replacer[0])) {
                        config.output.debug('Loading default replacer:', replacer);
                        const replacerModule = yield Promise.resolve().then(() => require(`../replacers/${replacer[0]}.replacer`));
                        config.replacers.push(replacerModule.default);
                    }
                    const file = (_b = replacer[1]) === null || _b === void 0 ? void 0 : _b.file;
                    if (!file) {
                        config.output.debug('Replacer has no file:', replacer);
                        continue;
                    }
                    const tryImportReplacer = (targetPath) => __awaiter(this, void 0, void 0, function* () {
                        const replacerModule = yield Promise.resolve().then(() => require(targetPath));
                        config.output.debug('Imported replacerModule:', replacerModule);
                        const replacerFunction = replacerModule.default;
                        if (typeof replacerFunction == 'function') {
                            config.replacers.push(replacerFunction);
                            config.output.info(`Added replacer "${file}"`);
                        }
                        else {
                            config.output.error(`Failed to import replacer "${file}", not in replacer format.`);
                        }
                    });
                    const isRelativePath = !(0, path_1.isAbsolute)(file);
                    const path = isRelativePath ? normalizePath((0, path_1.join)(dir, file)) : file;
                    if ((0, fs_1.existsSync)(path)) {
                        try {
                            yield tryImportReplacer(path);
                            config.output.debug('Imported replacer:', path);
                            continue;
                        }
                        catch (_c) { }
                    }
                    if (isRelativePath) {
                        for (const targetPath of node_modules.map((v) => (0, path_1.join)(dir, v, file))) {
                            try {
                                yield tryImportReplacer(targetPath);
                                config.output.debug('Imported replacer:', targetPath);
                                continue;
                            }
                            catch (_d) { }
                        }
                    }
                    config.output.error(`Failed to import replacer "${file}"`);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (entries_1_1 && !entries_1_1.done && (_a = entries_1.return)) yield _a.call(entries_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        config.output.debug('Loaded replacers:', config.replacers);
    });
}
exports.importReplacers = importReplacers;
function replaceAlias(config, file, resolveFullPath, resolveFullExtension) {
    return __awaiter(this, void 0, void 0, function* () {
        config.output.debug('Starting to replace file:', file);
        const code = yield fs_1.promises.readFile(file, 'utf8');
        const tempCode = replaceAliasString(config, file, code, resolveFullPath, resolveFullExtension);
        if (code !== tempCode) {
            config.output.debug('replaced file with changes:', file);
            yield fs_1.promises.writeFile(file, tempCode, 'utf8');
            return true;
        }
        config.output.debug('replaced file without changes:', file);
        return false;
    });
}
exports.replaceAlias = replaceAlias;
function replaceAliasString(config, file, code, resolveFullPath, resolveFullExtension) {
    config.replacers.forEach((replacer) => {
        code = (0, utils_1.replaceSourceImportPaths)(code, file, (orig) => replacer({
            orig,
            file,
            config
        }));
    });
    if (resolveFullPath) {
        code = (0, utils_1.resolveFullImportPaths)(code, file, resolveFullExtension);
    }
    return code;
}
exports.replaceAliasString = replaceAliasString;
//# sourceMappingURL=replacers.js.map
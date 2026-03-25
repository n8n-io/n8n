"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newStringRegex = exports.replaceSourceImportPaths = exports.newImportStatementRegex = exports.resolveFullImportPaths = void 0;
const normalizePath = require("normalize-path");
const fs_1 = require("fs");
const path_1 = require("path");
const anyQuote = `["']`;
const pathStringContent = `[^"'\r\n]+`;
const importString = `(?:${anyQuote}${pathStringContent}${anyQuote})`;
const funcStyle = `(?:\\b(?:import|require)\\s*\\(\\s*(\\/\\*.*\\*\\/\\s*)?${importString}\\s*\\))`;
const globalStyle = `(?:\\bimport\\s+${importString})`;
const globalMinimizedStyle = `(?:\\bimport${importString})`;
const fromStyle = `(?:\\bfrom\\s+${importString})`;
const fromMinimizedStyle = `(?:\\bfrom${importString})`;
const moduleStyle = `(?:\\bmodule\\s+${importString})`;
const importRegexString = `(?:${[
    funcStyle,
    globalStyle,
    globalMinimizedStyle,
    fromStyle,
    fromMinimizedStyle,
    moduleStyle
].join(`|`)})`;
class ImportPathResolver {
    constructor(source, sourcePath) {
        this.source = source;
        this.sourcePath = sourcePath;
    }
    get sourceDir() {
        return (0, path_1.dirname)(this.sourcePath);
    }
    replaceSourceImportPaths(replacer) {
        this.source = this.source.replace(ImportPathResolver.newImportStatementRegex('g'), replacer);
        return this;
    }
    resolveFullImportPaths(ext = '.js') {
        this.replaceSourceImportPaths((importStatement) => {
            const importPathMatch = importStatement.match((0, exports.newStringRegex)());
            if (!importPathMatch) {
                return importStatement;
            }
            const { path, pathWithQuotes } = importPathMatch.groups;
            const fullPath = normalizePath(this.resolveFullPath(path, ext));
            return importStatement.replace(pathWithQuotes, pathWithQuotes.replace(path, fullPath));
        });
        return this;
    }
    resolveFullPath(importPath, ext = '.js') {
        if (!importPath.startsWith('.') ||
            importPath.match(new RegExp(`\${ext}$`))) {
            return importPath;
        }
        if (!importPath.match(/[/\\]$/)) {
            const asFilePath = `${importPath}${ext}`;
            if ((0, fs_1.existsSync)((0, path_1.resolve)(this.sourceDir, asFilePath))) {
                return asFilePath;
            }
        }
        let asFilePath = (0, path_1.join)(importPath, 'index' + ext);
        if ((importPath.startsWith('./') || importPath === '.') &&
            !asFilePath.startsWith('./')) {
            asFilePath = './' + asFilePath;
        }
        return (0, fs_1.existsSync)((0, path_1.resolve)(this.sourceDir, asFilePath))
            ? asFilePath
            : importPath;
    }
    static newStringRegex() {
        return new RegExp(`(?<pathWithQuotes>${anyQuote}(?<path>${pathStringContent})${anyQuote})`);
    }
    static newImportStatementRegex(flags = '') {
        return new RegExp(importRegexString, flags);
    }
    static resolveFullImportPaths(code, path, ext = '.js') {
        return new ImportPathResolver(code, path).resolveFullImportPaths(ext)
            .source;
    }
    static replaceSourceImportPaths(code, path, replacer) {
        return new ImportPathResolver(code, path).replaceSourceImportPaths(replacer)
            .source;
    }
}
exports.resolveFullImportPaths = ImportPathResolver.resolveFullImportPaths;
exports.newImportStatementRegex = ImportPathResolver.newImportStatementRegex;
exports.replaceSourceImportPaths = ImportPathResolver.replaceSourceImportPaths;
exports.newStringRegex = ImportPathResolver.newStringRegex;
//# sourceMappingURL=import-path-resolver.js.map
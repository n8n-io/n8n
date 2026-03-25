"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguagePlugins = void 0;
exports.runTsc = runTsc;
exports.transformTscContent = transformTscContent;
const fs = require("fs");
const path = require("path");
let getLanguagePlugins = () => [];
exports.getLanguagePlugins = getLanguagePlugins;
function runTsc(tscPath, options, _getLanguagePlugins, typescriptObject) {
    exports.getLanguagePlugins = _getLanguagePlugins;
    let extraSupportedExtensions;
    let extraExtensionsToRemove;
    if (Array.isArray(options)) {
        extraSupportedExtensions = options;
        extraExtensionsToRemove = [];
    }
    else {
        extraSupportedExtensions = options.extraSupportedExtensions;
        extraExtensionsToRemove = options.extraExtensionsToRemove;
    }
    const proxyApiPath = require.resolve('../node/proxyCreateProgram');
    const readFileSync = fs.readFileSync;
    fs.readFileSync = (...args) => {
        if (args[0] === tscPath) {
            let tsc = readFileSync(...args);
            try {
                return transformTscContent(tsc, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);
            }
            catch {
                // Support the tsc shim used in Typescript v5.7 and up
                const requireRegex = /module\.exports\s*=\s*require\((?:"|')(?<path>\.\/\w+\.js)(?:"|')\)/;
                const requirePath = requireRegex.exec(tsc)?.groups?.path;
                if (requirePath) {
                    tsc = readFileSync(path.join(path.dirname(tscPath), requirePath), 'utf8');
                    return transformTscContent(tsc, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, __filename, typescriptObject);
                }
                else {
                    throw new Error('Failed to locate tsc module path from shim');
                }
            }
        }
        return readFileSync(...args);
    };
    try {
        require(tscPath);
    }
    finally {
        fs.readFileSync = readFileSync;
        delete require.cache[tscPath];
    }
}
/**
 * Replaces the code of typescript to add support for additional extensions and language plugins.
 *
 * @param tsc - The original code of typescript.
 * @param proxyApiPath - The path to the proxy API.
 * @param extraSupportedExtensions - An array of additional supported extensions.
 * @param extraExtensionsToRemove - An array of extensions to remove.
 * @param getLanguagePluginsFile - The file to get language plugins from.
 * @param typescriptObject - The object to use as typescript.
 * @returns The modified typescript code.
 */
function transformTscContent(tsc, proxyApiPath, extraSupportedExtensions, extraExtensionsToRemove, getLanguagePluginsFile = __filename, typescriptObject = `new Proxy({}, { get(_target, p, _receiver) { return eval(p); } } )`) {
    const neededPatchExtenstions = extraSupportedExtensions.filter(ext => !extraExtensionsToRemove.includes(ext));
    // Add allow extensions
    if (extraSupportedExtensions.length) {
        const extsText = extraSupportedExtensions.map(ext => `"${ext}"`).join(', ');
        tsc = replace(tsc, /supportedTSExtensions = .*(?=;)/, s => s + `.map((group, i) => i === 0 ? group.splice(0, 0, ${extsText}) && group : group)`);
        tsc = replace(tsc, /supportedJSExtensions = .*(?=;)/, s => s + `.map((group, i) => i === 0 ? group.splice(0, 0, ${extsText}) && group : group)`);
        tsc = replace(tsc, /allSupportedExtensions = .*(?=;)/, s => s + `.map((group, i) => i === 0 ? group.splice(0, 0, ${extsText}) && group : group)`);
    }
    // Use to emit basename.xxx to basename.d.ts instead of basename.xxx.d.ts
    if (extraExtensionsToRemove.length) {
        const extsText = extraExtensionsToRemove.map(ext => `"${ext}"`).join(', ');
        tsc = replace(tsc, /extensionsToRemove = .*(?=;)/, s => s + `.concat([${extsText}])`);
    }
    // Support for basename.xxx to basename.xxx.d.ts
    if (neededPatchExtenstions.length) {
        const extsText = neededPatchExtenstions.map(ext => `"${ext}"`).join(', ');
        tsc = replace(tsc, /function changeExtension\(/, s => `function changeExtension(path, newExtension) {
			return [${extsText}].some(ext => path.endsWith(ext))
				? path + newExtension
				: _changeExtension(path, newExtension)
			}\n` + s.replace('changeExtension', '_changeExtension'));
    }
    // proxy createProgram
    tsc = replace(tsc, /function createProgram\(.+\) {/, s => `var createProgram = require(${JSON.stringify(proxyApiPath)}).proxyCreateProgram(`
        + [
            typescriptObject,
            `_createProgram`,
            `require(${JSON.stringify(getLanguagePluginsFile)}).getLanguagePlugins`,
        ].join(', ')
        + `);\n`
        + s.replace('createProgram', '_createProgram'));
    return tsc;
}
function replace(text, ...[search, replace]) {
    const before = text;
    text = text.replace(search, replace);
    const after = text;
    if (after === before) {
        throw new Error('Failed to replace: ' + search);
    }
    return after;
}
//# sourceMappingURL=runTsc.js.map
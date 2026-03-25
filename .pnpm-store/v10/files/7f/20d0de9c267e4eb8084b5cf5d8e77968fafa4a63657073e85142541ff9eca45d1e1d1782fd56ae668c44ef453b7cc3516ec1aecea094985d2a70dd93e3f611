"use strict";
/// <reference types="@volar/typescript" />
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVueLanguagePlugin = createVueLanguagePlugin;
exports.getAllExtensions = getAllExtensions;
const language_core_1 = require("@volar/language-core");
const CompilerDOM = require("@vue/compiler-dom");
const plugins_1 = require("./plugins");
const CompilerVue2 = require("./utils/vue2TemplateCompiler");
const vueFile_1 = require("./virtualFile/vueFile");
const fileRegistries = [];
function getVueFileRegistry(key, plugins) {
    let fileRegistry = fileRegistries.find(r => r.key === key
        && r.plugins.length === plugins.length
        && r.plugins.every(plugin => plugins.includes(plugin)))?.files;
    if (!fileRegistry) {
        fileRegistry = new Map();
        fileRegistries.push({
            key: key,
            plugins: plugins,
            files: fileRegistry,
        });
    }
    return fileRegistry;
}
function getFileRegistryKey(compilerOptions, vueCompilerOptions, plugins) {
    const values = [
        ...Object.keys(vueCompilerOptions)
            .sort()
            .filter(key => key !== 'plugins')
            .map(key => [key, vueCompilerOptions[key]]),
        [...new Set(plugins.map(plugin => plugin.requiredCompilerOptions ?? []).flat())]
            .sort()
            .map(key => [key, compilerOptions[key]]),
    ];
    return JSON.stringify(values);
}
function createVueLanguagePlugin(ts, compilerOptions, vueCompilerOptions, asFileName) {
    const pluginContext = {
        modules: {
            '@vue/compiler-dom': vueCompilerOptions.target < 3
                ? {
                    ...CompilerDOM,
                    compile: CompilerVue2.compile,
                }
                : CompilerDOM,
            typescript: ts,
        },
        compilerOptions,
        vueCompilerOptions,
    };
    const plugins = (0, plugins_1.createPlugins)(pluginContext);
    const fileRegistry = getVueFileRegistry(getFileRegistryKey(compilerOptions, vueCompilerOptions, plugins), vueCompilerOptions.plugins);
    return {
        getLanguageId(scriptId) {
            const fileName = asFileName(scriptId);
            for (const plugin of plugins) {
                const languageId = plugin.getLanguageId?.(fileName);
                if (languageId) {
                    return languageId;
                }
            }
        },
        createVirtualCode(scriptId, languageId, snapshot) {
            const fileName = asFileName(scriptId);
            if (plugins.some(plugin => plugin.isValidFile?.(fileName, languageId))) {
                const code = fileRegistry.get(fileName);
                if (code) {
                    code.update(snapshot);
                    return code;
                }
                else {
                    const code = new vueFile_1.VueVirtualCode(fileName, languageId, snapshot, vueCompilerOptions, plugins, ts);
                    fileRegistry.set(fileName, code);
                    return code;
                }
            }
        },
        updateVirtualCode(_fileId, code, snapshot) {
            code.update(snapshot);
            return code;
        },
        typescript: {
            extraFileExtensions: getAllExtensions(vueCompilerOptions)
                .map(ext => ({
                extension: ext.slice(1),
                isMixedContent: true,
                scriptKind: 7,
            })),
            getServiceScript(root) {
                for (const code of (0, language_core_1.forEachEmbeddedCode)(root)) {
                    if (/script_(js|jsx|ts|tsx)/.test(code.id)) {
                        const lang = code.id.substring('script_'.length);
                        return {
                            code,
                            extension: '.' + lang,
                            scriptKind: lang === 'js' ? ts.ScriptKind.JS
                                : lang === 'jsx' ? ts.ScriptKind.JSX
                                    : lang === 'tsx' ? ts.ScriptKind.TSX
                                        : ts.ScriptKind.TS,
                        };
                    }
                }
            },
        },
    };
}
function getAllExtensions(options) {
    const result = new Set();
    for (const key in options) {
        if (key === 'extensions' || key.endsWith('Extensions')) {
            const value = options[key];
            if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
                for (const ext of value) {
                    result.add(ext);
                }
            }
        }
    }
    return [...result];
}
//# sourceMappingURL=languagePlugin.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParsedCommandLineByJson = createParsedCommandLineByJson;
exports.createParsedCommandLine = createParsedCommandLine;
exports.resolveVueCompilerOptions = resolveVueCompilerOptions;
exports.setupGlobalTypes = setupGlobalTypes;
const shared_1 = require("@vue/shared");
const path_browserify_1 = require("path-browserify");
const globalTypes_1 = require("../codegen/globalTypes");
const languagePlugin_1 = require("../languagePlugin");
function createParsedCommandLineByJson(ts, parseConfigHost, rootDir, json, configFileName = rootDir + '/jsconfig.json', skipGlobalTypesSetup = false) {
    const proxyHost = proxyParseConfigHostForExtendConfigPaths(parseConfigHost);
    ts.parseJsonConfigFileContent(json, proxyHost.host, rootDir, {}, configFileName);
    let vueOptions = {};
    for (const extendPath of proxyHost.extendConfigPaths.reverse()) {
        try {
            vueOptions = {
                ...vueOptions,
                ...getPartialVueCompilerOptions(ts, ts.readJsonConfigFile(extendPath, proxyHost.host.readFile)),
            };
        }
        catch (err) { }
    }
    const resolvedVueOptions = resolveVueCompilerOptions(vueOptions);
    if (skipGlobalTypesSetup) {
        resolvedVueOptions.__setupedGlobalTypes = true;
    }
    else {
        resolvedVueOptions.__setupedGlobalTypes = setupGlobalTypes(rootDir, resolvedVueOptions, parseConfigHost);
    }
    const parsed = ts.parseJsonConfigFileContent(json, proxyHost.host, rootDir, {}, configFileName, undefined, (0, languagePlugin_1.getAllExtensions)(resolvedVueOptions)
        .map(extension => ({
        extension: extension.slice(1),
        isMixedContent: true,
        scriptKind: ts.ScriptKind.Deferred,
    })));
    // fix https://github.com/vuejs/language-tools/issues/1786
    // https://github.com/microsoft/TypeScript/issues/30457
    // patching ts server broke with outDir + rootDir + composite/incremental
    parsed.options.outDir = undefined;
    return {
        ...parsed,
        vueOptions: resolvedVueOptions,
    };
}
function createParsedCommandLine(ts, parseConfigHost, tsConfigPath, skipGlobalTypesSetup = false) {
    try {
        const proxyHost = proxyParseConfigHostForExtendConfigPaths(parseConfigHost);
        const config = ts.readJsonConfigFile(tsConfigPath, proxyHost.host.readFile);
        ts.parseJsonSourceFileConfigFileContent(config, proxyHost.host, path_browserify_1.posix.dirname(tsConfigPath), {}, tsConfigPath);
        let vueOptions = {};
        for (const extendPath of proxyHost.extendConfigPaths.reverse()) {
            try {
                vueOptions = {
                    ...vueOptions,
                    ...getPartialVueCompilerOptions(ts, ts.readJsonConfigFile(extendPath, proxyHost.host.readFile)),
                };
            }
            catch (err) { }
        }
        const resolvedVueOptions = resolveVueCompilerOptions(vueOptions);
        if (skipGlobalTypesSetup) {
            resolvedVueOptions.__setupedGlobalTypes = true;
        }
        else {
            resolvedVueOptions.__setupedGlobalTypes = setupGlobalTypes(path_browserify_1.posix.dirname(tsConfigPath), resolvedVueOptions, parseConfigHost);
        }
        const parsed = ts.parseJsonSourceFileConfigFileContent(config, proxyHost.host, path_browserify_1.posix.dirname(tsConfigPath), {}, tsConfigPath, undefined, (0, languagePlugin_1.getAllExtensions)(resolvedVueOptions)
            .map(extension => ({
            extension: extension.slice(1),
            isMixedContent: true,
            scriptKind: ts.ScriptKind.Deferred,
        })));
        // fix https://github.com/vuejs/language-tools/issues/1786
        // https://github.com/microsoft/TypeScript/issues/30457
        // patching ts server broke with outDir + rootDir + composite/incremental
        parsed.options.outDir = undefined;
        return {
            ...parsed,
            vueOptions: resolvedVueOptions,
        };
    }
    catch (err) {
        // console.warn('Failed to resolve tsconfig path:', tsConfigPath, err);
        return {
            fileNames: [],
            options: {},
            vueOptions: resolveVueCompilerOptions({}),
            errors: [],
        };
    }
}
function proxyParseConfigHostForExtendConfigPaths(parseConfigHost) {
    const extendConfigPaths = [];
    const host = new Proxy(parseConfigHost, {
        get(target, key) {
            if (key === 'readFile') {
                return (fileName) => {
                    if (!fileName.endsWith('/package.json') && !extendConfigPaths.includes(fileName)) {
                        extendConfigPaths.push(fileName);
                    }
                    return target.readFile(fileName);
                };
            }
            return target[key];
        }
    });
    return {
        host,
        extendConfigPaths,
    };
}
function getPartialVueCompilerOptions(ts, tsConfigSourceFile) {
    const folder = path_browserify_1.posix.dirname(tsConfigSourceFile.fileName);
    const obj = ts.convertToObject(tsConfigSourceFile, []);
    const rawOptions = obj?.vueCompilerOptions ?? {};
    const result = {
        ...rawOptions,
    };
    const target = rawOptions.target ?? 'auto';
    if (target === 'auto') {
        const resolvedPath = resolvePath('vue/package.json');
        if (resolvedPath) {
            const vuePackageJson = require(resolvedPath);
            const versionNumbers = vuePackageJson.version.split('.');
            result.target = Number(versionNumbers[0] + '.' + versionNumbers[1]);
        }
        else {
            // console.warn('Load vue/package.json failed from', folder);
        }
    }
    else {
        result.target = target;
    }
    if (rawOptions.plugins) {
        const plugins = rawOptions.plugins
            .map((pluginPath) => {
            try {
                const resolvedPath = resolvePath(pluginPath);
                if (resolvedPath) {
                    const plugin = require(resolvedPath);
                    plugin.__moduleName = pluginPath;
                    return plugin;
                }
                else {
                    console.warn('[Vue] Load plugin failed:', pluginPath);
                }
            }
            catch (error) {
                console.warn('[Vue] Resolve plugin path failed:', pluginPath, error);
            }
            return [];
        });
        result.plugins = plugins;
    }
    return result;
    function resolvePath(scriptPath) {
        try {
            if (require?.resolve) {
                return require.resolve(scriptPath, { paths: [folder] });
            }
            else {
                // console.warn('failed to resolve path:', scriptPath, 'require.resolve is not supported in web');
            }
        }
        catch (error) {
            // console.warn(error);
        }
    }
}
function getDefaultOptions(options) {
    const target = options.target ?? 3.3;
    const lib = options.lib ?? 'vue';
    return {
        target,
        lib,
        extensions: ['.vue'],
        vitePressExtensions: [],
        petiteVueExtensions: [],
        jsxSlots: false,
        strictTemplates: false,
        skipTemplateCodegen: false,
        fallthroughAttributes: false,
        dataAttributes: [],
        htmlAttributes: ['aria-*'],
        optionsWrapper: target >= 2.7
            ? [`(await import('${lib}')).defineComponent(`, `)`]
            : [`(await import('${lib}')).default.extend(`, `)`],
        macros: {
            defineProps: ['defineProps'],
            defineSlots: ['defineSlots'],
            defineEmits: ['defineEmits'],
            defineExpose: ['defineExpose'],
            defineModel: ['defineModel'],
            defineOptions: ['defineOptions'],
            withDefaults: ['withDefaults'],
        },
        composables: {
            useAttrs: ['useAttrs'],
            useCssModule: ['useCssModule'],
            useSlots: ['useSlots'],
            useTemplateRef: ['useTemplateRef', 'templateRef'],
        },
        plugins: [],
        experimentalDefinePropProposal: false,
        experimentalResolveStyleCssClasses: 'scoped',
        experimentalModelPropName: null
    };
}
;
function resolveVueCompilerOptions(options, defaults = getDefaultOptions(options)) {
    return {
        ...defaults,
        ...options,
        macros: {
            ...defaults.macros,
            ...options.macros,
        },
        composables: {
            ...defaults.composables,
            ...options.composables,
        },
        // https://github.com/vuejs/vue-next/blob/master/packages/compiler-dom/src/transforms/vModel.ts#L49-L51
        // https://vuejs.org/guide/essentials/forms.html#form-input-bindings
        experimentalModelPropName: Object.fromEntries(Object.entries(options.experimentalModelPropName ?? defaults.experimentalModelPropName ?? {
            '': {
                input: true
            },
            value: {
                input: { type: 'text' },
                textarea: true,
                select: true
            }
        }).map(([k, v]) => [(0, shared_1.camelize)(k), v])),
    };
}
function setupGlobalTypes(rootDir, vueOptions, host) {
    if (!host.writeFile) {
        return;
    }
    try {
        let dir = rootDir;
        while (!host.fileExists(path_browserify_1.posix.join(dir, 'node_modules', vueOptions.lib, 'package.json'))) {
            const parentDir = path_browserify_1.posix.dirname(dir);
            if (dir === parentDir) {
                throw 0;
            }
            dir = parentDir;
        }
        const globalTypesPath = path_browserify_1.posix.join(dir, 'node_modules', '.vue-global-types', `${vueOptions.lib}_${vueOptions.target}_${vueOptions.strictTemplates}.d.ts`);
        const globalTypesContents = `// @ts-nocheck\nexport {};\n` + (0, globalTypes_1.generateGlobalTypes)(vueOptions.lib, vueOptions.target, vueOptions.strictTemplates);
        host.writeFile(globalTypesPath, globalTypesContents);
        return { absolutePath: globalTypesPath };
    }
    catch { }
}
//# sourceMappingURL=ts.js.map
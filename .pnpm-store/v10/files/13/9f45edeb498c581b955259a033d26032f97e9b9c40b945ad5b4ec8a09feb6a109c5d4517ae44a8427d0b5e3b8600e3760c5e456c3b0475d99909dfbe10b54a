/*
  @license
	Rollup.js v2.80.0
	Sun, 22 Feb 2026 06:16:40 GMT - commit d17ae15336a45c3c59b2a4aacac2b14186035d28

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
'use strict';

const rollup = require('./rollup.js');

const commandAliases = {
    c: 'config',
    d: 'dir',
    e: 'external',
    f: 'format',
    g: 'globals',
    h: 'help',
    i: 'input',
    m: 'sourcemap',
    n: 'name',
    o: 'file',
    p: 'plugin',
    v: 'version',
    w: 'watch'
};
function mergeOptions(config, rawCommandOptions = { external: [], globals: undefined }, defaultOnWarnHandler = rollup.defaultOnWarn) {
    const command = getCommandOptions(rawCommandOptions);
    const inputOptions = mergeInputOptions(config, command, defaultOnWarnHandler);
    const warn = inputOptions.onwarn;
    if (command.output) {
        Object.assign(command, command.output);
    }
    const outputOptionsArray = rollup.ensureArray(config.output);
    if (outputOptionsArray.length === 0)
        outputOptionsArray.push({});
    const outputOptions = outputOptionsArray.map(singleOutputOptions => mergeOutputOptions(singleOutputOptions, command, warn));
    rollup.warnUnknownOptions(command, Object.keys(inputOptions).concat(Object.keys(outputOptions[0]).filter(option => option !== 'sourcemapPathTransform'), Object.keys(commandAliases), 'config', 'environment', 'plugin', 'silent', 'failAfterWarnings', 'stdin', 'waitForBundleInput', 'configPlugin'), 'CLI flags', warn, /^_$|output$|config/);
    inputOptions.output = outputOptions;
    return inputOptions;
}
function getCommandOptions(rawCommandOptions) {
    const external = rawCommandOptions.external && typeof rawCommandOptions.external === 'string'
        ? rawCommandOptions.external.split(',')
        : [];
    return {
        ...rawCommandOptions,
        external,
        globals: typeof rawCommandOptions.globals === 'string'
            ? rawCommandOptions.globals.split(',').reduce((globals, globalDefinition) => {
                const [id, variableName] = globalDefinition.split(':');
                globals[id] = variableName;
                if (!external.includes(id)) {
                    external.push(id);
                }
                return globals;
            }, Object.create(null))
            : undefined
    };
}
function mergeInputOptions(config, overrides, defaultOnWarnHandler) {
    const getOption = (name) => { var _a; return (_a = overrides[name]) !== null && _a !== void 0 ? _a : config[name]; };
    const inputOptions = {
        acorn: getOption('acorn'),
        acornInjectPlugins: config.acornInjectPlugins,
        cache: config.cache,
        context: getOption('context'),
        experimentalCacheExpiry: getOption('experimentalCacheExpiry'),
        external: getExternal(config, overrides),
        inlineDynamicImports: getOption('inlineDynamicImports'),
        input: getOption('input') || [],
        makeAbsoluteExternalsRelative: getOption('makeAbsoluteExternalsRelative'),
        manualChunks: getOption('manualChunks'),
        maxParallelFileOps: getOption('maxParallelFileOps'),
        maxParallelFileReads: getOption('maxParallelFileReads'),
        moduleContext: getOption('moduleContext'),
        onwarn: getOnWarn(config, defaultOnWarnHandler),
        perf: getOption('perf'),
        plugins: rollup.ensureArray(config.plugins),
        preserveEntrySignatures: getOption('preserveEntrySignatures'),
        preserveModules: getOption('preserveModules'),
        preserveSymlinks: getOption('preserveSymlinks'),
        shimMissingExports: getOption('shimMissingExports'),
        strictDeprecations: getOption('strictDeprecations'),
        treeshake: getObjectOption(config, overrides, 'treeshake', rollup.objectifyOptionWithPresets(rollup.treeshakePresets, 'treeshake', 'false, true, ')),
        watch: getWatch(config, overrides)
    };
    rollup.warnUnknownOptions(config, Object.keys(inputOptions), 'input options', inputOptions.onwarn, /^output$/);
    return inputOptions;
}
const getExternal = (config, overrides) => {
    const configExternal = config.external;
    return typeof configExternal === 'function'
        ? (source, importer, isResolved) => configExternal(source, importer, isResolved) || overrides.external.includes(source)
        : rollup.ensureArray(configExternal).concat(overrides.external);
};
const getOnWarn = (config, defaultOnWarnHandler) => config.onwarn
    ? warning => config.onwarn(warning, defaultOnWarnHandler)
    : defaultOnWarnHandler;
const getObjectOption = (config, overrides, name, objectifyValue = rollup.objectifyOption) => {
    const commandOption = normalizeObjectOptionValue(overrides[name], objectifyValue);
    const configOption = normalizeObjectOptionValue(config[name], objectifyValue);
    if (commandOption !== undefined) {
        return commandOption && { ...configOption, ...commandOption };
    }
    return configOption;
};
const getWatch = (config, overrides) => config.watch !== false && getObjectOption(config, overrides, 'watch');
const isWatchEnabled = (optionValue) => {
    if (Array.isArray(optionValue)) {
        return optionValue.reduce((result, value) => (typeof value === 'boolean' ? value : result), false);
    }
    return optionValue === true;
};
const normalizeObjectOptionValue = (optionValue, objectifyValue) => {
    if (!optionValue) {
        return optionValue;
    }
    if (Array.isArray(optionValue)) {
        return optionValue.reduce((result, value) => value && result && { ...result, ...objectifyValue(value) }, {});
    }
    return objectifyValue(optionValue);
};
function mergeOutputOptions(config, overrides, warn) {
    const getOption = (name) => { var _a; return (_a = overrides[name]) !== null && _a !== void 0 ? _a : config[name]; };
    const outputOptions = {
        amd: getObjectOption(config, overrides, 'amd'),
        assetFileNames: getOption('assetFileNames'),
        banner: getOption('banner'),
        chunkFileNames: getOption('chunkFileNames'),
        compact: getOption('compact'),
        dir: getOption('dir'),
        dynamicImportFunction: getOption('dynamicImportFunction'),
        entryFileNames: getOption('entryFileNames'),
        esModule: getOption('esModule'),
        exports: getOption('exports'),
        extend: getOption('extend'),
        externalLiveBindings: getOption('externalLiveBindings'),
        file: getOption('file'),
        footer: getOption('footer'),
        format: getOption('format'),
        freeze: getOption('freeze'),
        generatedCode: getObjectOption(config, overrides, 'generatedCode', rollup.objectifyOptionWithPresets(rollup.generatedCodePresets, 'output.generatedCode', '')),
        globals: getOption('globals'),
        hoistTransitiveImports: getOption('hoistTransitiveImports'),
        indent: getOption('indent'),
        inlineDynamicImports: getOption('inlineDynamicImports'),
        interop: getOption('interop'),
        intro: getOption('intro'),
        manualChunks: getOption('manualChunks'),
        minifyInternalExports: getOption('minifyInternalExports'),
        name: getOption('name'),
        namespaceToStringTag: getOption('namespaceToStringTag'),
        noConflict: getOption('noConflict'),
        outro: getOption('outro'),
        paths: getOption('paths'),
        plugins: rollup.ensureArray(config.plugins),
        preferConst: getOption('preferConst'),
        preserveModules: getOption('preserveModules'),
        preserveModulesRoot: getOption('preserveModulesRoot'),
        sanitizeFileName: getOption('sanitizeFileName'),
        sourcemap: getOption('sourcemap'),
        sourcemapBaseUrl: getOption('sourcemapBaseUrl'),
        sourcemapExcludeSources: getOption('sourcemapExcludeSources'),
        sourcemapFile: getOption('sourcemapFile'),
        sourcemapPathTransform: getOption('sourcemapPathTransform'),
        strict: getOption('strict'),
        systemNullSetters: getOption('systemNullSetters'),
        validate: getOption('validate')
    };
    rollup.warnUnknownOptions(config, Object.keys(outputOptions), 'output options', warn);
    return outputOptions;
}

exports.commandAliases = commandAliases;
exports.isWatchEnabled = isWatchEnabled;
exports.mergeOptions = mergeOptions;
//# sourceMappingURL=mergeOptions.js.map

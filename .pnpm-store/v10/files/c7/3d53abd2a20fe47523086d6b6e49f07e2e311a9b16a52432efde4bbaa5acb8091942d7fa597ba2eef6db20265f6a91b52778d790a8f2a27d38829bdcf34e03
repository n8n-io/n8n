"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidationError = void 0;
exports.parsePresetName = parsePresetName;
exports.transformApiDefinitionsToApis = transformApiDefinitionsToApis;
exports.prefixRules = prefixRules;
exports.mergeExtends = mergeExtends;
exports.getMergedConfig = getMergedConfig;
exports.checkForDeprecatedFields = checkForDeprecatedFields;
exports.transformConfig = transformConfig;
exports.getResolveConfig = getResolveConfig;
exports.getUniquePlugins = getUniquePlugins;
exports.deepCloneMapWithJSON = deepCloneMapWithJSON;
exports.isDeprecatedPluginFormat = isDeprecatedPluginFormat;
exports.isCommonJsPlugin = isCommonJsPlugin;
const utils_1 = require("../utils");
const config_1 = require("./config");
const logger_1 = require("../logger");
function parsePresetName(presetName) {
    if (presetName.indexOf('/') > -1) {
        const [pluginId, configName] = presetName.split('/');
        return { pluginId, configName };
    }
    else {
        return { pluginId: '', configName: presetName };
    }
}
function transformApiDefinitionsToApis(apiDefinitions) {
    if (!apiDefinitions)
        return undefined;
    const apis = {};
    for (const [apiName, apiPath] of Object.entries(apiDefinitions)) {
        apis[apiName] = { root: apiPath };
    }
    return apis;
}
function extractFlatConfig({ plugins, extends: _extends, rules, oas2Rules, oas3_0Rules, oas3_1Rules, async2Rules, async3Rules, arazzo1Rules, preprocessors, oas2Preprocessors, oas3_0Preprocessors, oas3_1Preprocessors, async2Preprocessors, async3Preprocessors, arazzo1Preprocessors, decorators, oas2Decorators, oas3_0Decorators, oas3_1Decorators, async2Decorators, async3Decorators, arazzo1Decorators, ...rawConfigRest }) {
    const styleguideConfig = {
        plugins,
        extends: _extends,
        rules,
        oas2Rules,
        oas3_0Rules,
        oas3_1Rules,
        async2Rules,
        async3Rules,
        arazzo1Rules,
        preprocessors,
        oas2Preprocessors,
        oas3_0Preprocessors,
        oas3_1Preprocessors,
        async2Preprocessors,
        async3Preprocessors,
        arazzo1Preprocessors,
        decorators,
        oas2Decorators,
        oas3_0Decorators,
        oas3_1Decorators,
        async2Decorators,
        async3Decorators,
        arazzo1Decorators,
        doNotResolveExamples: rawConfigRest.resolve?.doNotResolveExamples,
    };
    if ((rawConfigRest.lint && rawConfigRest.styleguide) ||
        (Object.values(styleguideConfig).some(utils_1.isDefined) &&
            (rawConfigRest.lint || rawConfigRest.styleguide))) {
        throw new Error(`Do not use 'lint', 'styleguide' and flat syntax together. \nSee more about the configuration in the docs: https://redocly.com/docs/cli/configuration/ \n`);
    }
    return {
        styleguideConfig: Object.values(styleguideConfig).some(utils_1.isDefined)
            ? styleguideConfig
            : undefined,
        rawConfigRest,
    };
}
function transformApis(legacyApis) {
    if (!legacyApis)
        return undefined;
    const apis = {};
    for (const [apiName, { lint, ...apiContent }] of Object.entries(legacyApis)) {
        const { styleguideConfig, rawConfigRest } = extractFlatConfig(apiContent);
        apis[apiName] = {
            styleguide: styleguideConfig || lint,
            ...rawConfigRest,
        };
    }
    return apis;
}
function prefixRules(rules, prefix) {
    if (!prefix)
        return rules;
    const res = {};
    for (const name of Object.keys(rules)) {
        res[`${prefix}/${name}`] = rules[name];
    }
    return res;
}
function mergeExtends(rulesConfList) {
    const result = {
        rules: {},
        oas2Rules: {},
        oas3_0Rules: {},
        oas3_1Rules: {},
        async2Rules: {},
        async3Rules: {},
        arazzo1Rules: {},
        preprocessors: {},
        oas2Preprocessors: {},
        oas3_0Preprocessors: {},
        oas3_1Preprocessors: {},
        async2Preprocessors: {},
        async3Preprocessors: {},
        arazzo1Preprocessors: {},
        decorators: {},
        oas2Decorators: {},
        oas3_0Decorators: {},
        oas3_1Decorators: {},
        async2Decorators: {},
        async3Decorators: {},
        arazzo1Decorators: {},
        plugins: [],
        pluginPaths: [],
        extendPaths: [],
    };
    for (const rulesConf of rulesConfList) {
        if (rulesConf.extends) {
            throw new Error(`'extends' is not supported in shared configs yet:\n${JSON.stringify(rulesConf, null, 2)}`);
        }
        (0, utils_1.assignConfig)(result.rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.oas2Rules, rulesConf.oas2Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.oas2Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.oas3_0Rules, rulesConf.oas3_0Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_0Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.oas3_1Rules, rulesConf.oas3_1Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_1Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.async2Rules, rulesConf.async2Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.async2Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.async3Rules, rulesConf.async3Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.async3Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.arazzo1Rules, rulesConf.arazzo1Rules);
        (0, utils_1.assignOnlyExistingConfig)(result.arazzo1Rules, rulesConf.rules);
        (0, utils_1.assignConfig)(result.preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.oas2Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_0Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_1Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.async2Preprocessors, rulesConf.async2Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.async2Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.async3Preprocessors, rulesConf.async3Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.async3Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.arazzo1Preprocessors, rulesConf.arazzo1Preprocessors);
        (0, utils_1.assignOnlyExistingConfig)(result.arazzo1Preprocessors, rulesConf.preprocessors);
        (0, utils_1.assignConfig)(result.decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.oas2Decorators, rulesConf.oas2Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.oas2Decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_0Decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.oas3_1Decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.async2Decorators, rulesConf.async2Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.async2Decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.async3Decorators, rulesConf.async3Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.async3Decorators, rulesConf.decorators);
        (0, utils_1.assignConfig)(result.arazzo1Decorators, rulesConf.arazzo1Decorators);
        (0, utils_1.assignOnlyExistingConfig)(result.arazzo1Decorators, rulesConf.decorators);
        result.plugins.push(...(rulesConf.plugins || []));
        result.pluginPaths.push(...(rulesConf.pluginPaths || []));
        result.extendPaths.push(...new Set(rulesConf.extendPaths));
    }
    return result;
}
function getMergedConfig(config, apiName) {
    const extendPaths = [
        ...Object.values(config.apis).map((api) => api?.styleguide?.extendPaths),
        config.rawConfig?.styleguide?.extendPaths,
    ]
        .flat()
        .filter(utils_1.isTruthy);
    const pluginPaths = [
        ...Object.values(config.apis).map((api) => api?.styleguide?.pluginPaths),
        config.rawConfig?.styleguide?.pluginPaths,
    ]
        .flat()
        .filter(utils_1.isTruthy);
    return apiName
        ? new config_1.Config({
            ...config.rawConfig,
            styleguide: {
                ...(config.apis[apiName]
                    ? config.apis[apiName].styleguide
                    : config.rawConfig.styleguide),
                extendPaths,
                pluginPaths,
            },
            theme: {
                ...config.rawConfig.theme,
                ...config.apis[apiName]?.theme,
            },
            files: [...config.files, ...(config.apis?.[apiName]?.files ?? [])],
            // TODO: merge everything else here
        }, config.configFile)
        : config;
}
function checkForDeprecatedFields(deprecatedField, updatedField, rawConfig, updatedObject, link) {
    const isDeprecatedFieldInApis = rawConfig.apis &&
        Object.values(rawConfig.apis).some((api) => api[deprecatedField]);
    if (rawConfig[deprecatedField] && updatedField === null) {
        (0, utils_1.showWarningForDeprecatedField)(deprecatedField, undefined, updatedObject, link);
    }
    if (rawConfig[deprecatedField] && updatedField && rawConfig[updatedField]) {
        (0, utils_1.showErrorForDeprecatedField)(deprecatedField, updatedField);
    }
    if (rawConfig[deprecatedField] && updatedObject && rawConfig[updatedObject]) {
        (0, utils_1.showErrorForDeprecatedField)(deprecatedField, updatedField, updatedObject);
    }
    if (rawConfig[deprecatedField] || isDeprecatedFieldInApis) {
        (0, utils_1.showWarningForDeprecatedField)(deprecatedField, updatedField, updatedObject, link);
    }
}
function transformConfig(rawConfig) {
    const migratedFields = [
        ['apiDefinitions', 'apis', undefined, undefined],
        ['referenceDocs', 'openapi', 'theme', undefined],
        [
            'lint',
            undefined,
            undefined,
            'https://redocly.com/docs/api-registry/guides/migration-guide-config-file/#changed-properties',
        ],
        [
            'styleguide',
            undefined,
            undefined,
            'https://redocly.com/docs/api-registry/guides/migration-guide-config-file/#changed-properties',
        ],
        ['features.openapi', 'openapi', 'theme', undefined],
    ];
    for (const [deprecatedField, updatedField, updatedObject, link] of migratedFields) {
        checkForDeprecatedFields(deprecatedField, updatedField, rawConfig, updatedObject, link);
    }
    const { apis, apiDefinitions, referenceDocs, lint, ...rest } = rawConfig;
    const { styleguideConfig, rawConfigRest } = extractFlatConfig(rest);
    const transformedConfig = {
        theme: {
            openapi: {
                ...referenceDocs,
                ...rawConfig['features.openapi'],
                ...rawConfig.theme?.openapi,
            },
            mockServer: {
                ...rawConfig['features.mockServer'],
                ...rawConfig.theme?.mockServer,
            },
        },
        apis: transformApis(apis) || transformApiDefinitionsToApis(apiDefinitions),
        styleguide: styleguideConfig || lint,
        ...rawConfigRest,
    };
    showDeprecationMessages(transformedConfig);
    return transformedConfig;
}
function showDeprecationMessages(config) {
    let allRules = { ...config.styleguide?.rules };
    for (const api of Object.values(config.apis || {})) {
        allRules = { ...allRules, ...api?.styleguide?.rules };
    }
    for (const ruleKey of Object.keys(allRules)) {
        if (ruleKey.startsWith('assert/')) {
            logger_1.logger.warn(`\nThe 'assert/' syntax in ${ruleKey} is deprecated. Update your configuration to use 'rule/' instead. Examples and more information: https://redocly.com/docs/cli/rules/configurable-rules/\n`);
        }
    }
}
function getResolveConfig(resolve) {
    return {
        http: {
            headers: resolve?.http?.headers ?? [],
            customFetch: undefined,
        },
    };
}
function getUniquePlugins(plugins) {
    const seen = new Set();
    const results = [];
    for (const p of plugins) {
        if (!seen.has(p.id)) {
            results.push(p);
            seen.add(p.id);
        }
        else if (p.id) {
            logger_1.logger.warn(`Duplicate plugin id "${logger_1.colorize.red(p.id)}".\n`);
        }
    }
    return results;
}
class ConfigValidationError extends Error {
}
exports.ConfigValidationError = ConfigValidationError;
function deepCloneMapWithJSON(originalMap) {
    return new Map(JSON.parse(JSON.stringify([...originalMap])));
}
function isDeprecatedPluginFormat(plugin) {
    return plugin !== undefined && typeof plugin === 'object' && 'id' in plugin;
}
function isCommonJsPlugin(plugin) {
    return typeof plugin === 'function';
}

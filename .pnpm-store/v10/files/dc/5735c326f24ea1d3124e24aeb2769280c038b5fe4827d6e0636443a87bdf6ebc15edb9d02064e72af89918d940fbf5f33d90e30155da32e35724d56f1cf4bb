"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG_FILE_NAMES = void 0;
exports.loadConfig = loadConfig;
exports.findConfig = findConfig;
exports.getConfig = getConfig;
exports.createConfig = createConfig;
const fs = require("fs");
const path = require("path");
const redocly_1 = require("../redocly");
const utils_1 = require("../utils");
const js_yaml_1 = require("../js-yaml");
const utils_2 = require("./utils");
const config_resolvers_1 = require("./config-resolvers");
const bundle_1 = require("../bundle");
const resolve_1 = require("../resolve");
const env_1 = require("../env");
const domains_1 = require("../redocly/domains");
async function addConfigMetadata({ rawConfig, customExtends, configPath, tokens, files, region, externalRefResolver, }) {
    if (customExtends !== undefined) {
        rawConfig.styleguide = rawConfig.styleguide || {};
        rawConfig.styleguide.extends = customExtends;
    }
    else if ((0, utils_1.isEmptyObject)(rawConfig)) {
        rawConfig.styleguide = { extends: ['recommended'], recommendedFallback: true };
    }
    if (tokens?.length) {
        if (!rawConfig.resolve)
            rawConfig.resolve = {};
        if (!rawConfig.resolve.http)
            rawConfig.resolve.http = {};
        rawConfig.resolve.http.headers = [...(rawConfig.resolve.http.headers ?? [])];
        for (const item of tokens) {
            const domain = domains_1.DOMAINS[item.region];
            rawConfig.resolve.http.headers.push({
                matches: `https://api.${domain}/registry/**`,
                name: 'Authorization',
                envVariable: undefined,
                value: item.token,
            }, 
            //support redocly.com domain for future compatibility
            ...(item.region === 'us'
                ? [
                    {
                        matches: `https://api.redoc.ly/registry/**`,
                        name: 'Authorization',
                        envVariable: undefined,
                        value: item.token,
                    },
                ]
                : []));
        }
    }
    return (0, config_resolvers_1.resolveConfig)({
        rawConfig: {
            ...rawConfig,
            files: files ?? rawConfig.files,
            region: region ?? rawConfig.region,
        },
        configPath,
        externalRefResolver,
    });
}
async function loadConfig(options = {}) {
    const { configPath = findConfig(), customExtends, processRawConfig, files, region, externalRefResolver, } = options;
    const { rawConfig, document, parsed, resolvedRefMap } = await getConfig({
        configPath,
        externalRefResolver,
    });
    const redoclyClient = env_1.isBrowser ? undefined : new redocly_1.RedoclyClient();
    const tokens = redoclyClient && redoclyClient.hasTokens() ? redoclyClient.getAllTokens() : [];
    const config = await addConfigMetadata({
        rawConfig,
        customExtends,
        configPath,
        tokens,
        files,
        region,
        externalRefResolver,
    });
    if (document && parsed && resolvedRefMap && typeof processRawConfig === 'function') {
        try {
            await processRawConfig({
                document,
                resolvedRefMap,
                config,
                parsed,
            });
        }
        catch (e) {
            if (e instanceof utils_2.ConfigValidationError) {
                throw e;
            }
            throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
        }
    }
    return config;
}
exports.CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];
function findConfig(dir) {
    if (!fs?.hasOwnProperty?.('existsSync'))
        return;
    const existingConfigFiles = exports.CONFIG_FILE_NAMES.map((name) => dir ? path.resolve(dir, name) : name).filter(fs.existsSync);
    if (existingConfigFiles.length > 1) {
        throw new Error(`
      Multiple configuration files are not allowed.
      Found the following files: ${existingConfigFiles.join(', ')}.
      Please use 'redocly.yaml' instead.
    `);
    }
    return existingConfigFiles[0];
}
async function getConfig(options = {}) {
    const { configPath = findConfig(), externalRefResolver = new resolve_1.BaseResolver() } = options;
    if (!configPath)
        return { rawConfig: {} };
    try {
        const { document, resolvedRefMap } = await (0, config_resolvers_1.resolveConfigFileAndRefs)({
            configPath,
            externalRefResolver,
        });
        const bundledRefMap = (0, utils_2.deepCloneMapWithJSON)(resolvedRefMap);
        const parsed = await (0, bundle_1.bundleConfig)(JSON.parse(JSON.stringify(document)), bundledRefMap);
        return {
            rawConfig: (0, utils_2.transformConfig)(parsed),
            document,
            parsed,
            resolvedRefMap,
        };
    }
    catch (e) {
        throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
    }
}
async function createConfig(config, options) {
    return addConfigMetadata({
        rawConfig: (0, utils_2.transformConfig)(typeof config === 'string' ? (0, js_yaml_1.parseYaml)(config) : config),
        ...options,
    });
}

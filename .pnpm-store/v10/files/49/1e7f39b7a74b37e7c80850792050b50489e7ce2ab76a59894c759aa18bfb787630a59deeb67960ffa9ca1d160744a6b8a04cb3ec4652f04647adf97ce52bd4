"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.StyleguideConfig = exports.IGNORE_FILE = void 0;
const fs = require("fs");
const path = require("path");
const js_yaml_1 = require("../js-yaml");
const utils_1 = require("../utils");
const oas_types_1 = require("../oas-types");
const env_1 = require("../env");
const utils_2 = require("./utils");
const ref_utils_1 = require("../ref-utils");
exports.IGNORE_FILE = '.redocly.lint-ignore.yaml';
const IGNORE_BANNER = `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.\n` +
    `# See https://redocly.com/docs/cli/ for more information.\n`;
function getIgnoreFilePath(configFile) {
    if (configFile) {
        return (0, utils_1.doesYamlFileExist)(configFile)
            ? path.join(path.dirname(configFile), exports.IGNORE_FILE)
            : path.join(configFile, exports.IGNORE_FILE);
    }
    else {
        return env_1.isBrowser ? undefined : path.join(process.cwd(), exports.IGNORE_FILE);
    }
}
class StyleguideConfig {
    constructor(rawConfig, configFile) {
        this.rawConfig = rawConfig;
        this.configFile = configFile;
        this.ignore = {};
        this._usedRules = new Set();
        this._usedVersions = new Set();
        this.plugins = rawConfig.plugins || [];
        this.doNotResolveExamples = !!rawConfig.doNotResolveExamples;
        this.recommendedFallback = rawConfig.recommendedFallback || false;
        const ruleGroups = [
            'rules',
            'oas2Rules',
            'oas3_0Rules',
            'oas3_1Rules',
            'async2Rules',
            'async3Rules',
            'arazzo1Rules',
            'overlay1Rules',
        ];
        replaceSpecWithStruct(ruleGroups, rawConfig);
        this.rules = {
            [oas_types_1.SpecVersion.OAS2]: { ...rawConfig.rules, ...rawConfig.oas2Rules },
            [oas_types_1.SpecVersion.OAS3_0]: { ...rawConfig.rules, ...rawConfig.oas3_0Rules },
            [oas_types_1.SpecVersion.OAS3_1]: { ...rawConfig.rules, ...rawConfig.oas3_1Rules },
            [oas_types_1.SpecVersion.Async2]: { ...rawConfig.rules, ...rawConfig.async2Rules },
            [oas_types_1.SpecVersion.Async3]: { ...rawConfig.rules, ...rawConfig.async3Rules },
            [oas_types_1.SpecVersion.Arazzo1]: { ...rawConfig.rules, ...rawConfig.arazzo1Rules },
            [oas_types_1.SpecVersion.Overlay1]: { ...rawConfig.rules, ...rawConfig.overlay1Rules },
        };
        this.preprocessors = {
            [oas_types_1.SpecVersion.OAS2]: { ...rawConfig.preprocessors, ...rawConfig.oas2Preprocessors },
            [oas_types_1.SpecVersion.OAS3_0]: { ...rawConfig.preprocessors, ...rawConfig.oas3_0Preprocessors },
            [oas_types_1.SpecVersion.OAS3_1]: { ...rawConfig.preprocessors, ...rawConfig.oas3_1Preprocessors },
            [oas_types_1.SpecVersion.Async2]: { ...rawConfig.preprocessors, ...rawConfig.async2Preprocessors },
            [oas_types_1.SpecVersion.Async3]: { ...rawConfig.preprocessors, ...rawConfig.async3Preprocessors },
            [oas_types_1.SpecVersion.Arazzo1]: { ...rawConfig.arazzo1Preprocessors },
            [oas_types_1.SpecVersion.Overlay1]: { ...rawConfig.preprocessors, ...rawConfig.overlay1Preprocessors },
        };
        this.decorators = {
            [oas_types_1.SpecVersion.OAS2]: { ...rawConfig.decorators, ...rawConfig.oas2Decorators },
            [oas_types_1.SpecVersion.OAS3_0]: { ...rawConfig.decorators, ...rawConfig.oas3_0Decorators },
            [oas_types_1.SpecVersion.OAS3_1]: { ...rawConfig.decorators, ...rawConfig.oas3_1Decorators },
            [oas_types_1.SpecVersion.Async2]: { ...rawConfig.decorators, ...rawConfig.async2Decorators },
            [oas_types_1.SpecVersion.Async3]: { ...rawConfig.decorators, ...rawConfig.async3Decorators },
            [oas_types_1.SpecVersion.Arazzo1]: { ...rawConfig.arazzo1Decorators },
            [oas_types_1.SpecVersion.Overlay1]: { ...rawConfig.decorators, ...rawConfig.overlay1Decorators },
        };
        this.extendPaths = rawConfig.extendPaths || [];
        this.pluginPaths = rawConfig.pluginPaths || [];
        this.resolveIgnore(getIgnoreFilePath(configFile));
    }
    resolveIgnore(ignoreFile) {
        if (!ignoreFile || !(0, utils_1.doesYamlFileExist)(ignoreFile))
            return;
        this.ignore =
            (0, js_yaml_1.parseYaml)(fs.readFileSync(ignoreFile, 'utf-8')) || {};
        replaceSpecWithStruct(Object.keys(this.ignore), this.ignore);
        // resolve ignore paths
        for (const fileName of Object.keys(this.ignore)) {
            this.ignore[(0, ref_utils_1.isAbsoluteUrl)(fileName) ? fileName : path.resolve(path.dirname(ignoreFile), fileName)] = this.ignore[fileName];
            for (const ruleId of Object.keys(this.ignore[fileName])) {
                this.ignore[fileName][ruleId] = new Set(this.ignore[fileName][ruleId]);
            }
            if (!(0, ref_utils_1.isAbsoluteUrl)(fileName)) {
                delete this.ignore[fileName];
            }
        }
    }
    saveIgnore() {
        const dir = this.configFile ? path.dirname(this.configFile) : process.cwd();
        const ignoreFile = path.join(dir, exports.IGNORE_FILE);
        const mapped = {};
        for (const absFileName of Object.keys(this.ignore)) {
            const mappedDefinitionName = (0, ref_utils_1.isAbsoluteUrl)(absFileName)
                ? absFileName
                : (0, utils_1.slash)(path.relative(dir, absFileName));
            const ignoredRules = (mapped[mappedDefinitionName] = this.ignore[absFileName]);
            for (const ruleId of Object.keys(ignoredRules)) {
                ignoredRules[ruleId] = Array.from(ignoredRules[ruleId]);
            }
        }
        fs.writeFileSync(ignoreFile, IGNORE_BANNER + (0, js_yaml_1.stringifyYaml)(mapped));
    }
    addIgnore(problem) {
        const ignore = this.ignore;
        const loc = problem.location[0];
        if (loc.pointer === undefined)
            return;
        const fileIgnore = (ignore[loc.source.absoluteRef] = ignore[loc.source.absoluteRef] || {});
        const ruleIgnore = (fileIgnore[problem.ruleId] = fileIgnore[problem.ruleId] || new Set());
        ruleIgnore.add(loc.pointer);
    }
    addProblemToIgnore(problem) {
        const loc = problem.location[0];
        if (loc.pointer === undefined)
            return problem;
        const fileIgnore = this.ignore[loc.source.absoluteRef] || {};
        const ruleIgnore = fileIgnore[problem.ruleId];
        const ignored = ruleIgnore && ruleIgnore.has(loc.pointer);
        return ignored
            ? {
                ...problem,
                ignored,
            }
            : problem;
    }
    extendTypes(types, version) {
        let extendedTypes = types;
        for (const plugin of this.plugins) {
            if (plugin.typeExtension !== undefined) {
                switch (version) {
                    case oas_types_1.SpecVersion.OAS3_0:
                    case oas_types_1.SpecVersion.OAS3_1:
                        if (!plugin.typeExtension.oas3)
                            continue;
                        extendedTypes = plugin.typeExtension.oas3(extendedTypes, version);
                        break;
                    case oas_types_1.SpecVersion.OAS2:
                        if (!plugin.typeExtension.oas2)
                            continue;
                        extendedTypes = plugin.typeExtension.oas2(extendedTypes, version);
                        break;
                    case oas_types_1.SpecVersion.Async2:
                        if (!plugin.typeExtension.async2)
                            continue;
                        extendedTypes = plugin.typeExtension.async2(extendedTypes, version);
                        break;
                    case oas_types_1.SpecVersion.Async3:
                        if (!plugin.typeExtension.async3)
                            continue;
                        extendedTypes = plugin.typeExtension.async3(extendedTypes, version);
                        break;
                    case oas_types_1.SpecVersion.Arazzo1:
                        if (!plugin.typeExtension.arazzo1)
                            continue;
                        extendedTypes = plugin.typeExtension.arazzo1(extendedTypes, version);
                        break;
                    case oas_types_1.SpecVersion.Overlay1:
                        if (!plugin.typeExtension.overlay1)
                            continue;
                        extendedTypes = plugin.typeExtension.overlay1(extendedTypes, version);
                        break;
                    default:
                        throw new Error('Not implemented');
                }
            }
        }
        return extendedTypes;
    }
    getRuleSettings(ruleId, oasVersion) {
        this._usedRules.add(ruleId);
        this._usedVersions.add(oasVersion);
        const settings = this.rules[oasVersion][ruleId] || 'off';
        if (typeof settings === 'string') {
            return {
                severity: settings,
            };
        }
        else {
            return { severity: 'error', ...settings };
        }
    }
    getPreprocessorSettings(ruleId, oasVersion) {
        this._usedRules.add(ruleId);
        this._usedVersions.add(oasVersion);
        const settings = this.preprocessors[oasVersion][ruleId] || 'off';
        if (typeof settings === 'string') {
            return {
                severity: settings === 'on' ? 'error' : settings,
            };
        }
        else {
            return { severity: 'error', ...settings };
        }
    }
    getDecoratorSettings(ruleId, oasVersion) {
        this._usedRules.add(ruleId);
        this._usedVersions.add(oasVersion);
        const settings = this.decorators[oasVersion][ruleId] || 'off';
        if (typeof settings === 'string') {
            return {
                severity: settings === 'on' ? 'error' : settings,
            };
        }
        else {
            return { severity: 'error', ...settings };
        }
    }
    getUnusedRules() {
        const rules = [];
        const decorators = [];
        const preprocessors = [];
        for (const usedVersion of Array.from(this._usedVersions)) {
            rules.push(...Object.keys(this.rules[usedVersion]).filter((name) => !this._usedRules.has(name)));
            decorators.push(...Object.keys(this.decorators[usedVersion]).filter((name) => !this._usedRules.has(name)));
            preprocessors.push(...Object.keys(this.preprocessors[usedVersion]).filter((name) => !this._usedRules.has(name)));
        }
        return {
            rules,
            preprocessors,
            decorators,
        };
    }
    getRulesForSpecVersion(version) {
        switch (version) {
            case oas_types_1.SpecMajorVersion.OAS3:
                // eslint-disable-next-line no-case-declarations
                const oas3Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.oas3 && oas3Rules.push(p.preprocessors.oas3));
                this.plugins.forEach((p) => p.rules?.oas3 && oas3Rules.push(p.rules.oas3));
                this.plugins.forEach((p) => p.decorators?.oas3 && oas3Rules.push(p.decorators.oas3));
                return oas3Rules;
            case oas_types_1.SpecMajorVersion.OAS2:
                // eslint-disable-next-line no-case-declarations
                const oas2Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.oas2 && oas2Rules.push(p.preprocessors.oas2));
                this.plugins.forEach((p) => p.rules?.oas2 && oas2Rules.push(p.rules.oas2));
                this.plugins.forEach((p) => p.decorators?.oas2 && oas2Rules.push(p.decorators.oas2));
                return oas2Rules;
            case oas_types_1.SpecMajorVersion.Async2:
                // eslint-disable-next-line no-case-declarations
                const asyncApi2Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.async2 && asyncApi2Rules.push(p.preprocessors.async2));
                this.plugins.forEach((p) => p.rules?.async2 && asyncApi2Rules.push(p.rules.async2));
                this.plugins.forEach((p) => p.decorators?.async2 && asyncApi2Rules.push(p.decorators.async2));
                return asyncApi2Rules;
            case oas_types_1.SpecMajorVersion.Async3:
                // eslint-disable-next-line no-case-declarations
                const asyncApi3Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.async3 && asyncApi3Rules.push(p.preprocessors.async3));
                this.plugins.forEach((p) => p.rules?.async3 && asyncApi3Rules.push(p.rules.async3));
                this.plugins.forEach((p) => p.decorators?.async3 && asyncApi3Rules.push(p.decorators.async3));
                return asyncApi3Rules;
            case oas_types_1.SpecMajorVersion.Arazzo1:
                // eslint-disable-next-line no-case-declarations
                const arazzo1Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.arazzo1 && arazzo1Rules.push(p.preprocessors.arazzo1));
                this.plugins.forEach((p) => p.rules?.arazzo1 && arazzo1Rules.push(p.rules.arazzo1));
                this.plugins.forEach((p) => p.decorators?.arazzo1 && arazzo1Rules.push(p.decorators.arazzo1));
                return arazzo1Rules;
            case oas_types_1.SpecMajorVersion.Overlay1:
                // eslint-disable-next-line no-case-declarations
                const overlay1Rules = [];
                this.plugins.forEach((p) => p.preprocessors?.overlay1 && overlay1Rules.push(p.preprocessors.overlay1));
                this.plugins.forEach((p) => p.rules?.overlay1 && overlay1Rules.push(p.rules.overlay1));
                this.plugins.forEach((p) => p.decorators?.overlay1 && overlay1Rules.push(p.decorators.overlay1));
                return overlay1Rules;
        }
    }
    skipRules(rules) {
        for (const ruleId of rules || []) {
            for (const version of Object.values(oas_types_1.SpecVersion)) {
                if (this.rules[version][ruleId]) {
                    this.rules[version][ruleId] = 'off';
                }
                else if (Array.isArray(this.rules[version].assertions)) {
                    // skip assertions
                    for (const configurableRule of this.rules[version].assertions) {
                        if (configurableRule.assertionId === ruleId) {
                            configurableRule.severity = 'off';
                        }
                    }
                }
            }
        }
    }
    skipPreprocessors(preprocessors) {
        for (const preprocessorId of preprocessors || []) {
            for (const version of Object.values(oas_types_1.SpecVersion)) {
                if (this.preprocessors[version][preprocessorId]) {
                    this.preprocessors[version][preprocessorId] = 'off';
                }
            }
        }
    }
    skipDecorators(decorators) {
        for (const decoratorId of decorators || []) {
            for (const version of Object.values(oas_types_1.SpecVersion)) {
                if (this.decorators[version][decoratorId]) {
                    this.decorators[version][decoratorId] = 'off';
                }
            }
        }
    }
}
exports.StyleguideConfig = StyleguideConfig;
// To support backwards compatibility with the old `spec` key we rename it to `struct`.
function replaceSpecWithStruct(ruleGroups, config) {
    for (const ruleGroup of ruleGroups) {
        if (config[ruleGroup] && (0, utils_1.isPlainObject)(config[ruleGroup]) && 'spec' in config[ruleGroup]) {
            (0, utils_1.showWarningForDeprecatedField)('spec', 'struct');
            config[ruleGroup].struct = config[ruleGroup].spec;
            delete config[ruleGroup].spec;
        }
    }
}
class Config {
    constructor(rawConfig, configFile) {
        this.rawConfig = rawConfig;
        this.configFile = configFile;
        this.apis = rawConfig.apis || {};
        this.styleguide = new StyleguideConfig(rawConfig.styleguide || {}, configFile);
        this.theme = rawConfig.theme || {};
        this.resolve = (0, utils_2.getResolveConfig)(rawConfig?.resolve);
        this.region = rawConfig.region;
        this.organization = rawConfig.organization;
        this.files = rawConfig.files || [];
        this.telemetry = rawConfig.telemetry;
    }
}
exports.Config = Config;

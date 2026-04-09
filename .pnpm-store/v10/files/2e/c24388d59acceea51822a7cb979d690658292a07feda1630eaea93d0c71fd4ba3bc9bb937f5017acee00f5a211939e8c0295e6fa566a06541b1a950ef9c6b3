"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.help = exports.run = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const bs_logger_1 = require("bs-logger");
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const json5_1 = require("json5");
const create_jest_preset_1 = require("../../presets/create-jest-preset");
const backports_1 = require("../../utils/backports");
const presets_1 = require("../helpers/presets");
const migrateGlobalConfigToTransformConfig = (transformConfig, globalsTsJestConfig) => {
    if (transformConfig) {
        return Object.entries(transformConfig).reduce((previousValue, currentValue) => {
            const [key, transformOptions] = currentValue;
            if (typeof transformOptions === 'string' && transformOptions.includes('ts-jest')) {
                return {
                    ...previousValue,
                    [key]: globalsTsJestConfig ? ['ts-jest', globalsTsJestConfig] : 'ts-jest',
                };
            }
            return {
                ...previousValue,
                [key]: transformOptions,
            };
        }, {});
    }
    return {};
};
const migratePresetToTransformConfig = (transformConfig, preset, globalsTsJestConfig) => {
    if (preset) {
        const transformConfigFromPreset = preset.name === "ts-jest/presets/js-with-ts" /* JestPresetNames.jsWithTs */
            ? (0, create_jest_preset_1.createJsWithTsPreset)(globalsTsJestConfig)
            : preset.name === "ts-jest/presets/js-with-babel" /* JestPresetNames.jsWIthBabel */
                ? (0, create_jest_preset_1.createJsWithBabelPreset)(globalsTsJestConfig)
                : (0, create_jest_preset_1.createDefaultPreset)(globalsTsJestConfig);
        return {
            ...transformConfig,
            ...transformConfigFromPreset.transform,
        };
    }
    return transformConfig;
};
/**
 * @internal
 */
const run = async (args /* , logger: Logger*/) => {
    const nullLogger = (0, bs_logger_1.createLogger)({ targets: [] });
    const file = args._[0]?.toString();
    const filePath = (0, path_1.resolve)(process.cwd(), file);
    if (!(0, fs_1.existsSync)(filePath)) {
        throw new Error(`Configuration file ${file} does not exists.`);
    }
    const name = (0, path_1.basename)(file);
    const isPackage = name === 'package.json';
    if (!/\.(js|json)$/.test(name)) {
        throw new TypeError(`Configuration file ${file} must be a JavaScript or JSON file.`);
    }
    let actualConfig = require(filePath);
    if (isPackage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actualConfig = actualConfig.jest;
    }
    if (!actualConfig)
        actualConfig = {};
    // migrate
    // first we backport our options
    const migratedConfig = (0, backports_1.backportJestConfig)(nullLogger, actualConfig);
    let preset;
    if (migratedConfig.preset) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        preset = presets_1.allPresets[migratedConfig.preset] ?? presets_1.allPresets["ts-jest/presets/default" /* JestPresetNames.default */];
    }
    else {
        if (args.js) {
            preset = args.js === 'babel' ? presets_1.allPresets["ts-jest/presets/js-with-babel" /* JestPresetNames.jsWIthBabel */] : presets_1.allPresets["ts-jest/presets/js-with-ts" /* JestPresetNames.jsWithTs */];
        }
        else {
            preset = presets_1.allPresets["ts-jest/presets/default" /* JestPresetNames.default */];
        }
    }
    // check the extensions
    if (migratedConfig.moduleFileExtensions?.length && preset) {
        const presetValue = dedupSort(preset.value.moduleFileExtensions ?? []).join('::');
        const migratedValue = dedupSort(migratedConfig.moduleFileExtensions).join('::');
        if (presetValue === migratedValue) {
            delete migratedConfig.moduleFileExtensions;
        }
    }
    // there is a testRegex, remove our testMatch
    if (typeof migratedConfig.testRegex === 'string' || migratedConfig.testRegex?.length) {
        delete migratedConfig.testMatch;
    }
    // check the testMatch
    else if (migratedConfig.testMatch?.length &&
        preset &&
        Array.isArray(preset.value.testMatch) &&
        Array.isArray(migratedConfig.testMatch)) {
        const presetValue = dedupSort(preset.value.testMatch).join('::');
        const migratedValue = dedupSort(migratedConfig.testMatch).join('::');
        if (presetValue === migratedValue) {
            delete migratedConfig.testMatch;
        }
    }
    const globalsTsJestConfig = migratedConfig.globals?.['ts-jest'];
    migratedConfig.transform = migrateGlobalConfigToTransformConfig(migratedConfig.transform, globalsTsJestConfig);
    migratedConfig.transform = migratePresetToTransformConfig(migratedConfig.transform, preset, globalsTsJestConfig);
    cleanupConfig(actualConfig);
    cleanupConfig(migratedConfig);
    const before = (0, fast_json_stable_stringify_1.default)(actualConfig);
    const after = (0, fast_json_stable_stringify_1.default)(migratedConfig);
    if (after === before) {
        process.stderr.write(`
No migration needed for given Jest configuration
    `);
        return;
    }
    const stringify = file.endsWith('.json') ? JSON.stringify : json5_1.stringify;
    const prefix = file.endsWith('.json') ? '"jest": ' : 'module.exports = ';
    // output new config
    process.stderr.write(`
Migrated Jest configuration:
`);
    process.stdout.write(`${prefix}${stringify(migratedConfig, undefined, '  ')}\n`);
};
exports.run = run;
function cleanupConfig(config) {
    if (config.globals) {
        delete config.globals['ts-jest'];
        if (!Object.keys(config.globals).length) {
            delete config.globals;
        }
    }
    if (config.transform && !Object.keys(config.transform).length) {
        delete config.transform;
    }
    if (config.moduleFileExtensions) {
        config.moduleFileExtensions = dedupSort(config.moduleFileExtensions);
        if (!config.moduleFileExtensions.length)
            delete config.moduleFileExtensions;
    }
    if (config.testMatch && Array.isArray(config.testMatch)) {
        config.testMatch = dedupSort(config.testMatch);
        if (!config.testMatch.length)
            delete config.testMatch;
    }
    delete config.preset;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dedupSort(arr) {
    return arr
        .filter((s, i, a) => a.findIndex((e) => s.toString() === e.toString()) === i)
        .sort((a, b) => (a.toString() > b.toString() ? 1 : a.toString() < b.toString() ? -1 : 0));
}
/**
 * @internal
 */
const help = async () => {
    process.stdout.write(`
Usage:
  ts-jest config:migrate [options] <config-file>

Arguments:
  <config-file>         Can be a js or json Jest config file. If it is a
                        package.json file, the configuration will be read from
                        the "jest" property.

Options:
  --js ts|babel         Process .js files with ts-jest if 'ts' or with
                        babel-jest if 'babel'
  --no-jest-preset      Disable the use of Jest presets
`);
};
exports.help = help;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJestPreset = createJestPreset;
exports.createDefaultPreset = createDefaultPreset;
exports.createDefaultLegacyPreset = createDefaultLegacyPreset;
exports.createJsWithTsPreset = createJsWithTsPreset;
exports.createJsWithTsLegacyPreset = createJsWithTsLegacyPreset;
exports.createJsWithBabelPreset = createJsWithBabelPreset;
exports.createJsWithBabelLegacyPreset = createJsWithBabelLegacyPreset;
exports.createDefaultEsmPreset = createDefaultEsmPreset;
exports.createDefaultEsmLegacyPreset = createDefaultEsmLegacyPreset;
exports.createJsWithTsEsmPreset = createJsWithTsEsmPreset;
exports.createJsWithTsEsmLegacyPreset = createJsWithTsEsmLegacyPreset;
exports.createJsWithBabelEsmPreset = createJsWithBabelEsmPreset;
exports.createJsWithBabelEsmLegacyPreset = createJsWithBabelEsmLegacyPreset;
const constants_1 = require("../constants");
const utils_1 = require("../utils");
const logger = utils_1.rootLogger.child({ namespace: 'jest-preset' });
/**
 * @deprecated use other functions below instead
 */
function createJestPreset(legacy = false, allowJs = false, extraOptions = {}) {
    logger.debug({ allowJs }, 'creating jest presets', allowJs ? 'handling' : 'not handling', 'JavaScript files');
    const { extensionsToTreatAsEsm, moduleFileExtensions, testMatch } = extraOptions;
    const supportESM = extensionsToTreatAsEsm?.length;
    const tsJestTransformOptions = supportESM ? { useESM: true } : {};
    return {
        ...(extensionsToTreatAsEsm ? { extensionsToTreatAsEsm } : undefined),
        ...(moduleFileExtensions ? { moduleFileExtensions } : undefined),
        ...(testMatch ? { testMatch } : undefined),
        transform: {
            ...extraOptions.transform,
            [allowJs ? (supportESM ? '^.+\\.m?[tj]sx?$' : '^.+\\.[tj]sx?$') : '^.+\\.tsx?$']: legacy
                ? ['ts-jest/legacy', tsJestTransformOptions]
                : ['ts-jest', tsJestTransformOptions],
        },
    };
}
function createDefaultPreset(tsJestTransformOptions = {}) {
    logger.debug('creating default CJS Jest preset');
    return {
        transform: {
            [constants_1.TS_TRANSFORM_PATTERN]: ['ts-jest', tsJestTransformOptions],
        },
    };
}
function createDefaultLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating default CJS Jest preset');
    return {
        transform: {
            [constants_1.TS_TRANSFORM_PATTERN]: ['ts-jest/legacy', tsJestTransformOptions],
        },
    };
}
function createJsWithTsPreset(tsJestTransformOptions = {}) {
    logger.debug('creating Js with Ts CJS Jest preset');
    return {
        transform: {
            [constants_1.TS_JS_TRANSFORM_PATTERN]: ['ts-jest', tsJestTransformOptions],
        },
    };
}
function createJsWithTsLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating Js with Ts CJS Jest preset');
    return {
        transform: {
            [constants_1.TS_JS_TRANSFORM_PATTERN]: ['ts-jest/legacy', tsJestTransformOptions],
        },
    };
}
function createJsWithBabelPreset(tsJestTransformOptions = {}) {
    logger.debug('creating JS with Babel CJS Jest preset');
    return {
        transform: {
            [constants_1.JS_TRANSFORM_PATTERN]: 'babel-jest',
            [constants_1.TS_TRANSFORM_PATTERN]: ['ts-jest', tsJestTransformOptions],
        },
    };
}
function createJsWithBabelLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating JS with Babel CJS Jest preset');
    return {
        transform: {
            [constants_1.JS_TRANSFORM_PATTERN]: 'babel-jest',
            [constants_1.TS_TRANSFORM_PATTERN]: ['ts-jest/legacy', tsJestTransformOptions],
        },
    };
}
function createDefaultEsmPreset(tsJestTransformOptions = {}) {
    logger.debug('creating default ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_TS_TRANSFORM_PATTERN]: [
                'ts-jest',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}
function createDefaultEsmLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating default ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_TS_TRANSFORM_PATTERN]: [
                'ts-jest/legacy',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}
function createJsWithTsEsmPreset(tsJestTransformOptions = {}) {
    logger.debug('creating Js with Ts ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.JS_EXT_TO_TREAT_AS_ESM, ...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_TS_JS_TRANSFORM_PATTERN]: [
                'ts-jest',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}
function createJsWithTsEsmLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating Js with Ts ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.JS_EXT_TO_TREAT_AS_ESM, ...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_TS_JS_TRANSFORM_PATTERN]: [
                'ts-jest/legacy',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}
function createJsWithBabelEsmPreset(tsJestTransformOptions = {}) {
    logger.debug('creating JS with Babel ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.JS_EXT_TO_TREAT_AS_ESM, ...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_JS_TRANSFORM_PATTERN]: 'babel-jest',
            [constants_1.ESM_TS_TRANSFORM_PATTERN]: [
                'ts-jest',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}
function createJsWithBabelEsmLegacyPreset(tsJestTransformOptions = {}) {
    logger.debug('creating JS with Babel ESM Jest preset');
    return {
        extensionsToTreatAsEsm: [...constants_1.JS_EXT_TO_TREAT_AS_ESM, ...constants_1.TS_EXT_TO_TREAT_AS_ESM],
        transform: {
            [constants_1.ESM_JS_TRANSFORM_PATTERN]: 'babel-jest',
            [constants_1.ESM_TS_TRANSFORM_PATTERN]: [
                'ts-jest/legacy',
                {
                    ...tsJestTransformOptions,
                    useESM: true,
                },
            ],
        },
    };
}

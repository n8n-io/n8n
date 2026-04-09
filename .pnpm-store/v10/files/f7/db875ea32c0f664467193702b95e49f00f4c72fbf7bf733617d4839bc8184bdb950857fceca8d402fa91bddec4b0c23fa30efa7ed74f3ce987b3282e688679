"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.backportTsJestDebugEnvVar = exports.backportJestConfig = void 0;
const bs_logger_1 = require("bs-logger");
const messages_1 = require("./messages");
const context = { [bs_logger_1.LogContexts.namespace]: 'backports' };
/**
 * @internal
 */
const backportJestConfig = (logger, config) => {
    logger.debug({ ...context, config }, 'backporting config');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { globals = {} } = (config || {});
    const { 'ts-jest': tsJest = {} } = globals;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mergeTsJest = {};
    let hadWarnings = false;
    const warnConfig = (oldPath, newPath, note) => {
        hadWarnings = true;
        logger.warn(context, (0, messages_1.interpolate)(note ? "\"[jest-config].{{oldPath}}\" is deprecated, use \"[jest-config].{{newPath}}\" instead.\n    \u21B3 {{note}}" /* Deprecations.ConfigOptionWithNote */ : "\"[jest-config].{{oldPath}}\" is deprecated, use \"[jest-config].{{newPath}}\" instead." /* Deprecations.ConfigOption */, {
            oldPath,
            newPath,
            note,
        }));
    };
    if ('__TS_CONFIG__' in globals) {
        warnConfig('globals.__TS_CONFIG__', 'globals.ts-jest.tsconfig');
        if (typeof globals.__TS_CONFIG__ === 'object') {
            mergeTsJest.tsconfig = globals.__TS_CONFIG__;
        }
        delete globals.__TS_CONFIG__;
    }
    if ('__TRANSFORM_HTML__' in globals) {
        warnConfig('globals.__TRANSFORM_HTML__', 'globals.ts-jest.stringifyContentPathRegex');
        if (globals.__TRANSFORM_HTML__) {
            mergeTsJest.stringifyContentPathRegex = '\\.html?$';
        }
        delete globals.__TRANSFORM_HTML__;
    }
    if ('typeCheck' in tsJest) {
        warnConfig('globals.ts-jest.typeCheck', 'globals.ts-jest.isolatedModules');
        mergeTsJest.isolatedModules = !tsJest.typeCheck;
        delete tsJest.typeCheck;
    }
    if ('tsConfigFile' in tsJest) {
        warnConfig('globals.ts-jest.tsConfigFile', 'globals.ts-jest.tsconfig');
        if (tsJest.tsConfigFile) {
            mergeTsJest.tsconfig = tsJest.tsConfigFile;
        }
        delete tsJest.tsConfigFile;
    }
    if ('tsConfig' in tsJest) {
        warnConfig('globals.ts-jest.tsConfig', 'globals.ts-jest.tsconfig');
        if (tsJest.tsConfig) {
            mergeTsJest.tsconfig = tsJest.tsConfig;
        }
        delete tsJest.tsConfig;
    }
    if ('enableTsDiagnostics' in tsJest) {
        warnConfig('globals.ts-jest.enableTsDiagnostics', 'globals.ts-jest.diagnostics');
        if (tsJest.enableTsDiagnostics) {
            mergeTsJest.diagnostics = { warnOnly: true };
            if (typeof tsJest.enableTsDiagnostics === 'string')
                mergeTsJest.diagnostics.exclude = [tsJest.enableTsDiagnostics];
        }
        else {
            mergeTsJest.diagnostics = false;
        }
        delete tsJest.enableTsDiagnostics;
    }
    if ('useBabelrc' in tsJest) {
        warnConfig('globals.ts-jest.useBabelrc', 'globals.ts-jest.babelConfig', "See `babel-jest` related issue: https://github.com/facebook/jest/issues/3845" /* Deprecations.ConfigOptionUseBabelRcNote */);
        if (tsJest.useBabelrc != null) {
            mergeTsJest.babelConfig = tsJest.useBabelrc ? true : {};
        }
        delete tsJest.useBabelrc;
    }
    if ('skipBabel' in tsJest) {
        warnConfig('globals.ts-jest.skipBabel', 'globals.ts-jest.babelConfig');
        if (tsJest.skipBabel === false && !mergeTsJest.babelConfig) {
            mergeTsJest.babelConfig = true;
        }
        delete tsJest.skipBabel;
    }
    // if we had some warnings we can inform the user about the CLI tool
    if (hadWarnings) {
        logger.warn(context, messages_1.Helps.MigrateConfigUsingCLI);
    }
    return {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...config,
        globals: {
            ...globals,
            'ts-jest': {
                ...mergeTsJest,
                ...tsJest,
            },
        },
    };
};
exports.backportJestConfig = backportJestConfig;
/**
 * @internal
 */
const backportTsJestDebugEnvVar = (logger) => {
    if ('TS_JEST_DEBUG' in process.env) {
        const shouldLog = !/^\s*(?:0|f(?:alse)?|no?|disabled?|off|)\s*$/i.test(process.env.TS_JEST_DEBUG || '');
        delete process.env.TS_JEST_DEBUG;
        if (shouldLog) {
            process.env.TS_JEST_LOG = 'ts-jest.log,stderr:warn';
        }
        logger.warn(context, (0, messages_1.interpolate)("Using env. var \"{{old}}\" is deprecated, use \"{{new}}\" instead." /* Deprecations.EnvVar */, {
            old: 'TS_JEST_DEBUG',
            new: 'TS_JEST_LOG',
        }));
    }
};
exports.backportTsJestDebugEnvVar = backportTsJestDebugEnvVar;

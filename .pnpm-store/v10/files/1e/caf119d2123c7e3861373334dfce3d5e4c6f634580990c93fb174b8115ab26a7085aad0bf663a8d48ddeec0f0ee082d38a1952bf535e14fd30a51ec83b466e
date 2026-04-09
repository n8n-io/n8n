"use strict";
/**
 * This has been written quickly. While trying to improve I realised it'd be better to have it in Jest...
 * ...and I saw a merged PR with `jest --init` tool!
 * TODO: see what's the best path for this
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.help = exports.run = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const handlebars_1 = __importDefault(require("handlebars"));
const json5_1 = require("json5");
const create_jest_preset_1 = require("../../presets/create-jest-preset");
const JEST_CONFIG_TEMPLATE = `const { {{ presetCreatorFn }} } = require("ts-jest");

const tsJestTransformCfg = {{ presetCreatorFn }}({{{ transformOpts }}}).transform;

/** @type {import("jest").Config} **/
{{{ exportKind }}} {
  testEnvironment: "{{ testEnvironment }}",
  transform: {
    ...tsJestTransformCfg,
  },
};`;
const ensureOnlyUsingDoubleQuotes = (str) => {
    return str
        .replace(/"'(.*?)'"/g, '"$1"')
        .replace(/'ts-jest'/g, '"ts-jest"')
        .replace(/'babel-jest'/g, '"babel-jest"');
};
/**
 * @internal
 */
const run = async (args /* , logger: Logger */) => {
    const { tsconfig: askedTsconfig, force, jsdom, js: jsFilesProcessor, babel: shouldPostProcessWithBabel } = args;
    const file = args._[0]?.toString() ?? 'jest.config.js';
    const filePath = (0, path_1.join)(process.cwd(), file);
    const name = (0, path_1.basename)(file);
    const isPackageJsonConfig = name === 'package.json';
    const isJestConfigFileExisted = (0, fs_1.existsSync)(filePath);
    const pkgFile = isPackageJsonConfig ? filePath : (0, path_1.join)(process.cwd(), 'package.json');
    const isPackageJsonExisted = isPackageJsonConfig || (0, fs_1.existsSync)(pkgFile);
    const tsconfig = askedTsconfig === 'tsconfig.json' ? undefined : askedTsconfig;
    const pkgJsonContent = isPackageJsonExisted ? JSON.parse((0, fs_1.readFileSync)(pkgFile, 'utf8')) : {};
    if (shouldPostProcessWithBabel) {
        console.warn(`The option --babel is deprecated and will be removed in the next major version.` +
            ` Please specify 'js' option value (see more with npx ts-jest help) if you wish 'ts-jest' to process 'js' with TypeScript API or Babel.`);
    }
    if (isPackageJsonConfig && !isJestConfigFileExisted) {
        throw new Error(`File ${file} does not exists.`);
    }
    else if (!isPackageJsonConfig && isJestConfigFileExisted && !force) {
        throw new Error(`Configuration file ${file} already exists.`);
    }
    if (!isPackageJsonConfig && !name.endsWith('.js')) {
        throw new TypeError(`Configuration file ${file} must be a .js file or the package.json.`);
    }
    if (isPackageJsonExisted && pkgJsonContent.jest) {
        if (force && !isPackageJsonConfig) {
            delete pkgJsonContent.jest;
            (0, fs_1.writeFileSync)(pkgFile, JSON.stringify(pkgJsonContent, undefined, '  '));
        }
        else if (!force) {
            throw new Error(`A Jest configuration is already set in ${pkgFile}.`);
        }
    }
    let body;
    const transformOpts = tsconfig
        ? { tsconfig: `${(0, json5_1.stringify)(tsconfig)}` }
        : undefined;
    let transformConfig;
    if (isPackageJsonConfig) {
        if (jsFilesProcessor === 'babel' || shouldPostProcessWithBabel) {
            transformConfig = (0, create_jest_preset_1.createJsWithBabelPreset)(transformOpts);
        }
        else if (jsFilesProcessor === 'ts') {
            transformConfig = (0, create_jest_preset_1.createJsWithTsPreset)(transformOpts);
        }
        else {
            transformConfig = (0, create_jest_preset_1.createDefaultPreset)(transformOpts);
        }
        body = ensureOnlyUsingDoubleQuotes(JSON.stringify({
            ...pkgJsonContent,
            jest: transformConfig,
        }, undefined, '  '));
    }
    else {
        let presetCreatorFn;
        if (jsFilesProcessor === 'babel' || shouldPostProcessWithBabel) {
            presetCreatorFn = 'createJsWithBabelPreset';
        }
        else if (jsFilesProcessor === 'ts') {
            presetCreatorFn = 'createJsWithTsPreset';
        }
        else {
            presetCreatorFn = 'createDefaultPreset';
        }
        const template = handlebars_1.default.compile(JEST_CONFIG_TEMPLATE);
        body = template({
            exportKind: pkgJsonContent.type === 'module' ? 'export default' : 'module.exports =',
            testEnvironment: jsdom ? 'jsdom' : 'node',
            presetCreatorFn,
            transformOpts: transformOpts ? ensureOnlyUsingDoubleQuotes(JSON.stringify(transformOpts, null, 2)) : undefined,
        });
    }
    (0, fs_1.writeFileSync)(filePath, body);
    process.stderr.write(`
Jest configuration written to "${filePath}".
`);
};
exports.run = run;
/**
 * @internal
 */
const help = async () => {
    process.stdout.write(`
Usage:
  ts-jest config:init [options] [<config-file>]

Arguments:
  <config-file>         Can be a js or json Jest config file. If it is a
                        package.json file, the configuration will be read from
                        the "jest" property.
                        Default: jest.config.js

Options:
  --force               Discard any existing Jest config
  --js ts|babel         Process '.js' files with ts-jest if 'ts' or with
                        babel-jest if 'babel'
  --no-jest-preset      Disable the use of Jest presets
  --tsconfig <file>     Path to the tsconfig.json file
  --babel               Enable using Babel to process 'js' resulted content from 'ts-jest' processing
  --jsdom               Use 'jsdom' as test environment instead of 'node'
`);
};
exports.help = help;

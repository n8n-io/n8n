"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lint_1 = require("../../commands/lint");
const openapi_core_1 = require("@redocly/openapi-core");
const miscellaneous_1 = require("../../utils/miscellaneous");
const config_1 = require("../fixtures/config");
const perf_hooks_1 = require("perf_hooks");
const wrapper_1 = require("../../wrapper");
const colorette_1 = require("colorette");
jest.mock('@redocly/openapi-core');
jest.mock('../../utils/miscellaneous');
jest.mock('perf_hooks');
jest.mock('../../utils/update-version-notifier', () => ({
    version: '1.0.0',
}));
const argvMock = {
    apis: ['openapi.yaml'],
    'lint-config': 'off',
    format: 'codeframe',
};
describe('handleLint', () => {
    let processExitMock;
    let exitCb;
    const getMergedConfigMock = openapi_core_1.getMergedConfig;
    beforeEach(() => {
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
        perf_hooks_1.performance.now.mockImplementation(() => 42);
        processExitMock = jest.spyOn(process, 'exit').mockImplementation();
        jest.spyOn(process, 'once').mockImplementation((_e, cb) => {
            exitCb = cb;
            return process.on(_e, cb);
        });
        getMergedConfigMock.mockReturnValue(config_1.ConfigFixture);
        openapi_core_1.doesYamlFileExist.mockImplementation((path) => path === 'redocly.yaml');
    });
    afterEach(() => {
        getMergedConfigMock.mockReset();
    });
    describe('loadConfig and getEnrtypoints stage', () => {
        it('should fail if config file does not exist', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({ ...argvMock, config: 'config.yaml' });
            expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith('Please provide a valid path to the configuration file.');
        });
        it('should call loadConfigAndHandleErrors and getFallbackApisOrExit', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(miscellaneous_1.loadConfigAndHandleErrors).toHaveBeenCalledWith({
                configPath: undefined,
                customExtends: undefined,
                processRawConfig: undefined,
            });
            expect(miscellaneous_1.getFallbackApisOrExit).toHaveBeenCalled();
        });
        it('should call loadConfig with args if such exist', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({
                ...argvMock,
                config: 'redocly.yaml',
                extends: ['some/path'],
            });
            expect(miscellaneous_1.loadConfigAndHandleErrors).toHaveBeenCalledWith({
                configPath: 'redocly.yaml',
                customExtends: ['some/path'],
                processRawConfig: undefined,
            });
        });
        it('should call mergedConfig with clear ignore if `generate-ignore-file` argv', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({ ...argvMock, 'generate-ignore-file': true });
            expect(getMergedConfigMock).toHaveBeenCalled();
        });
        it('should check if ruleset exist', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(miscellaneous_1.checkIfRulesetExist).toHaveBeenCalledTimes(1);
        });
        it('should fail if apis not provided', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({ ...argvMock, apis: [] });
            expect(miscellaneous_1.getFallbackApisOrExit).toHaveBeenCalledTimes(1);
            expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith('No APIs were provided.');
        });
    });
    describe('loop through entrypoints and lint stage', () => {
        it('should call getMergedConfig and lint ', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(perf_hooks_1.performance.now).toHaveBeenCalled();
            expect(getMergedConfigMock).toHaveBeenCalled();
            expect(openapi_core_1.lint).toHaveBeenCalled();
        });
        it('should call skipRules,skipPreprocessors and addIgnore with argv', async () => {
            openapi_core_1.lint.mockResolvedValueOnce(['problem']);
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({
                ...argvMock,
                'skip-preprocessor': ['preprocessor'],
                'skip-rule': ['rule'],
                'generate-ignore-file': true,
            });
            expect(config_1.ConfigFixture.styleguide.skipRules).toHaveBeenCalledWith(['rule']);
            expect(config_1.ConfigFixture.styleguide.skipPreprocessors).toHaveBeenCalledWith(['preprocessor']);
        });
        it('should call formatProblems and getExecutionTime with argv', async () => {
            openapi_core_1.lint.mockResolvedValueOnce(['problem']);
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)({ ...argvMock, 'max-problems': 2, format: 'stylish' });
            expect(openapi_core_1.getTotals).toHaveBeenCalledWith(['problem']);
            expect(openapi_core_1.formatProblems).toHaveBeenCalledWith(['problem'], {
                format: 'stylish',
                maxProblems: 2,
                totals: { errors: 0 },
                version: '1.0.0',
            });
            expect(miscellaneous_1.getExecutionTime).toHaveBeenCalledWith(42);
        });
        it('should catch error in handleError if something fails', async () => {
            openapi_core_1.lint.mockRejectedValueOnce('error');
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(miscellaneous_1.handleError).toHaveBeenCalledWith('error', 'openapi.yaml');
        });
    });
    describe('erros and warning handle after lint stage', () => {
        it('should call printLintTotals and printLintTotals', async () => {
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(miscellaneous_1.printUnusedWarnings).toHaveBeenCalled();
        });
        it('should call exit with 0 if no errors', async () => {
            miscellaneous_1.loadConfigAndHandleErrors.mockImplementation(() => {
                return { ...config_1.ConfigFixture };
            });
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            await exitCb?.();
            expect(processExitMock).toHaveBeenCalledWith(0);
        });
        it('should exit with 1 if total errors > 0', async () => {
            openapi_core_1.getTotals.mockReturnValueOnce({ errors: 1 });
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            await exitCb?.();
            expect(processExitMock).toHaveBeenCalledWith(1);
        });
        it('should use recommended fallback if no config', async () => {
            openapi_core_1.getMergedConfig.mockImplementation(() => {
                return {
                    styleguide: {
                        recommendedFallback: true,
                        rules: {},
                        skipRules: jest.fn(),
                        skipPreprocessors: jest.fn(),
                    },
                };
            });
            await (0, wrapper_1.commandWrapper)(lint_1.handleLint)(argvMock);
            expect(process.stderr.write).toHaveBeenCalledWith(`No configurations were provided -- using built in ${(0, colorette_1.blue)('recommended')} configuration by default.\n\n`);
        });
    });
});

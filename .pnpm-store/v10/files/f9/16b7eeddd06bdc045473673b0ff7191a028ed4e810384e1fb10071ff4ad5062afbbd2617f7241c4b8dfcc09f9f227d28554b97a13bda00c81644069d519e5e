import { handleLint, LintOptions } from '../../commands/lint';
import {
  getMergedConfig,
  lint,
  getTotals,
  formatProblems,
  doesYamlFileExist,
} from '@redocly/openapi-core';
import {
  getFallbackApisOrExit,
  getExecutionTime,
  printUnusedWarnings,
  handleError,
  exitWithError,
  loadConfigAndHandleErrors,
  checkIfRulesetExist,
} from '../../utils/miscellaneous';
import { ConfigFixture } from '../fixtures/config';
import { performance } from 'perf_hooks';
import { commandWrapper } from '../../wrapper';
import { Arguments } from 'yargs';
import { blue } from 'colorette';

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
} as Arguments<LintOptions>;

describe('handleLint', () => {
  let processExitMock: jest.SpyInstance;
  let exitCb: any;
  const getMergedConfigMock = getMergedConfig as jest.Mock<any, any>;

  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    (performance.now as jest.Mock<any, any>).mockImplementation(() => 42);
    processExitMock = jest.spyOn(process, 'exit').mockImplementation();
    jest.spyOn(process, 'once').mockImplementation((_e, cb) => {
      exitCb = cb;
      return process.on(_e, cb);
    });
    getMergedConfigMock.mockReturnValue(ConfigFixture);
    (doesYamlFileExist as jest.Mock<any, any>).mockImplementation(
      (path) => path === 'redocly.yaml'
    );
  });

  afterEach(() => {
    getMergedConfigMock.mockReset();
  });

  describe('loadConfig and getEnrtypoints stage', () => {
    it('should fail if config file does not exist', async () => {
      await commandWrapper(handleLint)({ ...argvMock, config: 'config.yaml' });
      expect(exitWithError).toHaveBeenCalledWith(
        'Please provide a valid path to the configuration file.'
      );
    });

    it('should call loadConfigAndHandleErrors and getFallbackApisOrExit', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith({
        configPath: undefined,
        customExtends: undefined,
        processRawConfig: undefined,
      });
      expect(getFallbackApisOrExit).toHaveBeenCalled();
    });

    it('should call loadConfig with args if such exist', async () => {
      await commandWrapper(handleLint)({
        ...argvMock,
        config: 'redocly.yaml',
        extends: ['some/path'],
      });
      expect(loadConfigAndHandleErrors).toHaveBeenCalledWith({
        configPath: 'redocly.yaml',
        customExtends: ['some/path'],
        processRawConfig: undefined,
      });
    });

    it('should call mergedConfig with clear ignore if `generate-ignore-file` argv', async () => {
      await commandWrapper(handleLint)({ ...argvMock, 'generate-ignore-file': true });
      expect(getMergedConfigMock).toHaveBeenCalled();
    });

    it('should check if ruleset exist', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(checkIfRulesetExist).toHaveBeenCalledTimes(1);
    });

    it('should fail if apis not provided', async () => {
      await commandWrapper(handleLint)({ ...argvMock, apis: [] });
      expect(getFallbackApisOrExit).toHaveBeenCalledTimes(1);
      expect(exitWithError).toHaveBeenCalledWith('No APIs were provided.');
    });
  });

  describe('loop through entrypoints and lint stage', () => {
    it('should call getMergedConfig and lint ', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(performance.now).toHaveBeenCalled();
      expect(getMergedConfigMock).toHaveBeenCalled();
      expect(lint).toHaveBeenCalled();
    });

    it('should call skipRules,skipPreprocessors and addIgnore with argv', async () => {
      (lint as jest.Mock<any, any>).mockResolvedValueOnce(['problem']);
      await commandWrapper(handleLint)({
        ...argvMock,
        'skip-preprocessor': ['preprocessor'],
        'skip-rule': ['rule'],
        'generate-ignore-file': true,
      });
      expect(ConfigFixture.styleguide.skipRules).toHaveBeenCalledWith(['rule']);
      expect(ConfigFixture.styleguide.skipPreprocessors).toHaveBeenCalledWith(['preprocessor']);
    });

    it('should call formatProblems and getExecutionTime with argv', async () => {
      (lint as jest.Mock<any, any>).mockResolvedValueOnce(['problem']);
      await commandWrapper(handleLint)({ ...argvMock, 'max-problems': 2, format: 'stylish' });
      expect(getTotals).toHaveBeenCalledWith(['problem']);
      expect(formatProblems).toHaveBeenCalledWith(['problem'], {
        format: 'stylish',
        maxProblems: 2,
        totals: { errors: 0 },
        version: '1.0.0',
      });
      expect(getExecutionTime).toHaveBeenCalledWith(42);
    });

    it('should catch error in handleError if something fails', async () => {
      (lint as jest.Mock<any, any>).mockRejectedValueOnce('error');
      await commandWrapper(handleLint)(argvMock);
      expect(handleError).toHaveBeenCalledWith('error', 'openapi.yaml');
    });
  });

  describe('erros and warning handle after lint stage', () => {
    it('should call printLintTotals and printLintTotals', async () => {
      await commandWrapper(handleLint)(argvMock);
      expect(printUnusedWarnings).toHaveBeenCalled();
    });

    it('should call exit with 0 if no errors', async () => {
      (loadConfigAndHandleErrors as jest.Mock).mockImplementation(() => {
        return { ...ConfigFixture };
      });
      await commandWrapper(handleLint)(argvMock);
      await exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should exit with 1 if total errors > 0', async () => {
      (getTotals as jest.Mock<any, any>).mockReturnValueOnce({ errors: 1 });
      await commandWrapper(handleLint)(argvMock);
      await exitCb?.();
      expect(processExitMock).toHaveBeenCalledWith(1);
    });

    it('should use recommended fallback if no config', async () => {
      (getMergedConfig as jest.Mock).mockImplementation(() => {
        return {
          styleguide: {
            recommendedFallback: true,
            rules: {},
            skipRules: jest.fn(),
            skipPreprocessors: jest.fn(),
          },
        };
      });
      await commandWrapper(handleLint)(argvMock);
      expect(process.stderr.write).toHaveBeenCalledWith(
        `No configurations were provided -- using built in ${blue(
          'recommended'
        )} configuration by default.\n\n`
      );
    });
  });
});

import { ConfigFixture } from '../../__tests__/fixtures/config';

export const getFallbackApisOrExit = jest.fn((entrypoints) =>
  entrypoints.map((path: string) => ({ path }))
);
export const dumpBundle = jest.fn(() => '');
export const slash = jest.fn();
export const pluralize = jest.fn();
export const getExecutionTime = jest.fn();
export const printExecutionTime = jest.fn();
export const printUnusedWarnings = jest.fn();
export const printLintTotals = jest.fn();
export const getOutputFileName = jest.fn(() => ({ outputFile: 'test.yaml', ext: 'yaml' }));
export const handleError = jest.fn();
export const exitWithError = jest.fn();
export const writeYaml = jest.fn();
export const loadConfigAndHandleErrors = jest.fn(() => ConfigFixture);
export const checkIfRulesetExist = jest.fn();
export const sortTopLevelKeysForOas = jest.fn((document) => document);
export const getAndValidateFileExtension = jest.fn((fileName: string) => fileName.split('.').pop());
export const writeToFileByExtension = jest.fn();
export const checkForDeprecatedOptions = jest.fn();
export const saveBundle = jest.fn();
export const formatPath = jest.fn((path: string) => path);

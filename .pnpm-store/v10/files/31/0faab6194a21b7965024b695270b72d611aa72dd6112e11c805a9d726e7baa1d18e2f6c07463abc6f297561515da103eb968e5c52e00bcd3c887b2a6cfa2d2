import {
  getFallbackApisOrExit,
  isSubdir,
  pathToFilename,
  printConfigLintTotals,
  langToExt,
  checkIfRulesetExist,
  handleError,
  CircularJSONNotSupportedError,
  sortTopLevelKeysForOas,
  cleanColors,
  HandledError,
  cleanArgs,
  cleanRawInput,
  getAndValidateFileExtension,
  writeToFileByExtension,
} from '../utils/miscellaneous';
import { sanitizeLocale, sanitizePath, getPlatformSpawnArgs } from '../utils/platform';
import {
  ResolvedApi,
  Totals,
  isAbsoluteUrl,
  ResolveError,
  YamlParseError,
  stringifyYaml,
} from '@redocly/openapi-core';
import { blue, red, yellow } from 'colorette';
import { existsSync, statSync } from 'fs';
import * as path from 'path';
import * as process from 'process';
import { ConfigApis } from '../types';

jest.mock('os');
jest.mock('colorette');

jest.mock('fs');

describe('isSubdir', () => {
  it('can correctly determine if subdir', () => {
    (
      [
        ['/foo', '/foo', false],
        ['/foo', '/bar', false],
        ['/foo', '/foobar', false],
        ['/foo', '/foo/bar', true],
        ['/foo', '/foo/../bar', false],
        ['/foo', '/foo/./bar', true],
        ['/bar/../foo', '/foo/bar', true],
        ['/foo', './bar', false],
        ['/foo', '/foo/..bar', true],
      ] as [string, string, boolean][]
    ).forEach(([parent, child, expectRes]) => {
      expect(isSubdir(parent, child)).toBe(expectRes);
    });
  });

  it('can correctly determine if subdir for windows-based paths', () => {
    const os = require('os');
    os.platform.mockImplementation(() => 'win32');

    (
      [
        ['C:/Foo', 'C:/Foo/Bar', true],
        ['C:\\Foo', 'C:\\Bar', false],
        ['C:\\Foo', 'D:\\Foo\\Bar', false],
      ] as [string, string, boolean][]
    ).forEach(([parent, child, expectRes]) => {
      expect(isSubdir(parent, child)).toBe(expectRes);
    });
  });

  afterEach(() => {
    jest.resetModules();
  });
});

describe('pathToFilename', () => {
  it('should use correct path separator', () => {
    const processedPath = pathToFilename('/user/createWithList', '_');
    expect(processedPath).toEqual('user_createWithList');
  });
});

describe('printConfigLintTotals', () => {
  const totalProblemsMock: Totals = {
    errors: 1,
    warnings: 0,
    ignored: 0,
  };

  const redColoretteMocks = red as jest.Mock<any, any>;
  const yellowColoretteMocks = yellow as jest.Mock<any, any>;

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text: string) => text);
    redColoretteMocks.mockImplementation((text: string) => text);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  it('should print errors if such exist', () => {
    printConfigLintTotals(totalProblemsMock);
    expect(process.stderr.write).toHaveBeenCalledWith('❌ Your config has 1 error.');
    expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error.');
  });

  it('should print warnign if no error', () => {
    printConfigLintTotals({ ...totalProblemsMock, errors: 0, warnings: 2 });
    expect(process.stderr.write).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
    expect(yellowColoretteMocks).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
  });

  it('should print nothing if no error and no warnings', () => {
    const result = printConfigLintTotals({ ...totalProblemsMock, errors: 0 });
    expect(result).toBeUndefined();
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(yellowColoretteMocks).toHaveBeenCalledTimes(0);
    expect(redColoretteMocks).toHaveBeenCalledTimes(0);
  });
});

describe('getFallbackApisOrExit', () => {
  const redColoretteMocks = red as jest.Mock<any, any>;
  const yellowColoretteMocks = yellow as jest.Mock<any, any>;

  const apis: Record<string, ResolvedApi> = {
    main: {
      root: 'someFile.yaml',
      styleguide: {},
    },
  };

  const config = { apis };

  beforeEach(() => {
    yellowColoretteMocks.mockImplementation((text: string) => text);
    redColoretteMocks.mockImplementation((text: string) => text);
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process, 'exit').mockImplementation();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should exit with error because no path provided', async () => {
    const apisConfig = {
      apis: {},
    };
    expect.assertions(1);
    try {
      await getFallbackApisOrExit([''], apisConfig);
    } catch (e) {
      expect(e.message).toEqual('Path cannot be empty.');
    }
  });

  it('should error if file from config do not exist', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    expect.assertions(3);
    try {
      await getFallbackApisOrExit(undefined, config);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should return valid array with results if such file exist', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => true);
    jest.spyOn(path, 'resolve').mockImplementationOnce((_, path) => path);

    const result = await getFallbackApisOrExit(undefined, config);
    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(process.exit).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'someFile.yaml',
        output: undefined,
      },
    ]);
  });

  it('should exit with error in case if invalid path provided as args', async () => {
    const apisConfig = {
      apis: {},
    };
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    expect.assertions(3);

    try {
      await getFallbackApisOrExit(['someFile.yaml'], apisConfig);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should exit with error in case if invalid 2 path provided as args', async () => {
    const apisConfig = {
      apis: {},
    };
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    expect.assertions(3);
    try {
      await getFallbackApisOrExit(['someFile.yaml', 'someFile2.yaml'], apisConfig);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nsomeFile.yaml does not exist or is invalid.\n\n'
      );
      expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
      expect(e.message).toEqual('Please provide a valid path.');
    }
  });

  it('should exit with error if only one file exist ', async () => {
    const apisStub = {
      ...apis,
      notExist: {
        root: 'notExist.yaml',
        styleguide: {},
      },
    };
    const configStub = { apis: apisStub };

    const existSyncMock = (existsSync as jest.Mock<any, any>).mockImplementation((path) =>
      path.endsWith('someFile.yaml')
    );

    expect.assertions(4);

    try {
      await getFallbackApisOrExit(undefined, configStub);
    } catch (e) {
      expect(process.stderr.write).toHaveBeenCalledWith(
        '\nnotExist.yaml does not exist or is invalid.\n\n'
      );
      expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
      expect(process.stderr.write).toHaveBeenCalledTimes(2);
      expect(e.message).toEqual('Please provide a valid path.');
    }
    existSyncMock.mockClear();
  });

  it('should work ok if it is url passed', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => false);
    (isAbsoluteUrl as jest.Mock<any, any>).mockImplementation(() => true);
    const apisConfig = {
      apis: {
        main: {
          root: 'https://someLinkt/petstore.yaml?main',
          styleguide: {},
        },
      },
    };

    const result = await getFallbackApisOrExit(undefined, apisConfig);

    expect(process.stderr.write).toHaveBeenCalledTimes(0);
    expect(result).toStrictEqual([
      {
        alias: 'main',
        path: 'https://someLinkt/petstore.yaml?main',
        output: undefined,
      },
    ]);

    (isAbsoluteUrl as jest.Mock<any, any>).mockReset();
  });

  it('should find alias by filename', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => true);
    const entry = await getFallbackApisOrExit(['./test.yaml'], {
      apis: {
        main: {
          root: 'test.yaml',
          styleguide: {},
        },
      },
    });
    expect(entry).toEqual([{ path: './test.yaml', alias: 'main' }]);
  });

  it('should return apis from config with paths and outputs resolved relatively to the config location', async () => {
    (existsSync as jest.Mock<any, any>).mockImplementationOnce(() => true);
    const entry = await getFallbackApisOrExit(undefined, {
      apis: {
        main: {
          root: 'test.yaml',
          output: 'output/test.yaml',
          styleguide: {},
        },
      },
      configFile: 'project-folder/redocly.yaml',
    });
    expect(entry).toEqual([
      {
        path: expect.stringMatching(/project\-folder\/test\.yaml$/),
        output: expect.stringMatching(/project\-folder\/output\/test\.yaml$/),
        alias: 'main',
      },
    ]);
  });
});

describe('langToExt', () => {
  it.each([
    ['php', '.php'],
    ['c#', '.cs'],
    ['shell', '.sh'],
    ['curl', '.sh'],
    ['bash', '.sh'],
    ['javascript', '.js'],
    ['js', '.js'],
    ['python', '.py'],
    ['c', '.c'],
    ['c++', '.cpp'],
    ['coffeescript', '.litcoffee'],
    ['dart', '.dart'],
    ['elixir', '.ex'],
    ['go', '.go'],
    ['groovy', '.groovy'],
    ['java', '.java'],
    ['kotlin', '.kt'],
    ['objective-c', '.m'],
    ['perl', '.pl'],
    ['powershell', '.ps1'],
    ['ruby', '.rb'],
    ['rust', '.rs'],
    ['scala', '.sc'],
    ['swift', '.swift'],
    ['typescript', '.ts'],
    ['tsx', '.tsx'],
  ])('should infer file extension from lang - %s', (lang, expected) => {
    expect(langToExt(lang)).toBe(expected);
  });

  it('should ignore case when inferring file extension', () => {
    expect(langToExt('JavaScript')).toBe('.js');
  });
});

describe('sorTopLevelKeysForOas', () => {
  it('should sort oas3 top level keys', () => {
    const openApi = {
      openapi: '3.0.0',
      components: {},
      security: [],
      tags: [],
      servers: [],
      paths: {},
      info: {},
      externalDocs: {},
      webhooks: [],
      'x-webhooks': [],
      jsonSchemaDialect: '',
    } as any;
    const orderedKeys = [
      'openapi',
      'info',
      'jsonSchemaDialect',
      'servers',
      'security',
      'tags',
      'externalDocs',
      'paths',
      'webhooks',
      'x-webhooks',
      'components',
    ];
    const result = sortTopLevelKeysForOas(openApi);

    Object.keys(result).forEach((key, index) => {
      expect(key).toEqual(orderedKeys[index]);
    });
  });

  it('should sort oas2 top level keys', () => {
    const openApi = {
      swagger: '2.0.0',
      security: [],
      tags: [],
      paths: {},
      info: {},
      externalDocs: {},
      host: '',
      basePath: '',
      securityDefinitions: [],
      schemes: [],
      consumes: [],
      parameters: [],
      produces: [],
      definitions: [],
      responses: [],
    } as any;
    const orderedKeys = [
      'swagger',
      'info',
      'host',
      'basePath',
      'schemes',
      'consumes',
      'produces',
      'security',
      'tags',
      'externalDocs',
      'paths',
      'definitions',
      'parameters',
      'responses',
      'securityDefinitions',
    ];
    const result = sortTopLevelKeysForOas(openApi);

    Object.keys(result).forEach((key, index) => {
      expect(key).toEqual(orderedKeys[index]);
    });
  });
});

describe('handleErrors', () => {
  const ref = 'openapi/test.yaml';

  const redColoretteMocks = red as jest.Mock<any, any>;
  const blueColoretteMocks = blue as jest.Mock<any, any>;

  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    jest.spyOn(process, 'exit').mockImplementation((code) => code as never);
    redColoretteMocks.mockImplementation((text) => text);
    blueColoretteMocks.mockImplementation((text) => text);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle ResolveError', () => {
    const resolveError = new ResolveError(new Error('File not found.'));
    expect(() => handleError(resolveError, ref)).toThrowError(HandledError);
    expect(redColoretteMocks).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      `Failed to resolve API description at openapi/test.yaml:\n\n  - File not found.\n\n`
    );
  });

  it('should handle YamlParseError', () => {
    const yamlParseError = new YamlParseError(new Error('Invalid yaml.'), {} as any);
    expect(() => handleError(yamlParseError, ref)).toThrowError(HandledError);
    expect(redColoretteMocks).toHaveBeenCalledTimes(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      `Failed to parse API description at openapi/test.yaml:\n\n  - Invalid yaml.\n\n`
    );
  });

  it('should handle CircularJSONNotSupportedError', () => {
    const circularError = new CircularJSONNotSupportedError(new Error('Circular json'));
    expect(() => handleError(circularError, ref)).toThrowError(HandledError);
    expect(process.stderr.write).toHaveBeenCalledWith(
      `Detected circular reference which can't be converted to JSON.\n` +
        `Try to use ${blue('yaml')} output or remove ${blue('--dereferenced')}.\n\n`
    );
  });

  it('should handle SyntaxError', () => {
    const testError = new SyntaxError('Unexpected identifier');
    testError.stack = 'test stack';
    expect(() => handleError(testError, ref)).toThrowError(HandledError);
    expect(process.stderr.write).toHaveBeenCalledWith(
      'Syntax error: Unexpected identifier test stack\n\n'
    );
  });

  it('should throw unknown error', () => {
    const testError = new Error('Test error.');
    expect(() => handleError(testError, ref)).toThrowError(HandledError);
    expect(process.stderr.write).toHaveBeenCalledWith(
      `Something went wrong when processing openapi/test.yaml:\n\n  - Test error.\n\n`
    );
  });
});

describe('checkIfRulesetExist', () => {
  beforeEach(() => {
    jest.spyOn(process, 'exit').mockImplementation((code?: number) => code as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error if rules are not provided', () => {
    const rules = {
      oas2: {},
      oas3_0: {},
      oas3_1: {},
      async2: {},
      async3: {},
      arazzo1: {},
    };
    expect(() => checkIfRulesetExist(rules)).toThrowError(
      '⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/'
    );
  });

  it('should not throw an error if rules are provided', () => {
    const rules = {
      oas2: { 'operation-4xx-response': 'error' },
      oas3_0: {},
      oas3_1: {},
    } as any;
    checkIfRulesetExist(rules);
  });
});

describe('cleanColors', () => {
  it('should remove colors from string', () => {
    const stringWithColors = `String for ${red('test')}`;
    const result = cleanColors(stringWithColors);

    expect(result).not.toMatch(/\x1b\[\d+m/g);
  });
});

describe('cleanArgs', () => {
  beforeEach(() => {
    // @ts-ignore
    isAbsoluteUrl = jest.requireActual('@redocly/openapi-core').isAbsoluteUrl;
    // @ts-ignore
    existsSync = (value) => jest.requireActual('fs').existsSync(path.resolve(__dirname, value));
    // @ts-ignore
    statSync = (value) => jest.requireActual('fs').statSync(path.resolve(__dirname, value));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should remove potentially sensitive data from args', () => {
    const testArgs = {
      config: './fixtures/redocly.yaml',
      apis: ['main@v1', 'fixtures/openapi.yaml', 'http://some.url/openapi.yaml'],
      format: 'codeframe',
    };
    expect(cleanArgs(testArgs)).toEqual({
      config: 'file-yaml',
      apis: ['api-name@api-version', 'file-yaml', 'http://url'],
      format: 'codeframe',
    });
  });
  it('should remove potentially sensitive data from a push destination', () => {
    const testArgs = {
      destination: '@org/name@version',
    };
    expect(cleanArgs(testArgs)).toEqual({
      destination: '@organization/api-name@api-version',
    });
  });
});

describe('cleanRawInput', () => {
  beforeEach(() => {
    // @ts-ignore
    isAbsoluteUrl = jest.requireActual('@redocly/openapi-core').isAbsoluteUrl;
    // @ts-ignore
    existsSync = (value) => jest.requireActual('fs').existsSync(path.resolve(__dirname, value));
    // @ts-ignore
    statSync = (value) => jest.requireActual('fs').statSync(path.resolve(__dirname, value));
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should remove  potentially sensitive data from raw CLI input', () => {
    const rawInput = [
      'redocly',
      'bundle',
      'api-name@api-version',
      './fixtures/openapi.yaml',
      'http://some.url/openapi.yaml',
      '--config=fixtures/redocly.yaml',
      '--output',
      'fixtures',
    ];
    expect(cleanRawInput(rawInput)).toEqual(
      'redocly bundle api-name@api-version file-yaml http://url --config=file-yaml --output folder'
    );
  });
  it('should preserve safe data from raw CLI input', () => {
    const rawInput = [
      'redocly',
      'lint',
      './fixtures/openapi.json',
      '--format',
      'stylish',
      '--extends=minimal',
      '--skip-rule',
      'operation-4xx-response',
    ];
    expect(cleanRawInput(rawInput)).toEqual(
      'redocly lint file-json --format stylish --extends=minimal --skip-rule operation-4xx-response'
    );
  });

  describe('validateFileExtension', () => {
    it('should return current file extension', () => {
      expect(getAndValidateFileExtension('test.json')).toEqual('json');
    });

    it('should return yaml and print warning if file extension does not supported', () => {
      const stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      (yellow as jest.Mock<any, any>).mockImplementation((text: string) => text);

      expect(getAndValidateFileExtension('test.xml')).toEqual('yaml');
      expect(stderrMock).toHaveBeenCalledWith(`Unsupported file extension: xml. Using yaml.\n`);
    });
  });
});

describe('writeToFileByExtension', () => {
  beforeEach(() => {
    jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
    (yellow as jest.Mock<any, any>).mockImplementation((text: string) => text);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call stringifyYaml function', () => {
    writeToFileByExtension('test data', 'test.yaml');
    expect(stringifyYaml).toHaveBeenCalledWith('test data', { noRefs: false });
    expect(process.stderr.write).toHaveBeenCalledWith(`test data`);
  });

  it('should call JSON.stringify function', () => {
    const stringifySpy = jest.spyOn(JSON, 'stringify').mockImplementation((data) => data);
    writeToFileByExtension('test data', 'test.json');
    expect(stringifySpy).toHaveBeenCalledWith('test data', null, 2);
    expect(process.stderr.write).toHaveBeenCalledWith(`test data`);
  });
});

describe('runtime platform', () => {
  describe('sanitizePath', () => {
    test.each([
      ['C:\\Program Files\\App', 'C:\\Program Files\\App'],
      ['/usr/local/bin/app', '/usr/local/bin/app'],
      ['invalid|path?name*', 'invalidpathname'],
      ['', ''],
      ['<>:"|?*', ':'],
      ['C:/Program Files\\App', 'C:/Program Files\\App'],
      ['path\nname\r', 'pathname'],
      ['/usr/local; rm -rf /', '/usr/local rm -rf /'],
      ['C:\\data&& dir', 'C:\\data dir'],
    ])('should sanitize path %s to %s', (input, expected) => {
      expect(sanitizePath(input)).toBe(expected);
    });
  });

  describe('sanitizeLocale', () => {
    test.each([
      ['en-US', 'en-US'],
      ['fr_FR', 'fr_FR'],
      ['en<>US', 'enUS'],
      ['fr@FR', 'fr@FR'],
      ['en_US@#$%', 'en_US@'],
      [' en-US ', 'en-US'],
      ['', ''],
    ])('should sanitize locale %s to %s', (input, expected) => {
      expect(sanitizeLocale(input)).toBe(expected);
    });
  });

  describe('getPlatformSpawnArgs', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      });
    });

    it('should return args for Windows platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      });

      const result = getPlatformSpawnArgs();

      expect(result).toEqual({
        npxExecutableName: 'npx.cmd',
        sanitize: expect.any(Function),
        shell: true,
      });
    });

    it('should return args for non-Windows platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
      });

      const result = getPlatformSpawnArgs();

      expect(result).toEqual({
        npxExecutableName: 'npx',
        sanitize: expect.any(Function),
        shell: false,
      });
    });
  });
});

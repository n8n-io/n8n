"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const miscellaneous_1 = require("../utils/miscellaneous");
const platform_1 = require("../utils/platform");
const openapi_core_1 = require("@redocly/openapi-core");
const colorette_1 = require("colorette");
const fs_1 = require("fs");
const path = require("path");
const process = require("process");
jest.mock('os');
jest.mock('colorette');
jest.mock('fs');
describe('isSubdir', () => {
    it('can correctly determine if subdir', () => {
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
        ].forEach(([parent, child, expectRes]) => {
            expect((0, miscellaneous_1.isSubdir)(parent, child)).toBe(expectRes);
        });
    });
    it('can correctly determine if subdir for windows-based paths', () => {
        const os = require('os');
        os.platform.mockImplementation(() => 'win32');
        [
            ['C:/Foo', 'C:/Foo/Bar', true],
            ['C:\\Foo', 'C:\\Bar', false],
            ['C:\\Foo', 'D:\\Foo\\Bar', false],
        ].forEach(([parent, child, expectRes]) => {
            expect((0, miscellaneous_1.isSubdir)(parent, child)).toBe(expectRes);
        });
    });
    afterEach(() => {
        jest.resetModules();
    });
});
describe('pathToFilename', () => {
    it('should use correct path separator', () => {
        const processedPath = (0, miscellaneous_1.pathToFilename)('/user/createWithList', '_');
        expect(processedPath).toEqual('user_createWithList');
    });
});
describe('printConfigLintTotals', () => {
    const totalProblemsMock = {
        errors: 1,
        warnings: 0,
        ignored: 0,
    };
    const redColoretteMocks = colorette_1.red;
    const yellowColoretteMocks = colorette_1.yellow;
    beforeEach(() => {
        yellowColoretteMocks.mockImplementation((text) => text);
        redColoretteMocks.mockImplementation((text) => text);
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    });
    it('should print errors if such exist', () => {
        (0, miscellaneous_1.printConfigLintTotals)(totalProblemsMock);
        expect(process.stderr.write).toHaveBeenCalledWith('❌ Your config has 1 error.');
        expect(redColoretteMocks).toHaveBeenCalledWith('❌ Your config has 1 error.');
    });
    it('should print warnign if no error', () => {
        (0, miscellaneous_1.printConfigLintTotals)({ ...totalProblemsMock, errors: 0, warnings: 2 });
        expect(process.stderr.write).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
        expect(yellowColoretteMocks).toHaveBeenCalledWith('⚠️ Your config has 2 warnings.\n');
    });
    it('should print nothing if no error and no warnings', () => {
        const result = (0, miscellaneous_1.printConfigLintTotals)({ ...totalProblemsMock, errors: 0 });
        expect(result).toBeUndefined();
        expect(process.stderr.write).toHaveBeenCalledTimes(0);
        expect(yellowColoretteMocks).toHaveBeenCalledTimes(0);
        expect(redColoretteMocks).toHaveBeenCalledTimes(0);
    });
});
describe('getFallbackApisOrExit', () => {
    const redColoretteMocks = colorette_1.red;
    const yellowColoretteMocks = colorette_1.yellow;
    const apis = {
        main: {
            root: 'someFile.yaml',
            styleguide: {},
        },
    };
    const config = { apis };
    beforeEach(() => {
        yellowColoretteMocks.mockImplementation((text) => text);
        redColoretteMocks.mockImplementation((text) => text);
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
            await (0, miscellaneous_1.getFallbackApisOrExit)([''], apisConfig);
        }
        catch (e) {
            expect(e.message).toEqual('Path cannot be empty.');
        }
    });
    it('should error if file from config do not exist', async () => {
        fs_1.existsSync.mockImplementationOnce(() => false);
        expect.assertions(3);
        try {
            await (0, miscellaneous_1.getFallbackApisOrExit)(undefined, config);
        }
        catch (e) {
            expect(process.stderr.write).toHaveBeenCalledWith('\nsomeFile.yaml does not exist or is invalid.\n\n');
            expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
            expect(e.message).toEqual('Please provide a valid path.');
        }
    });
    it('should return valid array with results if such file exist', async () => {
        fs_1.existsSync.mockImplementationOnce(() => true);
        jest.spyOn(path, 'resolve').mockImplementationOnce((_, path) => path);
        const result = await (0, miscellaneous_1.getFallbackApisOrExit)(undefined, config);
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
        fs_1.existsSync.mockImplementationOnce(() => false);
        expect.assertions(3);
        try {
            await (0, miscellaneous_1.getFallbackApisOrExit)(['someFile.yaml'], apisConfig);
        }
        catch (e) {
            expect(process.stderr.write).toHaveBeenCalledWith('\nsomeFile.yaml does not exist or is invalid.\n\n');
            expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
            expect(e.message).toEqual('Please provide a valid path.');
        }
    });
    it('should exit with error in case if invalid 2 path provided as args', async () => {
        const apisConfig = {
            apis: {},
        };
        fs_1.existsSync.mockImplementationOnce(() => false);
        expect.assertions(3);
        try {
            await (0, miscellaneous_1.getFallbackApisOrExit)(['someFile.yaml', 'someFile2.yaml'], apisConfig);
        }
        catch (e) {
            expect(process.stderr.write).toHaveBeenCalledWith('\nsomeFile.yaml does not exist or is invalid.\n\n');
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
        const existSyncMock = fs_1.existsSync.mockImplementation((path) => path.endsWith('someFile.yaml'));
        expect.assertions(4);
        try {
            await (0, miscellaneous_1.getFallbackApisOrExit)(undefined, configStub);
        }
        catch (e) {
            expect(process.stderr.write).toHaveBeenCalledWith('\nnotExist.yaml does not exist or is invalid.\n\n');
            expect(process.stderr.write).toHaveBeenCalledWith('Please provide a valid path.\n\n');
            expect(process.stderr.write).toHaveBeenCalledTimes(2);
            expect(e.message).toEqual('Please provide a valid path.');
        }
        existSyncMock.mockClear();
    });
    it('should work ok if it is url passed', async () => {
        fs_1.existsSync.mockImplementationOnce(() => false);
        openapi_core_1.isAbsoluteUrl.mockImplementation(() => true);
        const apisConfig = {
            apis: {
                main: {
                    root: 'https://someLinkt/petstore.yaml?main',
                    styleguide: {},
                },
            },
        };
        const result = await (0, miscellaneous_1.getFallbackApisOrExit)(undefined, apisConfig);
        expect(process.stderr.write).toHaveBeenCalledTimes(0);
        expect(result).toStrictEqual([
            {
                alias: 'main',
                path: 'https://someLinkt/petstore.yaml?main',
                output: undefined,
            },
        ]);
        openapi_core_1.isAbsoluteUrl.mockReset();
    });
    it('should find alias by filename', async () => {
        fs_1.existsSync.mockImplementationOnce(() => true);
        const entry = await (0, miscellaneous_1.getFallbackApisOrExit)(['./test.yaml'], {
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
        fs_1.existsSync.mockImplementationOnce(() => true);
        const entry = await (0, miscellaneous_1.getFallbackApisOrExit)(undefined, {
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
        expect((0, miscellaneous_1.langToExt)(lang)).toBe(expected);
    });
    it('should ignore case when inferring file extension', () => {
        expect((0, miscellaneous_1.langToExt)('JavaScript')).toBe('.js');
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
        };
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
        const result = (0, miscellaneous_1.sortTopLevelKeysForOas)(openApi);
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
        };
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
        const result = (0, miscellaneous_1.sortTopLevelKeysForOas)(openApi);
        Object.keys(result).forEach((key, index) => {
            expect(key).toEqual(orderedKeys[index]);
        });
    });
});
describe('handleErrors', () => {
    const ref = 'openapi/test.yaml';
    const redColoretteMocks = colorette_1.red;
    const blueColoretteMocks = colorette_1.blue;
    beforeEach(() => {
        jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
        jest.spyOn(process, 'exit').mockImplementation((code) => code);
        redColoretteMocks.mockImplementation((text) => text);
        blueColoretteMocks.mockImplementation((text) => text);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should handle ResolveError', () => {
        const resolveError = new openapi_core_1.ResolveError(new Error('File not found.'));
        expect(() => (0, miscellaneous_1.handleError)(resolveError, ref)).toThrowError(miscellaneous_1.HandledError);
        expect(redColoretteMocks).toHaveBeenCalledTimes(1);
        expect(process.stderr.write).toHaveBeenCalledWith(`Failed to resolve API description at openapi/test.yaml:\n\n  - File not found.\n\n`);
    });
    it('should handle YamlParseError', () => {
        const yamlParseError = new openapi_core_1.YamlParseError(new Error('Invalid yaml.'), {});
        expect(() => (0, miscellaneous_1.handleError)(yamlParseError, ref)).toThrowError(miscellaneous_1.HandledError);
        expect(redColoretteMocks).toHaveBeenCalledTimes(1);
        expect(process.stderr.write).toHaveBeenCalledWith(`Failed to parse API description at openapi/test.yaml:\n\n  - Invalid yaml.\n\n`);
    });
    it('should handle CircularJSONNotSupportedError', () => {
        const circularError = new miscellaneous_1.CircularJSONNotSupportedError(new Error('Circular json'));
        expect(() => (0, miscellaneous_1.handleError)(circularError, ref)).toThrowError(miscellaneous_1.HandledError);
        expect(process.stderr.write).toHaveBeenCalledWith(`Detected circular reference which can't be converted to JSON.\n` +
            `Try to use ${(0, colorette_1.blue)('yaml')} output or remove ${(0, colorette_1.blue)('--dereferenced')}.\n\n`);
    });
    it('should handle SyntaxError', () => {
        const testError = new SyntaxError('Unexpected identifier');
        testError.stack = 'test stack';
        expect(() => (0, miscellaneous_1.handleError)(testError, ref)).toThrowError(miscellaneous_1.HandledError);
        expect(process.stderr.write).toHaveBeenCalledWith('Syntax error: Unexpected identifier test stack\n\n');
    });
    it('should throw unknown error', () => {
        const testError = new Error('Test error.');
        expect(() => (0, miscellaneous_1.handleError)(testError, ref)).toThrowError(miscellaneous_1.HandledError);
        expect(process.stderr.write).toHaveBeenCalledWith(`Something went wrong when processing openapi/test.yaml:\n\n  - Test error.\n\n`);
    });
});
describe('checkIfRulesetExist', () => {
    beforeEach(() => {
        jest.spyOn(process, 'exit').mockImplementation((code) => code);
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
        expect(() => (0, miscellaneous_1.checkIfRulesetExist)(rules)).toThrowError('⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/');
    });
    it('should not throw an error if rules are provided', () => {
        const rules = {
            oas2: { 'operation-4xx-response': 'error' },
            oas3_0: {},
            oas3_1: {},
        };
        (0, miscellaneous_1.checkIfRulesetExist)(rules);
    });
});
describe('cleanColors', () => {
    it('should remove colors from string', () => {
        const stringWithColors = `String for ${(0, colorette_1.red)('test')}`;
        const result = (0, miscellaneous_1.cleanColors)(stringWithColors);
        expect(result).not.toMatch(/\x1b\[\d+m/g);
    });
});
describe('cleanArgs', () => {
    beforeEach(() => {
        // @ts-ignore
        openapi_core_1.isAbsoluteUrl = jest.requireActual('@redocly/openapi-core').isAbsoluteUrl;
        // @ts-ignore
        fs_1.existsSync = (value) => jest.requireActual('fs').existsSync(path.resolve(__dirname, value));
        // @ts-ignore
        fs_1.statSync = (value) => jest.requireActual('fs').statSync(path.resolve(__dirname, value));
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
        expect((0, miscellaneous_1.cleanArgs)(testArgs)).toEqual({
            config: 'file-yaml',
            apis: ['api-name@api-version', 'file-yaml', 'http://url'],
            format: 'codeframe',
        });
    });
    it('should remove potentially sensitive data from a push destination', () => {
        const testArgs = {
            destination: '@org/name@version',
        };
        expect((0, miscellaneous_1.cleanArgs)(testArgs)).toEqual({
            destination: '@organization/api-name@api-version',
        });
    });
});
describe('cleanRawInput', () => {
    beforeEach(() => {
        // @ts-ignore
        openapi_core_1.isAbsoluteUrl = jest.requireActual('@redocly/openapi-core').isAbsoluteUrl;
        // @ts-ignore
        fs_1.existsSync = (value) => jest.requireActual('fs').existsSync(path.resolve(__dirname, value));
        // @ts-ignore
        fs_1.statSync = (value) => jest.requireActual('fs').statSync(path.resolve(__dirname, value));
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
        expect((0, miscellaneous_1.cleanRawInput)(rawInput)).toEqual('redocly bundle api-name@api-version file-yaml http://url --config=file-yaml --output folder');
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
        expect((0, miscellaneous_1.cleanRawInput)(rawInput)).toEqual('redocly lint file-json --format stylish --extends=minimal --skip-rule operation-4xx-response');
    });
    describe('validateFileExtension', () => {
        it('should return current file extension', () => {
            expect((0, miscellaneous_1.getAndValidateFileExtension)('test.json')).toEqual('json');
        });
        it('should return yaml and print warning if file extension does not supported', () => {
            const stderrMock = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
            colorette_1.yellow.mockImplementation((text) => text);
            expect((0, miscellaneous_1.getAndValidateFileExtension)('test.xml')).toEqual('yaml');
            expect(stderrMock).toHaveBeenCalledWith(`Unsupported file extension: xml. Using yaml.\n`);
        });
    });
});
describe('writeToFileByExtension', () => {
    beforeEach(() => {
        jest.spyOn(process.stderr, 'write').mockImplementation(jest.fn());
        colorette_1.yellow.mockImplementation((text) => text);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('should call stringifyYaml function', () => {
        (0, miscellaneous_1.writeToFileByExtension)('test data', 'test.yaml');
        expect(openapi_core_1.stringifyYaml).toHaveBeenCalledWith('test data', { noRefs: false });
        expect(process.stderr.write).toHaveBeenCalledWith(`test data`);
    });
    it('should call JSON.stringify function', () => {
        const stringifySpy = jest.spyOn(JSON, 'stringify').mockImplementation((data) => data);
        (0, miscellaneous_1.writeToFileByExtension)('test data', 'test.json');
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
            expect((0, platform_1.sanitizePath)(input)).toBe(expected);
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
            expect((0, platform_1.sanitizeLocale)(input)).toBe(expected);
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
            const result = (0, platform_1.getPlatformSpawnArgs)();
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
            const result = (0, platform_1.getPlatformSpawnArgs)();
            expect(result).toEqual({
                npxExecutableName: 'npx',
                sanitize: expect.any(Function),
                shell: false,
            });
        });
    });
});

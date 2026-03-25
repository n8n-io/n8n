"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colorette_1 = require("colorette");
const openapi_core_1 = require("@redocly/openapi-core");
const join_1 = require("../../commands/join");
const miscellaneous_1 = require("../../utils/miscellaneous");
const openapi_core_2 = require("../../__mocks__/@redocly/openapi-core");
const config_1 = require("../fixtures/config");
jest.mock('../../utils/miscellaneous');
jest.mock('colorette');
describe('handleJoin', () => {
    const colloreteYellowMock = colorette_1.yellow;
    colloreteYellowMock.mockImplementation((string) => string);
    it('should call exitWithError because only one entrypoint', async () => {
        await (0, join_1.handleJoin)({ argv: { apis: ['first.yaml'] }, config: {}, version: 'cli-version' });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
    });
    it('should call exitWithError if glob expands to less than 2 APIs', async () => {
        miscellaneous_1.getFallbackApisOrExit.mockResolvedValueOnce([{ path: 'first.yaml' }]);
        await (0, join_1.handleJoin)({
            argv: { apis: ['*.yaml'] },
            config: {},
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
    });
    it('should proceed if glob expands to 2 or more APIs', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_1');
        miscellaneous_1.getFallbackApisOrExit.mockResolvedValueOnce([
            { path: 'first.yaml' },
            { path: 'second.yaml' },
        ]);
        await (0, join_1.handleJoin)({
            argv: { apis: ['*.yaml'] },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).not.toHaveBeenCalled();
    });
    it('should call exitWithError because passed all 3 options for tags', async () => {
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
                'prefix-tags-with-info-prop': 'something',
                'without-x-tag-groups': true,
                'prefix-tags-with-filename': true,
            },
            config: {},
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith(`You use prefix-tags-with-filename, prefix-tags-with-info-prop, without-x-tag-groups together.\nPlease choose only one!`);
    });
    it('should call exitWithError because passed all 2 options for tags', async () => {
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
                'without-x-tag-groups': true,
                'prefix-tags-with-filename': true,
            },
            config: {},
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith(`You use prefix-tags-with-filename, without-x-tag-groups together.\nPlease choose only one!`);
    });
    it('should call exitWithError because Only OpenAPI 3.0 and OpenAPI 3.1 are supported', async () => {
        openapi_core_1.detectSpec.mockReturnValueOnce('oas2_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith('Only OpenAPI 3.0 and OpenAPI 3.1 are supported: undefined.');
    });
    it('should call exitWithError if mixing OpenAPI 3.0 and 3.1', async () => {
        openapi_core_1.detectSpec
            .mockImplementationOnce(() => 'oas3_0')
            .mockImplementationOnce(() => 'oas3_1');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.exitWithError).toHaveBeenCalledWith('All APIs must use the same OpenAPI version: undefined.');
    });
    it('should call writeToFileByExtension function', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.writeToFileByExtension).toHaveBeenCalledWith(expect.any(Object), 'openapi.yaml', expect.any(Boolean));
    });
    it('should call writeToFileByExtension function for OpenAPI 3.1', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_1');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.writeToFileByExtension).toHaveBeenCalledWith(expect.any(Object), 'openapi.yaml', expect.any(Boolean));
    });
    it('should call writeToFileByExtension function with custom output file', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
                output: 'output.yml',
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.writeToFileByExtension).toHaveBeenCalledWith(expect.any(Object), 'output.yml', expect.any(Boolean));
    });
    it('should call writeToFileByExtension function with json file extension', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.json', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.writeToFileByExtension).toHaveBeenCalledWith(expect.any(Object), 'openapi.json', expect.any(Boolean));
    });
    it('should call skipDecorators and skipPreprocessors', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml'],
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        const config = (0, openapi_core_2.loadConfig)();
        expect(config.styleguide.skipDecorators).toHaveBeenCalled();
        expect(config.styleguide.skipPreprocessors).toHaveBeenCalled();
    });
    it('should handle join with prefix-components-with-info-prop and null values', async () => {
        openapi_core_1.detectSpec.mockReturnValue('oas3_0');
        await (0, join_1.handleJoin)({
            argv: {
                apis: ['first.yaml', 'second.yaml', 'third.yaml'],
                'prefix-components-with-info-prop': 'title',
                output: 'join-result.yaml',
            },
            config: config_1.ConfigFixture,
            version: 'cli-version',
        });
        expect(miscellaneous_1.writeToFileByExtension).toHaveBeenCalledWith({
            openapi: '3.0.0',
            info: {
                description: 'example test',
                version: '1.0.0',
                title: 'First API',
                termsOfService: 'http://swagger.io/terms/',
                license: {
                    name: 'Apache 2.0',
                    url: 'http://www.apache.org/licenses/LICENSE-2.0.html',
                },
            },
            servers: [
                {
                    url: 'http://localhost:8080',
                },
                {
                    url: 'https://api.server.test/v1',
                },
            ],
            tags: [
                {
                    name: 'pet',
                    'x-displayName': 'pet',
                },
            ],
            paths: {
                '/GETUser/{userId}': {
                    summary: 'get user by id',
                    description: 'user info',
                    servers: [
                        {
                            url: '/user',
                        },
                        {
                            url: '/pet',
                            description: 'pet server',
                        },
                    ],
                    get: {
                        tags: ['pet'],
                        summary: 'Find pet by ID',
                        description: 'Returns a single pet',
                        operationId: 'getPetById',
                        servers: [
                            {
                                url: '/pet',
                            },
                        ],
                    },
                    parameters: [
                        {
                            name: 'param1',
                            in: 'header',
                            schema: {
                                description: 'string',
                            },
                        },
                    ],
                },
            },
            components: {
                schemas: {
                    Third_API_SchemaWithNull: {
                        type: 'string',
                        default: null,
                        nullable: true,
                    },
                    Third_API_SchemaWithRef: {
                        type: 'object',
                        properties: {
                            schemaType: {
                                type: 'string',
                                enum: ['foo'],
                            },
                            foo: {
                                $ref: '#/components/schemas/Third_API_SchemaWithNull',
                            },
                        },
                    },
                    Third_API_SchemaWithDiscriminator: {
                        discriminator: {
                            propertyName: 'schemaType',
                            mapping: {
                                foo: '#/components/schemas/Third_API_SchemaWithRef',
                                bar: '#/components/schemas/Third_API_SchemaWithNull',
                            },
                        },
                        oneOf: [
                            {
                                $ref: '#/components/schemas/Third_API_SchemaWithRef',
                            },
                            {
                                type: 'object',
                                properties: {
                                    schemaType: {
                                        type: 'string',
                                        enum: ['bar'],
                                    },
                                    bar: {
                                        type: 'string',
                                    },
                                },
                            },
                        ],
                    },
                },
            },
            'x-tagGroups': [
                {
                    name: 'First API',
                    tags: ['pet'],
                },
            ],
        }, 'join-result.yaml', true);
    });
});

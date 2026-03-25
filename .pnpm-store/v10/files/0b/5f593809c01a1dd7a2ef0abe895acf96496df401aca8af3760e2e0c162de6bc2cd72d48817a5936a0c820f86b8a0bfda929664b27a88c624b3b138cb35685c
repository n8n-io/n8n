import { yellow } from 'colorette';
import { detectSpec } from '@redocly/openapi-core';
import { handleJoin } from '../../commands/join';
import {
  exitWithError,
  getFallbackApisOrExit,
  writeToFileByExtension,
} from '../../utils/miscellaneous';
import { loadConfig } from '../../__mocks__/@redocly/openapi-core';
import { ConfigFixture } from '../fixtures/config';

jest.mock('../../utils/miscellaneous');

jest.mock('colorette');

describe('handleJoin', () => {
  const colloreteYellowMock = yellow as jest.Mock<any, any>;
  colloreteYellowMock.mockImplementation((string: string) => string);

  it('should call exitWithError because only one entrypoint', async () => {
    await handleJoin({ argv: { apis: ['first.yaml'] }, config: {} as any, version: 'cli-version' });
    expect(exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
  });

  it('should call exitWithError if glob expands to less than 2 APIs', async () => {
    (getFallbackApisOrExit as jest.Mock).mockResolvedValueOnce([{ path: 'first.yaml' }]);

    await handleJoin({
      argv: { apis: ['*.yaml'] },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(`At least 2 APIs should be provided.`);
  });

  it('should proceed if glob expands to 2 or more APIs', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_1');
    (getFallbackApisOrExit as jest.Mock).mockResolvedValueOnce([
      { path: 'first.yaml' },
      { path: 'second.yaml' },
    ]);

    await handleJoin({
      argv: { apis: ['*.yaml'] },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(exitWithError).not.toHaveBeenCalled();
  });

  it('should call exitWithError because passed all 3 options for tags', async () => {
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        'prefix-tags-with-info-prop': 'something',
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, prefix-tags-with-info-prop, without-x-tag-groups together.\nPlease choose only one!`
    );
  });

  it('should call exitWithError because passed all 2 options for tags', async () => {
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        'without-x-tag-groups': true,
        'prefix-tags-with-filename': true,
      },
      config: {} as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      `You use prefix-tags-with-filename, without-x-tag-groups together.\nPlease choose only one!`
    );
  });

  it('should call exitWithError because Only OpenAPI 3.0 and OpenAPI 3.1 are supported', async () => {
    (detectSpec as jest.Mock).mockReturnValueOnce('oas2_0');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });
    expect(exitWithError).toHaveBeenCalledWith(
      'Only OpenAPI 3.0 and OpenAPI 3.1 are supported: undefined.'
    );
  });

  it('should call exitWithError if mixing OpenAPI 3.0 and 3.1', async () => {
    (detectSpec as jest.Mock)
      .mockImplementationOnce(() => 'oas3_0')
      .mockImplementationOnce(() => 'oas3_1');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(exitWithError).toHaveBeenCalledWith(
      'All APIs must use the same OpenAPI version: undefined.'
    );
  });

  it('should call writeToFileByExtension function', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.yaml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function for OpenAPI 3.1', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_1');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.yaml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function with custom output file', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
        output: 'output.yml',
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'output.yml',
      expect.any(Boolean)
    );
  });

  it('should call writeToFileByExtension function with json file extension', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin({
      argv: {
        apis: ['first.json', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      expect.any(Object),
      'openapi.json',
      expect.any(Boolean)
    );
  });

  it('should call skipDecorators and skipPreprocessors', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_0');
    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml'],
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    const config = loadConfig();
    expect(config.styleguide.skipDecorators).toHaveBeenCalled();
    expect(config.styleguide.skipPreprocessors).toHaveBeenCalled();
  });

  it('should handle join with prefix-components-with-info-prop and null values', async () => {
    (detectSpec as jest.Mock).mockReturnValue('oas3_0');

    await handleJoin({
      argv: {
        apis: ['first.yaml', 'second.yaml', 'third.yaml'],
        'prefix-components-with-info-prop': 'title',
        output: 'join-result.yaml',
      },
      config: ConfigFixture as any,
      version: 'cli-version',
    });

    expect(writeToFileByExtension).toHaveBeenCalledWith(
      {
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
      },
      'join-result.yaml',
      true
    );
  });
});

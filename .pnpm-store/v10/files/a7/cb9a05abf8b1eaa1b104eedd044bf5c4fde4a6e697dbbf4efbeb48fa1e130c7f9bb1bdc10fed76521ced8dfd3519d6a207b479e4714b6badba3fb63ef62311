import { outdent } from 'outdent';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { bundleDocument } from '../../../bundle';
import { BaseResolver } from '../../../resolve';

describe('oas2 remove-unused-components', () => {
  it('should remove unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        paths:
          /pets:
            get:
              produces:
                - application/json
              parameters: []
              responses:
                '200':
                  schema:
                    $ref: '#/definitions/Used'
              operationId: listPets
              summary: List all pets
        definitions:
          Unused:
            enum:
              - 1
              - 2
            type: integer
          Used:
            properties:
              link:
                type: string
            type: object
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: {} }),
      removeUnusedComponents: true,
    });

    expect(results.bundle.parsed).toEqual({
      swagger: '2.0',
      definitions: {
        Used: {
          properties: {
            link: { type: 'string' },
          },
          type: 'object',
        },
      },
      paths: {
        '/pets': {
          get: {
            produces: ['application/json'],
            parameters: [],
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                schema: {
                  $ref: '#/definitions/Used',
                },
              },
            },
          },
        },
      },
    });
  });

  it('should not remove components used child reference', async () => {
    const document = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        paths:
          /pets:
            get:
              produces:
                - application/json
              parameters: []
              responses:
                '200':
                  schema:
                    $ref: '#/definitions/Used'
              operationId: listPets
              summary: List all pets
        definitions:
          InnerUsed:
            properties:
              link:
                type: string
            type: object
          Unused:
            enum:
              - 1
              - 2
            type: integer
          Used:
            properties:
              link:
                $ref: '#/definitions/InnerUsed/properties/link'
            type: object
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: {} }),
      removeUnusedComponents: true,
    });

    expect(results.bundle.parsed).toEqual({
      swagger: '2.0',
      definitions: {
        InnerUsed: {
          properties: {
            link: {
              type: 'string',
            },
          },
          type: 'object',
        },
        Used: {
          properties: {
            link: { $ref: '#/definitions/InnerUsed/properties/link' },
          },
          type: 'object',
        },
      },
      paths: {
        '/pets': {
          get: {
            produces: ['application/json'],
            parameters: [],
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                schema: {
                  $ref: '#/definitions/Used',
                },
              },
            },
          },
        },
      },
    });
  });

  it('should remove transitively unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        paths:
          /pets:
            get:
              produces:
                - application/json
              parameters: []
              responses:
                '200':
                  schema:
                    $ref: '#/definitions/Used'
              operationId: listPets
              summary: List all pets
        definitions:
          Unused:
            enum:
              - 1
              - 2
            type: integer
          UnusedTransitive:
            type: object
            properties:
              link:
                $ref: '#/definitions/Unused'
          Used:
            properties:
              link:
                type: string
            type: object
        `,
      'foobar.yaml'
    );

    const results = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: {} }),
      removeUnusedComponents: true,
    });

    expect(results.bundle.parsed).toEqual({
      swagger: '2.0',
      definitions: {
        Used: {
          properties: {
            link: { type: 'string' },
          },
          type: 'object',
        },
      },
      paths: {
        '/pets': {
          get: {
            produces: ['application/json'],
            parameters: [],
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                schema: {
                  $ref: '#/definitions/Used',
                },
              },
            },
          },
        },
      },
    });
  });
});

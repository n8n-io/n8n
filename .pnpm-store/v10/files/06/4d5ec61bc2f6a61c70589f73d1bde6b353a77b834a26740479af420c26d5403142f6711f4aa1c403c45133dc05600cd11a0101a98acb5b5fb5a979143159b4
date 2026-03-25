import { outdent } from 'outdent';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { bundleDocument } from '../../../bundle';
import { BaseResolver } from '../../../resolve';

describe('oas3 remove-unused-components', () => {
  it('should remove unused components', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              parameters:
                - $ref: '#/components/parameters/used'
        components:
          parameters:
            used:
              name: used
            unused:
              name: unused
          responses:
            unused: {}
          examples:
            unused: {}
          requestBodies:
            unused: {}
          headers:
            unused: {}
          schemas:
            Unused:
              type: integer
              enum:
                - 1
                - 2
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
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              {
                $ref: '#/components/parameters/used',
              },
            ],
          },
        },
      },
      components: {
        parameters: {
          used: {
            name: 'used',
          },
        },
      },
    });
  });

  it('should not remove components used child reference', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        $ref: '#/components/schemas/Used'
        components:
          parameters:
            unused:
              name: unused
          responses:
            unused: {}
          examples:
            unused: {}
          requestBodies:
            unused: {}
          headers:
            unused: {}
          schemas:
            InnerUsed:
              type: object
              properties:
                link:
                  type: string
            Used:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/InnerUsed/properties/link'
            Unused:
              type: integer
              enum:
                - 1
                - 2
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
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Used',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          InnerUsed: {
            type: 'object',
            properties: {
              link: {
                type: 'string',
              },
            },
          },
          Used: {
            type: 'object',
            properties: {
              link: {
                $ref: '#/components/schemas/InnerUsed/properties/link',
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
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              parameters:
                - $ref: '#/components/parameters/used'
        components:
          parameters:
            used:
              name: used
            unused:
              name: unused
          schemas:
            Unused:
              type: integer
              enum:
                - 1
                - 2
            Transitive:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Unused'
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
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            summary: 'List all pets',
            operationId: 'listPets',
            parameters: [
              {
                $ref: '#/components/parameters/used',
              },
            ],
          },
        },
      },
      components: {
        parameters: {
          used: {
            name: 'used',
          },
        },
      },
    });
  });

  it('should remove transitively unused components with colliding paths', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              responses: 
                200:
                  content: 
                    application/json: 
                      schema: 
                        $ref: "#/components/schemas/Transitive2"
        components:
          schemas:
            Unused: # <-- this will be removed correctly
              type: integer
            Transitive: # <-- this will be removed correctly
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Unused'
            Used:
              type: integer
            Transitive2:
              type: object
              properties:
                link:
                  $ref: '#/components/schemas/Used'
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
      openapi: '3.0.0',
      paths: {
        '/pets': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Transitive2',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Transitive2: {
            type: 'object',
            properties: {
              link: {
                $ref: '#/components/schemas/Used',
              },
            },
          },
          Used: {
            type: 'integer',
          },
        },
      },
    });
  });
});

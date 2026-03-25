import { makeConfig, parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';
import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';

describe('oas3 media-type-examples-override', () => {
  expect.addSnapshotSerializer(yamlSerializer);
  it('should override response example', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    200:
                      description: json
                      content:
                        application/json:
                          examples:
                            def:
                              value:
                                a: test
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                responses: {
                  '200': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/request.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          b: from external file
      components: {}

    `);
  });

  it('should override requestBody examples', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  requestBody: 
                    content:
                      application/json:
                        examples:
                          def:
                            value:
                              a: test123
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/response.yaml',
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            requestBody:
              content:
                application/json:
                  examples:
                    def:
                      value:
                        name: test response name
      components: {}

    `);
  });

  it('should override requestBody examples and 200 response', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '200':
                      description: json
                      content:
                        application/json:
                          examples:
                            def:
                              value:
                                message: test
                  requestBody: 
                    content:
                      application/json:
                        examples:
                          def:
                            value:
                              a: test123
                      
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
                responses: {
                  '200': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                  '201': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          name: test response name
            requestBody:
              content:
                application/json:
                  examples:
                    def:
                      value:
                        b: from external file
      components: {}

    `);
  });

  it('should override response and request examples with refs', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '200':
                      $ref: '#/components/responses/okay200'
                  requestBody: 
                    $ref: '#/components/requestBodies/testRequest'
            components:
              requestBodies:
                testRequest:
                  content:
                    application/json:
                      examples:
                        def:
                          value:
                            a: test123
              responses:
                okay200:
                  description: json
                  content:
                    application/json:
                      examples:
                        def:
                          value:
                            a: t
                            b: 3                          
    `
    );

    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
                responses: {
                  '200': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          name: test response name
            requestBody:
              content:
                application/json:
                  examples:
                    def:
                      value:
                        b: from external file
      components:
        requestBodies:
          testRequest:
            content:
              application/json:
                examples:
                  def:
                    value:
                      a: test123
        responses:
          okay200:
            description: json
            content:
              application/json:
                examples:
                  def:
                    value:
                      a: t
                      b: 3

    `);
  });

  it('should override examples with ref', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '400':
                      description: bad request
                      content:
                        application/json:
                          examples:
                            $ref: '#/components/examples/testExample'
                  requestBody: 
                    content:
                      application/json:
                        examples:
                          obj:
                            $ref: '#/components/examples/testExample'
            components:
              examples:
                testExample:
                  value:
                    test: 1                          
    `
    );

    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
                responses: {
                  '400': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '400':
                description: bad request
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          name: test response name
            requestBody:
              content:
                application/json:
                  examples:
                    def:
                      value:
                        b: from external file
      components:
        examples:
          testExample:
            value:
              test: 1

    `);
  });

  it('should add the examples to response and request', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  requestBody:
                    description: empty body
                  responses:
                    '200':
                      description: json               
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/request.yaml',
                },
                responses: {
                  '200': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            requestBody:
              description: empty body
              content:
                application/json:
                  examples:
                    def:
                      value:
                        b: from external file
            responses:
              '200':
                description: json
                content:
                  application/json:
                    examples:
                      def:
                        value:
                          name: test response name
      components: {}

    `);
  });

  it('should add examples to response', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  responses:
                    '200':
                      description: json
                      content:
                        application/json:
                          schema: 
                            $ref: "#/components/schemas/Pet"
    ,               
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                responses: {
                  '200': {
                    'application/json':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            responses:
              '200':
                description: json
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/Pet'
                    examples:
                      def:
                        value:
                          name: test response name
      components: {}

    `);
  });

  it('should add examples to requestBody', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  requestBody: 
                    content:
                      application/json:
                        schema: 
                          $ref: "#/components/schemas/Pet"
                        
    ,               
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                request: {
                  'application/json':
                    'packages/core/src/decorators/__tests__/resources/response.yaml',
                  'application/xml':
                    'packages/core/src/decorators/__tests__/resources/response.yaml',
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            requestBody:
              content:
                application/json:
                  schema:
                    $ref: '#/components/schemas/Pet'
                  examples:
                    def:
                      value:
                        name: test response name
                application/xml:
                  examples:
                    def:
                      value:
                        name: test response name
      components: {}

    `);
  });

  it('should add new examples with new content type to response', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
            openapi: 3.0.0
            paths:
              /pet:
                get:
                  operationId: getUserById
                  requestBody:
                    description: empty body
                  responses:
                    '200':
                      description: json
                      content:
                        examples:  
                          application/json:
                            value:
                              name: json type               
    `
    );

    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'media-type-examples-override': {
            operationIds: {
              getUserById: {
                responses: {
                  '200': {
                    'application/xml':
                      'packages/core/src/decorators/__tests__/resources/response.yaml',
                  },
                },
              },
            },
          },
        },
      }),
    });

    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            operationId: getUserById
            requestBody:
              description: empty body
            responses:
              '200':
                description: json
                content:
                  examples:
                    application/json:
                      value:
                        name: json type
                  application/xml:
                    examples:
                      def:
                        value:
                          name: test response name
      components: {}

    `);
  });
});

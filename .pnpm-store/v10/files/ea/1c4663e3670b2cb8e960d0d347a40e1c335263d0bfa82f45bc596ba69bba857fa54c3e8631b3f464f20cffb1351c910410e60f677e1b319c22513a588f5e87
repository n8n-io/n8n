import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { lintDocumentForTest } from './utils/lint-document-for-test';

describe('Oas3 component-name-unique', () => {
  describe('schema', () => {
    it('should report on multiple schemas with same name', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          components:
            schemas:
              SomeSchema:
                type: object
              Test:
                type: object
                properties:
                  there:
                    $ref: '/test.yaml#/components/schemas/SomeSchema'
        `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
          openapi: 3.0.0
          components:
            schemas:
              SomeSchema:
                type: object
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/SomeSchema",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /test.yaml#/components/schemas/SomeSchema",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/SomeSchema",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /foobar.yaml#/components/schemas/SomeSchema",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report on multiple schemas with same name - filename', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        components:
          schemas:
            SomeSchema:
              type: object
            Test:
              type: object
              properties:
                there:
                  $ref: '/SomeSchema.yaml'
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/SomeSchema.yaml',
          body: outdent`
          type: object
          properties:
            test:
              type: number
      `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/schemas/SomeSchema",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /SomeSchema.yaml",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/",
                "reportOnKey": false,
                "source": "/SomeSchema.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /foobar.yaml#/components/schemas/SomeSchema",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report on multiple schemas with different names', async () => {
      const document = parseYamlToDocument(
        outdent`
          openapi: 3.0.0
          components:
            schemas:
              SomeSchema:
                type: object
              Test:
                type: object
                properties:
                  there:
                    $ref: '/test.yaml#/components/schemas/OtherSchema'
        `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
          openapi: 3.0.0
          components:
            schemas:
              OtherSchema:
                type: object
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('parameter', () => {
    it('should report if multiple parameters have same component name', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/test.yaml#/components/parameters/ParameterOne'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        openapi: 3.0.0
        components:
          parameters:
            ParameterOne:
              name: oneParameter
              in: query
              schema:
                type: integer
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/parameters/ParameterOne",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'parameters/ParameterOne' is not unique. It is also defined at:
        - /test.yaml#/components/parameters/ParameterOne",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/parameters/ParameterOne",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'parameters/ParameterOne' is not unique. It is also defined at:
        - /foobar.yaml#/components/parameters/ParameterOne",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report on multiple parameters with same component name - filename', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/ParameterOne.yaml'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/ParameterOne.yaml',
          body: outdent`
          name: oneParameter
          in: query
          schema:
            type: integer
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/parameters/ParameterOne",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'parameters/ParameterOne' is not unique. It is also defined at:
        - /ParameterOne.yaml",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/",
                "reportOnKey": false,
                "source": "/ParameterOne.yaml",
              },
            ],
            "message": "Component 'parameters/ParameterOne' is not unique. It is also defined at:
        - /foobar.yaml#/components/parameters/ParameterOne",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report on multiple parameters with different component names', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              parameters:
              - $ref: '#/components/parameters/ParameterOne'
              - $ref: '/test.yaml#/components/parameters/OneParameter'
        components:
          parameters:
            ParameterOne:
              name: parameterOne
              in: query
              schema:
                type: integer
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        openapi: 3.0.0
        components:
          parameters:
            OneParameter:
              name: oneParameter
              in: query
              schema:
                type: integer
      `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('response', () => {
    it('should report if multiple responses have same component name', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/SuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/test.yaml#/components/responses/SuccessResponse'
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        openapi: 3.0.0
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/responses/SuccessResponse",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'responses/SuccessResponse' is not unique. It is also defined at:
        - /test.yaml#/components/responses/SuccessResponse",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/responses/SuccessResponse",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'responses/SuccessResponse' is not unique. It is also defined at:
        - /foobar.yaml#/components/responses/SuccessResponse",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report on multiple responses with same component name - filename', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/SuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/SuccessResponse.yaml'
        components:
          responses:
            SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/SuccessResponse.yaml',
          body: outdent`
          description: Successful response
          content:
            application/json:
              schema:
                type: string
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/responses/SuccessResponse",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'responses/SuccessResponse' is not unique. It is also defined at:
        - /SuccessResponse.yaml",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/",
                "reportOnKey": false,
                "source": "/SuccessResponse.yaml",
              },
            ],
            "message": "Component 'responses/SuccessResponse' is not unique. It is also defined at:
        - /foobar.yaml#/components/responses/SuccessResponse",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report on multiple responses with different component names', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            get:
              responses:
                '200':
                  $ref: '#/components/responses/TestSuccessResponse'
          /test2:
            get:
              responses:
                '200':
                  $ref: '/test.yaml#/components/responses/Test2SuccessResponse'
        components:
          responses:
            TestSuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        openapi: 3.0.0
        components:
          responses:
            Test2SuccessResponse:
              description: Successful response
              content:
                application/json:
                  schema:
                    type: string
      `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('request-body', () => {
    it('should report if multiple request bodies have same component name', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            post:
              requestBody:
                $ref: '#/components/requestBodies/MyRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/test.yaml#/components/requestBodies/MyRequestBody'
        components:
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        components:
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /test.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /foobar.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should report on multiple responses with same component name - filename', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            post:
              requestBody:
                $ref: '#/components/requestBodies/MyRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/MyRequestBody.yaml'
        components:
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/MyRequestBody.yaml',
          body: outdent`
          components:
            requestBodies:
              MyRequestBody:
                required: true
                content:
                  application/json:
                    schema:
                      type: string
        `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /MyRequestBody.yaml",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/",
                "reportOnKey": false,
                "source": "/MyRequestBody.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /foobar.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report on multiple responses with different component names', async () => {
      const document = parseYamlToDocument(
        outdent`
        openapi: 3.0.0
        paths:
          /test:
            post:
              requestBody:
                $ref: '#/components/requestBodies/TestRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/test.yaml#/components/requestBodies/Test2RequestBody'
        components:
          requestBodies:
            TestRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
        '/foobar.yaml'
      );
      const additionalDocuments = [
        {
          absoluteRef: '/test.yaml',
          body: outdent`
        components:
          requestBodies:
            Test2RequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
        },
      ];

      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
    });
  });

  describe('different severities', () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /test:
            post:
              requestBody:
                $ref: '#/components/requestBodies/MyRequestBody'
          /test2:
            post:
              requestBody:
                $ref: '/test.yaml#/components/requestBodies/MyRequestBody'
        components:
          schemas:
            SomeSchema:
              type: object
            Test:
              type: object
              properties:
                there:
                  $ref: '/test.yaml#/components/schemas/SomeSchema'
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
      `,
      '/foobar.yaml'
    );
    const additionalDocuments = [
      {
        absoluteRef: '/test.yaml',
        body: outdent`
        components:
          schemas:
            SomeSchema:
              type: object
          requestBodies:
            MyRequestBody:
              required: true
              content:
                application/json:
                  schema:
                    type: string
        `,
      },
    ];

    it('should report both schema and request body', async () => {
      const results = await lintDocumentForTest(
        { 'component-name-unique': 'error' },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /test.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /foobar.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/SomeSchema",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /test.yaml#/components/schemas/SomeSchema",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/schemas/SomeSchema",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'schemas/SomeSchema' is not unique. It is also defined at:
        - /foobar.yaml#/components/schemas/SomeSchema",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });

    it('should not report if severity is off for specific component type', async () => {
      const results = await lintDocumentForTest(
        { 'component-name-unique': { severity: 'error', schemas: 'off' } },
        document,
        additionalDocuments
      );

      expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
        [
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/foobar.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /test.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
          {
            "location": [
              {
                "pointer": "#/components/requestBodies/MyRequestBody",
                "reportOnKey": false,
                "source": "/test.yaml",
              },
            ],
            "message": "Component 'requestBodies/MyRequestBody' is not unique. It is also defined at:
        - /foobar.yaml#/components/requestBodies/MyRequestBody",
            "ruleId": "component-name-unique",
            "severity": "error",
            "suggest": [],
          },
        ]
      `);
    });
  });
});

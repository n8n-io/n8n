import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

jest.setTimeout(10000);

describe('no-invalid-media-type-examples', () => {
  it('should report on invalid example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: 13
                        b: "string"
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`a\` property type must be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/b",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`b\` property type must be number.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on invalid example with allowAdditionalProperties', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: "string"
                        b: 13
                        c: unknown
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/example/c",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: must NOT have unevaluated properties \`c\`.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on invalid example with a falsy value', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /test:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: string
                      example: false
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1test/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1test/get/responses/200/content/application~1json/example",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: type must be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on valid example with allowAdditionalProperties', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: "string"
                        b: 13
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on valid example with allowAdditionalProperties and allOf and $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            C:
              properties:
                c:
                  type: string
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: "string"
                        b: 13
                        c: "string"
                      schema:
                        type: object
                        allOf:
                          - $ref: '#/components/schemas/C'
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not on invalid examples', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          examples:
            test:
              value:
                a: 23
                b: 25
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      examples:
                        test:
                          $ref: '#/components/examples/test'
                        test2:
                          value:
                            a: test
                            b: 35
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': {
            severity: 'error',
            allowAdditionalProperties: false,
          },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/components/examples/test/value/a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`a\` property type must be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if no examples', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example:
                        a: test
                        b: 35

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report if no schema', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should work with cross-file $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            C:
              $ref: './fixtures/common.yaml#/components/schemas/A'
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example: {
                        "a": "test",
                        "b": "test"
                      }
                      schema:
                        $ref: '#/components/schemas/C'

      `,
      __dirname + '/foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not throw for ajv throw', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                200:
                  content:
                    application/json:
                      example: {}
                      schema:
                        nullable: true

      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/schema",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example validation errored: "nullable" cannot be used without "type".",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if allOf used with discriminator', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        discriminator:
                          propertyName: powerSource
                          mapping: {}
                        allOf: []
                      examples:
                        first:
                          value: {}
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report if only externalValue is set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number
                      examples:
                        first:
                          externalValue: ./fixtures/external-value.yaml
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report if value is valid and externalValue is also set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number
                      examples:
                        first:
                          externalValue: "https://example.com/example.json"
                          value:
                            a: "A"
                            b: 0
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report invalid value when externalValue is also set', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          a:
                            type: string
                          b:
                            type: number
                      examples:
                        first:
                          externalValue: "https://example.com/example.json"
                          value:
                            a: 0
                            b: "0"
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-media-type-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/examples/first/value/a",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`a\` property type must be string.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/paths/~1pet/get/responses/200/content/application~1json",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/paths/~1pet/get/responses/200/content/application~1json/examples/first/value/b",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: \`b\` property type must be number.",
          "ruleId": "no-invalid-media-type-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should first report on unresolved ref rather than fail on validation', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths:
          /groups:
            get:
              responses:
                '200':
                  content:
                    application/json:
                      schema:
                        type: string
                      examples:
                        example1:
                          $ref: '#/components/examples/NotExisting'
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-invalid-media-type-examples': 'warn',
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1groups/get/responses/200/content/application~1json/examples/example1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 typed enum', () => {
  it('should not report on enum object if all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: A paged array of pets
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - 2
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on enum object if all items match type and enum is nullable', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: A paged array of pets
                    content:
                      application/json:
                        schema:
                          type: string
                          nullable: true
                          enum:
                            - A
                            - B
                            - C
                            - null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on enum object if not all items match type', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type: integer
                          enum:
                            - 1
                            - string
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "All values of \`enum\` field must be of the same type as the \`type\` field: expected "integer" but received "string".",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it("should report on enum object, 'string' value in enum does not have allowed types", async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          paths:
            /some:
              get:
                responses:
                  '200':
                    content:
                      application/json:
                        schema:
                          type:
                            - integer
                            - array
                          enum:
                            - 1
                            - string
                            - 3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema/enum/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Enum value \`string\` must be of allowed types: \`integer,array\`.",
          "ruleId": "no-enum-type-mismatch",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not crash on null schema when there is spec rule', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            title: test
            version: 1.2.3
          paths:
            /some:
              get:
                responses:
                  '200':
                    description: test
                    content:
                      application/json:
                        schema: null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { spec: 'error', 'no-enum-type-mismatch': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/paths/~1some/get/responses/200/content/application~1json/schema",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`Schema\` (object) but got \`null\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

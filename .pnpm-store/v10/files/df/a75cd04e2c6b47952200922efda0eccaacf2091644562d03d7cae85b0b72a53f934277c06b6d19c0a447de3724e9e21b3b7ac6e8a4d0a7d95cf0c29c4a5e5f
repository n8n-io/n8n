import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-4xx-problem-details-rfc7807', () => {
  it('should report `4xx` must have content type `application/problem+json` ', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          type:
                            type: string
                          title:
                            type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Response \`4xx\` must have content-type \`application/problem+json\`.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report `application/problem+json` must have `type` property', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      schema:
                        type: object
                        properties:
                          title:
                            type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema/properties/type",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "SchemaProperties object should contain \`type\` field.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report `application/problem+json` must have `schema` property', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: "3.0.0"
        paths:
          /pets:
            get:
              summary: List all pets
              operationId: listPets
              responses:
                '400':
                  description: Test
                  content:
                    application/problem+json:
                      example: asd
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-problem-details-rfc7807': 'error' } }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/responses/400/content/application~1problem+json/schema",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "MediaType object should contain \`schema\` field.",
          "ruleId": "operation-4xx-problem-details-rfc7807",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

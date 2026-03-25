import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 no-unused-components', () => {
  it('should report unused components', async () => {
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

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-unused-components': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/parameters/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "Unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/responses/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/examples/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/requestBodies/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/headers/unused",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Component: "unused" is never used.",
          "ruleId": "no-unused-components",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

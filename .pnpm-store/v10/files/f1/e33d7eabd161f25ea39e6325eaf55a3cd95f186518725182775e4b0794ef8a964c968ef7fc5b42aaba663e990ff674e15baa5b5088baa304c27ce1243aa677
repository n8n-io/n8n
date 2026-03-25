import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-invalid-schema-examples', () => {
  it('should report on invalid falsy example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Car:
              type: object
              properties:
                color:
                  type: string
                  example: 0
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-invalid-schema-examples': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/components/schemas/Car/properties/color",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/components/schemas/Car/properties/color/example",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Example value must conform to the schema: type must be string.",
          "ruleId": "no-invalid-schema-examples",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 path-not-include-query', () => {
  it('should report on path object if query params in pathitem', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /some?input:
              get:
                summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'path-not-include-query': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some?input",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Don't put query string items in the path, they belong in parameters with \`in: query\`.",
          "ruleId": "path-not-include-query",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on path object if no query params in pathitem', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /some:
          get:
            summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'path-not-include-query': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

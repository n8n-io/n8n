import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-tag-defined', () => {
  it('should not report on operation object if at least one tag is defined', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.4
          tags:
            - name: a
          paths:
            /some:
              get:
                tags:
                  - a
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-tag-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on operation object if no tags are defined', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.4
      tags:
        - name: a
      paths:
        /some:
          get:
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-tag-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1some/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation tags should be defined",
          "ruleId": "operation-tag-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

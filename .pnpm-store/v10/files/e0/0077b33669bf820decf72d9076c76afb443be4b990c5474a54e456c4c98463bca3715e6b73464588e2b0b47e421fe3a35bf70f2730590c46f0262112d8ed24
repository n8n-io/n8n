import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-operationId-unique', () => {
  it('should report on for non-unique opid', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get:
                operationId: test
              post:
                summary: no id
            '/test2':
              get:
                operationId: test2
              post:
                operationId: test2
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-operationId-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test2/post/test2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation must have a unique \`operationId\`.",
          "ruleId": "operation-operationId-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on operation object if only one tag', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              get:
                operationId: test
              post:
                operationId: test2
            '/test2':
              post:
                operationId: test3
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'peration-operationId-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

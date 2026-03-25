import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-parameters-unique', () => {
  it('should report on duplicated path params', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
                - name: a
                  in: query
                - name: a
                  in: query
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-parameters-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Paths must have unique \`name\` + \`in\` parameters.
      Repeats of \`in:query\` + \`name:a\`.",
          "ruleId": "operation-parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when operation overwrites path param', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
                - name: a
                  in: query
              put:
                parameters:
                  - name: a
                    in: query
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-parameters-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report when operation with duplicated params', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
                - name: a
                  in: query
              put:
                parameters:
                  - name: a
                    in: query
                  - name: a
                    in: path
                  - name: a
                    in: query
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-parameters-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/parameters/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operations must have unique \`name\` + \`in\` parameters. Repeats of \`in:query\` + \`name:a\`.",
          "ruleId": "operation-parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report when operation with duplicated params via $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              parameters:
                - $ref: '#/components/parameters/a'
              put:
                parameters:
                  - $ref: '#/components/parameters/a'
                  - name: a
                    in: path
                  - $ref: '#/components/parameters/a'
          components:
            parameters:
              a:
                in: query
                name: a
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-parameters-unique': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/parameters/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operations must have unique \`name\` + \`in\` parameters. Repeats of \`in:query\` + \`name:a\`.",
          "ruleId": "operation-parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

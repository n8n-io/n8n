import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 operation-4xx-response', () => {
  it('should report missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test':
              put:
                responses:
                  200:
                    description: ok response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report for present 400 response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  400:
                    description: error response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report for present 4XX response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  4XX:
                    description: error response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report if default is present but missing 4xx response', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses:
                  default:
                    description: some default response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report even if the responses are null', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses: null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-2xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`2XX\` response.",
          "ruleId": "operation-2xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report missing 4xx response in webhooks when enabled', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          webhooks:
            '/test/':
              put:
                responses:
                  200:
                    description: success response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'operation-4xx-response': { severity: 'error', validateWebhooks: true },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/webhooks/~1test~1/put/responses",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Operation must have at least one \`4XX\` response.",
          "ruleId": "operation-4xx-response",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report missing 4xx response in webhooks when not enabled', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          x-webhooks:
            '/test/':
              put:
                responses:
                  200:
                    description: success response
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'operation-4xx-response': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

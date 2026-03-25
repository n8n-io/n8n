import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas2 response-contains-header', () => {
  it('should report a response object not containing the header', async () => {
    const document = parseYamlToDocument(outdent`
      swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Location:
                    description: Location of created Account
                    type: string
              '404':
                description: User not found
    `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2xx': ['Content-Length'], '4xx': ['Content-Length'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/201/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Location:
                    description: Location of created Account
                    type: string
              '404':
                description: User not found",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a "Content-Length" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/404/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Location:
                    description: Location of created Account
                    type: string
              '404':
                description: User not found",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a "Content-Length" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report a response object containing the header nor not applicable', async () => {
    const document = parseYamlToDocument(outdent`
      swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '201':
                description: Account Created
                headers:
                  Content-Length:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              '404':
                description: User not found
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2xx': ['Content-Length'], '400': ['Content-Length'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should not report a response object when there is no `names` section defined', async () => {
    const document = parseYamlToDocument(outdent`
      swagger: '2.0'
      schemes:
        - https
      basePath: /v2
      paths:
        '/accounts/{accountId}':
          get:
            description: Retrieve a sub account under the master account.
            operationId: account
            responses:
              '404':
                description: User not found
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas2 response-contains-property', () => {
  it('should report a response object not containing the property', async () => {
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
              '200':
                description: Account object returned
                schema:
                  type: object
                  properties:
                    created_at:
                      description: Account creation date/time
                      format: date-time
                      type: string
                    owner_email:
                      description: Account Owner email
                      type: string
              '404':
                description: User not found
			`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '2xx': ['id'], '4xx': ['id'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1accounts~1{accountId}/get/responses/200/schema/properties",
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
              '200':
                description: Account object returned
                schema:
                  type: object
                  properties:
                    created_at:
                      description: Account creation date/time
                      format: date-time
                      type: string
                    owner_email:
                      description: Account Owner email
                      type: string
              '404':
                description: User not found",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a top-level "id" property.",
          "ruleId": "response-contains-property",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report a response object containing the expected property', async () => {
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
              '200':
                description: Account object returned
                schema:
                  type: object
                  properties:
                    created_at:
                      description: Account creation date/time
                      format: date-time
                      type: string
                    id: some-id
              '404':
                description: User not found
                id: some-id
			`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '200': ['id'], '4xx': ['id'] },
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
          'response-contains-property': {
            severity: 'error',
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });
});

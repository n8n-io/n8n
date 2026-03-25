import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 response-contains-property', () => {
  it('should report a response object not containing the property', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
		`);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { 201: ['id'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/201/content/application~1json/schema/properties",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456",
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

  it('should report response objects not containing props for a subset of status codes', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
              400:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        status:
                          type: integer
                description: error
      `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '2xx': ['id'], '400': ['error'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/201/content/application~1json/schema/properties",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
              400:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        status:
                          type: integer
                description: error",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a top-level "id" property.",
          "ruleId": "response-contains-property",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/400/content/application~1json/schema/properties",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
              400:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        status:
                          type: integer
                description: error",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a top-level "error" property.",
          "ruleId": "response-contains-property",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report response objects containing specified properties', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
                        id: some-id
              400:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        status:
                          type: integer
                        error:
                          type: string
      `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '2xx': ['id'], '400': ['error'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should not report a response object when schema type is not object', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  text/plain:
                    schema:
                      type: string
      `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { 201: ['id'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should not report response objects when there is no `names` field specified', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '201':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456
              400:
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        status:
                          type: integer
                description: error
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

  it('should not report response objects for 204 status code', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '204':
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        subscriptionId:
                          type: string
                          example: AAA-123-BBB-456                  
      `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '2xx': ['id'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should report response objects when there are no properties', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              200:
                content:
                  application/json:
                    schema:
                      type: object
                                      
      `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-property': {
            severity: 'error',
            names: { '2xx': ['id'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/content/application~1json/schema/properties",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "",
                "body": "openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              200:
                content:
                  application/json:
                    schema:
                      type: object
                                      ",
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
});

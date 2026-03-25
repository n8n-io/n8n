import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 response-contains-header', () => {
  it('should report a response object not containing the header', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
		`);

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '200': ['Content-Length'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/headers",
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
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32",
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

  it('should report response objects not containing headers for a subset of status codes', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string
    `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: {
              '2XX': ['x-request-id'],
              '400': ['Content-Length'],
            },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/200/headers",
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
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a "x-request-id" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1store~1subscribe/post/responses/400/headers",
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
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string",
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

  it('should not report response objects containing specified headers', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Rate-Limit:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
                  x-request-id:
                    description: Request ID
                    schema:
                      type: string
              400:
                description: error
                headers:
                  AccessForbidden:
                    description: Access forbidden
                    content:
                      application/json:
                        schema:
                          type: object
                          properties:
                            status:
                              type: integer
                              description: The HTTP status code.
                            error:
                              type: string
                  Content-Length:
                    description: The number of bytes in the file
                    schema:
                      type: integer
    `);
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: {
              '2xx': ['x-request-id'],
              '400': ['Content-Length'],
            },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should not report response object containing header name upper cased', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  X-Test-Header:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
		`);

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['x-test-header'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should not report response object containing header name in the rule upper cased', async () => {
    const document = parseYamlToDocument(outdent`
      openapi: 3.0.3
      info:
        version: 3.0.0
      paths:
        /store/subscribe:
          post:
            responses:
              '200':
                description: successful operation
                headers:
                  x-test-header:
                    description: calls per hour allowed by the user
                    schema:
                      type: integer
                      format: int32
		`);

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['X-Test-Header'] },
          },
        },
      }),
    });
    expect(results).toMatchInlineSnapshot(`[]`);
  });

  it('should report even if the response is null', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            '/test/':
              put:
                responses: 
                  '200': null
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['X-Test-Header'] },
          },
        },
      }),
    });

    expect(results).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test~1/put/responses/200/headers",
              "reportOnKey": true,
              "source": Source {
                "absoluteRef": "foobar.yaml",
                "body": "openapi: 3.0.0
      paths:
        '/test/':
          put:
            responses: 
              '200': null",
                "mimeType": undefined,
              },
            },
          ],
          "message": "Response object must contain a "X-Test-Header" header.",
          "ruleId": "response-contains-header",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

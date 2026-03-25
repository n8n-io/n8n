import { outdent } from 'outdent';
import { validateDoc } from './utils';

it('should not fail on valid callbacks object', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        summary: test
        get:
          callbacks:
            test:
              'http://notificationServer.com?transactionId={$request.body#/id}&email={$request.body#/email}':
                post:
                  requestBody:
                    description: Callback payload
                    content:
                      'application/json':
                        schema:
                          $ref: '#/components/schemas/SomePayload'
                  responses:
                    '200':
                      description: webhook successfully processed and no retries will be performed
          responses:
            '200':
              description: example description
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`[]`);
});

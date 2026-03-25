import { outdent } from 'outdent';
import { validateDoc } from './utils';

it('should not report if summary field is valid', async () => {
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

it('should report if summary field is not string ', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        summary:
        get:
          responses:
            '200':
              description: example description
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`
    [
      {
        "location": "#/paths/~1ping/summary",
        "message": "Expected type \`string\` but got \`null\`.",
      },
    ]
  `);
});

it('should not report if description field is valid', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        description: test
        get:
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

it('should report if description field is not string', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        description:
        get:
          responses:
            '200':
              description: example description
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`
    [
      {
        "location": "#/paths/~1ping/description",
        "message": "Expected type \`string\` but got \`null\`.",
      },
    ]
  `);
});

it('should not report of a valid GET operation object', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        get:
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

it('should not report of a valid PUT operation object', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        put:
          tags:
            - pet
          summary: Update an existing pet
          description: ''
          operationId: updatePet
          responses:
            '400':
              description: Invalid ID supplied
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`[]`);
});

it('should not report of a valid Post operation object', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        post:
          tags:
            - pet
          summary: uploads an image
          description: ''
          operationId: uploadFile
          parameters:
            - name: petId
              in: path
              description: ID of pet to update
              required: true
              schema:
                type: integer
                format: int64
          responses:
            '200':
              description: successful operation
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`[]`);
});

it('should not report of a valid delete operation object', async () => {
  const source = outdent`
    openapi: 3.0.2
    info:
      title: Test
      version: '1.0'

    servers:
      - url: http://google.com

    paths:
      '/ping':
        delete:
          tags:
            - store
          summary: Delete purchase order by ID
          description: >-
            For valid response try integer IDs with value < 1000. Anything above
            1000 or nonintegers will generate API errors
          operationId: deleteOrder
          parameters:
            - name: orderId
              in: path
              description: ID of the order that needs to be deleted
              required: true
              schema:
                type: string
                minimum: 1
          responses:
            '400':
              description: Invalid ID supplied
  `;

  expect(
    await validateDoc(source, {
      spec: 'error',
    })
  ).toMatchInlineSnapshot(`[]`);
});

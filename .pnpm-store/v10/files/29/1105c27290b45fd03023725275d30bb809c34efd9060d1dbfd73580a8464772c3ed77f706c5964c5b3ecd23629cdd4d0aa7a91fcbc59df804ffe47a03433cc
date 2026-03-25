import { outdent } from 'outdent';
import { lintDoc } from './utils';

describe('OpenAPI Schema 2.0', () => {
  it('should not report of a valid GET operation object', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        '/ping':
          get:
            responses:
              '200':
                description: example description
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should not report of a valid PUT operation object', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

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
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should not report of a valid Post operation object', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

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
                type: integer
                format: int64
            responses:
              '200':
                description: successful operation
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should not report of a valid delete operation object', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

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
                type: string
                minimum: 1
            responses:
              '400':
                description: Invalid ID supplied
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });
});

import { outdent } from 'outdent';
import { lintDoc } from './utils';

describe('OpenAPI Schema', () => {
  it('should not report if Path object is valid ', async () => {
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

  it('should not report if Path object is empty ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths: {}
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should report if Path object is not present ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/",
          "message": "The field \`paths\` must be present on this level.",
        },
      ]
    `);
  });

  it('should not report if Path object is empty ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths: {}
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  //Check: no error
  it('should report if the field name is not begin with a forward slash (/) ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        'ping':
          get:
            responses:
              '200':
                description: example description
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/paths/ping",
          "message": "Property \`ping\` is not expected here.",
        },
      ]
    `);
  });

  it('should report if paths are considered identical and invalid', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        /pets/{petId}:
          get:
            responses:
              '200':
                description: example description
        /pets/{name}:
          get:
            responses:
              '200':
                description: example description
    `;

    expect(
      await lintDoc(source, {
        'paths-identical': 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should not report valid matching URLs', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        '/pets/{petId}':
          get:
            responses:
              '200':
                description: example description
        '/pets/mine':
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

  it('should not report in case of ambiguous matching ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        '/{entity}/me':
          get:
            responses:
              '200':
                description: example description
        '/books/{id}':
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

  it('should not report if Path Item is empty ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        '/ping': {}
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });

  it('should not report of a valid Parameter Object', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Test
        version: '1.0'

      paths:
        /pet:
          parameters:
            - name: Accept-Language
              in: header
              description: "test"
              required: false
              type: string
              default: en-AU
          post:
            tags:
              - pet
            summary: Add a new pet to the store
            description: Add new pet to the store inventory.
            operationId: addPet
            responses:
              '405':
                description: Invalid input
    `;

    expect(
      await lintDoc(source, {
        spec: 'error',
      })
    ).toMatchInlineSnapshot(`[]`);
  });
});

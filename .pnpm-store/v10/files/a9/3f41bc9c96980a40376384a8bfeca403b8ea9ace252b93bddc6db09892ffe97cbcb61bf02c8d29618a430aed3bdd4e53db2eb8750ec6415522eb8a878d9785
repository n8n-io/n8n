import { outdent } from 'outdent';
import { lintDoc } from './utils';

describe('OpenAPI Schema 2.0', () => {
  it('should report if the title of the API is empty ', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title:
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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/title",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report if in the description field is not string.', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition.
        version: '1.0'
        description:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/description",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report if in the termsOfService field is not string', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/termsOfService",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should not report if the Contact Object is valid', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          name: API Support
          url: http://www.example.com/support
          email: support@example.com

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

  it('should report if in the Contact Object in URL field is not string', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          url:
          email: support@example.com

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/contact/url",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report if in the Contact Object in email field is not string', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        termsOfService: http://example.com/terms/
        contact:
          url: http://example.com/contact/
          email:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/contact/email",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should not report if the License Object is valid', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0
          url: https://www.apache.org/licenses/LICENSE-2.0.html

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

  it('should report if the License Object missing field Name', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          url: https://www.apache.org/licenses/LICENSE-2.0.html

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/license",
          "message": "The field \`name\` must be present on this level.",
        },
      ]
    `);
  });

  it('should report if in the URL field of the License Object is not string', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0
          url:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/license/url",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should not report if the URL field of the License Object is not provided', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'
        license:
          name: Apache 2.0

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

  it('should report if the Version field is not provided', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        title: Example OpenAPI 3 definition.

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info",
          "message": "The field \`version\` must be present on this level.",
        },
      ]
    `);
  });

  it('should report if in the Version field is not string', async () => {
    const source = outdent`
      swagger: '2.0'
      info:
        version:
        title: Example OpenAPI 3 definition.

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/info/version",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });
});

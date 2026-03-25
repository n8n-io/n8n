import { outdent } from 'outdent';
import { validateDoc } from './utils';

describe('OpenAPI Schema', () => {
  it('should not report on valid Server Object', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://server.com/v1
          description: Development server

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

  it('should report on empty server URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/url",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report on missing server URL', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
       - description: Development server

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0",
          "message": "The field \`url\` must be present on this level.",
        },
      ]
    `);
  });

  it('should report on empty description field', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://server.com/v1
          description:

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/description",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should not report if description field is missing', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://example.com

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

  it('should report if fields type in servers are not array', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        description: Development server

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers",
          "message": "Expected type \`ServerList\` (array) but got \`object\`",
        },
      ]
    `);
  });

  it('should not report on multiple servers', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://development.server.com/v1
          description: Development server
        - url: https://staging.server.com/v1
          description: Staging server
        - url: https://api.server.com/v1
          description: Production server

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

  it('should not report if variables are used for a server configuration', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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

  it('should report if array in enum is empty', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:

              default: '8443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/variables/port/enum",
          "message": "Expected type \`array\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report if some variable is not defined', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'

      paths:
        '/ping':
          get:
            responses:
              '200':
                description: example description
    `;

    expect(
      await validateDoc(source, {
        'no-undefined-server-variable': 'error',
      })
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/url",
          "message": "The \`basePath\` variable is not defined in the \`variables\` objects.",
        },
      ]
    `);
  });

  it('should report if default value is not provided in variables', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username: {}
            port:
              enum:
                - '8443'
                - '443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/variables/username",
          "message": "The field \`default\` must be present on this level.",
        },
        {
          "location": "#/servers/0/variables/port",
          "message": "The field \`default\` must be present on this level.",
        },
      ]
    `);
  });

  it('should report if default value in variables is empty', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default:
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/variables/username/default",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should report if description in variable is not a string', async () => {
    const source = outdent`
      openapi: 3.0.2
      info:
        title: Example OpenAPI 3 definition. Valid.
        version: '1.0'

      servers:
        - url: https://{username}.server.com:{port}/{basePath}
          variables:
            username:
              default: demo
              description:
            port:
              enum:
                - '8443'
                - '443'
              default: '8443'
            basePath:
              default: v2

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
    ).toMatchInlineSnapshot(`
      [
        {
          "location": "#/servers/0/variables/username/description",
          "message": "Expected type \`string\` but got \`null\`.",
        },
      ]
    `);
  });

  it('should not report if servers property is not provided', async () => {
    const source = outdent`
        openapi: 3.0.2
        info:
          title: Example OpenAPI 3 definition. Valid.
          version: '1.0'

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

  it('should not report if servers property is an empty array', async () => {
    const source = outdent`
        openapi: 3.0.2
        info:
          title: Example OpenAPI 3 definition. Valid.
          version: '1.0'

        servers: []

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
});

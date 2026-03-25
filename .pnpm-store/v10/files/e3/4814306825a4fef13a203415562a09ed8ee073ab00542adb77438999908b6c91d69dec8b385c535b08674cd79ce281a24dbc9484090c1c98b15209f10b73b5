import { outdent } from 'outdent';
import { bundleDocument } from '../../bundle';
import { BaseResolver } from '../../resolve';
import { makeConfig, parseYamlToDocument, yamlSerializer } from '../../../__tests__/utils';

describe('oas3 filter-out', () => {
  expect.addSnapshotSerializer(yamlSerializer);

  const inputDoc = parseYamlToDocument(
    outdent`
        openapi: 3.0.0
        paths:
          /pet:
            x-audience: Private
            post:
              summary: test
          /user:
            x-audience: Protected
            post:
              summary: test          
          /order:
            x-audience: [Private, Protected]
            post:
              operationId: storeOrder
              parameters:
                - name: api_key
              callbacks:
                x-access: protected
                orderInProgress:
                  x-internal: true`
  );

  it('should remove /pet path and y parameter', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          x-access: private
          get:
            parameters:
              - $ref: '#/components/parameters/y'
      components:
        parameters:
          x:
            name: x
          y:
            x-access: private
            name: y  
    `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: { 'filter-out': { property: 'x-access', value: 'private' } },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
          openapi: 3.0.0
          components:
            parameters:
              x:
                name: x

                `);
  });

  it('should remove only /order path', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'filter-out': {
            property: 'x-audience',
            value: ['Private', 'Protected'],
            matchStrategy: 'all',
          },
        },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-audience: Private
          post:
            summary: test
        /user:
          x-audience: Protected
          post:
            summary: test
      components: {}
      
      `);
  });

  it('should remove all paths', async () => {
    const { bundle: res } = await bundleDocument({
      document: inputDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'filter-out': {
            property: 'x-audience',
            value: ['Private', 'Protected'],
            matchStrategy: 'any',
          },
        },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
        openapi: 3.0.0
        components: {}
        
        `);
  });

  it('should remove requestBody', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          post:
            summary: test
            requestBody:
              content:
                x-access: private
                application/x-www-form-urlencoded:
                  schema:
                    type: object
      components: {}
            
        `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'filter-out': {
            property: 'x-access',
            value: 'private',
            matchStrategy: 'any',
          },
        },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          post:
            summary: test
      components: {}

    `);
  });

  it('should remove /pet path and /my/path/false path', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          get:
            x-prop: false
            parameters:
              - $ref: '#/components/parameters/x'
        /my/path/false:
          x-access: private
          x-prop: false
          get:
            parameters:
              - $ref: '#/components/parameters/x'
        /my/path/null:
          x-access: private
          x-prop: null
          get:
            parameters:
              - $ref: '#/components/parameters/x'
      components:
        parameters:
          x:
            name: x
            
            `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: { 'filter-out': { property: 'x-prop', value: false } },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /my/path/null:
          x-access: private
          x-prop: null
          get:
            parameters:
              - $ref: '#/components/parameters/x'
      components:
        parameters:
          x:
            name: x

            `);
  });

  it('should remove /my/path/null path ', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pet:
          x-access: private
          get:
            x-prop: false
            parameters:
              - $ref: '#/components/parameters/y'
        /my/path/false:
          x-access: private
          x-prop: false
          get:
            parameters:
              - $ref: '#/components/parameters/y'
        /my/path/null:
          x-access: private
          x-prop: null
          get:
            parameters:
              - $ref: '#/components/parameters/y'
      components:
        parameters:
          x:
            name: x
            
            `
    );
    const { bundle: res } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: { 'filter-out': { property: 'x-prop', value: null } },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      openapi: 3.0.0
      paths:
        /pet:
          x-access: private
          get:
            x-prop: false
            parameters:
              - $ref: '#/components/parameters/y'
        /my/path/false:
          x-access: private
          x-prop: false
          get:
            parameters:
              - $ref: '#/components/parameters/y'
      components:
        parameters:
          x:
            name: x

            `);
  });
});

describe('oas2 filter-out', () => {
  it('should clean all parameters and responses ', async () => {
    const testDoc = parseYamlToDocument(
      outdent`
        swagger: '2.0'
        host: api.instagram.com
        paths:
          '/geographies/{geo-id}/media/recent':
            get:
              parameters:
                - description: The geography ID.
                  x-access: private
                  in: path
                  name: geo-id
                  required: true
                  type: string
                - description: Max number of media to return.
                  x-access: protected
                  format: int32
                  in: query
                  name: count
                  required: false
                  type: integer
              responses:
                $ref: '#/components/response/200'
        components:
          response:
            '200':
                  description: List of recent media entries.
                  x-access: [protected, public]            
      `
    );
    const { bundle: res } = await bundleDocument({
      document: testDoc,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({
        rules: {},
        decorators: {
          'filter-out': {
            property: 'x-access',
            value: ['private', 'protected'],
            matchStrategy: 'any',
          },
        },
      }),
    });
    expect(res.parsed).toMatchInlineSnapshot(`
      swagger: '2.0'
      host: api.instagram.com
      paths:
        /geographies/{geo-id}/media/recent:
          get: {}
      components:
        response:
          '200':
            description: List of recent media entries.
            x-access:
              - protected
              - public

    `);
  });
});

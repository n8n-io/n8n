import outdent from 'outdent';
import * as path from 'path';

import { bundleDocument, bundle, bundleFromString } from '../bundle';
import { parseYamlToDocument, yamlSerializer, makeConfig } from '../../__tests__/utils';
import { StyleguideConfig, Config, ResolvedConfig, createConfig, loadConfig } from '../config';
import { BaseResolver } from '../resolve';

const stringDocument = outdent`
  openapi: 3.0.0
  paths:
    /pet:
      get:
        operationId: get
        parameters:
          - $ref: '#/components/parameters/shared_a'
          - name: get_b
      post:
        operationId: post
        parameters:
          - $ref: '#/components/parameters/shared_a'
  components:
    parameters:
      shared_a:
        name: shared-a
`;

const testDocument = parseYamlToDocument(stringDocument, '');

describe('bundle', () => {
  const fetchMock = jest.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => 'External schema content',
      headers: {
        get: () => '',
      },
    })
  );

  expect.addSnapshotSerializer(yamlSerializer);

  it('change nothing with only internal refs', async () => {
    const { bundle, problems } = await bundleDocument({
      document: testDocument,
      externalRefResolver: new BaseResolver(),
      config: new StyleguideConfig({}),
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(bundle.parsed).toEqual(origCopy);
  });

  it('should bundle external refs', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should bundle external refs and warn for conflicting names', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-external-refs-conflicting-names.yaml'),
    });
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toEqual(
      `Two schemas are referenced with the same name but different content. Renamed param-b to param-b-2.`
    );
    expect(res.parsed).toMatchSnapshot();
  });

  it('should dereferenced correctly when used with dereference', async () => {
    const { bundle: res, problems } = await bundleDocument({
      externalRefResolver: new BaseResolver(),
      config: new StyleguideConfig({}),
      document: testDocument,
      dereference: true,
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should place referenced schema inline when referenced schema name resolves to original schema name', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/externalref.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not place referenced schema inline when component in question is not of type "schemas"', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/external-request-body.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should pull hosted schema', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/hosted.yaml'),
    });

    expect(problems).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledWith('https://someexternal.schema', {
      headers: {},
    });
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not bundle url refs if used with keepUrlRefs', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-url-refs.yaml'),
      keepUrlRefs: true,
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should add to meta ref from redocly registry', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          /pet:
            get:
              operationId: get
              parameters:
                - $ref: '#/components/parameters/shared_a'
                - name: get_b
            post:
              operationId: post
              parameters:
                - $ref: 'https://api.redocly.com/registry/params'
        components:
          parameters:
            shared_a:
              name: shared-a
      `,
      ''
    );

    const config = await makeConfig({ rules: {}, decorators: { 'registry-dependencies': 'on' } });

    const {
      bundle: result,
      problems,
      ...meta
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver({
        http: {
          customFetch: fetchMock,
          headers: [],
        },
      }),
    });

    const parsedMeta = JSON.parse(JSON.stringify(meta));

    expect(problems).toHaveLength(0);
    expect(parsedMeta).toMatchSnapshot();
  });

  it('should bundle refs using $anchors', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                profile:
                  $ref: '#user-profile'
            UserProfile:
              $anchor: user-profile
              type: string
      `,
      ''
    );

    const config = await makeConfig({ rules: {} });

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      components:
        schemas:
          User:
            type: object
            properties:
              profile:
                $ref: '#user-profile'
          UserProfile:
            $anchor: user-profile
            type: string

    `);
  });

  it('should throw an error when there is no document to bundle', () => {
    const wrapper = () =>
      bundle({
        config: new Config({} as ResolvedConfig),
      });

    expect(wrapper()).rejects.toThrowError('Document or reference is required.\n');
  });

  it('should bundle with a doc provided', async () => {
    const {
      bundle: { parsed },
      problems,
    } = await bundle({
      config: await loadConfig({ configPath: path.join(__dirname, 'fixtures/redocly.yaml') }),
      doc: testDocument,
    });

    const origCopy = JSON.parse(JSON.stringify(testDocument.parsed));

    expect(problems).toHaveLength(0);
    expect(parsed).toEqual(origCopy);
  });

  it('should bundle schemas with properties named $ref and externalValues correctly', async () => {
    const { bundle: res, problems } = await bundle({
      config: new Config({} as ResolvedConfig),
      ref: path.join(__dirname, 'fixtures/refs/openapi-with-special-names-in-props.yaml'),
    });
    expect(problems).toHaveLength(0);
    expect(res.parsed).toMatchSnapshot();
  });

  it('should not fail when bundling openapi with nulls', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths: 
          /:
            get: 
              responses: 
                200:
                  content: 
                    application/json: 
                      schema: 
                        type: object
                        properties: 
                      examples: 
                        Foo:           
      `,
      ''
    );

    const config = await makeConfig({ rules: {} });

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      openapi: 3.1.0
      paths:
        /:
          get:
            responses:
              '200':
                content:
                  application/json:
                    schema:
                      type: object
                      properties: null
                    examples:
                      Foo: null
      components: {}

    `);
  });
});

describe('bundleFromString', () => {
  it('should bundle from string using bundleFromString', async () => {
    const {
      bundle: { parsed, ...rest },
      problems,
    } = await bundleFromString({
      config: await createConfig(`
        extends:
        - recommended
      `),
      source: testDocument.source.body,
    });
    expect(problems).toHaveLength(0);
    expect(rest.source.body).toEqual(stringDocument);
  });
});

describe('bundle async', () => {
  it('should bundle async of version 2.x', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: '2.6.0'
        info:
          title: Account Service
          version: 1.0.0
          description: This service is in charge of processing user signups
        channels:
          user/signedup:
            subscribe:
              message:
                $ref: '#/components/messages/UserSignedUp'
        components:
          schemas:
            UserSignedUp:
              type: object
              properties:
                displayName:
                  type: string
                  description: Name of the user
          messages:
            UserSignedUp:
              payload:
                $ref: '#/components/schemas/UserSignedUp'
      `,
      ''
    );

    const config = await makeConfig({ rules: {} });

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      dereference: true,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      asyncapi: 2.6.0
      info:
        title: Account Service
        version: 1.0.0
        description: This service is in charge of processing user signups
      channels:
        user/signedup:
          subscribe:
            message:
              payload: &ref_1
                type: object
                properties: &ref_0
                  displayName:
                    type: string
                    description: Name of the user
      components:
        schemas:
          UserSignedUp:
            type: object
            properties: *ref_0
        messages:
          UserSignedUp:
            payload: *ref_1

    `);
  });

  it('should bundle async of version 3.0', async () => {
    const testDocument = parseYamlToDocument(
      outdent`
        asyncapi: 3.0.0
        info:
          title: Account Service
          version: 1.0.0
          description: This service is in charge of processing user signups
        operations:
          sendUserSignedup:
            action: send
            messages:
              - $ref: '#/components/messages/UserSignedUp'
        components:
          schemas:
            UserSignedUp:
              type: object
              properties:
                displayName:
                  type: string
                  description: Name of the user
          messages:
            UserSignedUp:
              payload:
                $ref: '#/components/schemas/UserSignedUp'
      `,
      ''
    );

    const config = await makeConfig({ rules: {} });

    const {
      bundle: { parsed },
      problems,
    } = await bundleDocument({
      document: testDocument,
      config: config,
      externalRefResolver: new BaseResolver(),
      dereference: true,
    });

    expect(problems).toHaveLength(0);
    expect(parsed).toMatchInlineSnapshot(`
      asyncapi: 3.0.0
      info:
        title: Account Service
        version: 1.0.0
        description: This service is in charge of processing user signups
      operations:
        sendUserSignedup:
          action: send
          messages:
            - payload: &ref_1
                type: object
                properties: &ref_0
                  displayName:
                    type: string
                    description: Name of the user
      components:
        schemas:
          UserSignedUp:
            type: object
            properties: *ref_0
        messages:
          UserSignedUp:
            payload: *ref_1

    `);
  });
});

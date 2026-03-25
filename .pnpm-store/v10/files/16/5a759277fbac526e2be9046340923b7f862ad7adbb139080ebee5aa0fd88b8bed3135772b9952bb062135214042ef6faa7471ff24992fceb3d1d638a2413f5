import path = require('path');
import { outdent } from 'outdent';
import { lintDocument } from '../../lint';
import { BaseResolver } from '../../resolve';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../__tests__/utils';

describe('oas3 boolean-parameter-prefixes', () => {
  it('should report on unresolved $ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'invalid.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory 'invalid.yaml'",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on unresolved $ref yaml error', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/invalid-yaml.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": undefined,
              "reportOnKey": false,
              "source": "fixtures/invalid-yaml.yaml",
              "start": {
                "col": 1,
                "line": 2,
              },
            },
          ],
          "message": "Failed to parse: unexpected end of the stream within a single quoted scalar in "fixtures/invalid-yaml.yaml" (2:1)",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref: unexpected end of the stream within a single quoted scalar in "fixtures/invalid-yaml.yaml" (2:1)",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on unresolved $ref yaml error', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: 'fixtures/ref.yaml'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on unresolved localr ref', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            put:
              requestBody:
                $ref: '#/components/requestBodies/a'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/put/requestBody",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Can't resolve $ref",
          "ruleId": "no-unresolved-refs",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on refs inside specification extensions', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          requestBodies:
            a:
              content:
                application/json:
                  schema:
                    type: object
        x-webhooks:
          test:
            put:
              requestBody:
                $ref: '#/components/requestBodies/a'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on nested refs inside specification extensions', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        x-test:
          prop:
            $ref: 'fixtures/ref.yaml'
        paths:
          '/test':
            get:
              x-codeSamples:
                - lang: PHP
                  source:
                    $ref: 'fixtures/code-sample.php'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on nested refs inside specification extensions for 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        x-test:
          prop:
            $ref: 'fixtures/ref.yaml'
        paths:
          '/test':
            get:
              x-codeSamples:
                - lang: PHP
                  source:
                    $ref: 'fixtures/code-sample.php'
      `,
      path.join(__dirname, 'foobar.yaml')
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'no-unresolved-refs': 'error',
        },
      }),
    });

    expect(replaceSourceWithRef(results, __dirname)).toMatchInlineSnapshot(`[]`);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-path-trailing-slash', () => {
  it('should report on trailing slash in path', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/bad/':
            get:
              summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-path-trailing-slash': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1bad~1",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/bad/\` should not have a trailing slash.",
          "ruleId": "no-path-trailing-slash",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on trailing slash in path on key when referencing', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/bad/':
            $ref: '#/components/pathItems/MyItem'
        components:
          pathItems:
            MyItem:
              get:
                summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-path-trailing-slash': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1bad~1",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "\`/bad/\` should not have a trailing slash.",
          "ruleId": "no-path-trailing-slash",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on if no trailing slash in path', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/good':
            get:
              summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-path-trailing-slash': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on trailing slash in path if the path is root', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/':
            get:
              summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-path-trailing-slash': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

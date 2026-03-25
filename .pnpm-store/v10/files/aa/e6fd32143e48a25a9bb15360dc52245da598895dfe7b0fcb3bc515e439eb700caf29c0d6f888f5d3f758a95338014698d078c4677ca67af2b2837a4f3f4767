import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('license-strict', () => {
  it('should report on info.license with no url or identifier for OpenAPI 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          info:
            license:
              name: MIT
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-strict': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "License object should contain one of the fields: \`url\`, \`identifier\`.",
          "ruleId": "info-license-strict",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on info.license with url for OpenAPI 3.1', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          info:
            license:
              name: MIT
              url: google.com
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-strict': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on info.license with identifier', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.1.0
          info:
            license:
              name: MIT
              identifier: MIT
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-strict': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on info.license with no url for AsyncAPI 3.0', async () => {
    const document = parseYamlToDocument(
      outdent`
            asyncapi: 3.0.0
            info:
              license:
                name: MIT
          `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-strict': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/license/url",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "License object should contain \`url\` field.",
          "ruleId": "info-license-strict",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on info.license with url for AsyncAPI 3.0', async () => {
    const document = parseYamlToDocument(
      outdent`
            asyncapi: 3.0.0
            info:
              license:
                name: MIT
                url: google.com
          `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-strict': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

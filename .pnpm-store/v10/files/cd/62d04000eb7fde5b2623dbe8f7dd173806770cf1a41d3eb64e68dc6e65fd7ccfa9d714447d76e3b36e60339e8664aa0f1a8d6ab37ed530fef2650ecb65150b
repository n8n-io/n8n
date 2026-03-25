import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 license-url', () => {
  it('should report on info.license with no url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            license:
              name: MIT
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license-url': 'error' } }),
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
          "ruleId": "info-license-url",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on info.license with url', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
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
      config: await makeConfig({ rules: { 'info-license': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 info-license', () => {
  it('should report on info with no license', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            version: '1.0'
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'info-license': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Info object should contain \`license\` field.",
          "ruleId": "info-license",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on info with license', async () => {
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

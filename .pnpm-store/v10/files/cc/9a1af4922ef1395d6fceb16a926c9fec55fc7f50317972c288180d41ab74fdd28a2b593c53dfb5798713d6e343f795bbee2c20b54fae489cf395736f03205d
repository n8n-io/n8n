import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('Overlay 1.0 Description', () => {
  it('should not report if the Contact Object is valid', async () => {
    const document = parseYamlToDocument(
      outdent`
        overlay: 1.0.0
        info:
          title: Example Overlay 1 definition. Valid.
          version: '1.0'
          contact:
            name: API Support
            url: http://www.example.com/support
            email: support@example.com
        extends: 'openapi.yaml'
        actions: []
            `,
      'overlay.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'info-contact': { severity: 'error' },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report if the Contact Object is not defined', async () => {
    const document = parseYamlToDocument(
      outdent`
        overlay: 1.0.0
        info:
          title: Example Overlay 1 definition. Invalid.
          version: '1.0'
        extends: 'openapi.yaml'
        actions: []
            `,
      'overlay.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'info-contact': { severity: 'error' },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/info/contact",
              "reportOnKey": true,
              "source": "overlay.yaml",
            },
          ],
          "message": "Info object should contain \`contact\` field.",
          "ruleId": "info-contact",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
  it('should report if the Overlay Document is invalid', async () => {
    const document = parseYamlToDocument(
      outdent`
        overlay: 1.0.0
        info:
          title: Example Overlay 1 definition. Invalid.
          version: '1.0'
            `,
      'overlay.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          struct: { severity: 'error' },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/",
              "reportOnKey": true,
              "source": "overlay.yaml",
            },
          ],
          "message": "The field \`actions\` must be present on this level.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

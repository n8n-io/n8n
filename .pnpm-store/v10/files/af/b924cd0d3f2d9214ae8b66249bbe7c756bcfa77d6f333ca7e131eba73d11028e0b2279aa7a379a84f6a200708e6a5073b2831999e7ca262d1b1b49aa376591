import { outdent } from 'outdent';
import { lintDocument } from '../../../../lint';
import { parseYamlToDocument, replaceSourceWithRef } from '../../../../../__tests__/utils';
import { StyleguideConfig, defaultPlugin, resolvePlugins, resolvePreset } from '../../../../config';

import { BaseResolver } from '../../../../resolve';

import type { Plugin, ResolvedStyleguideConfig } from '../../../../config';

describe('Oas3 Structural visitor basic', () => {
  let plugins: Plugin[];
  let presets: ResolvedStyleguideConfig;
  let allConfig: StyleguideConfig;

  beforeAll(async () => {
    plugins = await resolvePlugins([defaultPlugin]);
    presets = resolvePreset('all', plugins);
    allConfig = new StyleguideConfig({ ...presets, plugins });
  });

  it('should report wrong types', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          tags:
            - 25.3
            - test
          servers:
          - url: 'http://redocly-example.com'
            variables:
              a:
                default: test
                enum:
                  - 123
                  - test
          info:
            title: Test
            version: '1.0'
            description: test description
            contact:
              name: string
              url: []
              email: false
            license: invalid
          paths: {}
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: allConfig,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/contact/url",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`array\`.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/contact/email",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`boolean\`.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/license",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`License\` (object) but got \`string\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/servers/0/url",
            "source": "foobar.yaml",
          },
          "location": [
            {
              "pointer": "#/servers/0/variables/a",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The \`a\` variable is not used in the server's \`url\` field.",
          "ruleId": "no-undefined-server-variable",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/servers/0/variables/a/enum/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/tags/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`Tag\` (object) but got \`number\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/tags/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Expected type \`Tag\` (object) but got \`string\`",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report unexpected properties', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components1: 1
          info:
            title: Test
            version: '1.0'
            description: test description
            license:
              name: MIT
              url: google.com
            contact:
              name: string
              test: blah
              x-test: vendor
          paths: {}
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: allConfig,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/components1",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Property \`components1\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [
            "components",
          ],
        },
        {
          "location": [
            {
              "pointer": "#/openapi",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Servers must be present.",
          "ruleId": "no-empty-servers",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info/contact/test",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Property \`test\` is not expected here.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report required properties missing', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          info:
            version: '1.0'
            description: test description
            license:
              name: MIT
              url: google.com
            contact:
              name: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: allConfig,
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The field \`paths\` must be present on this level.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/openapi",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Servers must be present.",
          "ruleId": "no-empty-servers",
          "severity": "error",
          "suggest": [],
        },
        {
          "from": undefined,
          "location": [
            {
              "pointer": "#/info",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "The field \`title\` must be present on this level.",
          "ruleId": "struct",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

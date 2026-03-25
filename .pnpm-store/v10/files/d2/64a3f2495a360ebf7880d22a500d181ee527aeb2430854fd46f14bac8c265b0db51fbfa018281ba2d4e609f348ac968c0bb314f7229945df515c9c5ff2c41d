import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-ambiguous-paths', () => {
  it('should report on ambiguous paths', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/good/{id}':
            get:
              summary: List all pets
          '/good/last':
            get:
              summary: List all pets
          '/good/{id}/{pet}':
            get:
              summary: List all pets
          '/good/last/{id}':
            get:
              summary: List all pets
          '/{id}/ambiguous':
            get:
              summary: List all pets
          '/ambiguous/{id}':
            get:
              summary: List all pets
          '/pet/last':
            get:
              summary: List all pets
          '/pet/first':
            get:
              summary: List all pets
          '/{entity}/{id}/last':
            get:
              summary: List all pets
          '/pet/first/{id}':
            get:
              summary: List all pets
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-ambiguous-paths': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1{id}~1ambiguous",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Paths should resolve unambiguously. Found two ambiguous paths: \`/good/{id}\` and \`/{id}/ambiguous\`.",
          "ruleId": "no-ambiguous-paths",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1ambiguous~1{id}",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Paths should resolve unambiguously. Found two ambiguous paths: \`/{id}/ambiguous\` and \`/ambiguous/{id}\`.",
          "ruleId": "no-ambiguous-paths",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1{entity}~1{id}~1last",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Paths should resolve unambiguously. Found two ambiguous paths: \`/good/{id}/{pet}\` and \`/{entity}/{id}/last\`.",
          "ruleId": "no-ambiguous-paths",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

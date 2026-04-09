import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo requestBody-replacements-unique', () => {
  const document = parseYamlToDocument(
    outdent`
      arazzo: '1.0.1'
      info:
        title: Cool API
        version: 1.0.0
        description: A cool API
      sourceDescriptions:
        - name: museum-api
          type: openapi
          url: openapi.yaml
      workflows:
        - workflowId: get-museum-hours
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: create-event
              description: >-
                Create a new special event.
              operationPath: $sourceDescriptions.museum-api#/paths/~1special-events/post
              requestBody:
                replacements:
                  - target: $randomString
                    value: $randomString
                  - target: $randomString
                    value: $randomString
                payload:
                  name: 'Mermaid Treasure Identification and Analysis'
                  location: 'Under the seaaa 🦀 🎶 🌊.'
                  eventDescription: 'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.'
                  dates:
                    - '2023-09-05'
                    - '2023-09-08'
                  price: 0
              successCriteria:
                - condition: $statusCode == 201
                - context: $response.body
                  condition: $.name == 'Mermaid Treasure Identification and Analysis'
                  type: jsonpath
              outputs:
                createdEventId: $response.body.eventId
                name: $response.body.name
        - workflowId: get-museum-hours-2
          description: This workflow demonstrates how to get the museum opening hours and buy tickets.
          parameters:
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should report when the `replacement` is not unique amongst all `replacements` in the RequestBody', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'requestBody-replacements-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/requestBody/replacements/1/target",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Every \`replacement\` in \`requestBody\` must be unique.",
          "ruleId": "requestBody-replacements-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the `replacement` is not unique amongst all `replacements` in the RequestBody', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {},
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

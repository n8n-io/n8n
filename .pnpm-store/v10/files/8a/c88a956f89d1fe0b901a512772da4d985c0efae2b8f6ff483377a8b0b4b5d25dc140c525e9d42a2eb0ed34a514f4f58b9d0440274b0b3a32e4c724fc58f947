import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo criteria-unique', () => {
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
                payload:
                  name: 'Mermaid Treasure Identification and Analysis'
                  location: 'Under the seaaa 🦀 🎶 🌊.'
                  eventDescription: 'Join us as we review and classify a rare collection of 20 thingamabobs, gadgets, gizmos, whoosits, and whatsits, kindly donated by Ariel.'
                  dates:
                    - '2023-09-05'
                    - '2023-09-08'
                  price: 0
              successCriteria:
                - condition: $statusCode == 200
                - condition: $statusCode == 200
                - context: $response.body
                  condition: $.name == 'Mermaid Treasure Identification and Analysis'
                  type: jsonpath
                - context: $response.body
                  condition: $.name == 'Mermaid Treasure Identification and Analysis'
                  type: jsonpath
              onSuccess:
                - name: 'onSuccessActionName'
                  type: 'goto'
                  stepId: 'buy-ticket'
                  criteria:
                    - condition: $response.body.open == true
                    - condition: $response.body.open == true
              onFailure:
                - name: 'onFailureActionName'
                  type: 'goto'
                  stepId: 'buy-ticket'
                  criteria:
                    - condition: $response.body.open == true
                    - condition: $response.body.open == true
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

  it('should report when the duplicated criteria exists', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'criteria-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/successCriteria/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The Step SuccessCriteria items must be unique.",
          "ruleId": "criteria-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/successCriteria/3",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The Step SuccessCriteria items must be unique.",
          "ruleId": "criteria-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/0/criteria/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The SuccessAction criteria items must be unique.",
          "ruleId": "criteria-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onFailure/0/criteria/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The FailureAction criteria items must be unique.",
          "ruleId": "criteria-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the duplicated criteria exists', async () => {
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

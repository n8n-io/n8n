import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo step-onSuccess-unique', () => {
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
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              successCriteria:
                - condition: $statusCode == 200
              onSuccess:
                - name: test
                  workflowId: events-crud
                  type: goto
                - name: test
                  workflowId: events-crud
                  type: goto
                - reference: $steps.test.outputs.createdEventId
                - reference: $steps.test.outputs.createdEventId  
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

  it('should report when the action `name` or `reference` is not unique amongst all onSuccess actions in the step', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'step-onSuccess-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The action \`name\` must be unique amongst listed \`onSuccess\` actions.",
          "ruleId": "step-onSuccess-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/onSuccess/3",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The action \`reference\` must be unique amongst listed \`onSuccess\` actions.",
          "ruleId": "step-onSuccess-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report when the action `name` or `reference` is not unique amongst all onSuccess actions in the step', async () => {
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

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo parameters-unique', () => {
  const document = parseYamlToDocument(
    outdent`
      arazzo: '1.0.0'
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
            - in: header
              name: Authorization
              value: Basic Og==
          steps:
            - stepId: get-museum-hours
              description: >-
                Get museum hours by resolving request details with getMuseumHours operationId from openapi.yaml description.
              operationId: museum-api.getMuseumHours
              parameters:
                - in: header
                  name: Secret
                  value: Basic Og==
                - in: header
                  name: Secret
                  value: Basic Og==
                - reference: $components.parameters.notify
                  value: 12
                - reference: $components.parameters.notify
                  value: 12
              successCriteria:
                - condition: $statusCode == 200
    `,
    'arazzo.yaml'
  );

  it('should not report on `parameters` duplication', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: {} }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on `parameters` duplication', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'parameters-unique': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`name\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/steps/0/parameters/3",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "The parameter \`reference\` must be unique amongst listed parameters.",
          "ruleId": "parameters-unique",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo workflow-dependsOn', () => {
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
          dependsOn:
            - get-museum-hours-2
            - get-museum-hours-3
            - get-museum-hours-2
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
        - workflowId: get-museum-hours-3
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

  const documentWithNotExistingWorkflows = parseYamlToDocument(
    outdent`
    arazzo: 1.0.1
    info:
      title: Redocly Museum API Test Workflow
      description: >-
        Use the Museum API with Arazzo as an example of describing multi-step workflows.
        Built with love by Redocly.
      version: 1.0.0

    sourceDescriptions:
      - name: museum-api
        type: openapi
        url: ../openapi.yaml
      - name: tickets-from-museum-api
        type: arazzo
        url: museum-tickets.arazzo.yaml

    workflows:
      - workflowId: get-museum-hours
        dependsOn:
          - events-crud
          - events-crus
          - $sourceDescriptions.tickets-from-museum-apis.workflows.get-museum-tickets
        description: >-
          This workflow demonstrates how to get the museum opening hours and buy tickets.
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
            outputs:
              schedule: $response.body
          - stepId: buy-ticket
            description: >-
              Buy a ticket for the museum by calling an external workflow from another Arazzo file.
            workflowId: $sourceDescriptions.tickets-from-museum-api.workflows.get-museum-tickets
            outputs:
              ticketId: $outputs.ticketId
      - workflowId: events-crud
        description: >-
          This workflow demonstrates how to list, create, update, and delete special events at the museum.
        parameters:
          - in: header
            name: Authorization
            value: Basic Og==
        steps:
          - stepId: list-events
            description: >-
              Request the list of events.
            operationPath: $sourceDescriptions.museum-api#/paths/~1special-events/get
            outputs:
              events: $response.body
    `,
    'arazzo.yaml'
  );

  it('should report on dependsOn unique violation', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'workflow-dependsOn': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/dependsOn",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Every workflow in dependsOn must be unique.",
          "ruleId": "workflow-dependsOn",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on dependsOn unique violation', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'workflow-dependsOn': 'off' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report on not existing workflows in dependsOn', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: documentWithNotExistingWorkflows,
      config: await makeConfig({
        rules: { 'workflow-dependsOn': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/workflows/0/dependsOn/1",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Workflow events-crus must be defined in workflows.",
          "ruleId": "workflow-dependsOn",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/workflows/0/dependsOn/2",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "SourceDescription tickets-from-museum-apis must be defined in sourceDescriptions.",
          "ruleId": "workflow-dependsOn",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

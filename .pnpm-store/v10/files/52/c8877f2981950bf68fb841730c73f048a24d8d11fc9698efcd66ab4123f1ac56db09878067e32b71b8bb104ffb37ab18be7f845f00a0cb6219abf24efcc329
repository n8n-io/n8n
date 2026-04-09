import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Arazzo respect-supported-versions', () => {
  const documentWithUnsupportedVersion = parseYamlToDocument(
    outdent`
      arazzo: '1.0.2'
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
    `,
    'arazzo.yaml'
  );

  const documentWithSupportedVersion = parseYamlToDocument(
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
    `,
    'arazzo.yaml'
  );

  it('should report on arazzo version error', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: documentWithUnsupportedVersion,
      config: await makeConfig({
        rules: { 'respect-supported-versions': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/arazzo",
              "reportOnKey": false,
              "source": "arazzo.yaml",
            },
          ],
          "message": "Only 1.0.1 Arazzo version is fully supported by Respect.",
          "ruleId": "respect-supported-versions",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on arazzo version error when supported version is used', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: documentWithSupportedVersion,
      config: await makeConfig({
        rules: { 'respect-supported-versions': 'error' },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on arazzo version error when rule is not configured', async () => {
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document: documentWithSupportedVersion,
      config: await makeConfig({
        rules: {},
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

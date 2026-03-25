import { outdent } from 'outdent';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('oas3 array-parameter-serialization', () => {
  it('should report on array parameter without style and explode', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: query
              schema:
                type: array
                items:
                  type: string
            - name: b
              in: header
              schema:
                type: array
                items:
                  type: string     
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error', in: ['query'] },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter \`a\` should have \`style\` and \`explode \` fields",
          "ruleId": "array-parameter-serialization",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on array parameter with style but without explode', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: query
              style: form
              schema:
                type: array
                items:
                  type: string
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error', in: ['query'] },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter \`a\` should have \`style\` and \`explode \` fields",
          "ruleId": "array-parameter-serialization",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report on parameter without type but with items', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        paths: 
          /test:
            parameters: 
              - name: test only type, path level
                in: query
                schema:
                  type: array # no items
            get: 
              parameters: 
                - name: test only items, operation level
                  in: header
                  items: # no type
                    type: string
        components: 
          parameters:
            TestParameter: 
              in: cookie
              name: test only prefixItems, components level
              prefixItems: # no type or items
                - type: number    
              `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error', in: ['query'] },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter \`test only type, path level\` should have \`style\` and \`explode \` fields",
          "ruleId": "array-parameter-serialization",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on array parameter with style and explode', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: query
              style: form
              explode: false
              schema:
                type: array
                items:
                  type: string
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error', in: ['query'] },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report non-array parameter without style and explode', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: query
              schema:
                type: string
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error', in: ['query'] },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it("should report all array parameter without style and explode if property 'in' not defined ", async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        paths:
          '/test':
            parameters:
            - name: a
              in: query
              schema:
                type: array
                items:
                  type: string
            - name: b
              in: header
              schema:
                type: array
                items:
                  type: string     
      `,
      'foobar.yaml'
    );
    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'array-parameter-serialization': { severity: 'error' },
        },
      }),
    });
    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter \`a\` should have \`style\` and \`explode \` fields",
          "ruleId": "array-parameter-serialization",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1test/parameters/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Parameter \`b\` should have \`style\` and \`explode \` fields",
          "ruleId": "array-parameter-serialization",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

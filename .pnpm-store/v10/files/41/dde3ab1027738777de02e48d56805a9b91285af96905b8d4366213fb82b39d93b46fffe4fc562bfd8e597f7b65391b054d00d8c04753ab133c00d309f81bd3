import { outdent } from 'outdent';
import { makeConfig, parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils';
import { lintDocument } from '../../../lint';
import { BaseResolver } from '../../../resolve';

describe('no-schema-type-mismatch rule', () => {
  it('should report a warning for object type with items field', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: object
                      items:
                        type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([
      {
        location: [
          {
            pointer: '#/paths/~1test/get/responses/200/content/application~1json/schema/items',
            reportOnKey: false,
            source: 'test.yaml',
          },
        ],
        message: "Schema type mismatch: 'object' type should not contain 'items' field.",
        ruleId: 'no-schema-type-mismatch',
        severity: 'warn',
        suggest: [],
      },
    ]);
  });

  it('should report a warning for array type with properties field', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: array
                      properties:
                        name:
                          type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([
      {
        location: [
          {
            pointer: '#/paths/~1test/get/responses/200/content/application~1json/schema/properties',
            reportOnKey: false,
            source: 'test.yaml',
          },
        ],
        message: "Schema type mismatch: 'array' type should not contain 'properties' field.",
        ruleId: 'no-schema-type-mismatch',
        severity: 'warn',
        suggest: [],
      },
    ]);
  });

  it('should not report a warning for valid schemas', async () => {
    const yaml = outdent`
      openapi: 3.0.0
      info:
        title: Test API
        version: 1.0.0
      paths:
        /test:
          get:
            responses:
              '200':
                description: OK
                content:
                  application/json:
                    schema:
                      type: object
                      properties:
                        name:
                          type: string
    `;

    const document = parseYamlToDocument(yaml, 'test.yaml');
    const results = await lintDocument({
      document,
      externalRefResolver: new BaseResolver(),
      config: await makeConfig({ rules: { 'no-schema-type-mismatch': 'warn' } }),
    });

    expect(replaceSourceWithRef(results)).toEqual([]);
  });
});

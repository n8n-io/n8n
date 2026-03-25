import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('no-required-schema-properties-undefined', () => {
  it('should report if one or more of the required properties are undefined', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                  - test
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report if one or more of the required properties are undefined, including allOf nested schemas', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                allOf:
                  - properties:
                      foo:
                        type: string
                required:
                  - id
                  - foo
                  - test
                properties:
                  id:
                    type: integer
                    format: int64
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report if one or more of the required properties are undefined when used in schema with allOf keyword', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                allOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                      - name
              Pet:
                type: object
                required:
                  - photoUrls
                properties:
                  name:
                    type: string
                  photoUrls:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Cat/allOf/1/required/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'name' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report required properties are present after resolving $refs when used in schema with allOf keyword', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                allOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                required:
                  - name
              Pet:
                type: object
                required:
                  - photoUrls
                properties:
                  name:
                    type: string
                  photoUrls:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report with few messages if more than one of the required properties are undefined', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                  - test
                  - test2
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/2",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/components/schemas/Pet/required/3",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test2' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if all of the required properties are present', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Pet:
                type: object
                required:
                  - name
                  - id
                properties:
                  id:
                    type: integer
                    format: int64
                  name:
                    type: string
                    example: doggie
                  test:
                    type: string
                    example: test
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not cause stack overflow when there are circular references in schemas', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                allOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                required:
                  - name
              Pet:
                description: A schema of pet
                allOf:
                  - $ref: '#/components/schemas/Cat'
                  - type: object
                    required:
                      - photoUrls
                    properties:
                      name:
                        type: string
                      photoUrls:
                        type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report if there is any required schema that is undefined, including checking nested allOf schemas', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                allOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                required:
                  - test
                  - id
              Pet:
                description: A schema of pet
                allOf:
                  - type: object
                    required:
                      - photoUrls
                    properties:
                      photoUrls:
                        type: string
                  - type: object
                    required:
                      - name
                    properties:
                      name:
                        type: string
                      id:
                        type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Cat/required/0",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'test' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if required property is present in one of the nested reference schemas', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Animal:
                type: object
                properties:
                  commonProperty:
                    type: string
              Mammal:
                allOf:
                  - $ref: '#/components/schemas/Animal'
                  - type: object
                    properties:
                      furColor:
                        type: string
                    required:
                      - furColor
              Carnivore:
                allOf:
                  - $ref: '#/components/schemas/Mammal'
                  - type: object
                    properties:
                      diet:
                        type: string
                    required:
                      - diet
              Tiger:
                allOf:
                  - $ref: '#/components/schemas/Carnivore'
                  - type: object
                    properties:
                      stripes:
                        type: boolean
                    required:
                      - stripes
                required:
                  - commonProperty
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report if one or more of the required properties are undefined when used in schema with anyOf keyword', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                anyOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                      - name
              Pet:
                type: object
                required:
                  - photoUrls
                properties:
                  name:
                    type: string
                  photoUrls:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/Cat/anyOf/1/required/1",
              "reportOnKey": false,
              "source": "foobar.yaml",
            },
          ],
          "message": "Required property 'name' is undefined.",
          "ruleId": "no-required-schema-properties-undefined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report if one or more of the required properties are undefined when used in schema with allOf keyword', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          components:
            schemas:
              Cat:
                description: A representation of a cat
                anyOf:
                  - $ref: '#/components/schemas/Pet'
                  - type: object
                    properties:
                      huntingSkill:
                        type: string
                    required:
                      - huntingSkill
                required:
                  - name
              Pet:
                type: object
                required:
                  - photoUrls
                properties:
                  name:
                    type: string
                  photoUrls:
                    type: string
        `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'no-required-schema-properties-undefined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

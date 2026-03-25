import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 scalar-property-missing-example', () => {
  it('should report on a scalar property missing example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            User:
              type: object
              properties:
                email:
                  description: User email address
                  type: string
                  format: email
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/User/properties/email",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Scalar property should have "example" defined.",
          "ruleId": "scalar-property-missing-example",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

describe('Oas3.1 scalar-property-missing-example', () => {
  it('should report on a scalar property missing example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                email:
                  description: User email address
                  type: string
                  format: email
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/components/schemas/User/properties/email",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Scalar property should have "example" or "examples" defined.",
          "ruleId": "scalar-property-missing-example",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on a scalar property with an example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                email:
                  description: User email address
                  type: string
                  format: email
                  example: john.smith@example.com
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on a scalar property with an examples', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                email:
                  description: User email address
                  type: string
                  format: email
                  examples: 
                  - john.smith@example.com
                  - other@example.com
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on a non-scalar property missing an example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            Pet:
              type: object
              required:
                - photoUrls
              properties:
                photoUrls:
                  description: The list of URL to a cute photos featuring pet
                  type: array
                  maxItems: 20
                  xml:
                    name: photoUrl
                    wrapped: true
                  items:
                    type: string
                    format: url
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on a scalar property of binary format missing an example', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.1.0
        components:
          schemas:
            User:
              type: object
              properties:
                responses:
                  type: string
                  format: binary
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on a scalar property of falsy values', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            User:
              type: object
              properties:
                testBool:
                  type: boolean
                  example: false
                testString:
                  type: string
                  example: ""
                testNumber:
                  type: number
                  example: 0
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report on a nullable scalar property values', async () => {
    const document = parseYamlToDocument(
      outdent`
        openapi: 3.0.0
        components:
          schemas:
            User:
              type: object
              properties:
                testBool:
                  type: string
                  nullable: true
                  example: null
      `,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'scalar-property-missing-example': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });
});

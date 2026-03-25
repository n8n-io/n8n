import { outdent } from 'outdent';
import { lintDocument } from '../../../lint';
import { parseYamlToDocument, replaceSourceWithRef, makeConfig } from '../../../../__tests__/utils';
import { BaseResolver } from '../../../resolve';

describe('Oas3 security-defined', () => {
  it('should report on securityRequirements object if security scheme is not defined in components', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
              get:
                security:
                  - some: []`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'security-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/security/0/some",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "There is no \`some\` security scheme defined.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report if security defined with an empty array', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          security: []
          paths:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'security-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report if security not defined at all', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
              get:
                requestBody:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'security-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report if security not defined for each operation', async () => {
    const document = parseYamlToDocument(
      outdent`
          openapi: 3.0.0
          paths:
            /pets:
                get:
                  security:
                    - some: []
            /cats:
                get:`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'security-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1pets/get/security/0/some",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "There is no \`some\` security scheme defined.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/paths/~1cats/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should not report on securityRequirements object if security scheme is defined in components', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.0.0
      paths:
        /pets:
          get:
            security:
              some: []
      components:
        securitySchemes:
          some:
            type: http
            scheme: basic`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({ rules: { 'security-defined': 'error' } }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should not report if a pathItem is explicitly excluded in the option', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      paths:
        /excluded:
          get:
            description: Should be skipped.
          post: 
            description: Should be skipped.`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'security-defined': { exceptions: [{ path: '/excluded' }] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`[]`);
  });

  it('should report only those operations without security defined that are not excluded in the options', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      paths:
        /partially-excluded:
          get:
            description: Should be skipped.
          post: 
            description: Has security.
            security: []
          delete: 
            description: Should have security defined.`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: {
          'security-defined': { exceptions: [{ path: '/partially-excluded', methods: ['GET'] }] },
        },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1partially-excluded/delete",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });

  it('should report operations from path items that are not excluded', async () => {
    const document = parseYamlToDocument(
      outdent`
      openapi: 3.1.0
      paths:
        /not-excluded:
          get: 
            summary: Should have security defined.`,
      'foobar.yaml'
    );

    const results = await lintDocument({
      externalRefResolver: new BaseResolver(),
      document,
      config: await makeConfig({
        rules: { 'security-defined': { exceptions: [{ path: '/excluded' }] } },
      }),
    });

    expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`
      [
        {
          "location": [
            {
              "pointer": "#/paths/~1not-excluded/get",
              "reportOnKey": true,
              "source": "foobar.yaml",
            },
          ],
          "message": "Every operation should have security defined on it or on the root level.",
          "ruleId": "security-defined",
          "severity": "error",
          "suggest": [],
        },
      ]
    `);
  });
});

import { loadConfig, findConfig, getConfig, createConfig } from '../load';
import { RedoclyClient } from '../../redocly';
import { Config } from '../config';
import { lintConfig } from '../../lint';
import { replaceSourceWithRef } from '../../../__tests__/utils';
import type { RuleConfig, FlatRawConfig } from './../types';
import type { NormalizedProblem } from '../../walk';
import { BaseResolver } from '../../resolve';

const fs = require('fs');
const path = require('path');

describe('loadConfig', () => {
  it('should resolve config http header by US region', async () => {
    jest
      .spyOn(RedoclyClient.prototype, 'getAllTokens')
      .mockImplementation(() => [{ region: 'us', token: 'accessToken' }]);
    jest.spyOn(RedoclyClient.prototype, 'hasTokens').mockImplementation(() => true);
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([
      {
        matches: 'https://api.redocly.com/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
      {
        matches: 'https://api.redoc.ly/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
    ]);
  });

  it('should resolve config http header by EU region', async () => {
    jest
      .spyOn(RedoclyClient.prototype, 'getAllTokens')
      .mockImplementation(() => [{ region: 'eu', token: 'accessToken' }]);
    jest.spyOn(RedoclyClient.prototype, 'hasTokens').mockImplementation(() => true);
    const config = await loadConfig();
    expect(config.resolve.http.headers).toStrictEqual([
      {
        matches: 'https://api.eu.redocly.com/registry/**',
        name: 'Authorization',
        envVariable: undefined,
        value: 'accessToken',
      },
    ]);
  });

  it('should call callback if such passed', async () => {
    const mockFn = jest.fn();
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-redocly.yaml'),
      processRawConfig: mockFn,
    });
    expect(mockFn).toHaveBeenCalled();
  });

  it('should resolve config and call processRawConfig', async () => {
    let problems: NormalizedProblem[];
    let doc: any;

    await loadConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
      processRawConfig: async ({ document, parsed, resolvedRefMap, config }) => {
        doc = parsed;
        problems = await lintConfig({
          document,
          severity: 'warn',
          resolvedRefMap,
          config,
        });
      },
    });

    expect(replaceSourceWithRef(problems!, __dirname)).toMatchInlineSnapshot(`
      [
        {
          "from": {
            "pointer": "#/seo",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/title",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/seo.yaml",
            },
          ],
          "message": "Expected type \`string\` but got \`integer\`.",
          "ruleId": "configuration spec",
          "severity": "warn",
          "suggest": [],
        },
        {
          "from": {
            "pointer": "#/rules",
            "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
          },
          "location": [
            {
              "pointer": "#/non-existing-rule",
              "reportOnKey": true,
              "source": "fixtures/resolve-refs-in-config/rules.yaml",
            },
          ],
          "message": "Property \`non-existing-rule\` is not expected here.",
          "ruleId": "configuration spec",
          "severity": "warn",
          "suggest": [],
        },
        {
          "location": [
            {
              "pointer": "#/theme",
              "reportOnKey": false,
              "source": "fixtures/resolve-refs-in-config/config-with-refs.yaml",
            },
          ],
          "message": "Can't resolve $ref: ENOENT: no such file or directory 'fixtures/resolve-refs-in-config/wrong-ref.yaml'",
          "ruleId": "configuration no-unresolved-refs",
          "severity": "warn",
          "suggest": [],
        },
      ]
    `);
    expect(doc).toMatchInlineSnapshot(`
      {
        "rules": {
          "info-license": "error",
          "non-existing-rule": "warn",
        },
        "seo": {
          "title": 1,
        },
        "theme": undefined,
      }
    `);
  });

  it('should call externalRefResolver if such passed', async () => {
    const externalRefResolver = new BaseResolver();
    const resolverSpy = jest.spyOn(externalRefResolver, 'resolveDocument');
    await loadConfig({
      configPath: path.join(__dirname, './fixtures/load-external.yaml'),
      externalRefResolver: externalRefResolver as any,
    });
    expect(resolverSpy).toHaveBeenCalledWith(
      null,
      'https://raw.githubusercontent.com/Redocly/redocly-cli-cookbook/main/rulesets/spec-compliant/redocly.yaml'
    );
  });
});

describe('findConfig', () => {
  it('should find redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('redocly.yaml');
  });
  it('should find .redocly.yaml', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === '.redocly.yaml');
    const configName = findConfig();
    expect(configName).toStrictEqual('.redocly.yaml');
  });
  it('should throw an error when found multiple config files', async () => {
    jest
      .spyOn(fs, 'existsSync')
      .mockImplementation((name) => name === 'redocly.yaml' || name === '.redocly.yaml');
    expect(findConfig).toThrow(`
      Multiple configuration files are not allowed.
      Found the following files: redocly.yaml, .redocly.yaml.
      Please use 'redocly.yaml' instead.
    `);
  });
  it('should find a nested config ', async () => {
    jest.spyOn(fs, 'existsSync').mockImplementation((name) => name === 'dir/redocly.yaml');
    jest.spyOn(path, 'resolve').mockImplementationOnce((dir, name) => `${dir}/${name}`);
    const configName = findConfig('dir');
    expect(configName).toStrictEqual('dir/redocly.yaml');
  });
});

describe('getConfig', () => {
  jest.spyOn(fs, 'hasOwnProperty').mockImplementation(() => false);
  it('should return empty object if there is no configPath and config file is not found', () => {
    expect(getConfig()).toEqual(Promise.resolve({ rawConfig: {} }));
  });

  it('should resolve refs in config', async () => {
    let problems: NormalizedProblem[];

    const { rawConfig } = await getConfig({
      configPath: path.join(__dirname, './fixtures/resolve-refs-in-config/config-with-refs.yaml'),
    });
    expect(rawConfig).toEqual({
      seo: {
        title: 1,
      },
      styleguide: {
        rules: {
          'info-license': 'error',
          'non-existing-rule': 'warn',
        },
      },
    });
  });
});

describe('createConfig', () => {
  it('should create config from string', async () => {
    const config = await createConfig(`
      extends:
      - recommended
      rules:
        info-license: off
    `);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'recommended',
      overridesRules: { 'info-license': 'off' },
    });
  });

  it('should create config from object', async () => {
    const rawConfig: FlatRawConfig = {
      extends: ['minimal'],
      rules: {
        'info-license': 'off',
        'tag-description': 'off',
        'operation-2xx-response': 'off',
      },
    };
    const config = await createConfig(rawConfig);

    verifyExtendedConfig(config, {
      extendsRuleSet: 'minimal',
      overridesRules: rawConfig.rules as Record<string, RuleConfig>,
    });
  });

  it('should create config from object with a custom plugin', async () => {
    const testCustomRule = jest.fn();
    const rawConfig: FlatRawConfig = {
      extends: [],
      plugins: [
        {
          id: 'my-plugin',
          rules: {
            oas3: {
              'test-rule': testCustomRule,
            },
          },
        },
      ],
      rules: {
        'my-plugin/test-rule': 'error',
      },
    };
    const config = await createConfig(rawConfig);

    expect(config.styleguide.plugins[0]).toEqual({
      id: 'my-plugin',
      rules: {
        oas3: {
          'my-plugin/test-rule': testCustomRule,
        },
      },
    });
    expect(config.styleguide.rules.oas3_0).toEqual({
      'my-plugin/test-rule': 'error',
    });
  });
});

function verifyExtendedConfig(
  config: Config,
  {
    extendsRuleSet,
    overridesRules,
  }: { extendsRuleSet: string; overridesRules: Record<string, RuleConfig> }
) {
  const defaultPlugin = config.styleguide.plugins.find((plugin) => plugin.id === '');
  expect(defaultPlugin).toBeDefined();

  const recommendedRules = defaultPlugin?.configs?.[extendsRuleSet];
  expect(recommendedRules).toBeDefined();

  verifyOasRules(
    config.styleguide.rules.oas2,
    overridesRules,
    { ...recommendedRules?.rules, ...recommendedRules?.oas2Rules } || {}
  );

  verifyOasRules(config.styleguide.rules.oas3_0, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_0Rules,
  });

  verifyOasRules(config.styleguide.rules.oas3_1, overridesRules, {
    ...recommendedRules?.rules,
    ...recommendedRules?.oas3_1Rules,
  });
}

function verifyOasRules(
  finalRuleset: Record<string, RuleConfig>,
  overridesRules: Record<string, RuleConfig>,
  defaultRuleset: Record<string, RuleConfig>
) {
  Object.entries(finalRuleset).forEach(([ruleName, ruleValue]) => {
    if (ruleName in overridesRules) {
      expect(ruleValue).toBe(overridesRules[ruleName]);
    } else {
      expect(ruleValue).toBe(defaultRuleset[ruleName]);
    }
  });
}

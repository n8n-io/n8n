import * as path from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import { isAbsoluteUrl } from '../ref-utils';
import { pickDefined, isNotString, isString, isDefined, keysOf } from '../utils';
import { resolveDocument, BaseResolver } from '../resolve';
import { defaultPlugin } from './builtIn';
import {
  getResolveConfig,
  getUniquePlugins,
  isCommonJsPlugin,
  isDeprecatedPluginFormat,
  mergeExtends,
  parsePresetName,
  prefixRules,
  transformConfig,
} from './utils';
import { isBrowser } from '../env';
import { Config } from './config';
import { colorize, logger } from '../logger';
import { asserts, buildAssertCustomFunction } from '../rules/common/assertions/asserts';
import { normalizeTypes } from '../types';
import { ConfigTypes } from '../types/redocly-yaml';

import type {
  StyleguideRawConfig,
  ApiStyleguideRawConfig,
  Plugin,
  RawConfig,
  ResolvedApi,
  ResolvedStyleguideConfig,
  RuleConfig,
  DeprecatedInRawConfig,
  ImportedPlugin,
} from './types';
import type { Assertion, AssertionDefinition, RawAssertion } from '../rules/common/assertions';
import type { Asserts, AssertionFn } from '../rules/common/assertions/asserts';
import type { BundleOptions } from '../bundle';
import type { Document, ResolvedRefMap } from '../resolve';

const DEFAULT_PROJECT_PLUGIN_PATHS = ['@theme/plugin.js', '@theme/plugin.cjs', '@theme/plugin.mjs'];

// Cache instantiated plugins during a single execution
const pluginsCache: Map<string, Plugin> = new Map();

export async function resolveConfigFileAndRefs({
  configPath,
  externalRefResolver = new BaseResolver(),
  base = null,
}: Omit<BundleOptions, 'config'> & { configPath?: string }): Promise<{
  document: Document;
  resolvedRefMap: ResolvedRefMap;
}> {
  if (!configPath) {
    throw new Error('Reference to a config is required.\n');
  }

  const document = await externalRefResolver.resolveDocument(base, configPath, true);

  if (document instanceof Error) {
    throw document;
  }

  const types = normalizeTypes(ConfigTypes);

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.ConfigRoot,
    externalRefResolver,
  });

  return { document, resolvedRefMap };
}

export async function resolveConfig({
  rawConfig,
  configPath,
  externalRefResolver,
}: {
  rawConfig: RawConfig;
  configPath?: string;
  externalRefResolver?: BaseResolver;
}): Promise<Config> {
  if (rawConfig.styleguide?.extends?.some(isNotString)) {
    throw new Error(
      `Error configuration format not detected in extends value must contain strings`
    );
  }

  const resolver = externalRefResolver ?? new BaseResolver(getResolveConfig(rawConfig.resolve));

  const apis = await resolveApis({
    rawConfig,
    configPath,
    resolver,
  });

  const styleguide = await resolveStyleguideConfig({
    styleguideConfig: rawConfig.styleguide,
    configPath,
    resolver,
  });

  return new Config(
    {
      ...rawConfig,
      apis,
      styleguide,
    },
    configPath
  );
}

function getDefaultPluginPath(configDir: string): string | undefined {
  for (const pluginPath of DEFAULT_PROJECT_PLUGIN_PATHS) {
    const absolutePluginPath = path.resolve(configDir, pluginPath);
    if (existsSync(absolutePluginPath)) {
      return pluginPath;
    }
  }
  return;
}

export async function resolvePlugins(
  plugins: (string | Plugin)[] | null,
  configDir: string = ''
): Promise<Plugin[]> {
  if (!plugins) return [];

  // TODO: implement or reuse Resolver approach so it will work in node and browser envs
  const requireFunc = async (plugin: string | Plugin): Promise<Plugin | undefined> => {
    if (isString(plugin)) {
      try {
        const maybeAbsolutePluginPath = path.resolve(configDir, plugin);

        const absolutePluginPath = existsSync(maybeAbsolutePluginPath)
          ? maybeAbsolutePluginPath
          : // For plugins imported from packages specifically
            require.resolve(plugin, {
              paths: [
                // Plugins imported from the node_modules in the project directory
                configDir,
                // Plugins imported from the node_modules in the package install directory (for example, npx cache directory)
                __dirname,
              ],
            });

        if (!pluginsCache.has(absolutePluginPath)) {
          let requiredPlugin: ImportedPlugin | undefined;

          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          if (typeof __webpack_require__ === 'function') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            requiredPlugin = __non_webpack_require__(absolutePluginPath);
          } else {
            // Workaround for dynamic imports being transpiled to require by Typescript: https://github.com/microsoft/TypeScript/issues/43329#issuecomment-811606238
            const _importDynamic = new Function('modulePath', 'return import(modulePath)');
            // you can import both cjs and mjs
            const mod = await _importDynamic(pathToFileURL(absolutePluginPath).href);
            requiredPlugin = mod.default || mod;
          }

          const pluginCreatorOptions = { contentDir: configDir };

          const pluginModule = isDeprecatedPluginFormat(requiredPlugin)
            ? requiredPlugin
            : isCommonJsPlugin(requiredPlugin)
            ? await requiredPlugin(pluginCreatorOptions)
            : await requiredPlugin?.default?.(pluginCreatorOptions);

          if (pluginModule?.id && isDeprecatedPluginFormat(requiredPlugin)) {
            logger.info(`Deprecated plugin format detected: ${pluginModule.id}\n`);
          }

          if (pluginModule) {
            pluginsCache.set(absolutePluginPath, {
              ...pluginModule,
              path: plugin,
              absolutePath: absolutePluginPath,
            });
          }
        }

        return pluginsCache.get(absolutePluginPath);
      } catch (e) {
        throw new Error(`Failed to load plugin "${plugin}": ${e.message}\n\n${e.stack}`);
      }
    }

    return plugin;
  };

  const seenPluginIds = new Map<string, string>();

  /**
   * Include the default plugin automatically if it's not in configuration
   */
  const defaultPluginPath = getDefaultPluginPath(configDir);
  if (defaultPluginPath) {
    plugins.push(defaultPluginPath);
  }

  const resolvedPlugins: Set<string> = new Set();

  const instances = await Promise.all(
    plugins.map(async (p) => {
      if (isString(p)) {
        if (isAbsoluteUrl(p)) {
          throw new Error(colorize.red(`We don't support remote plugins yet.`));
        }
        if (resolvedPlugins.has(p)) {
          return;
        }

        resolvedPlugins.add(p);
      }

      const pluginModule: Plugin | undefined = await requireFunc(p);

      if (!pluginModule) {
        return;
      }

      const id = pluginModule.id;
      if (typeof id !== 'string') {
        throw new Error(
          colorize.red(`Plugin must define \`id\` property in ${colorize.blue(p.toString())}.`)
        );
      }

      if (seenPluginIds.has(id)) {
        const pluginPath = seenPluginIds.get(id)!;
        throw new Error(
          colorize.red(
            `Plugin "id" must be unique. Plugin ${colorize.blue(
              p.toString()
            )} uses id "${colorize.blue(id)}" already seen in ${colorize.blue(pluginPath)}`
          )
        );
      }

      seenPluginIds.set(id, p.toString());

      const plugin: Plugin = {
        id,
        ...(pluginModule.configs ? { configs: pluginModule.configs } : {}),
        ...(pluginModule.typeExtension ? { typeExtension: pluginModule.typeExtension } : {}),
      };

      if (pluginModule.rules) {
        if (!pluginModule.rules.oas3 && !pluginModule.rules.oas2 && !pluginModule.rules.async2) {
          throw new Error(
            `Plugin rules must have \`oas3\`, \`oas2\`, \`async2\`, \`async3\` or \`arazzo\` rules "${p}.`
          );
        }
        plugin.rules = {};
        if (pluginModule.rules.oas3) {
          plugin.rules.oas3 = prefixRules(pluginModule.rules.oas3, id);
        }
        if (pluginModule.rules.oas2) {
          plugin.rules.oas2 = prefixRules(pluginModule.rules.oas2, id);
        }
        if (pluginModule.rules.async2) {
          plugin.rules.async2 = prefixRules(pluginModule.rules.async2, id);
        }
        if (pluginModule.rules.async3) {
          plugin.rules.async3 = prefixRules(pluginModule.rules.async3, id);
        }
        if (pluginModule.rules.arazzo1) {
          plugin.rules.arazzo1 = prefixRules(pluginModule.rules.arazzo1, id);
        }
      }
      if (pluginModule.preprocessors) {
        if (
          !pluginModule.preprocessors.oas3 &&
          !pluginModule.preprocessors.oas2 &&
          !pluginModule.preprocessors.async2 &&
          !pluginModule.preprocessors.async3 &&
          !pluginModule.preprocessors.arazzo1
        ) {
          throw new Error(
            `Plugin \`preprocessors\` must have \`oas3\`, \`oas2\` or \`async2\` preprocessors "${p}.`
          );
        }
        plugin.preprocessors = {};
        if (pluginModule.preprocessors.oas3) {
          plugin.preprocessors.oas3 = prefixRules(pluginModule.preprocessors.oas3, id);
        }
        if (pluginModule.preprocessors.oas2) {
          plugin.preprocessors.oas2 = prefixRules(pluginModule.preprocessors.oas2, id);
        }
        if (pluginModule.preprocessors.async2) {
          plugin.preprocessors.async2 = prefixRules(pluginModule.preprocessors.async2, id);
        }
        if (pluginModule.preprocessors.async3) {
          plugin.preprocessors.async3 = prefixRules(pluginModule.preprocessors.async3, id);
        }
        if (pluginModule.preprocessors.arazzo1) {
          plugin.preprocessors.arazzo1 = prefixRules(pluginModule.preprocessors.arazzo1, id);
        }
      }

      if (pluginModule.decorators) {
        if (
          !pluginModule.decorators.oas3 &&
          !pluginModule.decorators.oas2 &&
          !pluginModule.decorators.async2 &&
          !pluginModule.decorators.async3 &&
          !pluginModule.decorators.arazzo1
        ) {
          throw new Error(
            `Plugin \`decorators\` must have \`oas3\`, \`oas2\`, \`async2\` or \`async3\` decorators "${p}.`
          );
        }
        plugin.decorators = {};
        if (pluginModule.decorators.oas3) {
          plugin.decorators.oas3 = prefixRules(pluginModule.decorators.oas3, id);
        }
        if (pluginModule.decorators.oas2) {
          plugin.decorators.oas2 = prefixRules(pluginModule.decorators.oas2, id);
        }
        if (pluginModule.decorators.async2) {
          plugin.decorators.async2 = prefixRules(pluginModule.decorators.async2, id);
        }
        if (pluginModule.decorators.async3) {
          plugin.decorators.async3 = prefixRules(pluginModule.decorators.async3, id);
        }
        if (pluginModule.decorators.arazzo1) {
          plugin.decorators.arazzo1 = prefixRules(pluginModule.decorators.arazzo1, id);
        }
      }

      if (pluginModule.assertions) {
        plugin.assertions = pluginModule.assertions;
      }

      return {
        ...pluginModule,
        ...plugin,
      };
    })
  );

  return instances.filter(isDefined);
}

export async function resolveApis({
  rawConfig,
  configPath = '',
  resolver,
}: {
  rawConfig: RawConfig;
  configPath?: string;
  resolver?: BaseResolver;
}): Promise<Record<string, ResolvedApi>> {
  const { apis = {}, styleguide: styleguideConfig = {} } = rawConfig;
  const resolvedApis: Record<string, ResolvedApi> = {};
  for (const [apiName, apiContent] of Object.entries(apis || {})) {
    if (apiContent.styleguide?.extends?.some(isNotString)) {
      throw new Error(
        `Error configuration format not detected in extends value must contain strings`
      );
    }
    const rawStyleguideConfig = getMergedRawStyleguideConfig(
      styleguideConfig,
      apiContent.styleguide
    );
    const resolvedApiConfig = await resolveStyleguideConfig({
      styleguideConfig: rawStyleguideConfig,
      configPath,
      resolver,
    });
    resolvedApis[apiName] = { ...apiContent, styleguide: resolvedApiConfig };
  }
  return resolvedApis;
}

async function resolveAndMergeNestedStyleguideConfig({
  styleguideConfig,
  configPath = '',
  resolver = new BaseResolver(),
  parentConfigPaths = [],
  extendPaths = [],
}: {
  styleguideConfig?: StyleguideRawConfig;
  configPath?: string;
  resolver?: BaseResolver;
  parentConfigPaths?: string[];
  extendPaths?: string[];
}): Promise<ResolvedStyleguideConfig> {
  if (parentConfigPaths.includes(configPath)) {
    throw new Error(`Circular dependency in config file: "${configPath}"`);
  }
  const plugins = isBrowser
    ? // In browser, we don't support plugins from config file yet
      [defaultPlugin]
    : getUniquePlugins(
        await resolvePlugins(
          [...(styleguideConfig?.plugins || []), defaultPlugin],
          path.dirname(configPath)
        )
      );
  const pluginPaths = styleguideConfig?.plugins
    ?.filter(isString)
    .map((p) => path.resolve(path.dirname(configPath), p));

  const resolvedConfigPath = isAbsoluteUrl(configPath)
    ? configPath
    : configPath && path.resolve(configPath);

  const extendConfigs: ResolvedStyleguideConfig[] = await Promise.all(
    styleguideConfig?.extends?.map(async (presetItem) => {
      if (!isAbsoluteUrl(presetItem) && !path.extname(presetItem)) {
        return resolvePreset(presetItem, plugins);
      }
      const pathItem = isAbsoluteUrl(presetItem)
        ? presetItem
        : isAbsoluteUrl(configPath)
        ? new URL(presetItem, configPath).href
        : path.resolve(path.dirname(configPath), presetItem);
      const extendedStyleguideConfig = await loadExtendStyleguideConfig(pathItem, resolver);
      return await resolveAndMergeNestedStyleguideConfig({
        styleguideConfig: extendedStyleguideConfig,
        configPath: pathItem,
        resolver,
        parentConfigPaths: [...parentConfigPaths, resolvedConfigPath],
        extendPaths,
      });
    }) || []
  );

  const { plugins: mergedPlugins = [], ...styleguide } = mergeExtends([
    ...extendConfigs,
    {
      ...styleguideConfig,
      plugins,
      extends: undefined,
      extendPaths: [...parentConfigPaths, resolvedConfigPath],
      pluginPaths,
    },
  ]);

  return {
    ...styleguide,
    extendPaths: styleguide.extendPaths?.filter((path) => path && !isAbsoluteUrl(path)),
    plugins: getUniquePlugins(mergedPlugins),
    recommendedFallback: styleguideConfig?.recommendedFallback,
    doNotResolveExamples: styleguideConfig?.doNotResolveExamples,
  };
}

export async function resolveStyleguideConfig(opts: {
  styleguideConfig?: StyleguideRawConfig;
  configPath?: string;
  resolver?: BaseResolver;
  parentConfigPaths?: string[];
  extendPaths?: string[];
}): Promise<ResolvedStyleguideConfig> {
  const resolvedStyleguideConfig = await resolveAndMergeNestedStyleguideConfig(opts);

  return {
    ...resolvedStyleguideConfig,
    rules:
      resolvedStyleguideConfig.rules && groupStyleguideAssertionRules(resolvedStyleguideConfig),
  };
}

export function resolvePreset(presetName: string, plugins: Plugin[]): ResolvedStyleguideConfig {
  const { pluginId, configName } = parsePresetName(presetName);
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(
      `Invalid config ${colorize.red(presetName)}: plugin ${pluginId} is not included.`
    );
  }

  const preset = plugin.configs?.[configName];
  if (!preset) {
    throw new Error(
      pluginId
        ? `Invalid config ${colorize.red(
            presetName
          )}: plugin ${pluginId} doesn't export config with name ${configName}.`
        : `Invalid config ${colorize.red(presetName)}: there is no such built-in config.`
    );
  }
  return preset;
}

async function loadExtendStyleguideConfig(
  filePath: string,
  resolver: BaseResolver
): Promise<StyleguideRawConfig> {
  try {
    const { parsed } = (await resolver.resolveDocument(null, filePath)) as Document;
    const rawConfig = transformConfig(parsed as RawConfig & DeprecatedInRawConfig);
    if (!rawConfig.styleguide) {
      throw new Error(`Styleguide configuration format not detected: "${filePath}"`);
    }

    return rawConfig.styleguide;
  } catch (error) {
    throw new Error(`Failed to load "${filePath}": ${error.message}`);
  }
}

function getMergedRawStyleguideConfig(
  rootStyleguideConfig: StyleguideRawConfig,
  apiStyleguideConfig?: ApiStyleguideRawConfig
) {
  const resultLint = {
    ...rootStyleguideConfig,
    ...pickDefined(apiStyleguideConfig),
    rules: { ...rootStyleguideConfig?.rules, ...apiStyleguideConfig?.rules },
    oas2Rules: { ...rootStyleguideConfig?.oas2Rules, ...apiStyleguideConfig?.oas2Rules },
    oas3_0Rules: { ...rootStyleguideConfig?.oas3_0Rules, ...apiStyleguideConfig?.oas3_0Rules },
    oas3_1Rules: { ...rootStyleguideConfig?.oas3_1Rules, ...apiStyleguideConfig?.oas3_1Rules },
    async2Rules: { ...rootStyleguideConfig?.async2Rules, ...apiStyleguideConfig?.async2Rules },
    async3Rules: { ...rootStyleguideConfig?.async3Rules, ...apiStyleguideConfig?.async3Rules },
    arazzo1Rules: { ...rootStyleguideConfig?.arazzo1Rules, ...apiStyleguideConfig?.arazzo1Rules },
    preprocessors: {
      ...rootStyleguideConfig?.preprocessors,
      ...apiStyleguideConfig?.preprocessors,
    },
    oas2Preprocessors: {
      ...rootStyleguideConfig?.oas2Preprocessors,
      ...apiStyleguideConfig?.oas2Preprocessors,
    },
    oas3_0Preprocessors: {
      ...rootStyleguideConfig?.oas3_0Preprocessors,
      ...apiStyleguideConfig?.oas3_0Preprocessors,
    },
    oas3_1Preprocessors: {
      ...rootStyleguideConfig?.oas3_1Preprocessors,
      ...apiStyleguideConfig?.oas3_1Preprocessors,
    },
    decorators: { ...rootStyleguideConfig?.decorators, ...apiStyleguideConfig?.decorators },
    oas2Decorators: {
      ...rootStyleguideConfig?.oas2Decorators,
      ...apiStyleguideConfig?.oas2Decorators,
    },
    oas3_0Decorators: {
      ...rootStyleguideConfig?.oas3_0Decorators,
      ...apiStyleguideConfig?.oas3_0Decorators,
    },
    oas3_1Decorators: {
      ...rootStyleguideConfig?.oas3_1Decorators,
      ...apiStyleguideConfig?.oas3_1Decorators,
    },
    recommendedFallback: apiStyleguideConfig?.extends
      ? false
      : rootStyleguideConfig.recommendedFallback,
  };
  return resultLint;
}

function groupStyleguideAssertionRules({
  rules,
  plugins,
}: ResolvedStyleguideConfig): Record<string, RuleConfig> | undefined {
  if (!rules) {
    return rules;
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions: Assertion[] = [];
  for (const [ruleKey, rule] of Object.entries(rules)) {
    // keep the old assert/ syntax as an alias

    if (
      (ruleKey.startsWith('rule/') || ruleKey.startsWith('assert/')) &&
      typeof rule === 'object' &&
      rule !== null
    ) {
      const assertion = rule as RawAssertion;

      if (plugins) {
        registerCustomAssertions(plugins, assertion);

        // We may have custom assertion inside where block
        for (const context of assertion.where || []) {
          registerCustomAssertions(plugins, context);
        }
      }
      assertions.push({
        ...assertion,
        assertionId: ruleKey,
      });
    } else {
      // If it's not an assertion, keep it as is
      transformedRules[ruleKey] = rule;
    }
  }
  if (assertions.length > 0) {
    transformedRules.assertions = assertions;
  }

  return transformedRules;
}

function registerCustomAssertions(plugins: Plugin[], assertion: AssertionDefinition) {
  for (const field of keysOf(assertion.assertions)) {
    const [pluginId, fn] = field.split('/');

    if (!pluginId || !fn) continue;

    const plugin = plugins.find((plugin) => plugin.id === pluginId);

    if (!plugin) {
      throw Error(colorize.red(`Plugin ${colorize.blue(pluginId)} isn't found.`));
    }

    if (!plugin.assertions || !plugin.assertions[fn]) {
      throw Error(
        `Plugin ${colorize.red(
          pluginId
        )} doesn't export assertions function with name ${colorize.red(fn)}.`
      );
    }

    (asserts as Asserts & { [name: string]: AssertionFn })[field] = buildAssertCustomFunction(
      plugin.assertions[fn]
    );
  }
}

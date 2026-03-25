import * as path from 'path';

import { Document, Source, NormalizedProblem, parseYaml, stringifyYaml } from '../src';
import { StyleguideConfig, resolveStyleguideConfig, resolvePlugins } from '../src/config';
import { Oas3RuleSet } from '../src/oas-types';

import type { RuleConfig, Plugin, DecoratorConfig } from '../src/config';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export function replaceSourceWithRef(results: NormalizedProblem[], cwd?: string) {
  const cwdRegexp = cwd ? new RegExp(cwd + path.sep, 'g') : /$^/;
  return results.map((r) => {
    const mapped = {
      ...r,
      message: r.message.replace(cwdRegexp, ''),
      location: r.location.map((l) => ({
        ...l,
        source: cwd ? path.relative(cwd, l.source.absoluteRef) : l.source.absoluteRef,
      })),
    };
    if (mapped.from) {
      mapped.from = {
        ...mapped.from,
        source: cwd
          ? path.relative(cwd, mapped.from.source.absoluteRef)
          : (mapped.from.source.absoluteRef as any),
      };
    }
    return mapped;
  });
}

export const yamlSerializer = {
  test: () => {
    return true;
  },
  print: (val: any) => {
    return stringifyYaml(val);
  },
};

export async function makeConfigForRuleset(
  rules: Oas3RuleSet,
  plugin?: Partial<Plugin>,
  version: string = 'oas3'
) {
  const rulesConf: Record<string, RuleConfig> = {};
  const ruleId = 'test';
  Object.keys(rules).forEach((name) => {
    rulesConf[`${ruleId}/${name}`] = 'error';
  });
  const plugins = await resolvePlugins([
    {
      ...plugin,
      id: ruleId,
      rules: { [version]: rules },
    },
  ]);

  return new StyleguideConfig({
    plugins,
    rules: rulesConf,
  });
}

export async function makeConfig({
  rules,
  decorators,
  configPath,
}: {
  rules: Record<string, RuleConfig>;
  decorators?: Record<string, DecoratorConfig>;
  configPath?: string;
}) {
  return new StyleguideConfig(
    await resolveStyleguideConfig({
      styleguideConfig: {
        plugins: [],
        extends: [],
        rules,
        decorators,
      },
    }),
    configPath
  );
}

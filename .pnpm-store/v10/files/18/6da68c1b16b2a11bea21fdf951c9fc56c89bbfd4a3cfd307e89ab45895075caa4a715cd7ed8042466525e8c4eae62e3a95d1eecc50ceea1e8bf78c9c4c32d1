import { parseYaml } from '../js-yaml';
import { Source } from '../resolve';
import { StyleguideConfig, mergeExtends, resolvePlugins } from '../config';

import type { Document } from '../resolve';
import type { Oas3RuleSet } from '../oas-types';
import type { RuleConfig, Plugin, ResolvedStyleguideConfig } from '../config/types';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export async function makeConfigForRuleset(rules: Oas3RuleSet, plugin?: Partial<Plugin>) {
  const rulesConf: Record<string, RuleConfig> = {};
  const ruleId = 'test';
  Object.keys(rules).forEach((name) => {
    rulesConf[`${ruleId}/${name}`] = 'error';
  });
  const extendConfigs = [
    (await resolvePlugins([
      {
        ...plugin,
        id: ruleId,
        rules: { oas3: rules },
      },
    ])) as ResolvedStyleguideConfig,
  ];
  if (rules) {
    extendConfigs.push({ rules });
  }
  const styleguide = mergeExtends(extendConfigs);

  return new StyleguideConfig(styleguide);
}

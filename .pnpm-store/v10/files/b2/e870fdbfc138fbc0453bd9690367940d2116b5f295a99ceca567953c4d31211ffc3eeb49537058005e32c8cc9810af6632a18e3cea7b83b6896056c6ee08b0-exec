import { performance } from 'perf_hooks';
import * as colors from 'colorette';
import {
  normalizeTypes,
  BaseResolver,
  resolveDocument,
  detectSpec,
  getTypes,
  normalizeVisitors,
  walkDocument,
  Stats,
  bundle,
} from '@redocly/openapi-core';
import { getFallbackApisOrExit, printExecutionTime } from '../utils/miscellaneous';

import type {
  StatsAccumulator,
  StatsName,
  WalkContext,
  OutputFormat,
  StyleguideConfig,
} from '@redocly/openapi-core';
import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

const statsAccumulator: StatsAccumulator = {
  refs: { metric: '🚗 References', total: 0, color: 'red', items: new Set() },
  externalDocs: { metric: '📦 External Documents', total: 0, color: 'magenta' },
  schemas: { metric: '📈 Schemas', total: 0, color: 'white' },
  parameters: { metric: '👉 Parameters', total: 0, color: 'yellow', items: new Set() },
  links: { metric: '🔗 Links', total: 0, color: 'cyan', items: new Set() },
  pathItems: { metric: '🔀 Path Items', total: 0, color: 'green' },
  webhooks: { metric: '🎣 Webhooks', total: 0, color: 'green' },
  operations: { metric: '👷 Operations', total: 0, color: 'yellow' },
  tags: { metric: '🔖 Tags', total: 0, color: 'white', items: new Set() },
};

function printStatsStylish(statsAccumulator: StatsAccumulator) {
  for (const node in statsAccumulator) {
    const { metric, total, color } = statsAccumulator[node as StatsName];
    process.stderr.write(colors[color](`${metric}: ${total} \n`));
  }
}

function printStatsJson(statsAccumulator: StatsAccumulator) {
  const json: any = {};
  for (const key of Object.keys(statsAccumulator)) {
    json[key] = {
      metric: statsAccumulator[key as StatsName].metric,
      total: statsAccumulator[key as StatsName].total,
    };
  }
  process.stdout.write(JSON.stringify(json, null, 2));
}

function printStatsMarkdown(statsAccumulator: StatsAccumulator) {
  let output = '| Feature  | Count  |\n| --- | --- |\n';
  for (const key of Object.keys(statsAccumulator)) {
    output +=
      '| ' +
      statsAccumulator[key as StatsName].metric +
      ' | ' +
      statsAccumulator[key as StatsName].total +
      ' |\n';
  }
  process.stdout.write(output);
}

function printStats(
  statsAccumulator: StatsAccumulator,
  api: string,
  startedAt: number,
  format: string
) {
  switch (format) {
    case 'stylish':
      process.stderr.write(`Document: ${colors.magenta(api)} stats:\n\n`);
      printStatsStylish(statsAccumulator);
      printExecutionTime('stats', startedAt, api);
      break;
    case 'json':
      printStatsJson(statsAccumulator);
      break;
    case 'markdown':
      printStatsMarkdown(statsAccumulator);
      break;
  }
}

export type StatsOptions = {
  api?: string;
  format: OutputFormat;
} & VerifyConfigOptions;

export async function handleStats({ argv, config, collectSpecData }: CommandArgs<StatsOptions>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  collectSpecData?.(document.parsed);
  const lintConfig: StyleguideConfig = config.styleguide;
  const specVersion = detectSpec(document.parsed);
  const types = normalizeTypes(
    lintConfig.extendTypes(getTypes(specVersion), specVersion),
    lintConfig
  );

  const startedAt = performance.now();
  const ctx: WalkContext = {
    problems: [],
    oasVersion: specVersion,
    visitorsData: {},
  };

  const resolvedRefMap = await resolveDocument({
    rootDocument: document,
    rootType: types.Root,
    externalRefResolver,
  });

  const statsVisitor = normalizeVisitors(
    [
      {
        severity: 'warn',
        ruleId: 'stats',
        visitor: Stats(statsAccumulator),
      },
    ],
    types
  );

  walkDocument({
    document,
    rootType: types.Root,
    normalizedVisitors: statsVisitor,
    resolvedRefMap,
    ctx,
  });

  printStats(statsAccumulator, path, startedAt, argv.format);
}

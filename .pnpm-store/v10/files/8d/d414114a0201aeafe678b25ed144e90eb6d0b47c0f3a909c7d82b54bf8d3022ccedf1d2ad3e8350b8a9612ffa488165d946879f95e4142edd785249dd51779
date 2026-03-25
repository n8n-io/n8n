import type { BundleOutputFormat, Region, Config, RuleSeverity } from '@redocly/openapi-core';
import type { ArgumentsCamelCase } from 'yargs';
import type { LintOptions } from './commands/lint';
import type { BundleOptions } from './commands/bundle';
import type { JoinOptions } from './commands/join';
import type { LoginOptions } from './commands/login';
import type { PushOptions } from './commands/push';
import type { StatsOptions } from './commands/stats';
import type { SplitOptions } from './commands/split';
import type { PreviewDocsOptions } from './commands/preview-docs';
import type { BuildDocsArgv } from './commands/build-docs/types';
import type { PushOptions as CMSPushOptions } from './cms/commands/push';
import type { PushStatusOptions } from './cms/commands/push-status';
import type { PreviewProjectOptions } from './commands/preview-project/types';
import type { TranslationsOptions } from './commands/translations';
import type { EjectOptions } from './commands/eject';

export type Totals = {
  errors: number;
  warnings: number;
  ignored: number;
};
export type Entrypoint = {
  path: string;
  alias?: string;
  output?: string;
};
export const outputExtensions = ['json', 'yaml', 'yml'] as ReadonlyArray<BundleOutputFormat>;
export type OutputExtensions = 'json' | 'yaml' | 'yml' | undefined;
export const regionChoices = ['us', 'eu'] as ReadonlyArray<Region>;
export type CommandOptions =
  | StatsOptions
  | SplitOptions
  | JoinOptions
  | PushOptions
  | CMSPushOptions
  | LintOptions
  | BundleOptions
  | LoginOptions
  | PreviewDocsOptions
  | BuildDocsArgv
  | PushStatusOptions
  | PreviewProjectOptions
  | TranslationsOptions
  | EjectOptions;

export type VerifyConfigOptions = {
  config?: string;
  'lint-config'?: RuleSeverity;
};

export type Skips = {
  'skip-rule'?: string[];
  'skip-decorator'?: string[];
  'skip-preprocessor'?: string[];
};

export type ConfigApis = Pick<Config, 'apis' | 'configFile'>;

export type PushArguments = ArgumentsCamelCase<PushOptions & CMSPushOptions & { apis: string[] }>;

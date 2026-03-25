import type { OutputFormat } from '@redocly/openapi-core';
import type { RawConfigProcessor } from '@redocly/openapi-core/lib/config';
import type { CommandOptions, Skips, VerifyConfigOptions } from '../types';
import type { CommandArgs } from '../wrapper';
export type LintOptions = {
    apis?: string[];
    'max-problems': number;
    extends?: string[];
    format: OutputFormat;
    'generate-ignore-file'?: boolean;
} & Omit<Skips, 'skip-decorator'> & VerifyConfigOptions;
export declare function handleLint({ argv, config, version, collectSpecData, }: CommandArgs<LintOptions>): Promise<void>;
export declare function lintConfigCallback(argv: CommandOptions & Record<string, undefined>, version: string): RawConfigProcessor | undefined;

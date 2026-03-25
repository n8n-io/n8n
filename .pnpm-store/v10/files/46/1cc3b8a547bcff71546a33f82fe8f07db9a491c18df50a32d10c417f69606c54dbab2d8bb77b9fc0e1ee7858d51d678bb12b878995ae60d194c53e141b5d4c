import type { Arguments } from 'yargs';
import type { Config } from '@redocly/openapi-core';
import type { CollectFn } from '@redocly/openapi-core/lib/utils';
import type { CommandOptions } from './types';
export type CommandArgs<T extends CommandOptions> = {
    argv: T;
    config: Config;
    version: string;
    collectSpecData?: CollectFn;
};
export declare function commandWrapper<T extends CommandOptions>(commandHandler?: (wrapperArgs: CommandArgs<T>) => Promise<unknown>): (argv: Arguments<T>) => Promise<void>;

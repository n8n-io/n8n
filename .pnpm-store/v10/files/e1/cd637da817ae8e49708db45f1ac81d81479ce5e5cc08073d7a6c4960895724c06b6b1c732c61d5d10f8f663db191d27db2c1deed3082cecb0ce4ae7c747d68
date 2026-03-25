import type { OutputFormat } from '@redocly/openapi-core';
import type { CommandArgs } from '../../wrapper';
import type { VerifyConfigOptions } from '../../types';
export type PushOptions = {
    apis?: string[];
    organization?: string;
    project: string;
    'mount-path': string;
    branch: string;
    author: string;
    message: string;
    'commit-sha'?: string;
    'commit-url'?: string;
    namespace?: string;
    repository?: string;
    'created-at'?: string;
    files: string[];
    'default-branch': string;
    domain?: string;
    'wait-for-deployment'?: boolean;
    'max-execution-time': number;
    'continue-on-deploy-failures'?: boolean;
    verbose?: boolean;
    format?: Extract<OutputFormat, 'stylish'>;
} & VerifyConfigOptions;
export declare function handlePush({ argv, config, version, }: CommandArgs<PushOptions>): Promise<{
    pushId: string;
} | void>;

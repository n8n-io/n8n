import { handlePush as handleCMSPush } from '../cms/commands/push';
import type { Config, Region } from '@redocly/openapi-core';
import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';
export declare const DESTINATION_REGEX: RegExp;
export type PushOptions = {
    api?: string;
    destination?: string;
    branchName?: string;
    upsert?: boolean;
    'job-id'?: string;
    'batch-size'?: number;
    region?: Region;
    'skip-decorator'?: string[];
    public?: boolean;
    files?: string[];
    organization?: string;
} & VerifyConfigOptions;
export declare function commonPushHandler({ project, 'mount-path': mountPath, }: {
    project?: string;
    'mount-path'?: string;
}): typeof handleCMSPush | (({ argv: { apis, branch, "batch-id": batchId, "job-id": jobId, ...rest }, config, version, }: CommandArgs<BarePushArgs & {
    "batch-id"?: string;
}>) => Promise<void>);
export declare function handlePush({ argv, config }: CommandArgs<PushOptions>): Promise<void>;
export declare function getDestinationProps(destination: string | undefined, organization: string | undefined): {
    organizationId: string | undefined;
    name: string | undefined;
    version: string | undefined;
};
type BarePushArgs = Omit<PushOptions, 'destination' | 'branchName'> & {
    apis?: string[];
    branch?: string;
    destination?: string;
};
export declare const transformPush: (callback: typeof handlePush) => ({ argv: { apis, branch, "batch-id": batchId, "job-id": jobId, ...rest }, config, version, }: CommandArgs<BarePushArgs & {
    "batch-id"?: string;
}>) => Promise<void>;
export declare function getApiRoot({ name, version, config: { apis }, }: {
    name: string;
    version: string;
    config: Config;
}): string;
export {};

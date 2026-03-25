import type { OutputFormat } from '@redocly/openapi-core';
import type { CommandArgs } from '../../wrapper';
import type { DeploymentStatusResponse, PushResponse } from '../api/types';
export type PushStatusOptions = {
    organization: string;
    project: string;
    pushId: string;
    domain?: string;
    config?: string;
    format?: Extract<OutputFormat, 'stylish'>;
    wait?: boolean;
    'max-execution-time'?: number;
    'retry-interval'?: number;
    'start-time'?: number;
    'continue-on-deploy-failures'?: boolean;
    onRetry?: (lasSummary: PushStatusSummary) => void;
};
export interface PushStatusSummary {
    preview: DeploymentStatusResponse;
    production: DeploymentStatusResponse | null;
    commit: PushResponse['commit'];
}
export declare function handlePushStatus({ argv, config, version, }: CommandArgs<PushStatusOptions>): Promise<PushStatusSummary | void>;

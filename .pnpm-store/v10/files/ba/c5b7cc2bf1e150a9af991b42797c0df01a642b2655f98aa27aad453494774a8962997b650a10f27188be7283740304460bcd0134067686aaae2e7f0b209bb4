import Connection from '../connection/index.js';
import { ShardStatusList } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ShardsGetter extends CommandBase {
    private className?;
    private tenant?;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    withTenant: (tenant: string) => this;
    validateClassName: () => void;
    validate: () => void;
    do: () => Promise<ShardStatusList>;
}
export declare function getShards(client: Connection, className: any, tenant?: string): Promise<{
    name?: string | undefined;
    status?: string | undefined;
    vectorQueueSize?: number | undefined;
}[]>;

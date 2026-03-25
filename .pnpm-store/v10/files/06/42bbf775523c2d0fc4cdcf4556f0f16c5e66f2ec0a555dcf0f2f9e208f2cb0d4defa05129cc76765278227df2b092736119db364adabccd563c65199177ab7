import Connection from '../connection/index.js';
import { ShardStatusList } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ShardsUpdater extends CommandBase {
    private className;
    private shards;
    private status;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    validateClassName: () => void;
    withStatus: (status: string) => this;
    validateStatus: () => void;
    validate: () => void;
    updateShards: () => Promise<any>;
    do: () => Promise<ShardStatusList>;
}

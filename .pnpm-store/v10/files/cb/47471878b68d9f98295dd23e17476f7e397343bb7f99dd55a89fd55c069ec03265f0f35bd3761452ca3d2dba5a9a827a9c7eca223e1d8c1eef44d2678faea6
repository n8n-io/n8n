import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ShardUpdater extends CommandBase {
    private className;
    private shardName;
    private status;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    validateClassName: () => void;
    withShardName: (shardName: string) => this;
    validateShardName: () => void;
    withStatus: (status: string) => this;
    validateStatus: () => void;
    validate: () => void;
    do: () => any;
}
export declare function updateShard(client: Connection, className: string, shardName: string, status: string): any;

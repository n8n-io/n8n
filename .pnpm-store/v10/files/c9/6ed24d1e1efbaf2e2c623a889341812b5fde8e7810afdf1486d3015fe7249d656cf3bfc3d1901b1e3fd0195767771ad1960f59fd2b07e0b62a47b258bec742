import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class ShardUpdater extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.withShardName = (shardName) => {
            this.shardName = shardName;
            return this;
        };
        this.validateShardName = () => {
            if (!isValidStringProperty(this.shardName)) {
                this.addError('shardName must be set - set with .withShardName(shardName)');
            }
        };
        this.withStatus = (status) => {
            this.status = status;
            return this;
        };
        this.validateStatus = () => {
            if (!isValidStringProperty(this.status)) {
                this.addError('status must be set - set with .withStatus(status)');
            }
        };
        this.validate = () => {
            this.validateClassName();
            this.validateShardName();
            this.validateStatus();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error(`invalid usage: ${this.errors.join(', ')}`));
            }
            return updateShard(this.client, this.className, this.shardName, this.status);
        };
    }
}
export function updateShard(client, className, shardName, status) {
    const path = `/schema/${className}/shards/${shardName}`;
    return client.put(path, { status: status }, true);
}

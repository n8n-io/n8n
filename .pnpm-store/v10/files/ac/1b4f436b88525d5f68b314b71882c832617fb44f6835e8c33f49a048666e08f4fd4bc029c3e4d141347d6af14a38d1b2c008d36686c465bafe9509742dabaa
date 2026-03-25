"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateShard = void 0;
const commandBase_js_1 = require("../validation/commandBase.js");
const string_js_1 = require("../validation/string.js");
class ShardUpdater extends commandBase_js_1.CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.validateClassName = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.withShardName = (shardName) => {
            this.shardName = shardName;
            return this;
        };
        this.validateShardName = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.shardName)) {
                this.addError('shardName must be set - set with .withShardName(shardName)');
            }
        };
        this.withStatus = (status) => {
            this.status = status;
            return this;
        };
        this.validateStatus = () => {
            if (!(0, string_js_1.isValidStringProperty)(this.status)) {
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
exports.default = ShardUpdater;
function updateShard(client, className, shardName, status) {
    const path = `/schema/${className}/shards/${shardName}`;
    return client.put(path, { status: status }, true);
}
exports.updateShard = updateShard;

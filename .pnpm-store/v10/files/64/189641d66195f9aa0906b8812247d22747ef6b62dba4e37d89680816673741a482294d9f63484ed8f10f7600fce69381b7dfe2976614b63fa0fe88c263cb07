import { CommandBase } from '../validation/commandBase.js';
import { isValidStringProperty } from '../validation/string.js';
export default class ShardsGetter extends CommandBase {
    constructor(client) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.validateClassName = () => {
            if (!isValidStringProperty(this.className)) {
                this.addError('className must be set - set with .withClassName(className)');
            }
        };
        this.validate = () => {
            this.validateClassName();
        };
        this.do = () => {
            this.validate();
            if (this.errors.length > 0) {
                return Promise.reject(new Error(`invalid usage: ${this.errors.join(', ')}`));
            }
            return getShards(this.client, this.className, this.tenant);
        };
    }
}
export function getShards(client, className, tenant) {
    const path = `/schema/${className}/shards${tenant ? `?tenant=${tenant}` : ''}`;
    return client.get(path);
}

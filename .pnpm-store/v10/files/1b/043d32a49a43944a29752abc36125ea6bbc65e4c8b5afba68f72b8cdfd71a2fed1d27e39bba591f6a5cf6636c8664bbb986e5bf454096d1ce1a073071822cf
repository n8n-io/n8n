"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShards = void 0;
const commandBase_js_1 = require("../validation/commandBase.js");
const string_js_1 = require("../validation/string.js");
class ShardsGetter extends commandBase_js_1.CommandBase {
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
            if (!(0, string_js_1.isValidStringProperty)(this.className)) {
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
exports.default = ShardsGetter;
function getShards(client, className, tenant) {
    const path = `/schema/${className}/shards${tenant ? `?tenant=${tenant}` : ''}`;
    return client.get(path);
}
exports.getShards = getShards;

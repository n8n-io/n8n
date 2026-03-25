"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class Getter extends commandBase_js_1.CommandBase {
    constructor(client, objectsPath) {
        super(client);
        this.withClassName = (className) => {
            this.className = className;
            return this;
        };
        this.withAfter = (id) => {
            this.after = id;
            return this;
        };
        this.withLimit = (limit) => {
            this.limit = limit;
            return this;
        };
        this.withTenant = (tenant) => {
            this.tenant = tenant;
            return this;
        };
        this.extendAdditional = (prop) => {
            this.additional = [...this.additional, prop];
            return this;
        };
        this.withAdditional = (additionalFlag) => this.extendAdditional(additionalFlag);
        this.withVector = () => this.extendAdditional('vector');
        this.do = () => {
            if (this.errors.length > 0) {
                return Promise.reject(new Error('invalid usage: ' + this.errors.join(', ')));
            }
            return this.objectsPath
                .buildGet(this.className, this.limit, this.additional, this.after, this.tenant)
                .then((path) => {
                return this.client.get(path);
            });
        };
        this.objectsPath = objectsPath;
        this.additional = [];
    }
    validate() {
        // nothing to validate
    }
}
exports.default = Getter;

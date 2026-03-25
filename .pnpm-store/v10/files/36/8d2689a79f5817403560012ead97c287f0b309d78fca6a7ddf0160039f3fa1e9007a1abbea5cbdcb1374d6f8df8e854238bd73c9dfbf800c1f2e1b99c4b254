"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class TenantsExists extends commandBase_js_1.CommandBase {
    constructor(client, className, tenant) {
        super(client);
        this.validate = () => {
            // nothing to validate
        };
        this.do = () => {
            return this.client.head(`/schema/${this.className}/tenants/${this.tenant}`, undefined);
        };
        this.className = className;
        this.tenant = tenant;
    }
}
exports.default = TenantsExists;

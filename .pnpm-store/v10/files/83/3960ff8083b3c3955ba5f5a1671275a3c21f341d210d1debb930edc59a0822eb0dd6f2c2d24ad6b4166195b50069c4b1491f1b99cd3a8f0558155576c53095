"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class TenantsUpdater extends commandBase_js_1.CommandBase {
    constructor(client, className, tenants) {
        super(client);
        this.validate = () => {
            // nothing to validate
        };
        this.do = () => {
            return this.client.put(`/schema/${this.className}/tenants`, this.tenants);
        };
        this.className = className;
        this.tenants = tenants;
    }
}
exports.default = TenantsUpdater;

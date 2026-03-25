"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commandBase_js_1 = require("../validation/commandBase.js");
class TenantsGetter extends commandBase_js_1.CommandBase {
    constructor(client, className) {
        super(client);
        this.validate = () => {
            // nothing to validate
        };
        this.do = () => {
            return this.client.get(`/schema/${this.className}/tenants`);
        };
        this.className = className;
    }
}
exports.default = TenantsGetter;

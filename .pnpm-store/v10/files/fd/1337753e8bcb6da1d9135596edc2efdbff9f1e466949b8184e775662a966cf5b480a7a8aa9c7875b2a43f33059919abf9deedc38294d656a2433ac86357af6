import { CommandBase } from '../validation/commandBase.js';
export default class TenantsExists extends CommandBase {
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

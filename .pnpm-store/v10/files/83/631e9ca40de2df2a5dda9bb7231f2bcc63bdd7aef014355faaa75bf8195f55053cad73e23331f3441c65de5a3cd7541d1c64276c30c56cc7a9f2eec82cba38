import { CommandBase } from '../validation/commandBase.js';
export default class TenantsDeleter extends CommandBase {
    constructor(client, className, tenants) {
        super(client);
        this.validate = () => {
            // nothing to validate
        };
        this.do = () => {
            return this.client.delete(`/schema/${this.className}/tenants`, this.tenants, false);
        };
        this.className = className;
        this.tenants = tenants;
    }
}

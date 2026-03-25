import { CommandBase } from '../validation/commandBase.js';
export default class TenantsUpdater extends CommandBase {
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

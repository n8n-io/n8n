import { CommandBase } from '../validation/commandBase.js';
export default class TenantsGetter extends CommandBase {
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

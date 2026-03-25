import Connection from '../connection/index.js';
import { Tenant } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class TenantsUpdater extends CommandBase {
    private className;
    private tenants;
    constructor(client: Connection, className: string, tenants: Array<Tenant>);
    validate: () => void;
    do: () => Promise<Array<Tenant>>;
}

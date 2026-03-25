import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class TenantsDeleter extends CommandBase {
    private className;
    private tenants;
    constructor(client: Connection, className: string, tenants: Array<string>);
    validate: () => void;
    do: () => Promise<void>;
}

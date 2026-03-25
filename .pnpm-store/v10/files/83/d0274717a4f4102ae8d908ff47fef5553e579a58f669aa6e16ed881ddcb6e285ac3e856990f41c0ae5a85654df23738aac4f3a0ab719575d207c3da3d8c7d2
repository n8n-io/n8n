import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class TenantsExists extends CommandBase {
    private className;
    private tenant;
    constructor(client: Connection, className: string, tenant: string);
    validate: () => void;
    do: () => Promise<boolean>;
}

import Connection from '../connection/index.js';
import { Tenant } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class TenantsGetter extends CommandBase {
    private className;
    constructor(client: Connection, className: string);
    validate: () => void;
    do: () => Promise<Array<Tenant>>;
}

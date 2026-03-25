import Connection from '../connection/index.js';
import { WeaviateSchema } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class SchemaGetter extends CommandBase {
    constructor(client: Connection);
    validate(): void;
    do: () => Promise<WeaviateSchema>;
}

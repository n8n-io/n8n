import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class RawGraphQL extends CommandBase {
    private query?;
    constructor(client: Connection);
    withQuery: (query: string) => this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    do: () => Promise<any>;
}

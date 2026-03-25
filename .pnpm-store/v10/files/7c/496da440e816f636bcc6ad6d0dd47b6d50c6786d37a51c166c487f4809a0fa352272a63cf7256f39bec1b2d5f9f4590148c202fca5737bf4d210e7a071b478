import Connection from '../connection/index.js';
import { C11yWordsResponse } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ConceptsGetter extends CommandBase {
    private concept?;
    constructor(client: Connection);
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    withConcept: (concept: string) => this;
    validate: () => void;
    do: () => Promise<C11yWordsResponse>;
}

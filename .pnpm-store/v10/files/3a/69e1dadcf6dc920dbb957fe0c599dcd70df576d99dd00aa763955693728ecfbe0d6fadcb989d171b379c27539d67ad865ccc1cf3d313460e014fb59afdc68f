import Connection from '../connection/index.js';
import { C11yExtension } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ExtensionCreator extends CommandBase {
    private concept?;
    private definition?;
    private weight?;
    constructor(client: Connection);
    withConcept: (concept: string) => this;
    withDefinition: (definition: string) => this;
    withWeight: (weight: number) => this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    payload: () => C11yExtension;
    do: () => Promise<C11yExtension>;
}

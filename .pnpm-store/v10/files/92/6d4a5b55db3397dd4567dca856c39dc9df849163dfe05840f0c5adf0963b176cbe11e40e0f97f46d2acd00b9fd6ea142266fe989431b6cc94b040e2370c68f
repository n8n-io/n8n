import Connection from '../connection/index.js';
import { WeaviateClass } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ClassUpdater extends CommandBase {
    private class;
    constructor(client: Connection);
    withClass: (classObj: WeaviateClass) => this;
    validateClass: () => void;
    validate(): void;
    do: () => Promise<WeaviateClass>;
}

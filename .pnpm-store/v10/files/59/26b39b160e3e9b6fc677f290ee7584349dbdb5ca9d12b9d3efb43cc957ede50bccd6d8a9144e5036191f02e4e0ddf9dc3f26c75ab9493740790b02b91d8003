import Connection from '../connection/index.js';
import { WeaviateClass } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ClassGetter extends CommandBase {
    private className?;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    validateClassName: () => void;
    validate: () => void;
    do: () => Promise<WeaviateClass>;
}

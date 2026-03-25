import Connection from '../connection/index.js';
import { VectorConfig } from '../index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class VectorAdder<T> extends CommandBase {
    private className;
    private vectors;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    withVectors: (vectors: Record<string, VectorConfig>) => this;
    validateClassName: () => void;
    validate: () => void;
    do: () => Promise<void>;
}

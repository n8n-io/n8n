import Connection from '../connection/index.js';
import { NodesStatusResponse } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class NodesStatusGetter extends CommandBase {
    private className?;
    private output?;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    withOutput: (output: 'minimal' | 'verbose') => this;
    validate(): void;
    do: () => Promise<NodesStatusResponse>;
}

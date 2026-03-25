import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ClassExists extends CommandBase {
    private className?;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    validateClassName: () => void;
    validate: () => void;
    do: () => Promise<boolean>;
}

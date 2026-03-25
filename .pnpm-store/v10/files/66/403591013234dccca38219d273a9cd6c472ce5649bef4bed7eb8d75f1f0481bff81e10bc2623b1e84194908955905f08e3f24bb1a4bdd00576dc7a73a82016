import Connection from '../connection/index.js';
import { Classification } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ClassificationsGetter extends CommandBase {
    private id?;
    constructor(client: Connection);
    withId: (id: string) => this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validateId: () => void;
    validate: () => void;
    do: () => Promise<Classification>;
}

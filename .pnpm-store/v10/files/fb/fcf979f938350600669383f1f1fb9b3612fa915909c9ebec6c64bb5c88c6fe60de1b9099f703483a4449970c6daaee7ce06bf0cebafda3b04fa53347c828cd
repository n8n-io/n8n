import Connection from '../connection/index.js';
import { Reference } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ReferencePayloadBuilder extends CommandBase {
    private className?;
    private id?;
    constructor(client: Connection);
    withId: (id: string) => this;
    withClassName(className: string): this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    payload: () => Reference;
    do(): Promise<any>;
}

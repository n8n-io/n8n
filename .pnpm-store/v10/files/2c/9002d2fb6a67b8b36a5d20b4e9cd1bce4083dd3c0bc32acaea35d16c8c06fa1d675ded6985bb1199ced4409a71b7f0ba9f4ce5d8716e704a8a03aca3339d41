import Connection from '../connection/index.js';
import { Properties } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class Validator extends CommandBase {
    private className?;
    private id?;
    private properties?;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    withProperties: (properties: Properties) => this;
    withId: (id: string) => this;
    validateClassName: () => void;
    payload: () => {
        properties: {
            [key: string]: unknown;
        } | undefined;
        class: string | undefined;
        id: string | undefined;
    };
    validate: () => void;
    do: () => Promise<boolean>;
}

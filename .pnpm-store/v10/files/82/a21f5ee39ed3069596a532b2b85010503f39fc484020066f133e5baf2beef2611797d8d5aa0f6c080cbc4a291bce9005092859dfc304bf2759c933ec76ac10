import Connection from '../connection/index.js';
import { Property } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class PropertyCreator extends CommandBase {
    private className;
    private property;
    constructor(client: Connection);
    withClassName: (className: string) => this;
    withProperty: (property: Property) => this;
    validateClassName: () => void;
    validateProperty: () => void;
    validate: () => void;
    do: () => Promise<Property>;
}

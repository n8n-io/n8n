import Connection from '../connection/index.js';
import { BatchReference } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ReferencesBatcher extends CommandBase {
    private fromClassName?;
    private fromId?;
    private fromRefProp?;
    private toClassName?;
    private toId?;
    constructor(client: Connection);
    withFromId: (id: string) => this;
    withToId: (id: string) => this;
    withFromClassName: (className: string) => this;
    withFromRefProp: (refProp: string) => this;
    withToClassName(className: string): this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validate: () => void;
    payload: () => BatchReference;
    do: () => Promise<any>;
}

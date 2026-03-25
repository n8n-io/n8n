import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class Deleter extends CommandBase {
    private className;
    private consistencyLevel?;
    private id;
    private tenant?;
    private objectsPath;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withId: (id: string) => this;
    withClassName: (className: string) => this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withTenant: (tenant: string) => this;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validateId: () => void;
    validate: () => void;
    do: () => Promise<any>;
}

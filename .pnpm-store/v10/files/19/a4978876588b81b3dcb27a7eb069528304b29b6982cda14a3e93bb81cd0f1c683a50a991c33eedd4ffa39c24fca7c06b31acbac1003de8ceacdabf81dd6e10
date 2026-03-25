import Connection from '../connection/index.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class Checker extends CommandBase {
    private className;
    private consistencyLevel?;
    private id;
    private tenant?;
    private objectsPath;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withId: (id: string) => this;
    withClassName: (className: string) => this;
    withTenant: (tenant: string) => this;
    withConsistencyLevel: (consistencyLevel: ConsistencyLevel) => this;
    buildPath: () => Promise<string>;
    validateIsSet: (prop: string | undefined | null, name: string, setter: string) => void;
    validateId: () => void;
    validate: () => void;
    do: () => Promise<boolean>;
}

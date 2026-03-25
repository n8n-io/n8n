import Connection from '../connection/index.js';
import { Properties, WeaviateObject } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class Merger extends CommandBase {
    private className;
    private consistencyLevel?;
    private id;
    private objectsPath;
    private properties?;
    private tenant?;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withProperties: (properties: Properties) => this;
    withClassName: (className: string) => this;
    withId: (id: string) => this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withTenant: (tenant: string) => this;
    validateClassName: () => void;
    validateId: () => void;
    payload: () => WeaviateObject;
    validate: () => void;
    do: () => Promise<any>;
}

import Connection from '../connection/index.js';
import { Properties, WeaviateObject } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class Updater extends CommandBase {
    private className;
    private consistencyLevel?;
    private id;
    private objectsPath;
    private properties?;
    private tenant?;
    private vector?;
    private vectors?;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withVector: (vector: number[]) => this;
    withVectors: (vectors: Record<string, number[]>) => this;
    withProperties: (properties: Properties) => this;
    withId: (id: string) => this;
    withClassName: (className: string) => this;
    withTenant: (tenant: string) => this;
    validateClassName: () => void;
    validateId: () => void;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    payload: () => WeaviateObject;
    validate: () => void;
    do: () => Promise<any>;
}

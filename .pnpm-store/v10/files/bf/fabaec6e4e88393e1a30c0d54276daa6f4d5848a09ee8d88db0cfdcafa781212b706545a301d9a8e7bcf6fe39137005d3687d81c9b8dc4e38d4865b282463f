import Connection from '../connection/index.js';
import { Properties, WeaviateObject } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class Creator extends CommandBase {
    private className?;
    private consistencyLevel?;
    private id?;
    private objectsPath;
    private properties?;
    private vector?;
    private vectors?;
    private tenant?;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withVector: (vector: number[]) => this;
    withVectors: (vectors: Record<string, number[]>) => this;
    withClassName: (className: string) => this;
    withProperties: (properties: Properties) => this;
    withId: (id: string) => this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withTenant: (tenant: string) => this;
    validateClassName: () => void;
    payload: () => WeaviateObject;
    validate: () => void;
    do: () => Promise<WeaviateObject>;
}

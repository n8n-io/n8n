import Connection from '../connection/index.js';
import { WeaviateObject } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { ObjectsPath } from './path.js';
import { ConsistencyLevel } from './replication.js';
export default class GetterById extends CommandBase {
    private additional;
    private className;
    private id;
    private consistencyLevel?;
    private nodeName?;
    private tenant?;
    private objectsPath;
    constructor(client: Connection, objectsPath: ObjectsPath);
    withId: (id: string) => this;
    withClassName: (className: string) => this;
    withTenant: (tenant: string) => this;
    extendAdditional: (prop: string) => this;
    withAdditional: (additionalFlag: string) => this;
    withVector: () => this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withNodeName: (nodeName: string) => this;
    validateId: () => void;
    validate: () => void;
    buildPath: () => Promise<string>;
    do: () => Promise<WeaviateObject>;
}

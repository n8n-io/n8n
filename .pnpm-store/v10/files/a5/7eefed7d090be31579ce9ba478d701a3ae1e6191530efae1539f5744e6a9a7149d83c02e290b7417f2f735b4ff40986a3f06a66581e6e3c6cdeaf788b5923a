import Connection from '../connection/index.js';
import { ConsistencyLevel } from '../data/replication.js';
import { BatchRequest, WeaviateObject, WeaviateObjectsGet } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ObjectsBatcher extends CommandBase {
    private consistencyLevel?;
    objects: WeaviateObject[];
    constructor(client: Connection);
    /**
     * can be called as:
     *  - withObjects(...[obj1, obj2, obj3])
     *  - withObjects(obj1, obj2, obj3)
     *  - withObjects(obj1)
     * @param  {...WeaviateObject[]} objects
     */
    withObjects(...objects: WeaviateObject[]): this;
    withObject(object: WeaviateObject): this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    payload: () => BatchRequest;
    validateObjectCount: () => void;
    validate: () => void;
    do: () => Promise<WeaviateObjectsGet[]>;
}

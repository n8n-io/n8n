import Connection from '../connection/index.js';
import { ConsistencyLevel } from '../data/replication.js';
import { BatchReference, BatchReferenceResponse } from '../openapi/types.js';
import { BeaconPath } from '../utils/beaconPath.js';
import { CommandBase } from '../validation/commandBase.js';
export default class ReferencesBatcher extends CommandBase {
    private beaconPath;
    private consistencyLevel?;
    references: BatchReference[];
    constructor(client: Connection, beaconPath: BeaconPath);
    /**
     * can be called as:
     *  - withReferences(...[ref1, ref2, ref3])
     *  - withReferences(ref1, ref2, ref3)
     *  - withReferences(ref1)
     * @param  {...BatchReference[]} references
     */
    withReferences(...references: BatchReference[]): this;
    withReference(reference: BatchReference): this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    payload: () => BatchReference[];
    validateReferenceCount: () => void;
    validate: () => void;
    do: () => Promise<BatchReferenceResponse[]>;
    rebuildReferencePromise: (reference: BatchReference) => Promise<BatchReference>;
}

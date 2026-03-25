import Connection from '../connection/index.js';
import { ConsistencyLevel } from '../data/replication.js';
import { BatchDelete, BatchDeleteResponse, WhereFilter } from '../openapi/types.js';
import { CommandBase } from '../validation/commandBase.js';
import { DeleteOutput } from './index.js';
export default class ObjectsBatchDeleter extends CommandBase {
    private className?;
    private consistencyLevel?;
    private dryRun?;
    private output?;
    private whereFilter?;
    private tenant?;
    constructor(client: Connection);
    withClassName(className: string): this;
    withWhere(whereFilter: WhereFilter): this;
    withOutput(output: DeleteOutput): this;
    withDryRun(dryRun: boolean): this;
    withConsistencyLevel: (cl: ConsistencyLevel) => this;
    withTenant(tenant: string): this;
    payload: () => BatchDelete;
    validateClassName: () => void;
    validateWhereFilter: () => void;
    validate: () => void;
    do: () => Promise<BatchDeleteResponse>;
}

import { EntityTarget } from "../common/EntityTarget";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when no result could be found in methods which are not allowed to return undefined or an empty set.
 */
export declare class EntityNotFoundError extends TypeORMError {
    readonly entityClass: EntityTarget<any>;
    readonly criteria: any;
    constructor(entityClass: EntityTarget<any>, criteria: any);
    private stringifyTarget;
    private stringifyCriteria;
}

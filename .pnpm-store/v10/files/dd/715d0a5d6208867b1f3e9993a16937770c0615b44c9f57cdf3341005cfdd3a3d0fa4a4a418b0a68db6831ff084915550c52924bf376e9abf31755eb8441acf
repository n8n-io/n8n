import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when query execution has failed.
 */
export declare class QueryFailedError<T extends Error = Error> extends TypeORMError {
    readonly query: string;
    readonly parameters: any[] | undefined;
    readonly driverError: T;
    constructor(query: string, parameters: any[] | undefined, driverError: T);
}

import { ExtendableError } from 'ts-error';
import { Status } from '../Status';
/**
 * Service implementations may throw this error to report gRPC errors to
 * clients.
 */
export declare class ServerError extends ExtendableError {
    /**
     * Status code to report to the client.
     */
    code: Status;
    /**
     * Status message to report to the client.
     */
    details: string;
    constructor(code: Status, details: string);
    static [Symbol.hasInstance](instance: any): boolean;
}

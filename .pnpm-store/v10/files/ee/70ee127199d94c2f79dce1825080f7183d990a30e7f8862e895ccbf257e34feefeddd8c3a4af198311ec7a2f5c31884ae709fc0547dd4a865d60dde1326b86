import { ExtendableError } from 'ts-error';
import { Status } from '../Status';
/**
 * Represents gRPC errors returned from client calls.
 */
export declare class ClientError extends ExtendableError {
    /**
     * Path of the client call.
     *
     * Has format `/package.Service/Method`.
     */
    path: string;
    /**
     * Status code reported by the server.
     */
    code: Status;
    /**
     * Status message reported by the server.
     */
    details: string;
    constructor(path: string, code: Status, details: string);
    static [Symbol.hasInstance](instance: any): boolean;
}

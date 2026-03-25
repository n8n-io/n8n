import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageResponseOptions } from './MessageResponse';
import { MessageResponse } from './MessageResponse';
export declare enum CompareResult {
    /**
     * Indicates that the target entry exists and contains the specified attribute with the indicated value
     */
    compareTrue = 6,
    /**
     * Indicates that the target entry exists and contains the specified attribute, but that the attribute does not have the indicated value
     */
    compareFalse = 5,
    /**
     * Indicates that the target entry exists but does not contain the specified attribute
     */
    noSuchAttribute = 22,
    /**
     * Indicates that the target entry does not exist
     */
    noSuchObject = 50
}
export declare class CompareResponse extends MessageResponse {
    protocolOperation: ProtocolOperation;
    constructor(options: MessageResponseOptions);
}

import { StatusObject, WriteObject } from './call-interface';
import { Metadata } from './metadata';
/**
 * Filter classes represent related per-call logic and state that is primarily
 * used to modify incoming and outgoing data. All async filters can be
 * rejected. The rejection error must be a StatusObject, and a rejection will
 * cause the call to end with that status.
 */
export interface Filter {
    sendMetadata(metadata: Promise<Metadata>): Promise<Metadata>;
    receiveMetadata(metadata: Metadata): Metadata;
    sendMessage(message: Promise<WriteObject>): Promise<WriteObject>;
    receiveMessage(message: Promise<Buffer>): Promise<Buffer>;
    receiveTrailers(status: StatusObject): StatusObject;
}
export declare abstract class BaseFilter implements Filter {
    sendMetadata(metadata: Promise<Metadata>): Promise<Metadata>;
    receiveMetadata(metadata: Metadata): Metadata;
    sendMessage(message: Promise<WriteObject>): Promise<WriteObject>;
    receiveMessage(message: Promise<Buffer>): Promise<Buffer>;
    receiveTrailers(status: StatusObject): StatusObject;
}
export interface FilterFactory<T extends Filter> {
    createFilter(): T;
}

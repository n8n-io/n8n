import type { BerReader, BerWriter } from 'asn1';
import { ProtocolOperation } from '../ProtocolOperation';
import type { MessageOptions } from './Message';
import { Message } from './Message';
export declare const SASL_MECHANISMS: readonly ["EXTERNAL", "PLAIN", "DIGEST-MD5", "SCRAM-SHA-1"];
export type SaslMechanism = (typeof SASL_MECHANISMS)[number];
export interface BindRequestMessageOptions extends MessageOptions {
    dn?: string;
    password?: string;
    mechanism?: string;
}
export declare class BindRequest extends Message {
    protocolOperation: ProtocolOperation;
    dn: string;
    password?: string;
    mechanism: string | undefined;
    constructor(options: BindRequestMessageOptions);
    writeMessage(writer: BerWriter): void;
    parseMessage(reader: BerReader): void;
}

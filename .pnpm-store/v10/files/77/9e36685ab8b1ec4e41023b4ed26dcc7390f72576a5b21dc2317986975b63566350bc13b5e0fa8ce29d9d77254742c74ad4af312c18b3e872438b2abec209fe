import { Duplex } from 'stream';
import * as tls from 'tls';
import { Socket } from 'net';
import { EventEmitter } from 'events';
import Debug from './debug';
import Message from './message';
import OutgoingMessageStream from './outgoing-message-stream';
declare class MessageIO extends EventEmitter {
    socket: Socket;
    debug: Debug;
    tlsNegotiationComplete: boolean;
    private incomingMessageStream;
    outgoingMessageStream: OutgoingMessageStream;
    securePair?: {
        cleartext: tls.TLSSocket;
        encrypted: Duplex;
    };
    incomingMessageIterator: AsyncIterableIterator<Message>;
    constructor(socket: Socket, packetSize: number, debug: Debug);
    packetSize(...args: [number]): number;
    startTls(credentialsDetails: tls.SecureContextOptions, hostname: string, trustServerCertificate: boolean): Promise<void>;
    sendMessage(packetType: number, data?: Buffer, resetConnection?: boolean): Message;
    /**
     * Read the next incoming message from the socket.
     */
    readMessage(): Promise<Message>;
}
export default MessageIO;

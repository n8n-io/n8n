import { Duplex } from 'stream';
import Debug from './debug';
import Message from './message';
declare class OutgoingMessageStream extends Duplex {
    packetSize: number;
    debug: Debug;
    bl: any;
    currentMessage: Message | undefined;
    constructor(debug: Debug, { packetSize }: {
        packetSize: number;
    });
    _write(message: Message, _encoding: string, callback: (err?: Error | null) => void): void;
    _read(_size: number): void;
}
export default OutgoingMessageStream;

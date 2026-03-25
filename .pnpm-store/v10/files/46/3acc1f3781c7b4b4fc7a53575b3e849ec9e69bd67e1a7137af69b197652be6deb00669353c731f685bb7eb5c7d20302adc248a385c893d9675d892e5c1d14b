import { Readable } from 'readable-stream';
import { Packet } from 'mqtt-packet';
import { DoneCallback } from './shared';
export interface IStoreOptions {
    clean?: boolean;
}
export type PacketCallback = (error?: Error, packet?: Packet) => void;
export interface IStore {
    put(packet: Packet, cb: DoneCallback): IStore;
    createStream(): Readable;
    del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore;
    get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): IStore;
    close(cb: DoneCallback): void;
}
export default class Store implements IStore {
    private options;
    private _inflights;
    constructor(options?: IStoreOptions);
    put(packet: Packet, cb: DoneCallback): this;
    createStream(): Readable;
    del(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): this;
    get(packet: Pick<Packet, 'messageId'>, cb: PacketCallback): this;
    close(cb: DoneCallback): void;
}

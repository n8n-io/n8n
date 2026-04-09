export declare const HEADER_LENGTH = 8;
export declare const TYPE: {
    [key: string]: number;
};
export declare const OFFSET: {
    Type: number;
    Status: number;
    Length: number;
    SPID: number;
    PacketID: number;
    Window: number;
};
export declare class Packet {
    buffer: Buffer;
    constructor(typeOrBuffer: Buffer | number);
    setLength(): void;
    length(): number;
    resetConnection(reset: boolean): void;
    last(last?: boolean): boolean;
    ignore(last: boolean): void;
    isLast(): boolean;
    packetId(packetId?: number): number;
    addData(data: Buffer): this;
    data(): Buffer<ArrayBuffer>;
    type(): number;
    statusAsString(): string;
    headerToString(indent?: string): string;
    dataToString(indent?: string): string;
    toString(indent?: string): string;
    payloadString(): string;
}
export declare function isPacketComplete(potentialPacketBuffer: Buffer): boolean;
export declare function packetLength(potentialPacketBuffer: Buffer): number;

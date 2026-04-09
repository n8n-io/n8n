import type { Checksum, SourceData } from "@smithy/types";
/**
 * @internal
 */
export declare class Md5 implements Checksum {
    private state;
    private buffer;
    private bufferLength;
    private bytesHashed;
    private finished;
    constructor();
    update(sourceData: SourceData): void;
    digest(): Promise<Uint8Array>;
    private hashBuffer;
    reset(): void;
}

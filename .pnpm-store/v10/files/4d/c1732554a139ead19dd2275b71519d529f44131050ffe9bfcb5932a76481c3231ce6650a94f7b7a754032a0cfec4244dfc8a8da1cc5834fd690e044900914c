import { Checksum, SourceData } from "@aws-sdk/types";
export declare class Sha1 implements Checksum {
    private readonly key;
    private toHash;
    constructor(secret?: SourceData);
    update(data: SourceData): void;
    digest(): Promise<Uint8Array>;
    reset(): void;
}

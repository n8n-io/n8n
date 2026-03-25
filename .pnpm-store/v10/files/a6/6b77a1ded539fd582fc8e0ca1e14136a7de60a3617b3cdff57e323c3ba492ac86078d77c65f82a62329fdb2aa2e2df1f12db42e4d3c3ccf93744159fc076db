import { AwsCrc32 } from "@aws-crypto/crc32";
import { Checksum } from "@smithy/types";
declare class NodeCrc32 implements Checksum {
  private checksum;
  update(data: Uint8Array): void;
  digest(): Promise<Uint8Array<ArrayBufferLike>>;
  reset(): void;
}
export declare const getCrc32ChecksumAlgorithmFunction: () =>
  | typeof NodeCrc32
  | typeof AwsCrc32;
export {};

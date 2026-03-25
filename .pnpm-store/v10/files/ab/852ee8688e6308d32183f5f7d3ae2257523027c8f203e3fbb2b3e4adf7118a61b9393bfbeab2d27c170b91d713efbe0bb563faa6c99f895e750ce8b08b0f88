import { ChecksumConstructor, Encoder, HashConstructor } from "@smithy/types";
export interface GetChecksumDigestOptions {
  checksumAlgorithmFn: ChecksumConstructor | HashConstructor;
  base64Encoder: Encoder;
}
export declare const getChecksum: (
  body: unknown,
  { checksumAlgorithmFn, base64Encoder }: GetChecksumDigestOptions
) => Promise<string>;

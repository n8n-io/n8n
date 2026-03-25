import { Sha1 as WebCryptoSha1 } from "./webCryptoSha1";
import { Checksum, SourceData } from "@aws-sdk/types";
import { supportsWebCrypto } from "@aws-crypto/supports-web-crypto";
import { locateWindow } from "@aws-sdk/util-locate-window";
import { convertToBuffer } from "@aws-crypto/util";

export class Sha1 implements Checksum {
  private hash: Checksum;

  constructor(secret?: SourceData) {
    if (supportsWebCrypto(locateWindow())) {
      this.hash = new WebCryptoSha1(secret);
    } else {
      throw new Error("SHA1 not supported");
    }
  }

  update(data: SourceData, encoding?: "utf8" | "ascii" | "latin1"): void {
    this.hash.update(convertToBuffer(data));
  }

  digest(): Promise<Uint8Array> {
    return this.hash.digest();
  }

  reset(): void {
    this.hash.reset();
  }
}

import { Checksum, SourceData } from "@aws-sdk/types";
import { fromUtf8 } from "@smithy/util-utf8";
import { isEmptyData } from "./isEmptyData";
import { EMPTY_DATA_SHA_1, SHA_1_HASH, SHA_1_HMAC_ALGO } from "./constants";
import { locateWindow } from "@aws-sdk/util-locate-window";

export class Sha1 implements Checksum {
  private readonly key: Promise<CryptoKey> | undefined;
  private toHash: Uint8Array = new Uint8Array(0);

  constructor(secret?: SourceData) {
    if (secret !== void 0) {
      this.key = new Promise((resolve, reject) => {
        locateWindow()
          .crypto.subtle.importKey(
            "raw",
            convertToBuffer(secret),
            SHA_1_HMAC_ALGO,
            false,
            ["sign"]
          )
          .then(resolve, reject);
      });
      this.key.catch(() => {});
    }
  }

  update(data: SourceData): void {
    if (isEmptyData(data)) {
      return;
    }

    const update = convertToBuffer(data);
    const typedArray = new Uint8Array(
      this.toHash.byteLength + update.byteLength
    );
    typedArray.set(this.toHash, 0);
    typedArray.set(update, this.toHash.byteLength);
    this.toHash = typedArray;
  }

  digest(): Promise<Uint8Array> {
    if (this.key) {
      return this.key.then((key) =>
        locateWindow()
          .crypto.subtle.sign(SHA_1_HMAC_ALGO, key, this.toHash)
          .then((data) => new Uint8Array(data))
      );
    }

    if (isEmptyData(this.toHash)) {
      return Promise.resolve(EMPTY_DATA_SHA_1);
    }

    return Promise.resolve()
      .then(() => locateWindow().crypto.subtle.digest(SHA_1_HASH, this.toHash))
      .then((data) => Promise.resolve(new Uint8Array(data)));
  }

  reset(): void {
    this.toHash = new Uint8Array(0);
  }
}

function convertToBuffer(data: SourceData): Uint8Array {
  if (typeof data === "string") {
    return fromUtf8(data);
  }

  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(
      data.buffer,
      data.byteOffset,
      data.byteLength / Uint8Array.BYTES_PER_ELEMENT
    );
  }

  return new Uint8Array(data);
}

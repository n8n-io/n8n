// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SourceData, Checksum } from "@aws-sdk/types";
import { convertToBuffer, isEmptyData, numToUint8 } from "@aws-crypto/util";
import { Crc32 } from "./index";

export class AwsCrc32 implements Checksum {
  private crc32 = new Crc32();

  update(toHash: SourceData) {
    if (isEmptyData(toHash)) return;

    this.crc32.update(convertToBuffer(toHash));
  }

  async digest(): Promise<Uint8Array> {
    return numToUint8(this.crc32.digest());
  }

  reset(): void {
    this.crc32 = new Crc32();
  }
}

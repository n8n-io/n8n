// Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Checksum, SourceData } from "@aws-sdk/types";
import { convertToBuffer, isEmptyData, numToUint8 } from "@aws-crypto/util";
import { Crc32c } from "./index";

export class AwsCrc32c implements Checksum {
  private crc32c = new Crc32c();

  update(toHash: SourceData) {
    if (isEmptyData(toHash)) return;

    this.crc32c.update(convertToBuffer(toHash));
  }

  async digest(): Promise<Uint8Array> {
    return numToUint8(this.crc32c.digest());
  }

  reset(): void {
    this.crc32c = new Crc32c();
  }
}

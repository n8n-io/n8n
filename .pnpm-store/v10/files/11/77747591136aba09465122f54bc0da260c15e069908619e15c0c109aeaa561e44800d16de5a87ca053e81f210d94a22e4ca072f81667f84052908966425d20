/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { StatusObject, WriteObject } from './call-interface';
import { Metadata } from './metadata';

/**
 * Filter classes represent related per-call logic and state that is primarily
 * used to modify incoming and outgoing data. All async filters can be
 * rejected. The rejection error must be a StatusObject, and a rejection will
 * cause the call to end with that status.
 */
export interface Filter {
  sendMetadata(metadata: Promise<Metadata>): Promise<Metadata>;

  receiveMetadata(metadata: Metadata): Metadata;

  sendMessage(message: Promise<WriteObject>): Promise<WriteObject>;

  receiveMessage(message: Promise<Buffer>): Promise<Buffer>;

  receiveTrailers(status: StatusObject): StatusObject;
}

export abstract class BaseFilter implements Filter {
  async sendMetadata(metadata: Promise<Metadata>): Promise<Metadata> {
    return metadata;
  }

  receiveMetadata(metadata: Metadata): Metadata {
    return metadata;
  }

  async sendMessage(message: Promise<WriteObject>): Promise<WriteObject> {
    return message;
  }

  async receiveMessage(message: Promise<Buffer>): Promise<Buffer> {
    return message;
  }

  receiveTrailers(status: StatusObject): StatusObject {
    return status;
  }
}

export interface FilterFactory<T extends Filter> {
  createFilter(): T;
}

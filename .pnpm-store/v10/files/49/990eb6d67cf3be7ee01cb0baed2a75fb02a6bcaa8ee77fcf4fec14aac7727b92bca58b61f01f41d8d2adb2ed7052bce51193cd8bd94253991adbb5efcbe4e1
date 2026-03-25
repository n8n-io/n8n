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

import { StatusObject } from './call-interface';
import { Status } from './constants';
import { Metadata } from './metadata';

/**
 * A builder for gRPC status objects.
 */
export class StatusBuilder {
  private code: Status | null;
  private details: string | null;
  private metadata: Metadata | null;

  constructor() {
    this.code = null;
    this.details = null;
    this.metadata = null;
  }

  /**
   * Adds a status code to the builder.
   */
  withCode(code: Status): this {
    this.code = code;
    return this;
  }

  /**
   * Adds details to the builder.
   */
  withDetails(details: string): this {
    this.details = details;
    return this;
  }

  /**
   * Adds metadata to the builder.
   */
  withMetadata(metadata: Metadata): this {
    this.metadata = metadata;
    return this;
  }

  /**
   * Builds the status object.
   */
  build(): Partial<StatusObject> {
    const status: Partial<StatusObject> = {};

    if (this.code !== null) {
      status.code = this.code;
    }

    if (this.details !== null) {
      status.details = this.details;
    }

    if (this.metadata !== null) {
      status.metadata = this.metadata;
    }

    return status;
  }
}

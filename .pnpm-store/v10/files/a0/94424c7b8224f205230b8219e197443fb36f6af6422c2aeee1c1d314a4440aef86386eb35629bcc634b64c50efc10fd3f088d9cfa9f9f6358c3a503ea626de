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
import { Filter, FilterFactory } from './filter';
import { Metadata } from './metadata';

export class FilterStack implements Filter {
  constructor(private readonly filters: Filter[]) {}

  sendMetadata(metadata: Promise<Metadata>): Promise<Metadata> {
    let result: Promise<Metadata> = metadata;

    for (let i = 0; i < this.filters.length; i++) {
      result = this.filters[i].sendMetadata(result);
    }

    return result;
  }

  receiveMetadata(metadata: Metadata) {
    let result: Metadata = metadata;

    for (let i = this.filters.length - 1; i >= 0; i--) {
      result = this.filters[i].receiveMetadata(result);
    }

    return result;
  }

  sendMessage(message: Promise<WriteObject>): Promise<WriteObject> {
    let result: Promise<WriteObject> = message;

    for (let i = 0; i < this.filters.length; i++) {
      result = this.filters[i].sendMessage(result);
    }

    return result;
  }

  receiveMessage(message: Promise<Buffer>): Promise<Buffer> {
    let result: Promise<Buffer> = message;

    for (let i = this.filters.length - 1; i >= 0; i--) {
      result = this.filters[i].receiveMessage(result);
    }

    return result;
  }

  receiveTrailers(status: StatusObject): StatusObject {
    let result: StatusObject = status;

    for (let i = this.filters.length - 1; i >= 0; i--) {
      result = this.filters[i].receiveTrailers(result);
    }

    return result;
  }

  push(filters: Filter[]) {
    this.filters.unshift(...filters);
  }

  getFilters(): Filter[] {
    return this.filters;
  }
}

export class FilterStackFactory implements FilterFactory<FilterStack> {
  constructor(private readonly factories: Array<FilterFactory<Filter>>) {}

  push(filterFactories: FilterFactory<Filter>[]) {
    this.factories.unshift(...filterFactories);
  }

  clone(): FilterStackFactory {
    return new FilterStackFactory([...this.factories]);
  }

  createFilter(): FilterStack {
    return new FilterStack(
      this.factories.map(factory => factory.createFilter())
    );
  }
}

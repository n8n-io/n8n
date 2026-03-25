"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterStackFactory = exports.FilterStack = void 0;
class FilterStack {
    constructor(filters) {
        this.filters = filters;
    }
    sendMetadata(metadata) {
        let result = metadata;
        for (let i = 0; i < this.filters.length; i++) {
            result = this.filters[i].sendMetadata(result);
        }
        return result;
    }
    receiveMetadata(metadata) {
        let result = metadata;
        for (let i = this.filters.length - 1; i >= 0; i--) {
            result = this.filters[i].receiveMetadata(result);
        }
        return result;
    }
    sendMessage(message) {
        let result = message;
        for (let i = 0; i < this.filters.length; i++) {
            result = this.filters[i].sendMessage(result);
        }
        return result;
    }
    receiveMessage(message) {
        let result = message;
        for (let i = this.filters.length - 1; i >= 0; i--) {
            result = this.filters[i].receiveMessage(result);
        }
        return result;
    }
    receiveTrailers(status) {
        let result = status;
        for (let i = this.filters.length - 1; i >= 0; i--) {
            result = this.filters[i].receiveTrailers(result);
        }
        return result;
    }
    push(filters) {
        this.filters.unshift(...filters);
    }
    getFilters() {
        return this.filters;
    }
}
exports.FilterStack = FilterStack;
class FilterStackFactory {
    constructor(factories) {
        this.factories = factories;
    }
    push(filterFactories) {
        this.factories.unshift(...filterFactories);
    }
    clone() {
        return new FilterStackFactory([...this.factories]);
    }
    createFilter() {
        return new FilterStack(this.factories.map(factory => factory.createFilter()));
    }
}
exports.FilterStackFactory = FilterStackFactory;
//# sourceMappingURL=filter-stack.js.map
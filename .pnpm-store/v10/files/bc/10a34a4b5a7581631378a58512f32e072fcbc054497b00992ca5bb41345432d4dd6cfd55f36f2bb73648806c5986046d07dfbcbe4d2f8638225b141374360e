"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ATTR_NET_PEER_PORT = exports.ATTR_NET_PEER_NAME = exports.ATTR_MESSAGING_SYSTEM = exports.ATTR_MESSAGING_OPERATION = void 0;
/*
 * This file contains a copy of unstable semantic convention definitions
 * used by this package.
 * @see https://github.com/open-telemetry/opentelemetry-js/tree/main/semantic-conventions#unstable-semconv
 */
/**
 * Deprecated, use `messaging.operation.type` instead.
 *
 * @example publish
 * @example create
 * @example process
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated Replaced by `messaging.operation.type`.
 */
exports.ATTR_MESSAGING_OPERATION = 'messaging.operation';
/**
 * The messaging system as identified by the client instrumentation.
 *
 * @note The actual messaging system may differ from the one known by the client. For example, when using Kafka client libraries to communicate with Azure Event Hubs, the `messaging.system` is set to `kafka` based on the instrumentation's best knowledge.
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 */
exports.ATTR_MESSAGING_SYSTEM = 'messaging.system';
/**
 * Deprecated, use `server.address` on client spans and `client.address` on server spans.
 *
 * @example example.com
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated Replaced by `server.address` on client spans and `client.address` on server spans.
 */
exports.ATTR_NET_PEER_NAME = 'net.peer.name';
/**
 * Deprecated, use `server.port` on client spans and `client.port` on server spans.
 *
 * @example 8080
 *
 * @experimental This attribute is experimental and is subject to breaking changes in minor releases of `@opentelemetry/semantic-conventions`.
 *
 * @deprecated Replaced by `server.port` on client spans and `client.port` on server spans.
 */
exports.ATTR_NET_PEER_PORT = 'net.peer.port';
//# sourceMappingURL=semconv.js.map
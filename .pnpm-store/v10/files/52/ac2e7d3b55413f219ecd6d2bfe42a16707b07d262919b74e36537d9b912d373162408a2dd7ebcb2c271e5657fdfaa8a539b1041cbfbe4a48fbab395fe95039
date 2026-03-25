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
exports.ATTR_MESSAGING_CONVERSATION_ID = exports.OLD_ATTR_MESSAGING_MESSAGE_ID = exports.MESSAGING_DESTINATION_KIND_VALUE_TOPIC = exports.ATTR_MESSAGING_URL = exports.ATTR_MESSAGING_PROTOCOL_VERSION = exports.ATTR_MESSAGING_PROTOCOL = exports.MESSAGING_OPERATION_VALUE_PROCESS = exports.ATTR_MESSAGING_RABBITMQ_ROUTING_KEY = exports.ATTR_MESSAGING_DESTINATION_KIND = exports.ATTR_MESSAGING_DESTINATION = void 0;
/*
 * This file contains constants for values that where replaced/removed from
 * Semantic Conventions long enough ago that they do not have `ATTR_*`
 * constants in the `@opentelemetry/semantic-conventions` package. Eventually
 * it is expected that this instrumention will be updated to emit telemetry
 * using modern Semantic Conventions, dropping the need for the constants in
 * this file.
 */
/**
 * The message destination name. This might be equal to the span name but is required nevertheless.
 *
 * @deprecated Use ATTR_MESSAGING_DESTINATION_NAME in [incubating entry-point]({@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}).
 */
exports.ATTR_MESSAGING_DESTINATION = 'messaging.destination';
/**
 * The kind of message destination.
 *
 * @deprecated Removed in semconv v1.20.0.
 */
exports.ATTR_MESSAGING_DESTINATION_KIND = 'messaging.destination_kind';
/**
 * RabbitMQ message routing key.
 *
 * @deprecated Use ATTR_MESSAGING_RABBITMQ_DESTINATION_ROUTING_KEY in [incubating entry-point]({@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}).
 */
exports.ATTR_MESSAGING_RABBITMQ_ROUTING_KEY = 'messaging.rabbitmq.routing_key';
/**
 * A string identifying the kind of message consumption as defined in the [Operation names](#operation-names) section above. If the operation is &#34;send&#34;, this attribute MUST NOT be set, since the operation can be inferred from the span kind in that case.
 *
 * @deprecated Use MESSAGING_OPERATION_TYPE_VALUE_PROCESS in [incubating entry-point]({@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}).
 */
exports.MESSAGING_OPERATION_VALUE_PROCESS = 'process';
/**
 * The name of the transport protocol.
 *
 * @deprecated Use ATTR_NETWORK_PROTOCOL_NAME.
 */
exports.ATTR_MESSAGING_PROTOCOL = 'messaging.protocol';
/**
 * The version of the transport protocol.
 *
 * @deprecated Use ATTR_NETWORK_PROTOCOL_VERSION.
 */
exports.ATTR_MESSAGING_PROTOCOL_VERSION = 'messaging.protocol_version';
/**
 * Connection string.
 *
 * @deprecated Removed in semconv v1.17.0.
 */
exports.ATTR_MESSAGING_URL = 'messaging.url';
/**
 * The kind of message destination.
 *
 * @deprecated Removed in semconv v1.20.0.
 */
exports.MESSAGING_DESTINATION_KIND_VALUE_TOPIC = 'topic';
/**
 * A value used by the messaging system as an identifier for the message, represented as a string.
 *
 * @deprecated Use ATTR_MESSAGING_MESSAGE_ID in [incubating entry-point]({@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}).
 *
 * Note: changing to `ATTR_MESSAGING_MESSAGE_ID` means a change in value from `messaging.message_id` to `messaging.message.id`.
 */
exports.OLD_ATTR_MESSAGING_MESSAGE_ID = 'messaging.message_id';
/**
 * The [conversation ID](#conversations) identifying the conversation to which the message belongs, represented as a string. Sometimes called &#34;Correlation ID&#34;.
 *
 * @deprecated Use ATTR_MESSAGING_MESSAGE_CONVERSATION_ID in [incubating entry-point]({@link https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md#unstable-semconv}).
 */
exports.ATTR_MESSAGING_CONVERSATION_ID = 'messaging.conversation_id';
//# sourceMappingURL=semconv-obsolete.js.map
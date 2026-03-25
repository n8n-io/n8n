"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isConfirmChannelTracing = exports.unmarkConfirmChannelTracing = exports.markConfirmChannelTracing = exports.getConnectionAttributesFromUrl = exports.getConnectionAttributesFromServer = exports.normalizeExchange = exports.CONNECTION_ATTRIBUTES = exports.CHANNEL_CONSUME_TIMEOUT_TIMER = exports.CHANNEL_SPANS_NOT_ENDED = exports.MESSAGE_STORED_SPAN = void 0;
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
const api_1 = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const semconv_1 = require("./semconv");
const semconv_obsolete_1 = require("../src/semconv-obsolete");
exports.MESSAGE_STORED_SPAN = Symbol('opentelemetry.amqplib.message.stored-span');
exports.CHANNEL_SPANS_NOT_ENDED = Symbol('opentelemetry.amqplib.channel.spans-not-ended');
exports.CHANNEL_CONSUME_TIMEOUT_TIMER = Symbol('opentelemetry.amqplib.channel.consumer-timeout-timer');
exports.CONNECTION_ATTRIBUTES = Symbol('opentelemetry.amqplib.connection.attributes');
const IS_CONFIRM_CHANNEL_CONTEXT_KEY = (0, api_1.createContextKey)('opentelemetry.amqplib.channel.is-confirm-channel');
const normalizeExchange = (exchangeName) => exchangeName !== '' ? exchangeName : '<default>';
exports.normalizeExchange = normalizeExchange;
const censorPassword = (url) => {
    return url.replace(/:[^:@/]*@/, ':***@');
};
const getPort = (portFromUrl, resolvedProtocol) => {
    // we are using the resolved protocol which is upper case
    // this code mimic the behavior of the amqplib which is used to set connection params
    return portFromUrl || (resolvedProtocol === 'AMQP' ? 5672 : 5671);
};
const getProtocol = (protocolFromUrl) => {
    const resolvedProtocol = protocolFromUrl || 'amqp';
    // the substring removed the ':' part of the protocol ('amqp:' -> 'amqp')
    const noEndingColon = resolvedProtocol.endsWith(':')
        ? resolvedProtocol.substring(0, resolvedProtocol.length - 1)
        : resolvedProtocol;
    // upper cases to match spec
    return noEndingColon.toUpperCase();
};
const getHostname = (hostnameFromUrl) => {
    // if user supplies empty hostname, it gets forwarded to 'net' package which default it to localhost.
    // https://nodejs.org/docs/latest-v12.x/api/net.html#net_socket_connect_options_connectlistener
    return hostnameFromUrl || 'localhost';
};
const extractConnectionAttributeOrLog = (url, attributeKey, attributeValue, nameForLog) => {
    if (attributeValue) {
        return { [attributeKey]: attributeValue };
    }
    else {
        api_1.diag.error(`amqplib instrumentation: could not extract connection attribute ${nameForLog} from user supplied url`, {
            url,
        });
        return {};
    }
};
const getConnectionAttributesFromServer = (conn) => {
    const product = conn.serverProperties.product?.toLowerCase?.();
    if (product) {
        return {
            [semconv_1.ATTR_MESSAGING_SYSTEM]: product,
        };
    }
    else {
        return {};
    }
};
exports.getConnectionAttributesFromServer = getConnectionAttributesFromServer;
const getConnectionAttributesFromUrl = (url, netSemconvStability) => {
    const attributes = {
        [semconv_obsolete_1.ATTR_MESSAGING_PROTOCOL_VERSION]: '0.9.1', // this is the only protocol supported by the instrumented library
    };
    url = url || 'amqp://localhost';
    if (typeof url === 'object') {
        const connectOptions = url;
        const protocol = getProtocol(connectOptions?.protocol);
        Object.assign(attributes, {
            ...extractConnectionAttributeOrLog(url, semconv_obsolete_1.ATTR_MESSAGING_PROTOCOL, protocol, 'protocol'),
        });
        const hostname = getHostname(connectOptions?.hostname);
        if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
            Object.assign(attributes, {
                ...extractConnectionAttributeOrLog(url, semconv_1.ATTR_NET_PEER_NAME, hostname, 'hostname'),
            });
        }
        if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
            Object.assign(attributes, {
                ...extractConnectionAttributeOrLog(url, semantic_conventions_1.ATTR_SERVER_ADDRESS, hostname, 'hostname'),
            });
        }
        const port = getPort(connectOptions.port, protocol);
        if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
            Object.assign(attributes, extractConnectionAttributeOrLog(url, semconv_1.ATTR_NET_PEER_PORT, port, 'port'));
        }
        if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
            Object.assign(attributes, extractConnectionAttributeOrLog(url, semantic_conventions_1.ATTR_SERVER_PORT, port, 'port'));
        }
    }
    else {
        const censoredUrl = censorPassword(url);
        attributes[semconv_obsolete_1.ATTR_MESSAGING_URL] = censoredUrl;
        try {
            const urlParts = new URL(censoredUrl);
            const protocol = getProtocol(urlParts.protocol);
            Object.assign(attributes, {
                ...extractConnectionAttributeOrLog(censoredUrl, semconv_obsolete_1.ATTR_MESSAGING_PROTOCOL, protocol, 'protocol'),
            });
            const hostname = getHostname(urlParts.hostname);
            if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
                Object.assign(attributes, {
                    ...extractConnectionAttributeOrLog(censoredUrl, semconv_1.ATTR_NET_PEER_NAME, hostname, 'hostname'),
                });
            }
            if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                Object.assign(attributes, {
                    ...extractConnectionAttributeOrLog(censoredUrl, semantic_conventions_1.ATTR_SERVER_ADDRESS, hostname, 'hostname'),
                });
            }
            const port = getPort(urlParts.port ? parseInt(urlParts.port) : undefined, protocol);
            if (netSemconvStability & instrumentation_1.SemconvStability.OLD) {
                Object.assign(attributes, extractConnectionAttributeOrLog(censoredUrl, semconv_1.ATTR_NET_PEER_PORT, port, 'port'));
            }
            if (netSemconvStability & instrumentation_1.SemconvStability.STABLE) {
                Object.assign(attributes, extractConnectionAttributeOrLog(censoredUrl, semantic_conventions_1.ATTR_SERVER_PORT, port, 'port'));
            }
        }
        catch (err) {
            api_1.diag.error('amqplib instrumentation: error while extracting connection details from connection url', {
                censoredUrl,
                err,
            });
        }
    }
    return attributes;
};
exports.getConnectionAttributesFromUrl = getConnectionAttributesFromUrl;
const markConfirmChannelTracing = (context) => {
    return context.setValue(IS_CONFIRM_CHANNEL_CONTEXT_KEY, true);
};
exports.markConfirmChannelTracing = markConfirmChannelTracing;
const unmarkConfirmChannelTracing = (context) => {
    return context.deleteValue(IS_CONFIRM_CHANNEL_CONTEXT_KEY);
};
exports.unmarkConfirmChannelTracing = unmarkConfirmChannelTracing;
const isConfirmChannelTracing = (context) => {
    return context.getValue(IS_CONFIRM_CHANNEL_CONTEXT_KEY) === true;
};
exports.isConfirmChannelTracing = isConfirmChannelTracing;
//# sourceMappingURL=utils.js.map
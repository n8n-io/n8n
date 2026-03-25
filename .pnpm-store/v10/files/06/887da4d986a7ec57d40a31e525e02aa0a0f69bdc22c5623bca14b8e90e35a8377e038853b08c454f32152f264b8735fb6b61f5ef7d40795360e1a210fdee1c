"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEventHubSpan = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const applicationinsights_js_1 = require("./constants/applicationinsights.js");
const azAttributes_js_1 = require("./constants/span/azAttributes.js");
/**
 * Average span.links[].attributes.enqueuedTime
 */
const getTimeSinceEnqueued = (span) => {
    let countEnqueueDiffs = 0;
    let sumEnqueueDiffs = 0;
    const startTimeMs = (0, core_1.hrTimeToMilliseconds)(span.startTime);
    span.links.forEach(({ attributes }) => {
        const enqueuedTime = attributes === null || attributes === void 0 ? void 0 : attributes[applicationinsights_js_1.ENQUEUED_TIME];
        if (enqueuedTime) {
            countEnqueueDiffs += 1;
            sumEnqueueDiffs += startTimeMs - (parseFloat(enqueuedTime.toString()) || 0);
        }
    });
    return Math.max(sumEnqueueDiffs / (countEnqueueDiffs || 1), 0);
};
/**
 * Implementation of Mapping to Azure Monitor
 *
 * https://gist.github.com/lmolkova/e4215c0f44a49ef824983382762e6b92#mapping-to-azure-monitor-application-insights-telemetry
 * @internal
 */
const parseEventHubSpan = (span, baseData) => {
    const namespace = span.attributes[azAttributes_js_1.AzNamespace];
    const peerAddress = (span.attributes[semantic_conventions_1.SEMATTRS_NET_PEER_NAME] ||
        span.attributes["peer.address"] ||
        "unknown").replace(/\/$/g, ""); // remove trailing "/"
    const messageBusDestination = (span.attributes[azAttributes_js_1.MessageBusDestination] || "unknown");
    switch (span.kind) {
        case api_1.SpanKind.CLIENT:
            baseData.type = namespace;
            baseData.target = `${peerAddress}/${messageBusDestination}`;
            break;
        case api_1.SpanKind.PRODUCER:
            baseData.type = `Queue Message | ${namespace}`;
            baseData.target = `${peerAddress}/${messageBusDestination}`;
            break;
        case api_1.SpanKind.CONSUMER:
            baseData.type = `Queue Message | ${namespace}`;
            baseData.source = `${peerAddress}/${messageBusDestination}`;
            baseData.measurements = Object.assign(Object.assign({}, baseData.measurements), { [applicationinsights_js_1.TIME_SINCE_ENQUEUED]: getTimeSinceEnqueued(span) });
            break;
        default: // no op
    }
};
exports.parseEventHubSpan = parseEventHubSpan;
//# sourceMappingURL=eventhub.js.map
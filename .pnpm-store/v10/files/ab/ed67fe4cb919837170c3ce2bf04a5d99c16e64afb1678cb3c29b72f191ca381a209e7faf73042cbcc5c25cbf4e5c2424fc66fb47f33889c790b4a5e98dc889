// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { SpanKind } from "@opentelemetry/api";
import { hrTimeToMilliseconds } from "@opentelemetry/core";
import { SEMATTRS_NET_PEER_NAME } from "@opentelemetry/semantic-conventions";
import { TIME_SINCE_ENQUEUED, ENQUEUED_TIME } from "./constants/applicationinsights.js";
import { AzNamespace, MessageBusDestination } from "./constants/span/azAttributes.js";
/**
 * Average span.links[].attributes.enqueuedTime
 */
const getTimeSinceEnqueued = (span) => {
    let countEnqueueDiffs = 0;
    let sumEnqueueDiffs = 0;
    const startTimeMs = hrTimeToMilliseconds(span.startTime);
    span.links.forEach(({ attributes }) => {
        const enqueuedTime = attributes === null || attributes === void 0 ? void 0 : attributes[ENQUEUED_TIME];
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
export const parseEventHubSpan = (span, baseData) => {
    const namespace = span.attributes[AzNamespace];
    const peerAddress = (span.attributes[SEMATTRS_NET_PEER_NAME] ||
        span.attributes["peer.address"] ||
        "unknown").replace(/\/$/g, ""); // remove trailing "/"
    const messageBusDestination = (span.attributes[MessageBusDestination] || "unknown");
    switch (span.kind) {
        case SpanKind.CLIENT:
            baseData.type = namespace;
            baseData.target = `${peerAddress}/${messageBusDestination}`;
            break;
        case SpanKind.PRODUCER:
            baseData.type = `Queue Message | ${namespace}`;
            baseData.target = `${peerAddress}/${messageBusDestination}`;
            break;
        case SpanKind.CONSUMER:
            baseData.type = `Queue Message | ${namespace}`;
            baseData.source = `${peerAddress}/${messageBusDestination}`;
            baseData.measurements = Object.assign(Object.assign({}, baseData.measurements), { [TIME_SINCE_ENQUEUED]: getTimeSinceEnqueued(span) });
            break;
        default: // no op
    }
};
//# sourceMappingURL=eventhub.js.map
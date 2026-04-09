/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InProgressPerformanceEvent, Logger } from "@azure/msal-common/browser";

interface NetworkConnection {
    effectiveType?: string;
    rtt?: number;
}

/**
 * Get network information for telemetry purposes. This is only supported in Chromium-based browsers.
 * @returns Network connection information, or an empty object if not available.
 */
export function getNetworkInfo(): NetworkConnection {
    if (typeof window === "undefined" || !window.navigator) {
        return {};
    }
    const connection: NetworkConnection | undefined =
        "connection" in window.navigator
            ? (
                  window.navigator as Navigator & {
                      connection: NetworkConnection;
                  }
              ).connection
            : undefined;
    return {
        effectiveType: connection?.effectiveType,
        rtt: connection?.rtt,
    };
}

export function collectInstanceStats(
    currentClientId: string,
    performanceEvent: InProgressPerformanceEvent,
    logger: Logger
): void {
    const frameInstances: string[] =
        // @ts-ignore
        window.msal?.clientIds || [];

    const msalInstanceCount = frameInstances.length;

    const sameClientIdInstanceCount = frameInstances.filter(
        (i) => i === currentClientId
    ).length;

    if (sameClientIdInstanceCount > 1) {
        logger.warning(
            "There is already an instance of MSAL.js in the window with the same client id."
        );
    }
    performanceEvent.add({
        msalInstanceCount: msalInstanceCount,
        sameClientIdInstanceCount: sameClientIdInstanceCount,
    });
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { InProgressPerformanceEvent, Logger } from "@azure/msal-common/browser";

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

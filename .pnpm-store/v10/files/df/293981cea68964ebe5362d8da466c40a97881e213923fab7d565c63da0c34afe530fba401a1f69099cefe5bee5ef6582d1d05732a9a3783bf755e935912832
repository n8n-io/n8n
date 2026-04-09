/*! @azure/msal-browser v4.30.0 2026-03-18 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Get network information for telemetry purposes. This is only supported in Chromium-based browsers.
 * @returns Network connection information, or an empty object if not available.
 */
function collectInstanceStats(currentClientId, performanceEvent, logger) {
    const frameInstances = 
    // @ts-ignore
    window.msal?.clientIds || [];
    const msalInstanceCount = frameInstances.length;
    const sameClientIdInstanceCount = frameInstances.filter((i) => i === currentClientId).length;
    if (sameClientIdInstanceCount > 1) {
        logger.warning("There is already an instance of MSAL.js in the window with the same client id.");
    }
    performanceEvent.add({
        msalInstanceCount: msalInstanceCount,
        sameClientIdInstanceCount: sameClientIdInstanceCount,
    });
}

export { collectInstanceStats };
//# sourceMappingURL=MsalFrameStatsUtils.mjs.map

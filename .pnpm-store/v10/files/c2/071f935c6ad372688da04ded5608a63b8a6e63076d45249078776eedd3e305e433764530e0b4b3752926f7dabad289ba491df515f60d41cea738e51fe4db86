/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
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

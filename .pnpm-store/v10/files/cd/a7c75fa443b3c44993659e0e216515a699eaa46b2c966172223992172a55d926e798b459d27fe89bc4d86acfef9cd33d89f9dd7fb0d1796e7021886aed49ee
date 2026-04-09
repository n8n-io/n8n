/*! @azure/msal-browser v4.30.0 2026-03-18 */
'use strict';
import { StandardOperatingContext } from '../operatingcontext/StandardOperatingContext.mjs';
import { StandardController } from './StandardController.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
async function createV3Controller(config, request) {
    const standard = new StandardOperatingContext(config);
    await standard.initialize();
    return StandardController.createController(standard, request);
}

export { createV3Controller };
//# sourceMappingURL=ControllerFactory.mjs.map

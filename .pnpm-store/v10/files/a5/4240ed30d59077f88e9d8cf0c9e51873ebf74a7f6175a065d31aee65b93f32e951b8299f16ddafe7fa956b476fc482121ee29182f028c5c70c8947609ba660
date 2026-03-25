/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { NestedAppOperatingContext } from '../operatingcontext/NestedAppOperatingContext.mjs';
import { StandardOperatingContext } from '../operatingcontext/StandardOperatingContext.mjs';
import { StandardController } from './StandardController.mjs';
import { NestedAppAuthController } from './NestedAppAuthController.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
async function createV3Controller(config, request) {
    const standard = new StandardOperatingContext(config);
    await standard.initialize();
    return StandardController.createController(standard, request);
}
async function createController(config) {
    const standard = new StandardOperatingContext(config);
    const nestedApp = new NestedAppOperatingContext(config);
    const operatingContexts = [standard.initialize(), nestedApp.initialize()];
    await Promise.all(operatingContexts);
    if (nestedApp.isAvailable() && config.auth.supportsNestedAppAuth) {
        return NestedAppAuthController.createController(nestedApp);
    }
    else if (standard.isAvailable()) {
        return StandardController.createController(standard);
    }
    else {
        // Since neither of the actual operating contexts are available keep the UnknownOperatingContextController
        return null;
    }
}

export { createController, createV3Controller };
//# sourceMappingURL=ControllerFactory.mjs.map

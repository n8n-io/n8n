/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { NestedAppOperatingContext } from "../operatingcontext/NestedAppOperatingContext.js";
import { StandardOperatingContext } from "../operatingcontext/StandardOperatingContext.js";
import { IController } from "./IController.js";
import { Configuration } from "../config/Configuration.js";
import { StandardController } from "./StandardController.js";
import { NestedAppAuthController } from "./NestedAppAuthController.js";
import { InitializeApplicationRequest } from "../request/InitializeApplicationRequest.js";

export async function createV3Controller(
    config: Configuration,
    request?: InitializeApplicationRequest
): Promise<IController> {
    const standard = new StandardOperatingContext(config);

    await standard.initialize();
    return StandardController.createController(standard, request);
}

export async function createController(
    config: Configuration
): Promise<IController | null> {
    const standard = new StandardOperatingContext(config);
    const nestedApp = new NestedAppOperatingContext(config);

    const operatingContexts = [standard.initialize(), nestedApp.initialize()];

    await Promise.all(operatingContexts);

    if (nestedApp.isAvailable() && config.auth.supportsNestedAppAuth) {
        return NestedAppAuthController.createController(nestedApp);
    } else if (standard.isAvailable()) {
        return StandardController.createController(standard);
    } else {
        // Since neither of the actual operating contexts are available keep the UnknownOperatingContextController
        return null;
    }
}

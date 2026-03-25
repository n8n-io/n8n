/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BaseOperatingContext } from '../../operatingcontext/BaseOperatingContext.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class CustomAuthOperatingContext extends BaseOperatingContext {
    constructor(configuration) {
        super(configuration);
        this.customAuthOptions = configuration.customAuth;
    }
    getModuleName() {
        return CustomAuthOperatingContext.MODULE_NAME;
    }
    getId() {
        return CustomAuthOperatingContext.ID;
    }
    getCustomAuthConfig() {
        return {
            ...this.getConfig(),
            customAuth: this.customAuthOptions,
        };
    }
    async initialize() {
        this.available = typeof window !== "undefined";
        return this.available;
    }
}
CustomAuthOperatingContext.MODULE_NAME = "";
CustomAuthOperatingContext.ID = "CustomAuthOperatingContext";

export { CustomAuthOperatingContext };
//# sourceMappingURL=CustomAuthOperatingContext.mjs.map

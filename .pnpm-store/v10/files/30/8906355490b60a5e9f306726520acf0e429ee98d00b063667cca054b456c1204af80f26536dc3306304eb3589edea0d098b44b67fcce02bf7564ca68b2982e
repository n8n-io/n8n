/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BaseOperatingContext } from './BaseOperatingContext.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class UnknownOperatingContext extends BaseOperatingContext {
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return UnknownOperatingContext.ID;
    }
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return UnknownOperatingContext.MODULE_NAME;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        /**
         * This operating context is in use when we have not checked for what the operating context is.
         * The context is unknown until we check it.
         */
        return true;
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
UnknownOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
UnknownOperatingContext.ID = "UnknownOperatingContext";

export { UnknownOperatingContext };
//# sourceMappingURL=UnknownOperatingContext.mjs.map

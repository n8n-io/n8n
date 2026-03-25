/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BaseOperatingContext } from './BaseOperatingContext.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class StandardOperatingContext extends BaseOperatingContext {
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return StandardOperatingContext.MODULE_NAME;
    }
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return StandardOperatingContext.ID;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        this.available = typeof window !== "undefined";
        return this.available;
        /*
         * NOTE: The standard context is available as long as there is a window.  If/when we split out WAM from Browser
         * We can move the current contents of the initialize method to here and verify that the WAM extension is available
         */
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
StandardOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
StandardOperatingContext.ID = "StandardOperatingContext";

export { StandardOperatingContext };
//# sourceMappingURL=StandardOperatingContext.mjs.map

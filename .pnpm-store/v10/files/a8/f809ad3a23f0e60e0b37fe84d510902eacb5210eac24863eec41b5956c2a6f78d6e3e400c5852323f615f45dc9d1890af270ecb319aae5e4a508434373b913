/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseOperatingContext } from "./BaseOperatingContext.js";

export class UnknownOperatingContext extends BaseOperatingContext {
    /*
     * TODO: Once we have determine the bundling code return here to specify the name of the bundle
     * containing the implementation for this operating context
     */
    static readonly MODULE_NAME: string = "";

    /**
     * Unique identifier for the operating context
     */
    static readonly ID: string = "UnknownOperatingContext";

    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId(): string {
        return UnknownOperatingContext.ID;
    }

    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName(): string {
        return UnknownOperatingContext.MODULE_NAME;
    }

    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize(): Promise<boolean> {
        /**
         * This operating context is in use when we have not checked for what the operating context is.
         * The context is unknown until we check it.
         */
        return true;
    }
}

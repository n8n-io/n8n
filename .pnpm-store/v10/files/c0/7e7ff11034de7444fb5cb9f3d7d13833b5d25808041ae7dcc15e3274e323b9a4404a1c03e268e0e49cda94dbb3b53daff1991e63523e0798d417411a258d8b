/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { ApiId } from "../utils/BrowserConstants.js";

/**
 * Additional information passed to the navigateInternal and navigateExternal functions
 */
export type NavigationOptions = {
    /** The Id of the API that initiated navigation */
    apiId: ApiId;
    /** Suggested timeout (ms) based on the configuration provided to PublicClientApplication */
    timeout: number;
    /** When set to true the url should not be added to the browser history */
    noHistory: boolean;
};

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { timedOut } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NavigationClient {
    /**
     * Navigates to other pages within the same web application
     * @param url
     * @param options
     */
    navigateInternal(url, options) {
        return NavigationClient.defaultNavigateWindow(url, options);
    }
    /**
     * Navigates to other pages outside the web application i.e. the Identity Provider
     * @param url
     * @param options
     */
    navigateExternal(url, options) {
        return NavigationClient.defaultNavigateWindow(url, options);
    }
    /**
     * Default navigation implementation invoked by the internal and external functions
     * @param url
     * @param options
     */
    static defaultNavigateWindow(url, options) {
        if (options.noHistory) {
            window.location.replace(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        }
        else {
            window.location.assign(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        }
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(createBrowserAuthError(timedOut, "failed_to_redirect"));
            }, options.timeout);
        });
    }
}

export { NavigationClient };
//# sourceMappingURL=NavigationClient.mjs.map

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BrowserAuthErrorCodes,
    createBrowserAuthError,
} from "../error/BrowserAuthError.js";
import { INavigationClient } from "./INavigationClient.js";
import { NavigationOptions } from "./NavigationOptions.js";

export class NavigationClient implements INavigationClient {
    /**
     * Navigates to other pages within the same web application
     * @param url
     * @param options
     */
    navigateInternal(
        url: string,
        options: NavigationOptions
    ): Promise<boolean> {
        return NavigationClient.defaultNavigateWindow(url, options);
    }

    /**
     * Navigates to other pages outside the web application i.e. the Identity Provider
     * @param url
     * @param options
     */
    navigateExternal(
        url: string,
        options: NavigationOptions
    ): Promise<boolean> {
        return NavigationClient.defaultNavigateWindow(url, options);
    }

    /**
     * Default navigation implementation invoked by the internal and external functions
     * @param url
     * @param options
     */
    private static defaultNavigateWindow(
        url: string,
        options: NavigationOptions
    ): Promise<boolean> {
        if (options.noHistory) {
            window.location.replace(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        } else {
            window.location.assign(url); // CodeQL [SM03712] Application owner controls the URL. User can't change it.
        }

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                reject(
                    createBrowserAuthError(
                        BrowserAuthErrorCodes.timedOut,
                        "failed_to_redirect"
                    )
                );
            }, options.timeout);
        });
    }
}

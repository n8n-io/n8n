/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    UrlString,
    invoke,
    invokeAsync,
    RequestParameterBuilder,
} from "@azure/msal-common/browser";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { BrowserConstants, BrowserCacheLocation } from "./BrowserConstants.js";
import * as BrowserCrypto from "../crypto/BrowserCrypto.js";
import {
    BrowserConfigurationAuthErrorCodes,
    createBrowserConfigurationAuthError,
} from "../error/BrowserConfigurationAuthError.js";
import type { BrowserConfiguration } from "../config/Configuration.js";

/**
 * Clears hash from window url.
 */
export function clearHash(contentWindow: Window): void {
    // Office.js sets history.replaceState to null
    contentWindow.location.hash = "";
    if (typeof contentWindow.history.replaceState === "function") {
        // Full removes "#" from url
        contentWindow.history.replaceState(
            null,
            "",
            `${contentWindow.location.origin}${contentWindow.location.pathname}${contentWindow.location.search}`
        );
    }
}

/**
 * Replaces current hash with hash from provided url
 */
export function replaceHash(url: string): void {
    const urlParts = url.split("#");
    urlParts.shift(); // Remove part before the hash
    window.location.hash = urlParts.length > 0 ? urlParts.join("#") : "";
}

/**
 * Returns boolean of whether the current window is in an iframe or not.
 */
export function isInIframe(): boolean {
    return window.parent !== window;
}

/**
 * Returns boolean of whether or not the current window is a popup opened by msal
 */
export function isInPopup(): boolean {
    return (
        typeof window !== "undefined" &&
        !!window.opener &&
        window.opener !== window &&
        typeof window.name === "string" &&
        window.name.indexOf(`${BrowserConstants.POPUP_NAME_PREFIX}.`) === 0
    );
}

// #endregion

/**
 * Returns current window URL as redirect uri
 */
export function getCurrentUri(): string {
    return typeof window !== "undefined" && window.location
        ? window.location.href.split("?")[0].split("#")[0]
        : "";
}

/**
 * Gets the homepage url for the current window location.
 */
export function getHomepage(): string {
    const currentUrl = new UrlString(window.location.href);
    const urlComponents = currentUrl.getUrlComponents();
    return `${urlComponents.Protocol}//${urlComponents.HostNameAndPort}/`;
}

/**
 * Throws error if we have completed an auth and are
 * attempting another auth request inside an iframe.
 */
export function blockReloadInHiddenIframes(): void {
    const isResponseHash = UrlString.hashContainsKnownProperties(
        window.location.hash
    );
    // return an error if called from the hidden iframe created by the msal js silent calls
    if (isResponseHash && isInIframe()) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.blockIframeReload);
    }
}

/**
 * Block redirect operations in iframes unless explicitly allowed
 * @param interactionType Interaction type for the request
 * @param allowRedirectInIframe Config value to allow redirects when app is inside an iframe
 */
export function blockRedirectInIframe(allowRedirectInIframe: boolean): void {
    if (isInIframe() && !allowRedirectInIframe) {
        // If we are not in top frame, we shouldn't redirect. This is also handled by the service.
        throw createBrowserAuthError(BrowserAuthErrorCodes.redirectInIframe);
    }
}

/**
 * Block redirectUri loaded in popup from calling AcquireToken APIs
 */
export function blockAcquireTokenInPopups(): void {
    // Popups opened by msal popup APIs are given a name that starts with "msal."
    if (isInPopup()) {
        throw createBrowserAuthError(BrowserAuthErrorCodes.blockNestedPopups);
    }
}

/**
 * Throws error if token requests are made in non-browser environment
 * @param isBrowserEnvironment Flag indicating if environment is a browser.
 */
export function blockNonBrowserEnvironment(): void {
    if (typeof window === "undefined") {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.nonBrowserEnvironment
        );
    }
}

/**
 * Throws error if initialize hasn't been called
 * @param initialized
 */
export function blockAPICallsBeforeInitialize(initialized: boolean): void {
    if (!initialized) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.uninitializedPublicClientApplication
        );
    }
}

/**
 * Helper to validate app environment before making an auth request
 * @param initialized
 */
export function preflightCheck(initialized: boolean): void {
    // Block request if not in browser environment
    blockNonBrowserEnvironment();

    // Block auth requests inside a hidden iframe
    blockReloadInHiddenIframes();

    // Block redirectUri opened in a popup from calling MSAL APIs
    blockAcquireTokenInPopups();

    // Block token acquisition before initialize has been called
    blockAPICallsBeforeInitialize(initialized);
}

/**
 * Helper to validate app enviornment before making redirect request
 * @param initialized
 * @param config
 */
export function redirectPreflightCheck(
    initialized: boolean,
    config: BrowserConfiguration
): void {
    preflightCheck(initialized);
    blockRedirectInIframe(config.system.allowRedirectInIframe);
    // Block redirects if memory storage is enabled but storeAuthStateInCookie is not
    if (
        config.cache.cacheLocation === BrowserCacheLocation.MemoryStorage &&
        !config.cache.storeAuthStateInCookie
    ) {
        throw createBrowserConfigurationAuthError(
            BrowserConfigurationAuthErrorCodes.inMemRedirectUnavailable
        );
    }
}

/**
 * Adds a preconnect link element to the header which begins DNS resolution and SSL connection in anticipation of the /token request
 * @param loginDomain Authority domain, including https protocol e.g. https://login.microsoftonline.com
 * @returns
 */
export function preconnect(authority: string): void {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(authority).origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);

    // The browser will close connection if not used within a few seconds, remove element from the header after 10s
    window.setTimeout(() => {
        try {
            document.head.removeChild(link);
        } catch {}
    }, 10000); // 10s Timeout
}

/**
 * Wrapper function that creates a UUID v7 from the current timestamp.
 * @returns {string}
 */
export function createGuid(): string {
    return BrowserCrypto.createNewGuid();
}

export { invoke };
export { invokeAsync };
export const addClientCapabilitiesToClaims =
    RequestParameterBuilder.addClientCapabilitiesToClaims;

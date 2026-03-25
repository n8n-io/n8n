/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { UrlString } from '@azure/msal-common/browser';
export { invoke, invokeAsync } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { BrowserCacheLocation, BrowserConstants } from './BrowserConstants.mjs';
import { createNewGuid } from '../crypto/BrowserCrypto.mjs';
import { createBrowserConfigurationAuthError } from '../error/BrowserConfigurationAuthError.mjs';
import { nonBrowserEnvironment, redirectInIframe, blockIframeReload, blockNestedPopups, uninitializedPublicClientApplication } from '../error/BrowserAuthErrorCodes.mjs';
import { inMemRedirectUnavailable } from '../error/BrowserConfigurationAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Clears hash from window url.
 */
function clearHash(contentWindow) {
    // Office.js sets history.replaceState to null
    contentWindow.location.hash = "";
    if (typeof contentWindow.history.replaceState === "function") {
        // Full removes "#" from url
        contentWindow.history.replaceState(null, "", `${contentWindow.location.origin}${contentWindow.location.pathname}${contentWindow.location.search}`);
    }
}
/**
 * Replaces current hash with hash from provided url
 */
function replaceHash(url) {
    const urlParts = url.split("#");
    urlParts.shift(); // Remove part before the hash
    window.location.hash = urlParts.length > 0 ? urlParts.join("#") : "";
}
/**
 * Returns boolean of whether the current window is in an iframe or not.
 */
function isInIframe() {
    return window.parent !== window;
}
/**
 * Returns boolean of whether or not the current window is a popup opened by msal
 */
function isInPopup() {
    return (typeof window !== "undefined" &&
        !!window.opener &&
        window.opener !== window &&
        typeof window.name === "string" &&
        window.name.indexOf(`${BrowserConstants.POPUP_NAME_PREFIX}.`) === 0);
}
// #endregion
/**
 * Returns current window URL as redirect uri
 */
function getCurrentUri() {
    return typeof window !== "undefined" && window.location
        ? window.location.href.split("?")[0].split("#")[0]
        : "";
}
/**
 * Gets the homepage url for the current window location.
 */
function getHomepage() {
    const currentUrl = new UrlString(window.location.href);
    const urlComponents = currentUrl.getUrlComponents();
    return `${urlComponents.Protocol}//${urlComponents.HostNameAndPort}/`;
}
/**
 * Throws error if we have completed an auth and are
 * attempting another auth request inside an iframe.
 */
function blockReloadInHiddenIframes() {
    const isResponseHash = UrlString.hashContainsKnownProperties(window.location.hash);
    // return an error if called from the hidden iframe created by the msal js silent calls
    if (isResponseHash && isInIframe()) {
        throw createBrowserAuthError(blockIframeReload);
    }
}
/**
 * Block redirect operations in iframes unless explicitly allowed
 * @param interactionType Interaction type for the request
 * @param allowRedirectInIframe Config value to allow redirects when app is inside an iframe
 */
function blockRedirectInIframe(allowRedirectInIframe) {
    if (isInIframe() && !allowRedirectInIframe) {
        // If we are not in top frame, we shouldn't redirect. This is also handled by the service.
        throw createBrowserAuthError(redirectInIframe);
    }
}
/**
 * Block redirectUri loaded in popup from calling AcquireToken APIs
 */
function blockAcquireTokenInPopups() {
    // Popups opened by msal popup APIs are given a name that starts with "msal."
    if (isInPopup()) {
        throw createBrowserAuthError(blockNestedPopups);
    }
}
/**
 * Throws error if token requests are made in non-browser environment
 * @param isBrowserEnvironment Flag indicating if environment is a browser.
 */
function blockNonBrowserEnvironment() {
    if (typeof window === "undefined") {
        throw createBrowserAuthError(nonBrowserEnvironment);
    }
}
/**
 * Throws error if initialize hasn't been called
 * @param initialized
 */
function blockAPICallsBeforeInitialize(initialized) {
    if (!initialized) {
        throw createBrowserAuthError(uninitializedPublicClientApplication);
    }
}
/**
 * Helper to validate app environment before making an auth request
 * @param initialized
 */
function preflightCheck(initialized) {
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
function redirectPreflightCheck(initialized, config) {
    preflightCheck(initialized);
    blockRedirectInIframe(config.system.allowRedirectInIframe);
    // Block redirects if memory storage is enabled but storeAuthStateInCookie is not
    if (config.cache.cacheLocation === BrowserCacheLocation.MemoryStorage &&
        !config.cache.storeAuthStateInCookie) {
        throw createBrowserConfigurationAuthError(inMemRedirectUnavailable);
    }
}
/**
 * Adds a preconnect link element to the header which begins DNS resolution and SSL connection in anticipation of the /token request
 * @param loginDomain Authority domain, including https protocol e.g. https://login.microsoftonline.com
 * @returns
 */
function preconnect(authority) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = new URL(authority).origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    // The browser will close connection if not used within a few seconds, remove element from the header after 10s
    window.setTimeout(() => {
        try {
            document.head.removeChild(link);
        }
        catch { }
    }, 10000); // 10s Timeout
}
/**
 * Wrapper function that creates a UUID v7 from the current timestamp.
 * @returns {string}
 */
function createGuid() {
    return createNewGuid();
}

export { blockAPICallsBeforeInitialize, blockAcquireTokenInPopups, blockNonBrowserEnvironment, blockRedirectInIframe, blockReloadInHiddenIframes, clearHash, createGuid, getCurrentUri, getHomepage, isInIframe, isInPopup, preconnect, preflightCheck, redirectPreflightCheck, replaceHash };
//# sourceMappingURL=BrowserUtils.mjs.map

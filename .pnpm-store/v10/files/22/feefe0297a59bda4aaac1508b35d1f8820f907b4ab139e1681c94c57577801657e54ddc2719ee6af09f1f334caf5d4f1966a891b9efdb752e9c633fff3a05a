import { invoke, invokeAsync, RequestParameterBuilder } from "@azure/msal-common/browser";
import type { BrowserConfiguration } from "../config/Configuration.js";
/**
 * Clears hash from window url.
 */
export declare function clearHash(contentWindow: Window): void;
/**
 * Replaces current hash with hash from provided url
 */
export declare function replaceHash(url: string): void;
/**
 * Returns boolean of whether the current window is in an iframe or not.
 */
export declare function isInIframe(): boolean;
/**
 * Returns boolean of whether or not the current window is a popup opened by msal
 */
export declare function isInPopup(): boolean;
/**
 * Returns current window URL as redirect uri
 */
export declare function getCurrentUri(): string;
/**
 * Gets the homepage url for the current window location.
 */
export declare function getHomepage(): string;
/**
 * Throws error if we have completed an auth and are
 * attempting another auth request inside an iframe.
 */
export declare function blockReloadInHiddenIframes(): void;
/**
 * Block redirect operations in iframes unless explicitly allowed
 * @param interactionType Interaction type for the request
 * @param allowRedirectInIframe Config value to allow redirects when app is inside an iframe
 */
export declare function blockRedirectInIframe(allowRedirectInIframe: boolean): void;
/**
 * Block redirectUri loaded in popup from calling AcquireToken APIs
 */
export declare function blockAcquireTokenInPopups(): void;
/**
 * Throws error if token requests are made in non-browser environment
 * @param isBrowserEnvironment Flag indicating if environment is a browser.
 */
export declare function blockNonBrowserEnvironment(): void;
/**
 * Throws error if initialize hasn't been called
 * @param initialized
 */
export declare function blockAPICallsBeforeInitialize(initialized: boolean): void;
/**
 * Helper to validate app environment before making an auth request
 * @param initialized
 */
export declare function preflightCheck(initialized: boolean): void;
/**
 * Helper to validate app enviornment before making redirect request
 * @param initialized
 * @param config
 */
export declare function redirectPreflightCheck(initialized: boolean, config: BrowserConfiguration): void;
/**
 * Adds a preconnect link element to the header which begins DNS resolution and SSL connection in anticipation of the /token request
 * @param loginDomain Authority domain, including https protocol e.g. https://login.microsoftonline.com
 * @returns
 */
export declare function preconnect(authority: string): void;
/**
 * Wrapper function that creates a UUID v7 from the current timestamp.
 * @returns {string}
 */
export declare function createGuid(): string;
export { invoke };
export { invokeAsync };
export declare const addClientCapabilitiesToClaims: typeof RequestParameterBuilder.addClientCapabilitiesToClaims;
//# sourceMappingURL=BrowserUtils.d.ts.map
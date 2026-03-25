/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { DEFAULT_CRYPTO_IMPLEMENTATION } from '@azure/msal-common/browser';
import { BrowserCacheManager, DEFAULT_BROWSER_CACHE_MANAGER } from '../cache/BrowserCacheManager.mjs';
import { CryptoOps } from '../crypto/CryptoOps.mjs';
import { blockAPICallsBeforeInitialize, blockNonBrowserEnvironment } from '../utils/BrowserUtils.mjs';
import { EventHandler } from '../event/EventHandler.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * UnknownOperatingContextController class
 *
 * - Until initialize method is called, this controller is the default
 * - AFter initialize method is called, this controller will be swapped out for the appropriate controller
 * if the operating context can be determined; otherwise this controller will continued be used
 *
 * - Why do we have this?  We don't want to dynamically import (download) all of the code in StandardController if we don't need to.
 *
 * - Only includes implementation for getAccounts and handleRedirectPromise
 *   - All other methods are will throw initialization error (because either initialize method or the factory method were not used)
 *   - This controller is necessary for React Native wrapper, server side rendering and any other scenario where we don't have a DOM
 *
 */
class UnknownOperatingContextController {
    constructor(operatingContext) {
        // Flag representing whether or not the initialize API has been called and completed
        this.initialized = false;
        this.operatingContext = operatingContext;
        this.isBrowserEnvironment =
            this.operatingContext.isBrowserEnvironment();
        this.config = operatingContext.getConfig();
        this.logger = operatingContext.getLogger();
        // Initialize performance client
        this.performanceClient = this.config.telemetry.client;
        // Initialize the crypto class.
        this.browserCrypto = this.isBrowserEnvironment
            ? new CryptoOps(this.logger, this.performanceClient)
            : DEFAULT_CRYPTO_IMPLEMENTATION;
        this.eventHandler = new EventHandler(this.logger);
        // Initialize the browser storage class.
        this.browserStorage = this.isBrowserEnvironment
            ? new BrowserCacheManager(this.config.auth.clientId, this.config.cache, this.browserCrypto, this.logger, this.performanceClient, this.eventHandler, undefined)
            : DEFAULT_BROWSER_CACHE_MANAGER(this.config.auth.clientId, this.logger, this.performanceClient, this.eventHandler);
    }
    getBrowserStorage() {
        return this.browserStorage;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccount(accountFilter) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByHomeId(homeAccountId) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByLocalId(localAccountId) {
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAccountByUsername(username) {
        return null;
    }
    getAllAccounts() {
        return [];
    }
    initialize() {
        this.initialized = true;
        return Promise.resolve();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenPopup(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    acquireTokenRedirect(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return Promise.resolve();
    }
    acquireTokenSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    silentRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenByCode(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenNative(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    apiId, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    accountId) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    acquireTokenByRefreshToken(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    commonRequest, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    silentRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    addEventCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callback, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventTypes) {
        return null;
    }
    removeEventCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    callbackId) { }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addPerformanceCallback(callback) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return "";
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removePerformanceCallback(callbackId) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    enableAccountStorageEvents() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    disableAccountStorageEvents() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    handleRedirectPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hash) {
        blockAPICallsBeforeInitialize(this.initialized);
        return Promise.resolve(null);
    }
    loginPopup(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    loginRedirect(request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logout(logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    logoutRedirect(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    logoutPopup(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    ssoSilent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getTokenCache() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getLogger() {
        return this.logger;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setLogger(logger) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setActiveAccount(account) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getActiveAccount() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    initializeWrapperLibrary(sku, version) {
        this.browserStorage.setWrapperMetadata(sku, version);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setNavigationClient(navigationClient) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    getConfiguration() {
        return this.config;
    }
    isBrowserEnv() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return true;
    }
    getBrowserCrypto() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getPerformanceClient() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    getRedirectResponse() {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
        return {};
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearCache(logoutRequest) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async hydrateCache(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    result, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    request) {
        blockAPICallsBeforeInitialize(this.initialized);
        blockNonBrowserEnvironment();
    }
}

export { UnknownOperatingContextController };
//# sourceMappingURL=UnknownOperatingContextController.mjs.map

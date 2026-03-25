/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BaseOperatingContext } from './BaseOperatingContext.mjs';
import { BridgeProxy } from '../naa/BridgeProxy.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NestedAppOperatingContext extends BaseOperatingContext {
    constructor() {
        super(...arguments);
        this.bridgeProxy = undefined;
        this.accountContext = null;
    }
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName() {
        return NestedAppOperatingContext.MODULE_NAME;
    }
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId() {
        return NestedAppOperatingContext.ID;
    }
    /**
     * Returns the current BridgeProxy
     * @returns IBridgeProxy | undefined
     */
    getBridgeProxy() {
        return this.bridgeProxy;
    }
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize() {
        try {
            if (typeof window !== "undefined") {
                if (typeof window.__initializeNestedAppAuth === "function") {
                    await window.__initializeNestedAppAuth();
                }
                const bridgeProxy = await BridgeProxy.create();
                /*
                 * Because we want single sign on we expect the host app to provide the account context
                 * with a min set of params that can be used to identify the account
                 * this.account = nestedApp.getAccountByFilter(bridgeProxy.getAccountContext());
                 */
                this.accountContext = bridgeProxy.getAccountContext();
                this.bridgeProxy = bridgeProxy;
                this.available = bridgeProxy !== undefined;
            }
        }
        catch (ex) {
            this.logger.infoPii(`Could not initialize Nested App Auth bridge (${ex})`);
        }
        this.logger.info(`Nested App Auth Bridge available: ${this.available}`);
        return this.available;
    }
}
/*
 * TODO: Once we have determine the bundling code return here to specify the name of the bundle
 * containing the implementation for this operating context
 */
NestedAppOperatingContext.MODULE_NAME = "";
/**
 * Unique identifier for the operating context
 */
NestedAppOperatingContext.ID = "NestedAppOperatingContext";

export { NestedAppOperatingContext };
//# sourceMappingURL=NestedAppOperatingContext.mjs.map

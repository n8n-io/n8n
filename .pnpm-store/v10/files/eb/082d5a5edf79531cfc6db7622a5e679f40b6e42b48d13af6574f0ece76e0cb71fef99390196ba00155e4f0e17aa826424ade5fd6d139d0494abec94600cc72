/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseOperatingContext } from "./BaseOperatingContext.js";
import { IBridgeProxy } from "../naa/IBridgeProxy.js";
import { BridgeProxy } from "../naa/BridgeProxy.js";
import { AccountContext } from "../naa/BridgeAccountContext.js";

declare global {
    interface Window {
        __initializeNestedAppAuth?(): Promise<void>;
    }
}

export class NestedAppOperatingContext extends BaseOperatingContext {
    protected bridgeProxy: IBridgeProxy | undefined = undefined;
    protected accountContext: AccountContext | null = null;

    /*
     * TODO: Once we have determine the bundling code return here to specify the name of the bundle
     * containing the implementation for this operating context
     */
    static readonly MODULE_NAME: string = "";

    /**
     * Unique identifier for the operating context
     */
    static readonly ID: string = "NestedAppOperatingContext";

    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName(): string {
        return NestedAppOperatingContext.MODULE_NAME;
    }

    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId(): string {
        return NestedAppOperatingContext.ID;
    }

    /**
     * Returns the current BridgeProxy
     * @returns IBridgeProxy | undefined
     */
    getBridgeProxy(): IBridgeProxy | undefined {
        return this.bridgeProxy;
    }

    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    async initialize(): Promise<boolean> {
        try {
            if (typeof window !== "undefined") {
                if (typeof window.__initializeNestedAppAuth === "function") {
                    await window.__initializeNestedAppAuth();
                }

                const bridgeProxy: IBridgeProxy = await BridgeProxy.create();
                /*
                 * Because we want single sign on we expect the host app to provide the account context
                 * with a min set of params that can be used to identify the account
                 * this.account = nestedApp.getAccountByFilter(bridgeProxy.getAccountContext());
                 */
                this.accountContext = bridgeProxy.getAccountContext();
                this.bridgeProxy = bridgeProxy;
                this.available = bridgeProxy !== undefined;
            }
        } catch (ex) {
            this.logger.infoPii(
                `Could not initialize Nested App Auth bridge (${ex})`
            );
        }

        this.logger.info(`Nested App Auth Bridge available: ${this.available}`);
        return this.available;
    }
}

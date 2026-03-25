import { BaseOperatingContext } from "./BaseOperatingContext.js";
import { IBridgeProxy } from "../naa/IBridgeProxy.js";
import { AccountContext } from "../naa/BridgeAccountContext.js";
declare global {
    interface Window {
        __initializeNestedAppAuth?(): Promise<void>;
    }
}
export declare class NestedAppOperatingContext extends BaseOperatingContext {
    protected bridgeProxy: IBridgeProxy | undefined;
    protected accountContext: AccountContext | null;
    static readonly MODULE_NAME: string;
    /**
     * Unique identifier for the operating context
     */
    static readonly ID: string;
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName(): string;
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId(): string;
    /**
     * Returns the current BridgeProxy
     * @returns IBridgeProxy | undefined
     */
    getBridgeProxy(): IBridgeProxy | undefined;
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    initialize(): Promise<boolean>;
}
//# sourceMappingURL=NestedAppOperatingContext.d.ts.map
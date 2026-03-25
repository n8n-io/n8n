import { BaseOperatingContext } from "./BaseOperatingContext.js";
export declare class UnknownOperatingContext extends BaseOperatingContext {
    static readonly MODULE_NAME: string;
    /**
     * Unique identifier for the operating context
     */
    static readonly ID: string;
    /**
     * Returns the unique identifier for this operating context
     * @returns string
     */
    getId(): string;
    /**
     * Return the module name.  Intended for use with import() to enable dynamic import
     * of the implementation associated with this operating context
     * @returns
     */
    getModuleName(): string;
    /**
     * Checks whether the operating context is available.
     * Confirms that the code is running a browser rather.  This is required.
     * @returns Promise<boolean> indicating whether this operating context is currently available.
     */
    initialize(): Promise<boolean>;
}
//# sourceMappingURL=UnknownOperatingContext.d.ts.map
import { Logger, LogLevel } from "@azure/msal-common/browser";
import { BrowserConfiguration, Configuration } from "../config/Configuration.js";
/**
 * Base class for operating context
 * Operating contexts are contexts in which MSAL.js is being run
 * More than one operating context may be available at a time
 * It's important from a logging and telemetry point of view for us to be able to identify the operating context.
 * For example: Some operating contexts will pre-cache tokens impacting performance telemetry
 */
export declare abstract class BaseOperatingContext {
    protected logger: Logger;
    protected config: BrowserConfiguration;
    protected available: boolean;
    protected browserEnvironment: boolean;
    protected static loggerCallback(level: LogLevel, message: string): void;
    constructor(config: Configuration);
    /**
     * returns the name of the module containing the API controller associated with this operating context
     */
    abstract getModuleName(): string;
    /**
     * returns the string identifier of this operating context
     */
    abstract getId(): string;
    /**
     * returns a boolean indicating whether this operating context is present
     */
    abstract initialize(): Promise<boolean>;
    /**
     * Return the MSAL config
     * @returns BrowserConfiguration
     */
    getConfig(): BrowserConfiguration;
    /**
     * Returns the MSAL Logger
     * @returns Logger
     */
    getLogger(): Logger;
    isAvailable(): boolean;
    isBrowserEnvironment(): boolean;
}
//# sourceMappingURL=BaseOperatingContext.d.ts.map
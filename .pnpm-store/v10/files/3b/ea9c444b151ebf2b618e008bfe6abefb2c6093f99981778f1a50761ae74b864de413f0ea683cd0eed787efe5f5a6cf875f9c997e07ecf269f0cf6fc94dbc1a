import { LoggerOptions, IPerformanceClient, Logger, AuthenticationScheme } from "@azure/msal-common/browser";
import { BrowserConfiguration } from "../../config/Configuration.js";
import { IPlatformAuthHandler } from "./IPlatformAuthHandler.js";
/**
 * Checks if the platform broker is available in the current environment.
 * @param loggerOptions
 * @param perfClient
 * @returns
 */
export declare function isPlatformBrokerAvailable(loggerOptions?: LoggerOptions, perfClient?: IPerformanceClient, correlationId?: string, domConfig?: boolean): Promise<boolean>;
export declare function getPlatformAuthProvider(logger: Logger, performanceClient: IPerformanceClient, correlationId: string, nativeBrokerHandshakeTimeout?: number, enablePlatformBrokerDOMSupport?: boolean): Promise<IPlatformAuthHandler | undefined>;
/**
 * Returns boolean indicating whether or not the request should attempt to use native broker
 * @param logger
 * @param config
 * @param platformAuthProvider
 * @param authenticationScheme
 */
export declare function isPlatformAuthAllowed(config: BrowserConfiguration, logger: Logger, platformAuthProvider?: IPlatformAuthHandler, authenticationScheme?: AuthenticationScheme): boolean;
//# sourceMappingURL=PlatformAuthProvider.d.ts.map
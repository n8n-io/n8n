import { Authority } from "./Authority.js";
import { INetworkModule } from "../network/INetworkModule.js";
import { ICacheManager } from "../cache/interface/ICacheManager.js";
import { AuthorityOptions } from "./AuthorityOptions.js";
import { Logger } from "../logger/Logger.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
/**
 * Create an authority object of the correct type based on the url
 * Performs basic authority validation - checks to see if the authority is of a valid type (i.e. aad, b2c, adfs)
 *
 * Also performs endpoint discovery.
 *
 * @param authorityUri
 * @param networkClient
 * @param protocolMode
 * @internal
 */
export declare function createDiscoveredInstance(authorityUri: string, networkClient: INetworkModule, cacheManager: ICacheManager, authorityOptions: AuthorityOptions, logger: Logger, correlationId: string, performanceClient?: IPerformanceClient): Promise<Authority>;
//# sourceMappingURL=AuthorityFactory.d.ts.map
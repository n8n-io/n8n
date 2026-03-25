import { INetworkModule } from "../network/INetworkModule.js";
import { RegionDiscoveryMetadata } from "./RegionDiscoveryMetadata.js";
import { ImdsOptions } from "./ImdsOptions.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { Logger } from "../logger/Logger.js";
export declare class RegionDiscovery {
    protected networkInterface: INetworkModule;
    private logger;
    protected performanceClient: IPerformanceClient | undefined;
    protected correlationId: string | undefined;
    protected static IMDS_OPTIONS: ImdsOptions;
    constructor(networkInterface: INetworkModule, logger: Logger, performanceClient?: IPerformanceClient, correlationId?: string);
    /**
     * Detect the region from the application's environment.
     *
     * @returns Promise<string | null>
     */
    detectRegion(environmentRegion: string | undefined, regionDiscoveryMetadata: RegionDiscoveryMetadata): Promise<string | null>;
    /**
     * Make the call to the IMDS endpoint
     *
     * @param imdsEndpointUrl
     * @returns Promise<NetworkResponse<string>>
     */
    private getRegionFromIMDS;
    /**
     * Get the most recent version of the IMDS endpoint available
     *
     * @returns Promise<string | null>
     */
    private getCurrentVersion;
}
//# sourceMappingURL=RegionDiscovery.d.ts.map
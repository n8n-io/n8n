import { DelayDefinition } from '../model/delay-definition.model';
export declare class GlobalService {
    baseUri: string;
    constructor(baseUri: string);
    /**
     * Update global settings
     * @param delayDistribution Delay definition
     */
    updateGlobalSettings(delayDefinition: DelayDefinition): Promise<void>;
    /**
     * Reset mappings to the default set and reset the request journal
     */
    resetAll(): Promise<void>;
    /**
    * Shut down the WireMock server
    */
    shutdown(): Promise<void>;
}

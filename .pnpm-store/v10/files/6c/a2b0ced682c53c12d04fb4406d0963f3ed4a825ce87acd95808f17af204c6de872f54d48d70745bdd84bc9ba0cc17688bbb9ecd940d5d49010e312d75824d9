import SentinelConnector from "./index";
import { Sentinel } from "./types";
export declare class FailoverDetector {
    private connector;
    private sentinels;
    private isDisconnected;
    constructor(connector: SentinelConnector, sentinels: Sentinel[]);
    cleanup(): void;
    subscribe(): Promise<void>;
    private disconnect;
}

type Details = Record<string, boolean | number | string | string[]>;
type PerfResult = {
    details: Details;
    duration: number;
    method: string | undefined;
    module: string;
    name: string;
    scope: string | undefined;
};
type PerfHighlights = {
    hookRunTimes: Record<string, Record<string, number>>;
    'oclif.commandLoadMs': number;
    'oclif.commandRunMs': number;
    'oclif.configLoadMs': number;
    'oclif.corePluginsLoadMs': number;
    'oclif.initHookMs': number;
    'oclif.initMs': number;
    'oclif.linkedPluginsLoadMs': number;
    'oclif.postrunHookMs': number;
    'oclif.prerunHookMs': number;
    'oclif.runMs': number;
    'oclif.userPluginsLoadMs': number;
    pluginLoadTimes: Record<string, {
        details: Details;
        duration: number;
    }>;
};
export declare const OCLIF_MARKER_OWNER = "@oclif/core";
declare class Marker {
    owner: string;
    name: string;
    details: Details;
    method: string;
    module: string;
    scope: string;
    stopped: boolean;
    private startMarker;
    private stopMarker;
    constructor(owner: string, name: string, details?: Details);
    addDetails(details: Details): void;
    measure(): void;
    stop(): void;
}
export declare class Performance {
    private static _oclifPerf;
    private static _results;
    private static markers;
    /**
     * Collect performance results into static Performance.results
     *
     * @returns Promise<void>
     */
    static collect(): Promise<void>;
    /**
     * Add debug logs for plugin loading performance
     * @returns void
     */
    static debug(): void;
    static get enabled(): boolean;
    static getResult(owner: string, name: string): PerfResult | undefined;
    /**
     * Add a new performance marker
     *
     * @param owner An npm package like `@oclif/core` or `@salesforce/source-tracking`
     * @param name Name of the marker. Use `module.method#scope` format
     * @param details Arbitrary details to attach to the marker
     * @returns Marker instance
     */
    static mark(owner: string, name: string, details?: Details): Marker | undefined;
    static get oclifPerf(): PerfHighlights | Record<string, never>;
    /** returns a map of owner, PerfResult[].  Excludes oclif PerfResult, which you can get from oclifPerf */
    static get results(): Map<string, PerfResult[]>;
}
export {};

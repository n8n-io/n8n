export declare function transformArguments(): Array<string>;
interface MemoryStatsReply {
    peakAllocated: number;
    totalAllocated: number;
    startupAllocated: number;
    replicationBacklog: number;
    clientsReplicas: number;
    clientsNormal: number;
    aofBuffer: number;
    luaCaches: number;
    overheadTotal: number;
    keysCount: number;
    keysBytesPerKey: number;
    datasetBytes: number;
    datasetPercentage: number;
    peakPercentage: number;
    allocatorAllocated?: number;
    allocatorActive?: number;
    allocatorResident?: number;
    allocatorFragmentationRatio?: number;
    allocatorFragmentationBytes?: number;
    allocatorRssRatio?: number;
    allocatorRssBytes?: number;
    rssOverheadRatio?: number;
    rssOverheadBytes?: number;
    fragmentation?: number;
    fragmentationBytes: number;
    db: {
        [key: number]: {
            overheadHashtableMain: number;
            overheadHashtableExpires: number;
        };
    };
}
export declare function transformReply(rawReply: Array<string | number | Array<string | number>>): MemoryStatsReply;
export {};

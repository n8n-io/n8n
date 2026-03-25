"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CLUSTER_OPTIONS = void 0;
const dns_1 = require("dns");
exports.DEFAULT_CLUSTER_OPTIONS = {
    clusterRetryStrategy: (times) => Math.min(100 + times * 2, 2000),
    enableOfflineQueue: true,
    enableReadyCheck: true,
    scaleReads: "master",
    maxRedirections: 16,
    retryDelayOnMoved: 0,
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    retryDelayOnTryAgain: 100,
    slotsRefreshTimeout: 1000,
    useSRVRecords: false,
    resolveSrv: dns_1.resolveSrv,
    dnsLookup: dns_1.lookup,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
};

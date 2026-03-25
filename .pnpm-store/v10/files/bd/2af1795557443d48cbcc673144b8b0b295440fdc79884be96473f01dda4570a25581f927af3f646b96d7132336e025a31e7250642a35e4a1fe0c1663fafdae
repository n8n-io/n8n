"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_REDIS_OPTIONS = void 0;
exports.DEFAULT_REDIS_OPTIONS = {
    // Connection
    port: 6379,
    host: "localhost",
    family: 4,
    connectTimeout: 10000,
    disconnectTimeout: 2000,
    retryStrategy: function (times) {
        return Math.min(times * 50, 2000);
    },
    keepAlive: 0,
    noDelay: true,
    connectionName: null,
    // Sentinel
    sentinels: null,
    name: null,
    role: "master",
    sentinelRetryStrategy: function (times) {
        return Math.min(times * 10, 1000);
    },
    sentinelReconnectStrategy: function () {
        // This strategy only applies when sentinels are used for detecting
        // a failover, not during initial master resolution.
        // The deployment can still function when some of the sentinels are down
        // for a long period of time, so we may not want to attempt reconnection
        // very often. Therefore the default interval is fairly long (1 minute).
        return 60000;
    },
    natMap: null,
    enableTLSForSentinelMode: false,
    updateSentinels: true,
    failoverDetector: false,
    // Status
    username: null,
    password: null,
    db: 0,
    // Others
    enableOfflineQueue: true,
    enableReadyCheck: true,
    autoResubscribe: true,
    autoResendUnfulfilledCommands: true,
    lazyConnect: false,
    keyPrefix: "",
    reconnectOnError: null,
    readOnly: false,
    stringNumbers: false,
    maxRetriesPerRequest: 20,
    maxLoadingRetryTime: 10000,
    enableAutoPipelining: false,
    autoPipeliningIgnoredCommands: [],
    sentinelMaxConnections: 10,
};

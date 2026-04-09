"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopologyRefresher = exports.fetchTopology = exports.isGlobalEndpoint = exports.getPrimaryCluster = exports.isPrimaryCluster = exports.DEFAULT_REFRESH_INTERVAL = exports.GLOBAL_CLUSTER_IDENTIFIER = exports.ClusterCapability = void 0;
const logger_1 = require("./logger");
const GlobalCluster_1 = require("../types/GlobalCluster");
Object.defineProperty(exports, "ClusterCapability", { enumerable: true, get: function () { return GlobalCluster_1.ClusterCapability; } });
// Identifier used in URIs to detect global cluster endpoints
exports.GLOBAL_CLUSTER_IDENTIFIER = 'global-cluster';
// Retry constants for topology fetch
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // ms
const MAX_DELAY = 10000; // ms
const REQUEST_TIMEOUT = 10000; // ms
// Default refresh interval for topology refresher
exports.DEFAULT_REFRESH_INTERVAL = 300000; // 5 minutes in ms
/**
 * Check if a ClusterInfo is the primary (writable) cluster.
 */
function isPrimaryCluster(cluster) {
    return (cluster.capability & GlobalCluster_1.ClusterCapability.WRITABLE) !== 0;
}
exports.isPrimaryCluster = isPrimaryCluster;
/**
 * Get the primary cluster from a topology.
 * @throws Error if no primary cluster is found.
 */
function getPrimaryCluster(topology) {
    const primary = topology.clusters.find(isPrimaryCluster);
    if (!primary) {
        throw new Error('No primary cluster found in topology');
    }
    return primary;
}
exports.getPrimaryCluster = getPrimaryCluster;
/**
 * Check if the URI points to a global cluster endpoint.
 */
function isGlobalEndpoint(uri) {
    if (!uri)
        return false;
    return uri.toLowerCase().includes(exports.GLOBAL_CLUSTER_IDENTIFIER);
}
exports.isGlobalEndpoint = isGlobalEndpoint;
/**
 * Parse the topology response from the REST API.
 */
function parseTopologyResponse(data) {
    return {
        version: parseInt(data.version, 10),
        clusters: data.clusters.map(c => ({
            clusterId: c.clusterId,
            endpoint: c.endpoint,
            capability: c.capability,
        })),
    };
}
/**
 * Fetch the global cluster topology from the REST API.
 *
 * @param globalEndpoint - The global cluster endpoint URL
 * @param token - Authentication token
 * @returns GlobalTopology object containing cluster information
 * @throws Error if topology cannot be fetched after retries
 */
function fetchTopology(globalEndpoint, token) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        // Build the topology URL
        let endpoint = globalEndpoint.replace(/\/+$/, '');
        if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
            endpoint = `https://${endpoint}`;
        }
        const url = `${endpoint}/${exports.GLOBAL_CLUSTER_IDENTIFIER}/topology`;
        const headers = {
            Authorization: `Bearer ${token}`,
        };
        logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Fetching topology from ${url}`);
        let lastError = null;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
                const response = yield fetch(url, {
                    headers,
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    const text = yield response.text();
                    const err = new Error(`Topology request failed with status ${response.status}: ${text}`);
                    // Only retry on 5xx server errors; 4xx are permanent (auth, bad request, etc.)
                    if (response.status >= 400 && response.status < 500) {
                        logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Topology fetch failed with ${response.status} (not retryable)`);
                        throw err;
                    }
                    throw Object.assign(err, { retryable: true });
                }
                const result = yield response.json();
                if (result.code !== undefined && result.code !== 0) {
                    // API-level error, don't retry
                    logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Topology API error code=${result.code}: ${result.message}`);
                    throw new Error(result.message || 'Unknown API error');
                }
                const topology = parseTopologyResponse(result.data);
                logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Topology fetched: version=${topology.version}, clusters=${topology.clusters.length}, primary=${((_a = topology.clusters.find(c => isPrimaryCluster(c))) === null || _a === void 0 ? void 0 : _a.endpoint) || 'none'}`);
                return topology;
            }
            catch (e) {
                // Only retry network errors, timeouts, and 5xx errors
                if (!e.retryable && e.name !== 'AbortError' && !((_b = e.message) === null || _b === void 0 ? void 0 : _b.includes('fetch failed'))) {
                    throw e;
                }
                lastError = e;
                if (attempt < MAX_RETRIES - 1) {
                    const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
                    const jitter = delay * 0.1 * Math.random();
                    logger_1.logger.warn(`Topology fetch attempt ${attempt + 1} failed: ${e.message}. Retrying in ${(delay + jitter).toFixed(0)}ms`);
                    yield new Promise(resolve => setTimeout(resolve, delay + jitter));
                }
            }
        }
        throw new Error(`Failed to fetch global topology after ${MAX_RETRIES} attempts: ${lastError === null || lastError === void 0 ? void 0 : lastError.message}`);
    });
}
exports.fetchTopology = fetchTopology;
/**
 * Background refresher that periodically fetches the global cluster topology.
 */
class TopologyRefresher {
    constructor(options) {
        var _a;
        this.intervalId = null;
        this.refreshing = false;
        this.globalEndpoint = options.globalEndpoint;
        this.token = options.token;
        this.topology = options.topology;
        this.refreshInterval =
            (_a = options.refreshInterval) !== null && _a !== void 0 ? _a : exports.DEFAULT_REFRESH_INTERVAL;
        this.onTopologyChange = options.onTopologyChange;
    }
    /** Start the background refresh interval. */
    start() {
        if (this.intervalId !== null)
            return;
        logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m TopologyRefresher started, interval=${this.refreshInterval}ms`);
        this.intervalId = setInterval(() => this.tryRefresh(), this.refreshInterval);
        // Allow the Node.js process to exit even if the interval is still running
        if (this.intervalId && typeof this.intervalId === 'object' && 'unref' in this.intervalId) {
            this.intervalId.unref();
        }
    }
    /** Stop the background refresh interval. */
    stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m TopologyRefresher stopped`);
        }
    }
    /** Check if the refresher is running. */
    isRunning() {
        return this.intervalId !== null;
    }
    /** Get the current topology. */
    getTopology() {
        return this.topology;
    }
    /** Trigger an immediate topology refresh (debounced). */
    triggerRefresh() {
        if (this.refreshing) {
            logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Topology refresh already in progress, skipping`);
            return;
        }
        logger_1.logger.debug(`\x1b[36m[Global]\x1b[0m Triggering immediate topology refresh`);
        this.refreshing = true;
        this.tryRefresh().finally(() => {
            this.refreshing = false;
        });
    }
    tryRefresh() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const newTopology = yield fetchTopology(this.globalEndpoint, this.token);
                if (newTopology.version > this.topology.version) {
                    const oldVersion = this.topology.version;
                    this.topology = newTopology;
                    logger_1.logger.info(`Topology updated: version ${oldVersion} -> ${newTopology.version}`);
                    if (this.onTopologyChange) {
                        try {
                            this.onTopologyChange(newTopology);
                        }
                        catch (_a) {
                            logger_1.logger.warn('Topology change callback failed');
                        }
                    }
                }
            }
            catch (_b) {
                logger_1.logger.warn('Topology refresh failed');
                // Keep using cached topology, will retry next interval
            }
        });
    }
}
exports.TopologyRefresher = TopologyRefresher;
//# sourceMappingURL=GlobalTopology.js.map
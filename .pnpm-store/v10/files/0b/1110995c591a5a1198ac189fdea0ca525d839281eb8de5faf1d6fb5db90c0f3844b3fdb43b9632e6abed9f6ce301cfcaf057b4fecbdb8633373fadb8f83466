"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexHostSingleton = void 0;
const control_1 = require("../control");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
// We use describeIndex to retrieve the data plane url (host) for a given API key
// and index. We only ever want to call describeIndex a maximum of once per API key
// and index, so we cache them in a singleton for reuse.
exports.IndexHostSingleton = (function () {
    const hostUrls = {}; // map of apiKey-indexName to hostUrl
    const _describeIndex = async (config, indexName) => {
        const indexOperationsApi = (0, control_1.indexOperationsBuilder)(config);
        const describeResponse = await (0, control_1.describeIndex)(indexOperationsApi)(indexName);
        const host = describeResponse.host;
        if (!host) {
            // Generally, middleware will handle most errors from the call itself such as index not found, etc
            // However, we need to explicitly handle the optionality of status.host
            throw new errors_1.PineconeUnableToResolveHostError('The HTTP call succeeded but the host URL could not be resolved. Please make sure the index exists and is in a ready state.');
        }
        else {
            return host;
        }
    };
    const _key = (config, indexName) => `${config.apiKey}-${indexName}`;
    const singleton = {
        getHostUrl: async (config, indexName) => {
            const cacheKey = _key(config, indexName);
            if (cacheKey in hostUrls) {
                return hostUrls[cacheKey];
            }
            else {
                const hostUrl = await _describeIndex(config, indexName);
                singleton._set(config, indexName, hostUrl);
                if (!hostUrls[cacheKey]) {
                    throw new errors_1.PineconeUnableToResolveHostError(`Could not get host for index: ${indexName}. Call describeIndex('${indexName}') to check the current status.`);
                }
                return hostUrls[cacheKey];
            }
        },
        _reset: () => {
            for (const key of Object.keys(hostUrls)) {
                delete hostUrls[key];
            }
        },
        _set: (config, indexName, hostUrl) => {
            const normalizedHostUrl = (0, utils_1.normalizeUrl)(hostUrl);
            // prevent adding an empty hostUrl to the cache
            if (!normalizedHostUrl) {
                return;
            }
            const cacheKey = _key(config, indexName);
            hostUrls[cacheKey] = normalizedHostUrl;
        },
        _delete: (config, indexName) => {
            const cacheKey = _key(config, indexName);
            delete hostUrls[cacheKey];
        },
    };
    return singleton;
})();
//# sourceMappingURL=indexHostSingleton.js.map
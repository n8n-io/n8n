const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const __gomomento_sdk_core = require_rolldown_runtime.__toESM(require("@gomomento/sdk-core"));

//#region src/utils/momento.ts
/**
* Utility function to ensure that a Momento cache exists.
* If the cache does not exist, it is created.
*
* @param client The Momento cache client.
* @param cacheName The name of the cache to ensure exists.
*/
async function ensureCacheExists(client, cacheName) {
	const createResponse = await client.createCache(cacheName);
	if (createResponse instanceof __gomomento_sdk_core.CreateCache.Success || createResponse instanceof __gomomento_sdk_core.CreateCache.AlreadyExists) {} else if (createResponse instanceof __gomomento_sdk_core.CreateCache.Error) throw createResponse.innerException();
	else throw new Error(`Unknown response type: ${createResponse.toString()}`);
}

//#endregion
exports.ensureCacheExists = ensureCacheExists;
//# sourceMappingURL=momento.cjs.map
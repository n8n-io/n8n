import { CreateCache } from "@gomomento/sdk-core";

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
	if (createResponse instanceof CreateCache.Success || createResponse instanceof CreateCache.AlreadyExists) {} else if (createResponse instanceof CreateCache.Error) throw createResponse.innerException();
	else throw new Error(`Unknown response type: ${createResponse.toString()}`);
}

//#endregion
export { ensureCacheExists };
//# sourceMappingURL=momento.js.map
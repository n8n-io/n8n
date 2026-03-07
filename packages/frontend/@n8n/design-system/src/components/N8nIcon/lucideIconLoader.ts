import {
	lucideBodyChunkLoaders,
	lucideIconChunkIndex,
} from './generated/lucideChunkIndex.generated';

type LucideBodyChunk = Record<string, string>;

const bodyCache = new Map<string, string>();
const loadedChunks = new Map<string, LucideBodyChunk>();
const inFlightChunks = new Map<string, Promise<LucideBodyChunk>>();

async function loadChunk(chunkId: string): Promise<LucideBodyChunk> {
	const cachedChunk = loadedChunks.get(chunkId);
	if (cachedChunk) {
		return cachedChunk;
	}

	const inFlight = inFlightChunks.get(chunkId);
	if (inFlight) {
		return await inFlight;
	}

	const importer = lucideBodyChunkLoaders[chunkId];
	if (!importer) {
		return {};
	}

	const promise = importer()
		.then((mod) => {
			const chunk = mod.lucideBodyChunk ?? {};
			loadedChunks.set(chunkId, chunk);
			for (const [name, body] of Object.entries(chunk)) {
				bodyCache.set(name, body);
			}
			return chunk;
		})
		.finally(() => {
			inFlightChunks.delete(chunkId);
		});

	inFlightChunks.set(chunkId, promise);
	return await promise;
}

export async function loadLucideIconBody(name: string): Promise<string | null> {
	const cachedBody = bodyCache.get(name);
	if (cachedBody) {
		return cachedBody;
	}

	const chunkId = lucideIconChunkIndex[name];
	if (!chunkId) {
		return null;
	}

	const chunk = await loadChunk(chunkId);
	return chunk[name] ?? null;
}

export async function loadLucideIconBodies(names: string[]): Promise<Record<string, string>> {
	const uniqueNames = [...new Set(names)];
	const result: Record<string, string> = {};
	const chunkIdsToLoad = new Set<string>();

	for (const name of uniqueNames) {
		const cachedBody = bodyCache.get(name);
		if (cachedBody) {
			result[name] = cachedBody;
			continue;
		}

		const chunkId = lucideIconChunkIndex[name];
		if (chunkId) {
			chunkIdsToLoad.add(chunkId);
		}
	}

	await Promise.all([...chunkIdsToLoad].map(async (chunkId) => await loadChunk(chunkId)));

	for (const name of uniqueNames) {
		const body = bodyCache.get(name);
		if (body) {
			result[name] = body;
		}
	}

	return result;
}

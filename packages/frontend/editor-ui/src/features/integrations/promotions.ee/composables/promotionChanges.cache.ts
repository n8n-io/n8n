import { ref, type Ref } from 'vue';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { PromotableResource, PromotionDirection } from '@n8n/api-types';

import { getPromotableChanges } from '../promotions.api';

type ChangesEntry = {
	changes: Ref<PromotableResource[]>;
	commitSha: Ref<string | null>;
	lastRefreshedAt: Ref<string | null>;
	isLoading: Ref<boolean>;
	error: Ref<Error | null>;
	/** Set once a response arrived, so a reader can tell "nothing yet" from "nothing to show". */
	hasLoaded: Ref<boolean>;
	inFlight?: Promise<void>;
	/** Bumped by an invalidate, so a request started before it cannot write rows for old settings. */
	generation: number;
};

/**
 * Deriving the changes for one project and direction exports the whole project on the server,
 * so the banner and the modal share one result instead of each asking for its own.
 */
const entries = new Map<string, ChangesEntry>();

function createEntry(): ChangesEntry {
	return {
		changes: ref<PromotableResource[]>([]),
		commitSha: ref<string | null>(null),
		lastRefreshedAt: ref<string | null>(null),
		isLoading: ref(false),
		error: ref<Error | null>(null),
		hasLoaded: ref(false),
		generation: 0,
	};
}

export function getPromotionChangesEntry(projectId: string, direction: PromotionDirection) {
	const key = `${projectId}:${direction}`;
	let entry = entries.get(key);
	if (!entry) {
		entry = createEntry();
		entries.set(key, entry);
	}
	return entry;
}

/** Forgets every result in place, so a mounted reader keeps its entry and follows the next load. */
export function invalidatePromotionChanges() {
	for (const entry of entries.values()) {
		entry.generation += 1;
		entry.inFlight = undefined;
		entry.changes.value = [];
		entry.commitSha.value = null;
		entry.lastRefreshedAt.value = null;
		entry.error.value = null;
		entry.hasLoaded.value = false;
		entry.isLoading.value = false;
	}
}

/** Keeps the rows on screen but makes the next `ensure` ask again, for projects an apply rewrote. */
export function markPromotionChangesStale() {
	for (const entry of entries.values()) {
		// A request that started before the apply answers for the old content, so it may not
		// write and the next reader may not join it.
		entry.generation += 1;
		entry.inFlight = undefined;
		entry.isLoading.value = false;
		entry.hasLoaded.value = false;
	}
}

async function load(context: IRestApiContext, projectId: string, direction: PromotionDirection) {
	const entry = getPromotionChangesEntry(projectId, direction);
	const { generation } = entry;
	entry.isLoading.value = true;
	try {
		const result = await getPromotableChanges(context, projectId, direction);
		if (entry.generation !== generation) return;
		// Only a settled request writes, so a retry keeps the last rows and the error it retries.
		entry.changes.value = result.changes;
		entry.commitSha.value = result.commitSha;
		entry.lastRefreshedAt.value = new Date().toISOString();
		entry.hasLoaded.value = true;
		entry.error.value = null;
	} catch (e) {
		if (entry.generation !== generation) return;
		entry.error.value = e instanceof Error ? e : new Error(String(e));
	} finally {
		if (entry.generation === generation) {
			entry.isLoading.value = false;
			entry.inFlight = undefined;
		}
	}
}

/** Joins the running request when there is one, so two readers never fetch the same thing twice. */
export async function refreshPromotionChanges(
	context: IRestApiContext,
	projectId: string,
	direction: PromotionDirection,
) {
	const entry = getPromotionChangesEntry(projectId, direction);
	entry.inFlight ??= load(context, projectId, direction);
	await entry.inFlight;
}

/** Fetches only when there is no result yet, so opening a second view costs nothing. */
export async function ensurePromotionChanges(
	context: IRestApiContext,
	projectId: string,
	direction: PromotionDirection,
) {
	const entry = getPromotionChangesEntry(projectId, direction);
	if (entry.hasLoaded.value && !entry.error.value) return;
	await refreshPromotionChanges(context, projectId, direction);
}

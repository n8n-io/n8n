import { computed, shallowReactive, toRaw, watch, type Ref } from 'vue';
import { z } from 'zod';
import { useEventListener } from '@vueuse/core';
import { useUsersStore } from '@n8n/stores/users.store';
import { useInstanceAiStore } from '../instanceAi.store';
import { toTime } from './threadDisplayState';

const STORAGE_KEY_PREFIX = 'n8n:instance-ai:last-viewed:';

/** The oldest views go first, so that the stored map stays small. */
export const MAX_LAST_VIEWED_ENTRIES = 200;

type LastViewedEntries = ReadonlyMap<string, string>;

const storedEntriesSchema = z.record(z.string(), z.unknown());

// The sidebar and the thread view share one map for each user, so a view updates the sidebar
// at once. The key is the user ID, because a new sign-in does not reload the page.
const entriesByUser = shallowReactive(new Map<string, LastViewedEntries>());

/** Clears the shared state. Tests call this between cases. */
export function resetThreadLastViewedState() {
	entriesByUser.clear();
}

const storageKey = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

/** Keeps the newest views. Every value is a valid time here. */
function keepNewest(entries: Array<[string, string]>): LastViewedEntries {
	const newestFirst = entries.toSorted(([, a], [, b]) => Date.parse(b) - Date.parse(a));
	return new Map(newestFirst.slice(0, MAX_LAST_VIEWED_ENTRIES));
}

function readEntries(userId: string): LastViewedEntries {
	try {
		const raw = localStorage.getItem(storageKey(userId));
		if (raw === null) return new Map();
		const parsed = storedEntriesSchema.safeParse(JSON.parse(raw));
		if (!parsed.success) return new Map();
		const valid = Object.entries(parsed.data).filter(
			(entry): entry is [string, string] =>
				typeof entry[1] === 'string' && toTime(entry[1]) !== undefined,
		);
		return keepNewest(valid);
	} catch {
		// Blocked storage or broken JSON: start again with no views.
		return new Map();
	}
}

function writeEntries(userId: string, entries: LastViewedEntries) {
	try {
		localStorage.setItem(storageKey(userId), JSON.stringify(Object.fromEntries(entries)));
	} catch {
		// Blocked or full storage: the views last for this page session only.
	}
}

function entriesFor(userId: string): LastViewedEntries {
	const cached = entriesByUser.get(userId);
	if (cached) return cached;
	const entries = readEntries(userId);
	// Reading the stored copy changes nothing that a render shows, so it does not notify readers.
	toRaw(entriesByUser).set(userId, entries);
	return entries;
}

// Another tab wrote its views. Read them again on the next access.
function onStorage(event: StorageEvent) {
	if (event.key === null) entriesByUser.clear();
	else if (event.key.startsWith(STORAGE_KEY_PREFIX)) {
		entriesByUser.delete(event.key.slice(STORAGE_KEY_PREFIX.length));
	}
}

/**
 * When the current user last opened each Assistant chat, kept in this browser.
 * Without a signed-in user, nothing is read or stored.
 */
export function useThreadLastViewed() {
	const usersStore = useUsersStore();
	// A new function for each caller: the DOM adds the same function only once, so the first
	// caller that unmounts would remove the listener of all the others.
	useEventListener(window, 'storage', (event) => onStorage(event));

	function lastViewedAt(threadId: string): string | undefined {
		const userId = usersStore.currentUserId;
		return userId ? entriesFor(userId).get(threadId) : undefined;
	}

	/**
	 * Stores the later of now and `seenActivityAt`. The activity time comes from the server
	 * clock, so a client clock that is behind cannot make a chat the user saw look unseen.
	 */
	function markViewed(threadId: string, seenActivityAt?: string) {
		const userId = usersStore.currentUserId;
		if (!userId) return;
		const time = Math.max(Date.now(), toTime(seenActivityAt) ?? Number.NEGATIVE_INFINITY);
		const others = [...entriesFor(userId)].filter(([id]) => id !== threadId);
		const next = keepNewest([[threadId, new Date(time).toISOString()], ...others]);
		entriesByUser.set(userId, next);
		writeEntries(userId, next);
	}

	return { lastViewedAt, markViewed };
}

/**
 * Marks the open chat as seen when the user enters it, when it stops working and when
 * new activity arrives while it stays open.
 */
export function useMarkThreadViewed(threadId: () => string, isWorking: Readonly<Ref<boolean>>) {
	const store = useInstanceAiStore();
	const { markViewed } = useThreadLastViewed();
	const lastActivityAt = computed(
		() => store.threads.find((thread) => thread.id === threadId())?.lastActivityAt,
	);

	watch(
		[threadId, isWorking, lastActivityAt],
		([id, working, activityAt]) => {
			if (!working) markViewed(id, activityAt);
		},
		{ immediate: true },
	);
}

import { computed, onUnmounted, reactive, toValue, type MaybeRefOrGetter } from 'vue';

interface ViewTitleEntry {
	id: number;
	/** Normalized at push time — `reactive` would unwrap a stored Ref. */
	getTitle: () => string;
	onBack?: () => void;
}

const state = reactive<{ stack: ViewTitleEntry[] }>({ stack: [] });

let nextEntryId = 0;

/**
 * Top of the view-title stack, or `undefined` when no titled view is open.
 * The app header replaces its brand with a back button + this title.
 */
export const activeViewTitle = computed(() => {
	const entry = state.stack.at(-1);
	if (!entry) return undefined;
	return { title: entry.getTitle(), onBack: entry.onBack };
});

/**
 * Push a titled view onto the stack; returns its release. Prefer `useViewTitle`
 * in components — this exists for non-component callers and tests.
 */
export function pushViewTitle(title: MaybeRefOrGetter<string>, onBack?: () => void): () => void {
	const entry: ViewTitleEntry = { id: nextEntryId++, getTitle: () => toValue(title), onBack };
	state.stack.push(entry);
	return () => {
		const index = state.stack.findIndex((candidate) => candidate.id === entry.id);
		if (index !== -1) state.stack.splice(index, 1);
	};
}

/**
 * Give the calling view the app header's title slot (with a back button firing
 * `onBack`) for as long as it is mounted. Views stack: the most recently
 * mounted one owns the header; unmounting reveals the one beneath. Pass a
 * getter/ref for titles that change while the view is open.
 */
export function useViewTitle(title: MaybeRefOrGetter<string>, onBack?: () => void): void {
	onUnmounted(pushViewTitle(title, onBack));
}

export function __resetViewTitlesForTests(): void {
	state.stack.length = 0;
}

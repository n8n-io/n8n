import { readonly, ref } from 'vue';

// Counts the explicit clears in the Inbox list of the navigation panel. The Inbox page
// watches it, because a clear also cancels the page's pending selections.
const clearCount = ref(0);

export const inboxSelectionClears = readonly(clearCount);

export function requestInboxSelectionClear() {
	clearCount.value++;
}

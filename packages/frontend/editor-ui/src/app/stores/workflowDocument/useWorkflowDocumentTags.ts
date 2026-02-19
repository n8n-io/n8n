import { ref, readonly } from 'vue';

type Action<N, P> = { name: N; payload: P };

type SetTagsAction = Action<'setTags', { tags: string[] }>;
type AddTagsAction = Action<'addTags', { tags: string[] }>;
type RemoveTagAction = Action<'removeTag', { tagId: string }>;

export type TagAction = SetTagsAction | AddTagsAction | RemoveTagAction;

const TAG_ACTION_NAMES = new Set<string>(['setTags', 'addTags', 'removeTag']);

export function isTagAction(action: { name: string }): action is TagAction {
	return TAG_ACTION_NAMES.has(action.name);
}

/**
 * Composable that encapsulates tag state, public API, and mutation logic
 * for a workflow document store.
 *
 * Accepts an `onChange` callback that routes actions through the store's
 * unified dispatcher for CRDT migration readiness.
 */
export function useWorkflowDocumentTags(onChange: (action: TagAction) => void) {
	const tags = ref<string[]>([]);

	function setTags(newTags: string[]) {
		onChange({ name: 'setTags', payload: { tags: newTags } });
	}

	function addTags(newTags: string[]) {
		onChange({ name: 'addTags', payload: { tags: newTags } });
	}

	function removeTag(tagId: string) {
		onChange({ name: 'removeTag', payload: { tagId } });
	}

	/**
	 * Apply a tag action to the state.
	 * Called by the store's unified onChange dispatcher.
	 */
	function handleAction(action: TagAction) {
		if (action.name === 'setTags') {
			tags.value = action.payload.tags;
		} else if (action.name === 'addTags') {
			const uniqueTags = new Set([...tags.value, ...action.payload.tags]);
			tags.value = Array.from(uniqueTags);
		} else if (action.name === 'removeTag') {
			tags.value = tags.value.filter((tag) => tag !== action.payload.tagId);
		}
	}

	return {
		tags: readonly(tags),
		setTags,
		addTags,
		removeTag,
		handleAction,
	};
}

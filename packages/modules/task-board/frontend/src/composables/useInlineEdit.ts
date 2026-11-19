import { ref, toValue, type MaybeRefOrGetter } from 'vue';

export type InlineEditOptions = {
	/** The saved text. */
	value: MaybeRefOrGetter<string>;
	/** A required text does not save as empty. The saved text stays. */
	required?: boolean;
	onSave: (value: string) => void;
};

/**
 * A text that the user edits in place. The draft is local, so a poll that brings the saved
 * text again does not change what the user types.
 */
export function useInlineEdit(options: InlineEditOptions) {
	const editing = ref(false);
	const draft = ref('');

	function start() {
		draft.value = toValue(options.value);
		editing.value = true;
	}

	function cancel() {
		editing.value = false;
	}

	function save() {
		if (!editing.value) return;
		editing.value = false;
		const next = draft.value.trim();
		if (next === toValue(options.value).trim()) return;
		if (options.required && next.length === 0) return;
		options.onSave(next);
	}

	return { editing, draft, start, cancel, save };
}

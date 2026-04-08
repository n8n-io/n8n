import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type TagsPayload = {
	tags: string[];
};

export type TagsChangeEvent = ChangeEvent<TagsPayload>;

export function useWorkflowDocumentTags() {
	const tags = ref<string[]>([]);

	const onTagsChange = createEventHook<TagsChangeEvent>();

	function applyTags(newTags: string[], action: ChangeAction = CHANGE_ACTION.UPDATE) {
		tags.value = newTags;
		void onTagsChange.trigger({ action, payload: { tags: newTags } });
	}

	function applyRemoveTag(tagId: string) {
		tags.value = tags.value.filter((tag) => tag !== tagId);
		void onTagsChange.trigger({
			action: CHANGE_ACTION.DELETE,
			payload: { tags: tags.value },
		});
	}

	function setTags(newTags: string[]) {
		applyTags(newTags);
	}

	function addTags(newTags: string[]) {
		const uniqueTags = new Set([...tags.value, ...newTags]);
		applyTags(Array.from(uniqueTags), CHANGE_ACTION.ADD);
	}

	function removeTag(tagId: string) {
		applyRemoveTag(tagId);
	}

	return {
		tags: readonly(tags),
		setTags,
		addTags,
		removeTag,
		onTagsChange: onTagsChange.on,
	};
}

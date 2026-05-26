import { ref, readonly } from 'vue';
import { createEventHook } from '@vueuse/core';
import type { ITag } from '@n8n/rest-api-client';
import { CHANGE_ACTION } from './types';
import type { ChangeAction, ChangeEvent } from './types';

export type TagsPayload = {
	tags: string[];
};

export type TagsChangeEvent = ChangeEvent<TagsPayload>;

export type TagsInput = Array<string | ITag>;

function normalizeTags(input: TagsInput): string[] {
	return input.map((tag) => (typeof tag === 'string' ? tag : tag.id));
}

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

	function setTags(newTags: TagsInput) {
		applyTags(normalizeTags(newTags));
	}

	function addTags(newTags: TagsInput) {
		const uniqueTags = new Set([...tags.value, ...normalizeTags(newTags)]);
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

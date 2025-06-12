<script setup lang="ts">
import { computed } from 'vue';
import { useUIStore } from '@/stores/ui.store';
import { useTagsStore } from '@/stores/tags.store';
import { TAGS_MANAGER_MODAL_KEY } from '@/constants';
import type { EventBus } from '@n8n/utils/event-bus';

interface TagsDropdownWrapperProps {
	placeholder?: string;
	modelValue?: string[];
	createEnabled?: boolean;
	eventBus?: EventBus | null;
}

const props = withDefaults(defineProps<TagsDropdownWrapperProps>(), {
	placeholder: '',
	modelValue: () => [],
	createEnabled: true,
	eventBus: null,
});

const emit = defineEmits<{
	'update:modelValue': [selected: string[]];
	esc: [];
	blur: [];
}>();

const tagsStore = useTagsStore();
const uiStore = useUIStore();

const selectedTags = computed({
	get: () => props.modelValue,
	set: (value) => emit('update:modelValue', value),
});

const allTags = computed(() => tagsStore.allTags);
const isLoading = computed(() => tagsStore.isLoading);
const tagsById = computed(() => tagsStore.tagsById);

async function createTag(name: string) {
	return await tagsStore.create(name);
}

function handleManageTags() {
	uiStore.openModal(TAGS_MANAGER_MODAL_KEY);
}

function handleEsc() {
	emit('esc');
}

function handleBlur() {
	emit('blur');
}

// Fetch all tags when the component is created
void tagsStore.fetchAll();
</script>

<template>
	<TagsDropdown
		v-model="selectedTags"
		:placeholder="placeholder"
		:create-enabled="createEnabled"
		:event-bus="eventBus"
		:all-tags="allTags"
		:is-loading="isLoading"
		:tags-by-id="tagsById"
		:create-tag="createTag"
		@manage-tags="handleManageTags"
		@esc="handleEsc"
		@blur="handleBlur"
	/>
</template>

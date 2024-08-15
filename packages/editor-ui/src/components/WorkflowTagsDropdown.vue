<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@/composables/useI18n';
import { useToast } from '@/composables/useToast';
import { useUIStore } from '@/stores/ui.store';
import { useTagsStore } from '@/stores/tags.store';
import { TAGS_MANAGER_MODAL_KEY } from '@/constants';
import type { EventBus } from 'n8n-design-system';

interface TagsDropdownWrapperProps {
	placeholder?: string;
	modelValue?: string[];
	createEnabled?: boolean;
	eventBus?: EventBus | null;
}

const props = withDefaults(defineProps<TagsDropdownWrapperProps>(), {
	placeholder: '',
	modelValue: () => [],
	createEnabled: false,
	eventBus: null,
});

const emit = defineEmits<{
	'update:modelValue': [selected: string[]];
	esc: [];
	blur: [];
}>();

const i18n = useI18n();
const { showError } = useToast();
const tagsStore = useTagsStore();
const uiStore = useUIStore();

const selectedTags = computed({
	get: () => props.modelValue,
	set: (value) => emit('update:modelValue', value),
});

const allTags = computed(() => tagsStore.allTags);
const isLoading = computed(() => tagsStore.isLoading);
const tagsById = computed(() => tagsStore.tagsById);

async function handleCreateTag(name: string) {
	try {
		const newTag = await tagsStore.create(name);
		selectedTags.value = [...selectedTags.value, newTag.id];
	} catch (error) {
		showError(
			error,
			i18n.baseText('tagsDropdown.showError.title'),
			i18n.baseText('tagsDropdown.showError.message', { interpolate: { name } }),
		);
	}
}

function handleManageTags() {
	console.log('MANAGE');
	uiStore.openModal(TAGS_MANAGER_MODAL_KEY);
}

function handleEsc() {
	emit('esc');
}

function handleBlur() {
	emit('blur');
}

// Fetch all tags when the component is mounted
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
		@create-tag="handleCreateTag"
		@manage-tags="handleManageTags"
		@esc="handleEsc"
		@blur="handleBlur"
	/>
</template>

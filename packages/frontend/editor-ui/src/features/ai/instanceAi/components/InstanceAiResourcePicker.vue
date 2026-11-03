<script lang="ts" setup>
import { N8nDropdownMenu } from '@n8n/design-system';
import type { DropdownMenuItemProps } from '@n8n/design-system';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import { DEBOUNCE_TIME } from '@/app/constants/durations';
import type { ArtifactTab } from '../useCanvasPreview';
import { useProjectResourceSearch } from '../composables/useProjectResourceSearch';

/** Lists the resources of a project, so the user can open one in a preview tab. */
const props = withDefaults(
	defineProps<{
		projectId: string;
		/** Resources that are open in a tab already. The list leaves them out. */
		excludedTabs: ArtifactTab[];
		placement?: 'bottom-start' | 'bottom-end';
		contentTestId?: string;
	}>(),
	{ placement: 'bottom-start', contentTestId: 'instance-ai-tab-picker' },
);

const emit = defineEmits<{
	select: [resource: ArtifactTab];
}>();

defineSlots<{
	trigger: (props: { isOpen: boolean }) => unknown;
}>();

const i18n = useI18n();
const isOpen = ref(false);
const resourceSearch = useProjectResourceSearch({
	projectId: () => props.projectId,
	excludedTabs: () => props.excludedTabs,
});
const items = computed(
	(): Array<DropdownMenuItemProps<string>> =>
		resourceSearch.results.value.map((resource) => ({
			id: `${resource.type}:${resource.id}`,
			label: resource.name,
			icon: { type: 'icon', value: resource.icon },
		})),
);

function handleOpenChange(open: boolean) {
	isOpen.value = open;
	if (open) void resourceSearch.search();
}

function handleSelect(itemId: string) {
	const resource = resourceSearch.results.value.find(
		(result) => `${result.type}:${result.id}` === itemId,
	);
	if (resource) emit('select', resource);
}
</script>

<template>
	<N8nDropdownMenu
		:model-value="isOpen"
		:items="items"
		:loading="resourceSearch.isLoading.value && items.length === 0"
		:search-placeholder="i18n.baseText('instanceAi.previewTabBar.searchResources')"
		:search-debounce="getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH)"
		:empty-text="i18n.baseText('instanceAi.previewTabBar.noResources')"
		:extra-popper-class="$style.picker"
		max-height="320px"
		:placement="placement"
		:content-test-id="contentTestId"
		searchable
		@update:model-value="handleOpenChange"
		@search="resourceSearch.search"
		@select="handleSelect"
	>
		<template #trigger>
			<slot name="trigger" :is-open="isOpen" />
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.picker {
	width: 200px;
}
</style>

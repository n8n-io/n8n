<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { usePagesReferencingResource } from '../composables/usePagesReferencingResource';
import { toResourcePagesTextKeys, type PagesResource } from '../resourcePages';
import ResourcePagesPopover from './ResourcePagesPopover.vue';

/**
 * Shows how many pages link to a resource and lists them in a popover.
 * The popover also creates a page that links to the resource, in `projectId`.
 * Emits `open` each time the popover opens, and `navigate` when a page is about to open.
 */
const props = withDefaults(
	defineProps<{
		resource: PagesResource;
		resourceName: string;
		/** The project that gets a new page. Without it the popover offers no creation. */
		projectId?: string;
		/** The start of each test id, for example `workflow-pages`. */
		testIdPrefix: string;
		align?: 'start' | 'center' | 'end';
	}>(),
	{ projectId: undefined, align: 'start' },
);

const emit = defineEmits<{
	open: [];
	navigate: [];
}>();

const i18n = useI18n();

const isOpen = ref(false);
const { pages, refresh } = usePagesReferencingResource(() => props.resource);

const hasPages = computed(() => pages.value.length > 0);
const countLabel = computed(() => (hasPages.value ? String(pages.value.length) : undefined));
const buttonTitle = computed(() =>
	i18n.baseText(toResourcePagesTextKeys(props.resource.resourceType).buttonTitle, {
		adjustToNumber: pages.value.length,
	}),
);

function refreshWhenOpened(open: boolean): void {
	if (open) {
		void refresh();
		emit('open');
	}
}

watch(isOpen, refreshWhenOpened);
</script>

<template>
	<ResourcePagesPopover
		v-model:open="isOpen"
		:pages="pages"
		:resource="resource"
		:resource-name="resourceName"
		:project-id="projectId"
		:test-id-prefix="testIdPrefix"
		:align="align"
		@navigate="emit('navigate')"
	>
		<template #trigger>
			<N8nButton
				variant="ghost"
				size="small"
				icon="file-text"
				:icon-only="!hasPages"
				:label="countLabel"
				:class="{ [$style.subdued]: !hasPages }"
				:title="buttonTitle"
				:aria-label="buttonTitle"
				:data-test-id="`${testIdPrefix}-button`"
			/>
		</template>
		<template #actions="{ close }">
			<slot name="actions" :close="close" />
		</template>
	</ResourcePagesPopover>
</template>

<style lang="scss" module>
.subdued {
	--button--color--text: var(--text-color--subtler);
}
</style>

<script setup lang="ts">
import { N8nButton, N8nCard, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { Page } from '@/features/apps/apps.types';
import { formatRoutePath } from '@/features/apps/pageTree.utils';

const i18n = useI18n();

const props = defineProps<{
	page: Page;
	childCount: number;
}>();

defineEmits<{
	open: [pageId: string];
	addChild: [parentPageId: string];
	delete: [pageId: string];
}>();

// An empty route means this page is the index page for its level — and,
// since it contributes no path segment of its own, it can't have children
// (a child of it would resolve to the same URL as a sibling of this page).
const routeLabel = computed(() =>
	formatRoutePath(props.page.route, i18n.baseText('apps.page.index')),
);
</script>

<template>
	<N8nCard hoverable :class="$style.card" data-test-id="page-card" @click="$emit('open', page.id)">
		<template #prepend>
			<N8nIcon icon="file" />
		</template>
		<N8nText bold data-test-id="app-page-route">{{ routeLabel }}</N8nText>
		<N8nText v-if="childCount > 0" color="text-light" size="small">
			{{ i18n.baseText('apps.page.subPageCount', { adjustToNumber: childCount }) }}
		</N8nText>
		<template #append>
			<div :class="$style.actions" @click.stop>
				<N8nTooltip v-if="page.route" :content="i18n.baseText('apps.page.addChild')">
					<N8nButton
						icon-only
						icon="plus"
						size="small"
						variant="subtle"
						:aria-label="i18n.baseText('apps.page.addChild')"
						data-test-id="app-page-add-child"
						@click="$emit('addChild', page.id)"
					/>
				</N8nTooltip>
				<N8nTooltip :content="i18n.baseText('generic.delete')">
					<N8nButton
						icon-only
						icon="trash-2"
						size="small"
						variant="subtle"
						:aria-label="i18n.baseText('generic.delete')"
						data-test-id="app-page-delete"
						@click="$emit('delete', page.id)"
					/>
				</N8nTooltip>
			</div>
		</template>
	</N8nCard>
</template>

<style lang="scss" module>
.card {
	cursor: pointer;
}

.actions {
	display: flex;
	gap: var(--spacing--4xs);
}
</style>

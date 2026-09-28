<script setup lang="ts">
import { N8nButton, N8nCard, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { Page } from '@/features/apps/apps.types';
import { formatRoutePath } from '@/features/apps/pageTree.utils';

const i18n = useI18n();

const props = withDefaults(
	defineProps<{
		page: Page;
		childCount: number;
		/** How many levels below the top of this list the card sits — 0 for a top-level row. */
		indent?: number;
	}>(),
	{ indent: 0 },
);

defineEmits<{
	open: [pageId: string];
	addChild: [parentPageId: string];
	edit: [pageId: string];
	delete: [pageId: string];
}>();

// An empty route means this page is the index page for its level — and,
// since it contributes no path segment of its own, it can't have children
// (a child of it would resolve to the same URL as a sibling of this page).
const routeLabel = computed(() =>
	formatRoutePath(props.page.route, i18n.baseText('apps.page.index')),
);

// A flex-column parent stretches this card to its own full width, so the
// indent has to come out of that width too, not just shift the box right —
// otherwise the right edge overflows the container.
const cardStyle = computed(() => {
	if (!props.indent) return undefined;
	const indent = `calc(${props.indent} * var(--spacing--lg))`;
	return { marginLeft: indent, width: `calc(100% - ${indent})` };
});
</script>

<template>
	<N8nCard
		hoverable
		:class="$style.card"
		:style="cardStyle"
		data-test-id="page-card"
		@click="$emit('open', page.id)"
	>
		<template #prepend>
			<N8nIcon :icon="indent > 0 ? 'corner-down-right' : 'file'" />
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
				<N8nTooltip :content="i18n.baseText('apps.page.edit')">
					<N8nButton
						icon-only
						icon="pencil"
						size="small"
						variant="subtle"
						:aria-label="i18n.baseText('apps.page.edit')"
						data-test-id="app-page-edit"
						@click="$emit('edit', page.id)"
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

<script setup lang="ts">
import type { PromotionDirection } from '@n8n/api-types';
import { N8nBadge, N8nTooltip, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { usePromotionEntryPoints } from '../composables/usePromotionEntryPoints';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';

const i18n = useI18n();
const { currentProjectId, showPromote, showApply, promote, apply } = usePromotionEntryPoints();

const ICONS: Record<PromotionDirection, IconName> = { apply: 'arrow-down', promote: 'arrow-up' };

const badges = computed(() => {
	const projectId = currentProjectId.value;
	if (!projectId) return [];
	const entries = [
		{ direction: 'apply' as const, show: showApply.value, changes: apply },
		{ direction: 'promote' as const, show: showPromote.value, changes: promote },
	];
	return entries
		.filter(({ show, changes }) => show && (changes.failed.value || changes.changeCount.value > 0))
		.map(({ direction, changes }) => ({
			direction,
			failed: changes.failed.value,
			changeCount: changes.changeCount.value,
			label: changes.failed.value
				? i18n.baseText(`promotions.preview.badge.failed.${direction}`)
				: i18n.baseText(`promotions.preview.badge.${direction}`, {
						adjustToNumber: changes.changeCount.value,
						interpolate: { count: String(changes.changeCount.value) },
					}),
			to: { name: PROMOTION_PREVIEW_VIEWS[direction], params: { projectId } },
		}));
});
</script>

<template>
	<div v-if="badges.length > 0" :class="$style.badges" data-test-id="promotion-preview-badges">
		<N8nTooltip v-for="badge in badges" :key="badge.direction" :content="badge.label">
			<RouterLink
				:to="badge.to"
				:aria-label="badge.label"
				:class="$style.link"
				:data-test-id="`promotion-preview-badge-${badge.direction}`"
			>
				<N8nBadge
					:variant="badge.failed ? 'warning' : 'subtle'"
					size="small"
					:leading-icon="badge.failed ? 'circle-alert' : ICONS[badge.direction]"
				>
					<template v-if="!badge.failed">{{ badge.changeCount }}</template>
				</N8nBadge>
			</RouterLink>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.badges {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.link {
	display: inline-flex;
	/* Matches the small badge, so the focus ring follows its shape. */
	border-radius: var(--radius--xs);

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--outline-color);
		outline-offset: var(--focus--border-width);
	}
}
</style>

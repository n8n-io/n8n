<script setup lang="ts">
import type { PromotionPlannedMove } from '@n8n/api-types';
import { N8nBadge, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionMoveLabels } from '../../composables/usePromotionMoveLabels';
import { changedProjectsOf, moveKey } from '../../promotionMoves';
import type { ResourceKey } from '../../promotionPreview.selection';
import { resourceIcon } from '../../promotionPreview.tree';
import PromotionWorkflowLinks from '../preview/PromotionWorkflowLinks.vue';
import PromotionDependencySection from './PromotionDependencySection.vue';

/**
 * The workflows and folders that an Apply transfers between two team projects, and each project
 * that it changes. A project that the user cannot access is counted, not named.
 */
const props = defineProps<{
	moves: PromotionPlannedMove[];
	/**
	 * False on a project page: the Apply of one project cannot move an item out of a project
	 * that the branch does not hold.
	 */
	canConfirm: boolean;
}>();

const emit = defineEmits<{ inspect: [key: ResourceKey] }>();

const i18n = useI18n();
const { projectLabel, moveSentence, changedProjectsText } = usePromotionMoveLabels();

const changedProjects = computed(() => changedProjectsOf(props.moves));
</script>

<template>
	<PromotionDependencySection
		:title="i18n.baseText('promotions.moves.title')"
		:description="i18n.baseText('promotions.moves.description')"
		icon="arrow-left-right"
		data-test-id="promotion-planned-moves"
	>
		<template #action>
			<N8nText step="2xs" color="text-light" :class="$style.count">
				{{
					i18n.baseText('promotions.moves.count', {
						adjustToNumber: moves.length,
						interpolate: { count: String(moves.length) },
					})
				}}
			</N8nText>
		</template>
		<li
			v-for="move in moves"
			:key="moveKey(move)"
			:class="$style.row"
			data-test-id="promotion-planned-move"
		>
			<div :class="$style.main">
				<span :class="$style.name">
					<N8nIcon :icon="resourceIcon(move.kind)" size="small" :class="$style.icon" />
					<PromotionWorkflowLinks
						:workflows="[{ key: moveKey(move), name: move.name }]"
						@inspect="emit('inspect', $event)"
					/>
				</span>
				<N8nText tag="p" step="2xs" color="text-base" :class="$style.detail">
					{{ moveSentence(move) }}
				</N8nText>
				<N8nText
					v-if="move.losesShares"
					tag="p"
					step="2xs"
					color="text-base"
					:class="$style.detail"
					data-test-id="promotion-planned-move-shares"
				>
					{{ i18n.baseText('promotions.moves.losesShares', { interpolate: { name: move.name } }) }}
				</N8nText>
				<N8nText
					v-if="move.needsConfirmation"
					tag="p"
					step="2xs"
					color="text-base"
					:class="$style.detail"
					data-test-id="promotion-planned-move-out"
				>
					{{
						i18n.baseText(
							canConfirm ? 'promotions.moves.needsConfirmation' : 'promotions.moves.needsInstance',
							{ interpolate: { from: projectLabel(move.fromProject) } },
						)
					}}
				</N8nText>
			</div>
			<div :class="$style.badges">
				<N8nBadge v-if="move.losesShares" variant="warning">
					{{ i18n.baseText('promotions.moves.losesShares.badge') }}
				</N8nBadge>
				<N8nBadge v-if="move.needsConfirmation" :variant="canConfirm ? 'warning' : 'danger'">
					{{
						i18n.baseText(
							canConfirm
								? 'promotions.moves.needsConfirmation.badge'
								: 'promotions.moves.needsInstance.badge',
						)
					}}
				</N8nBadge>
			</div>
		</li>
		<li :class="[$style.row, $style.summary]" data-test-id="promotion-changed-projects">
			<N8nIcon icon="layers" size="small" :class="$style.icon" />
			<N8nText step="xs" color="text-dark">{{ changedProjectsText(changedProjects) }}</N8nText>
		</li>
	</PromotionDependencySection>
</template>

<style module lang="scss">
.row {
	display: grid;
	grid-template-columns: minmax(0, 1fr) auto;
	align-items: center;
	column-gap: var(--spacing--sm);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:first-child) {
		border-top: var(--border);
	}
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.name {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.icon {
	flex-shrink: 0;
	color: var(--icon-color);
}

.detail {
	margin: 0;
	/* Lines up with the name, after the icon. */
	padding-left: calc(var(--spacing--xs) + var(--spacing--2xs));
}

.badges {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.summary {
	display: flex;
	gap: var(--spacing--2xs);
}

.count {
	white-space: nowrap;
}
</style>

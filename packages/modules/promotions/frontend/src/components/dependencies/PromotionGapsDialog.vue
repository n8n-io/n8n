<script setup lang="ts">
import type { PromotionDependencyReport, PromotionDirection } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { usePromotionDependencyLabels } from '../../composables/usePromotionDependencyLabels';
import { groupGaps, placeholderGaps } from '../../promotionDependencies';
import PromotionCommitMessageField from '../PromotionCommitMessageField.vue';
import PromotionDependencySection from './PromotionDependencySection.vue';
import PromotionGapRow from './PromotionGapRow.vue';

/**
 * The confirmation of a Promote or an Apply with gaps. It lists every gap that the user
 * accepts, and what the operation does about them.
 */
const props = defineProps<{
	open: boolean;
	direction: PromotionDirection;
	report: PromotionDependencyReport;
	/** The names of the projects that the user can access, by id. */
	projectNames: ReadonlyMap<string, string>;
	/** Promote only: the Promote opens a review, which then lists the gaps. */
	opensReview?: boolean;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	/** Promote sends its commit message. `undefined` lets the backend generate it. */
	confirm: [commitMessage: string | undefined];
}>();

// Owned by the page, so the typed message survives a failed promote.
const commitMessage = defineModel<string>('commitMessage', { default: '' });

const i18n = useI18n();
const { groupTitle } = usePromotionDependencyLabels();

const gapCount = computed(() => props.report.gaps.length);
const countOptions = computed(() => ({
	adjustToNumber: gapCount.value,
	interpolate: { count: String(gapCount.value) },
}));
const title = computed(() =>
	i18n.baseText(`promotions.dependencies.confirm.title.${props.direction}`, countOptions.value),
);
const confirmLabel = computed(() =>
	i18n.baseText(`promotions.dependencies.submit.${props.direction}`, countOptions.value),
);
const intro = computed(() =>
	i18n.baseText(`promotions.dependencies.confirm.intro.${props.direction}`, countOptions.value),
);
const groups = computed(() => groupGaps(props.report.gaps));

// What happens after the confirmation, one sentence for each effect.
const effects = computed((): string[] => {
	if (props.direction === 'promote') {
		return [
			i18n.baseText(
				props.opensReview
					? 'promotions.dependencies.confirm.effect.review'
					: 'promotions.dependencies.confirm.effect.commit',
			),
			i18n.baseText('promotions.dependencies.confirm.effect.apply'),
		];
	}
	const placeholders = placeholderGaps(props.report.gaps);
	const unresolved = props.report.gaps.filter(({ placeholder }) => !placeholder).length;
	return [
		...placeholders.map((gap) => {
			const project = props.projectNames.get(gap.consumer.projectId);
			const credential = gap.target.name ?? gap.target.id;
			return project
				? i18n.baseText('promotions.dependencies.placeholders.inProject', {
						interpolate: { credential, project },
					})
				: i18n.baseText('promotions.dependencies.placeholders.forWorkflow', {
						interpolate: { credential, workflow: gap.consumer.name },
					});
		}),
		...(unresolved > 0
			? [
					i18n.baseText('promotions.dependencies.confirm.effect.unresolved', {
						adjustToNumber: unresolved,
						interpolate: { count: String(unresolved) },
					}),
				]
			: []),
		i18n.baseText('promotions.dependencies.confirm.effect.notPublished'),
	];
});

function submit() {
	emit('confirm', commitMessage.value.trim() || undefined);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="large"
		:aria-description="intro"
		data-test-id="promotion-gaps-dialog"
		@update:open="emit('update:open', $event)"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		</N8nDialogHeader>
		<N8nDialogBody>
			<form id="promotion-gaps-form" :class="$style.body" @submit.prevent="submit">
				<N8nText tag="p" color="text-base" :class="$style.paragraph">{{ intro }}</N8nText>
				<div :class="$style.gaps" data-test-id="promotion-gaps-gaps">
					<PromotionDependencySection
						v-for="group in groups"
						:key="group.id"
						:title="groupTitle(group.id, direction)"
						compact
					>
						<PromotionGapRow
							v-for="row in group.rows"
							:key="row.key"
							:row="row"
							:group="group.id"
							:direction="direction"
							read-only
						/>
					</PromotionDependencySection>
				</div>
				<div :class="$style.effects">
					<N8nText tag="p" bold color="text-dark" :class="$style.paragraph">
						{{ i18n.baseText('promotions.dependencies.confirm.effects') }}
					</N8nText>
					<ul :class="$style.effectList" data-test-id="promotion-gaps-effects">
						<li v-for="effect in effects" :key="effect">
							<N8nText color="text-base">{{ effect }}</N8nText>
						</li>
					</ul>
				</div>
				<PromotionCommitMessageField v-if="direction === 'promote'" v-model="commitMessage" />
			</form>
		</N8nDialogBody>
		<N8nDialogFooter>
			<N8nButton
				type="button"
				variant="outline"
				data-test-id="promotion-gaps-cancel"
				@click="emit('update:open', false)"
			>
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				type="submit"
				form="promotion-gaps-form"
				data-test-id="promotion-gaps-confirm"
			>
				{{ confirmLabel }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.paragraph {
	margin: 0;
}

.gaps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.effects {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.effectList {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding-left: var(--spacing--md);
}
</style>

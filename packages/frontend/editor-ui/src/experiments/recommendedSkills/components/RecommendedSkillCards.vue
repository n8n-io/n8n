<script lang="ts" setup>
import { onMounted } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';

import {
	RECOMMENDED_SKILLS,
	type RecommendedSkill,
	type RecommendedSkillSelection,
} from '../recommendedSkills';
import RecommendedSkillSource from './RecommendedSkillSource.vue';
import { useRecommendedSkillLoader } from '../useRecommendedSkillLoader';
import {
	type RecommendedSkillsEntryPoint,
	useRecommendedSkillsExperiment,
} from '../useRecommendedSkillsExperiment';

const props = defineProps<{ entryPoint: RecommendedSkillsEntryPoint }>();

const emit = defineEmits<{
	select: [recommended: RecommendedSkillSelection];
}>();

const i18n = useI18n();
const { addedSkillIds, trackCardsShown } = useRecommendedSkillsExperiment();
const { loadingId, loadRecommendedSkill } = useRecommendedSkillLoader();

async function selectSkill(recommended: RecommendedSkill) {
	const skill = await loadRecommendedSkill(recommended);
	if (skill) emit('select', { id: recommended.id, skill });
}

onMounted(() => {
	trackCardsShown(props.entryPoint);
});
</script>

<template>
	<ul :class="$style.grid" data-test-id="recommended-skill-cards">
		<li v-for="recommended in RECOMMENDED_SKILLS" :key="recommended.id">
			<N8nCard :class="$style.card" :data-test-id="`recommended-skill-${recommended.id}`">
				<template #header>
					<span :class="$style.name">
						<span :class="$style.icon">
							<N8nIcon :icon="recommended.icon" size="small" />
						</span>
						<N8nText bold color="text-dark">{{ recommended.name }}</N8nText>
					</span>
					<N8nText
						v-if="entryPoint === 'create_menu' && addedSkillIds.includes(recommended.id)"
						:class="$style.added"
						size="small"
						color="success"
						data-test-id="recommended-skill-added"
					>
						<N8nIcon icon="check" size="small" />
						{{ i18n.baseText('tools.connection.action.added') }}
					</N8nText>
				</template>
				<N8nText tag="p" size="small" color="text-base" :class="$style.cardText">
					{{ i18n.baseText(recommended.cardTextKey) }}
				</N8nText>
				<RecommendedSkillSource :skill="recommended" :class="$style.source" />
				<template #footer>
					<N8nButton
						variant="outline"
						size="small"
						:loading="loadingId === recommended.id"
						data-test-id="recommended-skill-use-button"
						:data-attr="`recommended-skill-use-${recommended.id}`"
						@click="selectSkill(recommended)"
					>
						{{ i18n.baseText('experiments.recommendedSkills.use') }}
					</N8nButton>
				</template>
			</N8nCard>
		</li>
	</ul>
</template>

<style lang="scss" module>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
	gap: var(--spacing--xs);
	width: 100%;
	margin: 0;
	padding: 0;
	list-style: none;
	text-align: left;
}

.card {
	height: 100%;
	align-items: stretch;
}

.name {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.icon {
	display: grid;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border: var(--border);
	border-radius: var(--radius--3xs);
	background-color: var(--background--subtle);
	color: var(--text-color--subtle);
}

.added {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	white-space: nowrap;
}

.cardText {
	flex: 1;
	padding: var(--spacing--2xs) 0 var(--spacing--3xs);
}

.source {
	padding-bottom: var(--spacing--sm);
}
</style>

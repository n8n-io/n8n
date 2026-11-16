<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nCard, N8nIcon, N8nText } from '@n8n/design-system';

import type { AgentSkill } from '@/features/agents/types';

import {
	RECOMMENDED_SKILLS,
	type RecommendedSkill,
	type RecommendedSkillId,
} from '../recommendedSkills';
import {
	type RecommendedSkillsEntryPoint,
	useRecommendedSkillsExperiment,
} from '../useRecommendedSkillsExperiment';

const props = defineProps<{ entryPoint: RecommendedSkillsEntryPoint }>();

const emit = defineEmits<{
	select: [recommended: { id: RecommendedSkillId; skill: AgentSkill }];
}>();

const i18n = useI18n();
const { showError } = useToast();
const { trackCardsShown } = useRecommendedSkillsExperiment();
const loadingId = ref<RecommendedSkillId>();

async function selectSkill(recommended: RecommendedSkill) {
	if (loadingId.value) return;
	loadingId.value = recommended.id;
	try {
		emit('select', { id: recommended.id, skill: await recommended.load() });
	} catch (error) {
		showError(error, i18n.baseText('experiments.recommendedSkills.loadError'));
	} finally {
		loadingId.value = undefined;
	}
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
				</template>
				<N8nText tag="p" size="small" color="text-base" :class="$style.cardText">
					{{ i18n.baseText(recommended.cardTextKey) }}
				</N8nText>
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

.cardText {
	flex: 1;
	padding: var(--spacing--2xs) 0 var(--spacing--sm);
}
</style>

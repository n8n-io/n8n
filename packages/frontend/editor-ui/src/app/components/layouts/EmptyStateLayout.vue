<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useWorkflowsEmptyState } from '@/features/workflows/composables/useWorkflowsEmptyState';
import { useEmptyStateBuilderPromptStore } from '@/experiments/emptyStateBuilderPrompt/stores/emptyStateBuilderPrompt.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import RecommendedTemplatesSection from '@/features/workflows/templates/recommendations/components/RecommendedTemplatesSection.vue';
import ReadyToRunButton from '@/features/workflows/readyToRun/components/ReadyToRunButton.vue';
import EmptyStateBuilderPrompt from '@/experiments/emptyStateBuilderPrompt/components/EmptyStateBuilderPrompt.vue';

const emit = defineEmits<{
	'click:add': [];
}>();

const i18n = useI18n();
const route = useRoute();
const bannersStore = useBannersStore();
const projectsStore = useProjectsStore();
const projectPages = useProjectPages();
const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();
const readyToRunStore = useReadyToRunStore();

const {
	showBuilderPrompt,
	showRecommendedTemplatesInline,
	builderHeading,
	emptyStateHeading,
	emptyStateDescription,
	canCreateWorkflow,
} = useWorkflowsEmptyState();

const addWorkflow = () => {
	emit('click:add');
};

// Check if user can claim credits for ready-to-run
const showReadyToRunCard = computed(() => {
	return readyToRunStore.userCanClaimOpenAiCredits && canCreateWorkflow.value;
});

const handleReadyToRunClick = async () => {
	try {
		await readyToRunStore.claimCreditsAndOpenWorkflow(
			'card',
			builderParentFolderId.value,
			builderProjectId.value,
		);
	} catch {
		// Error already shown by store
	}
};

const containerStyle = computed(() => ({
	minHeight: `calc(100vh - ${bannersStore.bannersHeight}px)`,
}));

const builderProjectId = computed(() =>
	projectPages.isOverviewSubPage
		? projectsStore.personalProject?.id
		: (route.params.projectId as string),
);

const builderParentFolderId = computed(() => route.params.folderId as string | undefined);

const handleBuilderPromptSubmit = async (prompt: string) => {
	await emptyStateBuilderPromptStore.createWorkflowWithPrompt(
		prompt,
		builderProjectId.value,
		builderParentFolderId.value,
	);
};
</script>

<template>
	<div
		:class="[
			$style.emptyStateLayout,
			{
				[$style.noTemplatesContent]: !showRecommendedTemplatesInline && !showBuilderPrompt,
				[$style.builderLayout]: showBuilderPrompt,
			},
		]"
		:style="containerStyle"
	>
		<div :class="[$style.content, { [$style.builderContent]: showBuilderPrompt }]">
			<!-- State 1: AI Builder -->
			<template v-if="showBuilderPrompt">
				<div :class="$style.welcomeBuilder">
					<N8nHeading tag="h1" size="xlarge">
						{{ builderHeading }}
					</N8nHeading>
				</div>
				<EmptyStateBuilderPrompt
					data-test-id="empty-state-builder-prompt"
					:project-id="builderProjectId"
					:parent-folder-id="builderParentFolderId"
					@submit="handleBuilderPromptSubmit"
					@start-from-scratch="addWorkflow"
				/>
			</template>

			<!-- State 2: Recommended Templates -->
			<template v-else-if="showRecommendedTemplatesInline">
				<N8nHeading tag="h1" size="2xlarge" bold :class="$style.welcomeTitle">
					{{ emptyStateHeading }}
				</N8nHeading>

				<div :class="$style.templatesSection">
					<RecommendedTemplatesSection />

					<div :class="$style.orDivider">
						<N8nText size="large">
							{{ i18n.baseText('generic.or') }}
						</N8nText>
					</div>

					<div :class="$style.actionButtons">
						<ReadyToRunButton type="secondary" size="large" />
						<N8nButton
							type="secondary"
							icon="file"
							size="large"
							data-test-id="start-from-scratch-button"
							@click="addWorkflow"
						>
							{{ i18n.baseText('workflows.empty.startFromScratch') }}
						</N8nButton>
					</div>
				</div>
			</template>

			<!-- State 3: Fallback (Baseline) -->
			<template v-else>
				<N8nHeading tag="h1" size="2xlarge" bold :class="$style.welcomeTitle">
					{{ emptyStateHeading }}
				</N8nHeading>
				<div :class="$style.fallbackContent">
					<N8nText tag="p" size="large" color="text-base">
						{{ emptyStateDescription }}
					</N8nText>

					<!-- Two cards or single card depending on ready-to-run availability -->
					<div
						v-if="canCreateWorkflow"
						:class="[$style.actionCardsContainer, { [$style.singleCard]: !showReadyToRunCard }]"
					>
						<!-- Card 1: Try AI workflow (conditional) -->
						<N8nCard
							v-if="showReadyToRunCard"
							:class="$style.actionCard"
							hoverable
							data-test-id="ready-to-run-card"
							@click="handleReadyToRunClick"
						>
							<div :class="$style.cardContent">
								<N8nIcon
									:class="$style.cardIcon"
									icon="zap"
									color="foreground-dark"
									:stroke-width="1.5"
								/>
								<N8nText size="large" class="mt-xs">
									{{ i18n.baseText('workflows.empty.tryAiWorkflow') }}
								</N8nText>
							</div>
						</N8nCard>

						<!-- Card 2: Start from scratch (always shown) -->
						<N8nCard
							:class="$style.actionCard"
							hoverable
							data-test-id="new-workflow-card"
							@click="addWorkflow"
						>
							<div :class="$style.cardContent">
								<N8nIcon
									:class="$style.cardIcon"
									icon="file"
									color="foreground-dark"
									:stroke-width="1.5"
								/>
								<N8nText size="large" class="mt-xs">
									{{ i18n.baseText('workflows.empty.startFromScratch') }}
								</N8nText>
							</div>
						</N8nCard>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as vars;

.emptyStateLayout {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--4xl) var(--spacing--2xl) 0;
	max-width: var(--content-container--width);

	@media (max-width: vars.$breakpoint-lg) {
		padding: var(--spacing--xl) var(--spacing--xs) 0;
	}

	&.noTemplatesContent {
		padding-top: var(--spacing--3xl);
	}

	&.builderLayout {
		align-items: center;
		justify-content: center;
		width: 100%;
		max-width: none;
		padding: var(--spacing--lg);
	}
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.builderContent {
	max-width: 1024px;
	text-align: center;
}

.welcomeBuilder {
	margin-bottom: var(--spacing--sm);
}

.welcomeTitle {
	margin-bottom: var(--spacing--2xl);
}

.templatesSection {
	width: 100%;
}

.fallbackContent {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

.actionCardsContainer {
	display: grid;
	grid-template-columns: repeat(2, 192px);
	gap: var(--spacing--lg);
	margin-top: var(--spacing--2xl);
	justify-content: center;

	&.singleCard {
		grid-template-columns: 192px;
	}

	@media (max-width: vars.$breakpoint-xs) {
		grid-template-columns: 1fr;
		gap: var(--spacing--md);
		margin-top: var(--spacing--lg);
	}
}

.actionCard {
	width: 192px;
	height: 230px;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	transition:
		transform 0.2s ease,
		box-shadow 0.2s ease;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);

		.cardIcon svg {
			color: var(--color--primary);
		}
	}
}

.cardContent {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
}

.cardIcon {
	font-size: 48px;
	margin-bottom: var(--spacing--xs);

	svg {
		transition: color 0.3s ease;
	}
}

.orDivider {
	margin-top: var(--spacing--lg);
	text-align: center;
}

.actionButtons {
	display: flex;
	justify-content: center;
	gap: var(--spacing--xs);
	margin: var(--spacing--lg) 0;
}
</style>

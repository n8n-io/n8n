<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useWorkflowsEmptyState } from '@/features/workflows/composables/useWorkflowsEmptyState';
import { useSurfaceMcpEmptyState } from '@/experiments/surfaceMcpToNewCloudUsers/composables/useSurfaceMcpEmptyState';
import { useEmptyStateBuilderPromptStore } from '@/experiments/emptyStateBuilderPrompt/stores/emptyStateBuilderPrompt.store';
import { useCredentialsAppSelectionStore } from '@/experiments/credentialsAppSelection/stores/credentialsAppSelection.store';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import RecommendedTemplatesSection from '@/features/workflows/templates/recommendations/components/RecommendedTemplatesSection.vue';
import ReadyToRunButton from '@/features/workflows/readyToRun/components/ReadyToRunButton.vue';
import EmptyStateBuilderPrompt from '@/experiments/emptyStateBuilderPrompt/components/EmptyStateBuilderPrompt.vue';
import AppSelectionPage from '@/experiments/credentialsAppSelection/components/AppSelectionPage.vue';
import { useSettingsStore } from '@/app/stores/settings.store';
import { NEW_AGENT_VIEW } from '@/features/agents/constants';
import { useAgentTelemetry } from '@/features/agents/composables/useAgentTelemetry';
import { useAgentPermissions } from '@/features/agents/composables/useAgentPermissions';
import SurfaceMcpEmptyStateReminder from '@/experiments/surfaceMcpToNewCloudUsers/components/SurfaceMcpEmptyStateReminder.vue';
import SurfaceMcpEmptyStateTile from '@/experiments/surfaceMcpToNewCloudUsers/components/SurfaceMcpEmptyStateTile.vue';

const emit = defineEmits<{
	'click:add': [];
}>();

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const bannersStore = useBannersStore();
const projectsStore = useProjectsStore();
const projectPages = useProjectPages();
const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();
const credentialsAppSelectionStore = useCredentialsAppSelectionStore();
const readyToRunStore = useReadyToRunStore();
const settingsStore = useSettingsStore();
const agentTelemetry = useAgentTelemetry();

const {
	showAppSelection,
	showBuilderPrompt,
	showRecommendedTemplatesInline,
	builderHeading,
	emptyStateHeading,
	emptyStateDescription,
	canCreateWorkflow,
} = useWorkflowsEmptyState();

const { showTile: showMcpTile, showReminder: showMcpReminder } = useSurfaceMcpEmptyState({
	canCreateWorkflow: computed(() => Boolean(canCreateWorkflow.value)),
	showAppSelection: computed(() => Boolean(showAppSelection.value)),
	showBuilderPrompt: computed(() => Boolean(showBuilderPrompt.value)),
	showRecommendedTemplatesInline: computed(() => Boolean(showRecommendedTemplatesInline.value)),
});

const addWorkflow = () => {
	emit('click:add');
};

// Check if user can claim credits for ready-to-run
const showReadyToRunCard = computed(() => {
	return readyToRunStore.userCanClaimOpenAiCredits && canCreateWorkflow.value && !showMcpTile.value;
});

const builderProjectId = computed(() =>
	projectPages.isOverviewSubPage
		? projectsStore.personalProject?.id
		: (route.params.projectId as string),
);
const { canCreate } = useAgentPermissions(builderProjectId);

const showBuildAgentCard = computed(() => {
	return settingsStore.isModuleActive('agents') && canCreate.value;
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

const handleBuildAgentClick = () => {
	agentTelemetry.trackClickedNewAgent('card');
	void router.push({
		name: NEW_AGENT_VIEW,
		query: {
			projectId: builderProjectId.value,
		},
	});
};

const containerStyle = computed(() => ({
	minHeight: `calc(100vh - ${bannersStore.bannersHeight}px)`,
}));

const builderParentFolderId = computed(() => route.params.folderId as string | undefined);

const handleBuilderPromptSubmit = async (prompt: string) => {
	await emptyStateBuilderPromptStore.createWorkflowWithPrompt(
		prompt,
		builderProjectId.value,
		builderParentFolderId.value,
	);
};

const handleAppSelectionContinue = () => {
	credentialsAppSelectionStore.dismiss();
};
</script>

<template>
	<div
		:class="[
			$style.emptyStateLayout,
			{
				[$style.noTemplatesContent]:
					!showRecommendedTemplatesInline && !showBuilderPrompt && !showAppSelection,
				[$style.builderLayout]: showBuilderPrompt || showAppSelection,
			},
		]"
		:style="containerStyle"
	>
		<div :class="[$style.content, { [$style.builderContent]: showBuilderPrompt }]">
			<!-- State 0: App Selection -->
			<template v-if="showAppSelection">
				<AppSelectionPage @continue="handleAppSelectionContinue" />
			</template>

			<!-- State 1: AI Builder -->
			<template v-else-if="showBuilderPrompt">
				<div :class="$style.welcomeBuilder">
					<N8nHeading tag="h1" size="xlarge">
						{{ builderHeading }}
					</N8nHeading>
				</div>
				<EmptyStateBuilderPrompt
					data-test-id="empty-state-builder-prompt"
					:project-id="builderProjectId"
					:parent-folder-id="builderParentFolderId"
					:show-build-agent-button="showBuildAgentCard"
					@submit="handleBuilderPromptSubmit"
					@start-from-scratch="addWorkflow"
					@build-agent="handleBuildAgentClick"
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
							v-if="showBuildAgentCard"
							variant="subtle"
							icon="robot"
							size="large"
							data-test-id="build-agent-button"
							@click="handleBuildAgentClick"
						>
							{{ i18n.baseText('workflows.empty.buildAgent') }}
						</N8nButton>
						<N8nButton
							variant="subtle"
							icon="workflow"
							size="large"
							data-test-id="start-from-scratch-button"
							@click="addWorkflow"
						>
							{{ i18n.baseText('workflows.empty.buildWorkflow') }}
						</N8nButton>
					</div>
				</div>
			</template>

			<!-- State 3: Fallback (Baseline) -->
			<template v-else>
				<N8nHeading
					tag="h1"
					size="2xlarge"
					bold
					:class="[$style.welcomeTitle, $style.fallbackHeading]"
				>
					{{ emptyStateHeading }}
				</N8nHeading>
				<div :class="$style.fallbackContent">
					<N8nText
						v-if="!canCreateWorkflow"
						tag="p"
						size="large"
						color="text-base"
						:class="$style.fallbackDescription"
					>
						{{ emptyStateDescription }}
					</N8nText>
					<SurfaceMcpEmptyStateReminder v-if="showMcpReminder" />

					<!-- Cards vary based on enabled modules and ready-to-run availability -->
					<div
						v-if="canCreateWorkflow"
						:class="[
							$style.actionCardsContainer,
							{
								[$style.singleCard]: !showReadyToRunCard && !showMcpTile && !showBuildAgentCard,
							},
						]"
					>
						<SurfaceMcpEmptyStateTile v-if="showMcpTile" :class="$style.actionCard" />

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

						<!-- Card 2: Build an agent (conditional) -->
						<N8nCard
							v-if="showBuildAgentCard"
							:class="$style.actionCard"
							hoverable
							data-test-id="build-agent-card"
							@click="handleBuildAgentClick"
						>
							<div :class="$style.cardContent">
								<N8nIcon
									:class="$style.cardIcon"
									icon="robot"
									color="foreground-dark"
									:stroke-width="1.5"
								/>
								<N8nText size="large" class="mt-xs">
									{{ i18n.baseText('workflows.empty.buildAgent') }}
								</N8nText>
							</div>
						</N8nCard>

						<!-- Card 3: Start from scratch (always shown) -->
						<N8nCard
							:class="$style.actionCard"
							hoverable
							data-test-id="new-workflow-card"
							@click="addWorkflow"
						>
							<div :class="$style.cardContent">
								<N8nIcon
									:class="$style.cardIcon"
									icon="workflow"
									color="foreground-dark"
									:stroke-width="1.5"
								/>
								<N8nText size="large" class="mt-xs">
									{{ i18n.baseText('workflows.empty.buildWorkflow') }}
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
	justify-content: center;
	align-content: center;
	height: 100%;
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
	margin-bottom: var(--spacing--sm);
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

.fallbackDescription {
	animation: contentDropIn var(--duration--base) var(--easing--ease-out)
		calc(var(--duration--base) / 4) both;
}

.fallbackHeading {
	animation: headingLift var(--duration--base) var(--easing--ease-out) both;
}

.actionCardsContainer {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--lg);
	justify-content: center;
	width: 100%;

	&.singleCard {
		max-width: 192px;
	}

	@media (max-width: vars.$breakpoint-xs) {
		gap: var(--spacing--md);
		margin-top: var(--spacing--lg);
	}
}

.actionCard {
	--action-card-index: 0;

	max-width: 192px;
	aspect-ratio: 4/3;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	animation: actionCardIn var(--duration--base) var(--easing--ease-out)
		calc(160ms + var(--action-card-index) * 80ms) both;

	&:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);

		.cardIcon svg {
			color: var(--color--primary);
		}
	}

	&:nth-child(2) {
		--action-card-index: 1;
	}

	&:nth-child(3) {
		--action-card-index: 2;
	}
}

@keyframes headingLift {
	from {
		opacity: 0;
		filter: blur(3px);
		transform: translateY(var(--spacing--xs));
	}

	to {
		opacity: 1;
		filter: blur(0);
		transform: translateY(calc(-1 * var(--spacing--xs)));
	}
}

@keyframes contentDropIn {
	from {
		opacity: 0;
		filter: blur(3px);
		transform: translateY(calc(-1 * var(--spacing--xs)));
	}

	to {
		opacity: 1;
		filter: blur(0);
		transform: translateY(0);
	}
}

@keyframes actionCardIn {
	from {
		opacity: 0;
		transform: translateY(var(--spacing--2xs));
	}

	to {
		opacity: 1;
		transform: translateY(0);
	}
}

@media (prefers-reduced-motion: reduce) {
	.fallbackHeading,
	.fallbackDescription,
	.actionCard {
		animation: none;
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

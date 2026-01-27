<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import { useToast } from '@/app/composables/useToast';
// AI Builder (cherry-pick)
import EmptyStateBuilderPrompt from '@/experiments/emptyStateBuilderPrompt/components/EmptyStateBuilderPrompt.vue';
import { useEmptyStateBuilderPromptStore } from '@/experiments/emptyStateBuilderPrompt/stores/emptyStateBuilderPrompt.store';
import { useWorkflowsEmptyState } from '@/features/workflows/composables/useWorkflowsEmptyState';
// 2.4.6 Features
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import { useTemplatesDataQualityStore } from '@/experiments/templatesDataQuality/stores/templatesDataQuality.store';
import TemplatesDataQualityInlineSection from '@/experiments/templatesDataQuality/components/TemplatesDataQualityInlineSection.vue';

const emit = defineEmits<{
	'click:add': [];
}>();

const route = useRoute();
const i18n = useI18n();
const toast = useToast();
const bannersStore = useBannersStore();
const projectsStore = useProjectsStore();
const projectPages = useProjectPages();
const emptyStateBuilderPromptStore = useEmptyStateBuilderPromptStore();
const readyToRunStore = useReadyToRunStore();
const templatesDataQualityStore = useTemplatesDataQualityStore();

const {
	showBuilderPrompt,
	builderHeading,
	emptyStateHeading,
	emptyStateDescription,
	canCreateWorkflow,
	readOnlyEnv,
	projectPermissions,
} = useWorkflowsEmptyState();

const isLoadingReadyToRun = ref(false);

const personalProject = computed(() => projectsStore.personalProject);

const containerStyle = computed(() => ({
	minHeight: `calc(100vh - ${bannersStore.bannersHeight}px)`,
}));

const builderProjectId = computed(() =>
	projectPages.isOverviewSubPage
		? projectsStore.personalProject?.id
		: (route.params.projectId as string),
);

const builderParentFolderId = computed(() => route.params.folderId as string | undefined);

// 2.4.6 computed properties
const showReadyToRunCard = computed(() => {
	return (
		isLoadingReadyToRun.value ||
		readyToRunStore.getCardVisibility(projectPermissions.value.workflow.create, readOnlyEnv.value)
	);
});

const showTemplatesDataQualityInline = computed(() => {
	return (
		templatesDataQualityStore.isFeatureEnabled() &&
		!readOnlyEnv.value &&
		projectPermissions.value.workflow.create
	);
});

// AI Builder handlers
const handleBuilderPromptSubmit = async (prompt: string) => {
	await emptyStateBuilderPromptStore.createWorkflowWithPrompt(
		prompt,
		builderProjectId.value,
		builderParentFolderId.value,
	);
};

// 2.4.6 handlers
const handleReadyToRunClick = async () => {
	if (isLoadingReadyToRun.value) return;

	isLoadingReadyToRun.value = true;
	const projectId = projectPages.isOverviewSubPage
		? personalProject.value?.id
		: (route.params.projectId as string);

	try {
		await readyToRunStore.claimCreditsAndOpenWorkflow(
			'card',
			route.params.folderId as string,
			projectId,
		);
	} catch (error) {
		isLoadingReadyToRun.value = false;
		toast.showError(error, i18n.baseText('generic.error'));
	}
};

const addWorkflow = () => {
	emit('click:add');
};
</script>

<template>
	<div
		:class="[
			$style.emptyStateLayout,
			{
				[$style.builderLayout]: showBuilderPrompt,
			},
		]"
		:style="containerStyle"
	>
		<div
			:class="[
				$style.content,
				{
					[$style.builderContent]: showBuilderPrompt,
					[$style.legacyContent]: !showBuilderPrompt,
				},
			]"
		>
			<!-- AI Builder State -->
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

			<!-- 2.4.6 State -->
			<template v-else>
				<div :class="$style.welcome">
					<N8nHeading tag="h1" size="2xlarge" :class="$style.welcomeTitle">
						{{ emptyStateHeading }}
					</N8nHeading>
					<N8nText size="large" color="text-base" :class="$style.welcomeDescription">
						{{ emptyStateDescription }}
					</N8nText>
				</div>

				<div v-if="canCreateWorkflow" :class="$style.actionsContainer">
					<N8nCard
						v-if="showReadyToRunCard"
						:class="[$style.actionCard, { [$style.loading]: isLoadingReadyToRun }]"
						:hoverable="!isLoadingReadyToRun"
						data-test-id="ready-to-run-card"
						@click="handleReadyToRunClick"
					>
						<div :class="$style.cardContent">
							<N8nIcon
								:class="$style.cardIcon"
								:icon="isLoadingReadyToRun ? 'spinner' : 'sparkles'"
								color="foreground-dark"
								:stroke-width="1.5"
								:spin="isLoadingReadyToRun"
							/>
							<N8nText size="large" class="mt-xs">
								{{ i18n.baseText('workflows.empty.readyToRun') }}
							</N8nText>
						</div>
					</N8nCard>

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

				<div v-if="showTemplatesDataQualityInline" :class="$style.templatesSection">
					<TemplatesDataQualityInlineSection />
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.emptyStateLayout {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: var(--spacing--3xl);
	min-height: 100vh;

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

.legacyContent {
	max-width: 900px;
	text-align: center;
}

.welcome {
	margin-bottom: var(--spacing--2xl);
}

.welcomeBuilder {
	margin-bottom: var(--spacing--sm);
}

.welcomeTitle {
	margin-bottom: var(--spacing--md);
}

.welcomeDescription {
	max-width: 480px;
}

.actionsContainer {
	display: flex;
	gap: var(--spacing--sm);
	justify-content: center;
	flex-wrap: wrap;
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

	&.loading {
		pointer-events: none;
		opacity: 0.7;
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

.templatesSection {
	padding-inline: var(--spacing--md);
}
</style>

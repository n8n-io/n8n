<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nCard, N8nHeading, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useToast } from '@/app/composables/useToast';
import { useReadyToRunStore } from '@/features/workflows/readyToRun/stores/readyToRun.store';
import type { IUser } from 'n8n-workflow';

const emit = defineEmits<{
	'click:add': [];
}>();

const route = useRoute();
const i18n = useI18n();
const toast = useToast();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const projectPages = useProjectPages();
const readyToRunStore = useReadyToRunStore();

const isLoadingReadyToRun = ref(false);

const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const personalProject = computed(() => projectsStore.personalProject);
const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? personalProject.value?.scopes,
	);
});

const emptyListDescription = computed(() => {
	if (readOnlyEnv.value) {
		return i18n.baseText('workflows.empty.description.readOnlyEnv');
	} else if (!projectPermissions.value.workflow.create) {
		return i18n.baseText('workflows.empty.description.noPermission');
	} else {
		return i18n.baseText('workflows.empty.description');
	}
});

const showReadyToRunCard = computed(() => {
	return (
		isLoadingReadyToRun.value ||
		readyToRunStore.getCardVisibility(projectPermissions.value.workflow.create, readOnlyEnv.value)
	);
});

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

const props = defineProps<{
	loading: boolean;
	hasInitialized: boolean;
}>();
</script>

<template>
	<div v-if="props.loading || !props.hasInitialized" :class="$style.workflowsLoadingContainer">
		<div :class="$style.workflowsLoadingBar"></div>
	</div>

	<div v-else :class="$style.emptyStateLayout">
		<div :class="$style.content">
			<div :class="$style.welcome">
				<N8nHeading tag="h1" size="2xlarge" :class="$style.welcomeTitle">
					{{
						currentUser.firstName
							? i18n.baseText('workflows.empty.heading', {
									interpolate: { name: currentUser.firstName },
								})
							: i18n.baseText('workflows.empty.heading.userNotSetup')
					}}
				</N8nHeading>
				<N8nText size="large" color="text-base" :class="$style.welcomeDescription">
					{{ emptyListDescription }}
				</N8nText>
			</div>

			<div
				v-if="!readOnlyEnv && projectPermissions.workflow.create"
				:class="$style.actionsContainer"
			>
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
		</div>
	</div>
</template>

<style lang="scss" module>
.workflowsLoadingContainer {
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 200px;
}

.workflowsLoadingBar {
	width: 100px;
	height: 6px;
	background-color: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	position: relative;
	overflow: hidden;

	&::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		width: 40%;
		height: 100%;
		background-color: var(--color--primary);
		border-radius: var(--radius);
		animation: loadingBarProgress 1.2s ease-in-out infinite;
	}
}

@keyframes loadingBarProgress {
	0% {
		transform: translateX(-100%);
	}
	100% {
		transform: translateX(350%);
	}
}

.emptyStateLayout {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	max-width: 600px;
	text-align: center;
}

.welcome {
	margin-bottom: var(--spacing--2xl);
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
</style>

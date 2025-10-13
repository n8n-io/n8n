<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { N8nCard, N8nHeading, N8nText, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/stores/users.store';
import { useProjectsStore } from '@/features/projects/projects.store';
import { useSourceControlStore } from '@/features/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectPages } from '@/features/projects/composables/useProjectPages';
import { useToast } from '@/composables/useToast';
import { useReadyToRunWorkflowsV2Store } from '../stores/readyToRunWorkflowsV2.store';
import type { IUser } from 'n8n-workflow';

const route = useRoute();
const i18n = useI18n();
const toast = useToast();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const projectPages = useProjectPages();
const readyToRunWorkflowsV2Store = useReadyToRunWorkflowsV2Store();

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

const showReadyToRunV2Card = computed(() => {
	return (
		isLoadingReadyToRun.value ||
		readyToRunWorkflowsV2Store.getCardVisibility(
			projectPermissions.value.workflow.create,
			readOnlyEnv.value,
			false, // loading is false in simplified layout
		)
	);
});

const handleReadyToRunV2Click = async () => {
	if (isLoadingReadyToRun.value) return;

	isLoadingReadyToRun.value = true;
	const projectId = projectPages.isOverviewSubPage
		? personalProject.value?.id
		: (route.params.projectId as string);

	try {
		await readyToRunWorkflowsV2Store.claimCreditsAndOpenWorkflow(
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

const emit = defineEmits<{
	'click:add': [];
}>();
</script>

<template>
	<div :class="$style.simplifiedLayout">
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
					v-if="showReadyToRunV2Card"
					:class="[$style.actionCard, { [$style.loading]: isLoadingReadyToRun }]"
					:hoverable="!isLoadingReadyToRun"
					data-test-id="ready-to-run-v2-card"
					@click="handleReadyToRunV2Click"
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
							{{ i18n.baseText('workflows.empty.readyToRunV2') }}
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
.simplifiedLayout {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
}

.header {
	position: fixed;
	top: var(--spacing--lg);
	left: var(--spacing--lg);
	opacity: 0.6;
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

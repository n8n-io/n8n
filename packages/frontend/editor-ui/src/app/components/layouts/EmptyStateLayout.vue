<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useUsersStore } from '@/features/settings/users/users.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useRecommendedTemplatesStore } from '@/features/workflows/templates/recommendations/recommendedTemplates.store';
import { useBannersStore } from '@/features/shared/banners/banners.store';
import RecommendedTemplatesSection from '@/features/workflows/templates/recommendations/components/RecommendedTemplatesSection.vue';
import ReadyToRunButton from '@/features/workflows/readyToRun/components/ReadyToRunButton.vue';
import type { IUser } from 'n8n-workflow';

const emit = defineEmits<{
	'click:add': [];
}>();

const i18n = useI18n();
const usersStore = useUsersStore();
const projectsStore = useProjectsStore();
const sourceControlStore = useSourceControlStore();
const recommendedTemplatesStore = useRecommendedTemplatesStore();
const bannersStore = useBannersStore();

const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const personalProject = computed(() => projectsStore.personalProject);
const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? personalProject.value?.scopes,
	);
});

const canCreateWorkflow = computed(
	() => !readOnlyEnv.value && projectPermissions.value.workflow.create,
);

const emptyListDescription = computed(() => {
	if (readOnlyEnv.value) {
		return i18n.baseText('workflows.empty.description.readOnlyEnv');
	} else if (!projectPermissions.value.workflow.create) {
		return i18n.baseText('workflows.empty.description.noPermission');
	} else {
		return i18n.baseText('workflows.empty.description');
	}
});

const showRecommendedTemplatesInline = computed(() => {
	return (
		recommendedTemplatesStore.isFeatureEnabled() &&
		!readOnlyEnv.value &&
		projectPermissions.value.workflow.create
	);
});

const emptyStateHeading = computed(() => {
	if (showRecommendedTemplatesInline.value) {
		return i18n.baseText('workflows.empty.heading', {
			interpolate: { name: currentUser.value.firstName ?? '' },
		});
	} else {
		return i18n.baseText('workflows.empty.headingWithIcon', {
			interpolate: { name: currentUser.value.firstName ?? '' },
		});
	}
});

const addWorkflow = () => {
	emit('click:add');
};

const containerStyle = computed(() => ({
	minHeight: `calc(100vh - ${bannersStore.bannersHeight}px)`,
}));
</script>

<template>
	<div
		:class="[
			$style.emptyStateLayout,
			{ [$style.noTemplatesContent]: !showRecommendedTemplatesInline },
		]"
		:style="containerStyle"
	>
		<div :class="$style.content">
			<div :class="$style.header">
				<N8nHeading tag="h1" size="2xlarge" bold :class="$style.welcomeTitle">
					{{ emptyStateHeading }}
				</N8nHeading>
				<div v-if="showRecommendedTemplatesInline" :class="$style.actions">
					<ReadyToRunButton />
					<N8nButton type="primary" data-test-id="new-workflow-button" @click="addWorkflow">
						{{ i18n.baseText('generic.create.workflow') }}
					</N8nButton>
				</div>
			</div>

			<div v-if="showRecommendedTemplatesInline" :class="$style.templatesSection">
				<RecommendedTemplatesSection />
			</div>
			<div v-else :class="$style.noTemplatesContent">
				<N8nText tag="p" size="large" color="text-base">
					{{ emptyListDescription }}
				</N8nText>
				<N8nCard
					v-if="canCreateWorkflow && !showRecommendedTemplatesInline"
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
.emptyStateLayout {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
	max-width: var(--content-container--width);

	&.noTemplatesContent {
		padding-top: var(--spacing--3xl);
	}
}

.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	width: 100%;
	margin-bottom: var(--spacing--md);
}

.actionCard {
	width: 192px;
	height: 230px;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-top: var(--spacing--2xl);
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

<script setup lang="ts">
import { N8nButton, N8nCard, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

import PageViewLayout from '@/app/components/layouts/PageViewLayout.vue';
import { useProjectPages } from '@/features/collaboration/projects/composables/useProjectPages';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useAppsStore } from '@/features/apps/apps.store';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import { APP_DETAILS, APP_NEW } from '@/features/apps/apps.constants';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const documentTitle = useDocumentTitle();
const { confirmAndDeleteApp } = useAppDeletion();

const projectPages = useProjectPages();
const projectsStore = useProjectsStore();
const appsStore = useAppsStore();

// On the home overview page there's no :projectId route param — fall back to
// the user's personal project, same as Data Tables does.
const currentProject = computed(() =>
	projectPages.isOverviewSubPage ? projectsStore.personalProject : projectsStore.currentProject,
);

const projectId = () => currentProject.value?.id ?? '';

const fetchApps = async () => {
	try {
		await appsStore.fetchApps(projectId());
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.getDetails.error'));
	}
};

const openNewApp = async () => {
	await router.push({ name: APP_NEW, params: { projectId: projectId() } });
};

const openApp = async (appId: string) => {
	await router.push({ name: APP_DETAILS, params: { projectId: projectId(), appId } });
};

onMounted(() => {
	documentTitle.set(i18n.baseText('apps.apps'));
	void fetchApps();
});
</script>

<template>
	<PageViewLayout data-test-id="apps-view">
		<template #header>
			<div :class="$style.header">
				<N8nHeading bold tag="h1" size="2xlarge">{{ i18n.baseText('apps.apps') }}</N8nHeading>
				<N8nButton data-test-id="apps-new" @click="openNewApp">
					{{ i18n.baseText('apps.add.button.label') }}
				</N8nButton>
			</div>
		</template>

		<div :class="$style.container">
			<N8nText v-if="appsStore.apps.length === 0" color="text-light">
				{{ i18n.baseText('apps.empty.heading') }}
			</N8nText>

			<N8nCard
				v-for="app in appsStore.apps"
				:key="app.id"
				hoverable
				:class="$style.appCard"
				data-test-id="app-card"
				@click="openApp(app.id)"
			>
				<template #prepend>
					<N8nIcon icon="app-window" />
				</template>
				<N8nText bold>{{ app.name }}</N8nText>
				<N8nText color="text-light" size="small">/{{ app.namespace }}</N8nText>
				<template #append>
					<N8nButton
						icon-only
						icon="trash-2"
						variant="subtle"
						:aria-label="i18n.baseText('generic.delete')"
						data-test-id="app-delete"
						@click.stop="confirmAndDeleteApp(projectId(), app)"
					/>
				</template>
			</N8nCard>
		</div>
	</PageViewLayout>
</template>

<style lang="scss" module>
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--lg);
}

.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	padding-bottom: var(--spacing--lg);
}

.appCard {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
}
</style>

<script setup lang="ts">
import type { AppResponse, AppVersionResponse } from '@n8n/api-types';
import { useLatestFetch } from '@n8n/composables/useLatestFetch';
import {
	isIconOrEmoji,
	N8nBreadcrumbs,
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nSegmentControl,
	type DropdownMenuItemProps,
	type IconOrEmoji,
	type PathItem,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { getProject, type Project } from '@n8n/rest-api-client/api/projects';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { listApps } from '../apps.api';
import { APP_DETAIL_VIEW, PROJECT_APPS, type AppViewTab } from '../apps.constants';
import AppActions from './AppActions.vue';
import AppPublishButton from './AppPublishButton.vue';

const PERSONAL_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'user' };
const DEFAULT_PROJECT_ICON: IconOrEmoji = { type: 'icon', value: 'layers' };
const NO_OTHER_APPS = '__empty__';
const SWITCHER_MAX_APPS = 100;

function projectIcon(project: Project | null): IconOrEmoji {
	return isIconOrEmoji(project?.icon) ? project.icon : DEFAULT_PROJECT_ICON;
}

const props = defineProps<{
	projectId: string;
	app: AppResponse | null;
	publishableVersion: AppVersionResponse | null;
}>();

const emit = defineEmits<{ updated: [app: AppResponse]; deleted: [appId: string] }>();

const tab = defineModel<AppViewTab>('tab', { required: true });

const i18n = useI18n();
const router = useRouter();
const rootStore = useRootStore();
const latestProjectFetch = useLatestFetch();
const latestAppsFetch = useLatestFetch();

const project = ref<Project | null>(null);
const projectApps = ref<AppResponse[]>([]);

const tabOptions = computed(() => [
	{ value: 'preview' as const, label: i18n.baseText('apps.detail.tabs.preview') },
	{ value: 'configure' as const, label: i18n.baseText('apps.detail.tabs.configure') },
]);

const appsRoute = computed(() => ({ name: PROJECT_APPS, params: { projectId: props.projectId } }));

const breadcrumbItems = computed<PathItem[]>(() => {
	const isPersonal = project.value?.type === 'personal';
	return [
		{
			id: props.projectId,
			label: isPersonal
				? i18n.baseText('projects.menu.personal')
				: (project.value?.name ?? i18n.baseText('apps.detail.projectFallback')),
			icon: isPersonal ? PERSONAL_PROJECT_ICON : projectIcon(project.value),
			href: router.resolve(appsRoute.value).href,
		},
	];
});

const switcherOptions = computed<Array<DropdownMenuItemProps<string>>>(() => {
	const others = projectApps.value.filter((projectApp) => projectApp.id !== props.app?.id);
	if (others.length === 0) {
		return [
			{ id: NO_OTHER_APPS, label: i18n.baseText('apps.detail.switcher.empty'), disabled: true },
		];
	}
	return others.map((projectApp) => ({ id: projectApp.id, label: projectApp.name }));
});

function onSwitcherSelect(appId: string) {
	if (appId === NO_OTHER_APPS) return;
	void router.push({ name: APP_DETAIL_VIEW, params: { projectId: props.projectId, appId } });
}

async function loadProject() {
	const isLatest = latestProjectFetch.next();
	try {
		const result = await getProject(rootStore.restApiContext, props.projectId);
		if (isLatest()) project.value = result;
	} catch {
		if (isLatest()) project.value = null;
	}
}

async function loadProjectApps() {
	const isLatest = latestAppsFetch.next();
	try {
		const { data } = await listApps(rootStore.restApiContext, props.projectId, {
			skip: 0,
			take: SWITCHER_MAX_APPS,
			sortBy: 'name:asc',
		});
		if (isLatest()) projectApps.value = data;
	} catch {
		if (isLatest()) projectApps.value = [];
	}
}

watch(
	() => props.projectId,
	() => {
		void loadProject();
		void loadProjectApps();
	},
	{ immediate: true },
);
</script>

<template>
	<header :class="$style.header" data-test-id="app-header">
		<div :class="$style.left">
			<N8nBreadcrumbs
				:items="breadcrumbItems"
				theme="medium"
				@item-selected="router.push(appsRoute)"
			>
				<template #append>
					<span :class="$style.separator" aria-hidden="true">/</span>
					<N8nDropdownMenu
						:items="switcherOptions"
						placement="bottom-start"
						data-test-id="app-header-switcher"
						@select="onSwitcherSelect"
					>
						<template #trigger>
							<N8nButton
								variant="ghost"
								size="small"
								:class="$style.switcherButton"
								:aria-label="i18n.baseText('apps.detail.switcher.ariaLabel')"
							>
								<span :class="$style.appName" data-test-id="app-header-name">{{
									app?.name ?? '…'
								}}</span>
								<N8nIcon icon="chevron-down" :size="12" />
							</N8nButton>
						</template>
					</N8nDropdownMenu>
					<AppActions v-if="app" :app="app" @deleted="emit('deleted', $event)" />
				</template>
			</N8nBreadcrumbs>
		</div>
		<N8nSegmentControl
			v-if="app"
			v-model="tab"
			:options="tabOptions"
			:class="$style.center"
			data-test-id="app-header-tabs"
		/>
		<div :class="$style.right">
			<AppPublishButton
				v-if="app"
				:app="app"
				:version="publishableVersion"
				@updated="emit('updated', $event)"
			/>
		</div>
	</header>
</template>

<style lang="scss" module>
.header {
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--md);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.left,
.right {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.left {
	grid-column: 1;
}

.center {
	grid-column: 2;
}

.right {
	grid-column: 3;
	justify-content: flex-end;
}

.separator {
	color: var(--border-color);
	margin-inline: var(--spacing--4xs);
	font-size: var(--font-size--xl);
	user-select: none;
}

.switcherButton {
	font-size: var(--font-size--sm);
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.appName {
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>

<script lang="ts" setup>
import { computed, onMounted, watch, ref, onBeforeMount } from 'vue';
import ResourcesListLayout, { type IResource } from '@/components/layouts/ResourcesListLayout.vue';
import WorkflowCard from '@/components/WorkflowCard.vue';
import WorkflowTagsDropdown from '@/components/WorkflowTagsDropdown.vue';
import { EnterpriseEditionFeature, MORE_ONBOARDING_OPTIONS_EXPERIMENT, VIEWS } from '@/constants';
import type { ITag, IUser, IWorkflowDb, WorkflowsFetchOptions } from '@/Interface';
import { useUIStore } from '@/stores/ui.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useUsersStore } from '@/stores/users.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useSourceControlStore } from '@/stores/sourceControl.store';
import { useTagsStore } from '@/stores/tags.store';
import { useProjectsStore } from '@/stores/projects.store';
import ProjectTabs from '@/components/Projects/ProjectTabs.vue';
import { useTemplatesStore } from '@/stores/templates.store';
import { getResourcePermissions } from '@/permissions';
import { usePostHog } from '@/stores/posthog.store';
import { useDocumentTitle } from '@/composables/useDocumentTitle';
import { useI18n } from '@/composables/useI18n';
import { useRoute, useRouter } from 'vue-router';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	N8nButton,
	N8nCard,
	N8nHeading,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
	N8nTooltip,
} from 'n8n-design-system';
import { pickBy } from 'lodash-es';
import { useCredentialsStore } from '@/stores/credentials.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { ProjectSharingData } from 'n8n-workflow';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();

const sourceControlStore = useSourceControlStore();
const usersStore = useUsersStore();
const workflowsStore = useWorkflowsStore();
const settingsStore = useSettingsStore();
const posthogStore = usePostHog();
const projectsStore = useProjectsStore();
const templatesStore = useTemplatesStore();
const telemetry = useTelemetry();
const uiStore = useUIStore();
const tagsStore = useTagsStore();
const documentTitle = useDocumentTitle();
const credentialsStore = useCredentialsStore();
const nodeTypesStore = useNodeTypesStore();

interface Filters {
	search: string;
	homeProject: string;
	status: string | boolean;
	tags: string[];
	credentials: string[];
	nodeTypes: string[];
	nodeName: string;
	webhookUrl: string;
	httpRequestUrl: string;
}

const StatusFilter = {
	ACTIVE: true,
	DEACTIVATED: false,
	ALL: '',
};

const loading = ref(false);
const filters = ref<Filters>({
	search: '',
	homeProject: '',
	status: StatusFilter.ALL,
	tags: [],
	credentials: [],
	nodeTypes: [],
	nodeName: '',
	webhookUrl: '',
	httpRequestUrl: '',
});

const readOnlyEnv = computed(() => sourceControlStore.preferences.branchReadOnly);
const currentUser = computed(() => usersStore.currentUser ?? ({} as IUser));
const allWorkflows = computed(() => workflowsStore.allWorkflows as IResource[]);
const isShareable = computed(
	() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.Sharing],
);

const statusFilterOptions = computed(() => [
	{
		label: i18n.baseText('workflows.filters.status.all'),
		value: StatusFilter.ALL,
	},
	{
		label: i18n.baseText('workflows.filters.status.active'),
		value: StatusFilter.ACTIVE,
	},
	{
		label: i18n.baseText('workflows.filters.status.deactivated'),
		value: StatusFilter.DEACTIVATED,
	},
]);

const userRole = computed(() => {
	const role = usersStore.currentUserCloudInfo?.role;
	if (role) return role;

	const answers = usersStore.currentUser?.personalizationAnswers;
	if (answers && 'role' in answers) {
		return answers.role;
	}

	return undefined;
});

const isOnboardingExperimentEnabled = computed(() => {
	return (
		posthogStore.getVariant(MORE_ONBOARDING_OPTIONS_EXPERIMENT.name) ===
		MORE_ONBOARDING_OPTIONS_EXPERIMENT.variant
	);
});

const isSalesUser = computed(() => {
	return ['Sales', 'sales-and-marketing'].includes(userRole.value || '');
});

const addWorkflowButtonText = computed(() => {
	return projectsStore.currentProject
		? i18n.baseText('workflows.project.add')
		: i18n.baseText('workflows.add');
});

const projectPermissions = computed(() => {
	return getResourcePermissions(
		projectsStore.currentProject?.scopes ?? projectsStore.personalProject?.scopes,
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

// Methods
const onFiltersUpdated = async (newFilters: Filters) => {
	Object.assign(filters.value, newFilters);

	await fetchWorkflowsWithFilters();
};

const addWorkflow = () => {
	uiStore.nodeViewInitialized = false;
	void router.push({
		name: VIEWS.NEW_WORKFLOW,
		query: { projectId: route.params?.projectId },
	});

	telemetry.track('User clicked add workflow button', {
		source: 'Workflows list',
	});
	trackEmptyCardClick('blank');
};

const getTemplateRepositoryURL = () => templatesStore.websiteTemplateRepositoryURL;

const trackEmptyCardClick = (option: 'blank' | 'templates' | 'courses') => {
	telemetry.track('User clicked empty page option', {
		option,
	});
	if (option === 'templates' && isSalesUser.value) {
		trackCategoryLinkClick('Sales');
	}
};

const trackCategoryLinkClick = (category: string) => {
	telemetry.track(`User clicked Browse ${category} Templates`, {
		role: usersStore.currentUserCloudInfo?.role,
		active_workflow_count: workflowsStore.activeWorkflows.length,
	});
};

const fetchWorkflowsWithFilters = async () => {
	const { homeProject, status, credentials } = filters.value;
	const options: WorkflowsFetchOptions = {
		filter: {
			projectId: homeProject ? homeProject : undefined,
			active: status === StatusFilter.ACTIVE ? true : undefined,
		},
		credentialIds: credentials.length ? credentials : undefined,
	};

	console.log('fetching', options);
	await workflowsStore.fetchAllWorkflows(options);
};

const initialize = async () => {
	loading.value = true;
	await setFiltersFromQueryString();
	await Promise.all([
		nodeTypesStore.loadNodeTypesIfNotLoaded(),
		credentialsStore.fetchAllCredentials(route?.params?.projectId as string | undefined),
		usersStore.fetchUsers(),
		fetchWorkflowsWithFilters(),
		workflowsStore.fetchActiveWorkflows(),
	]);
	loading.value = false;
};

const onClickTag = (tagId: string) => {
	if (!filters.value.tags.includes(tagId)) {
		filters.value.tags.push(tagId);
	}
};

const saveFiltersOnQueryString = () => {
	const query: { [key: string]: string } = {};

	if (filters.value.search) {
		query.search = filters.value.search;
	}

	if (typeof filters.value.status !== 'string') {
		query.status = filters.value.status.toString();
	}

	if (filters.value.tags.length) {
		query.tags = filters.value.tags.join(',');
	}

	if (filters.value.homeProject) {
		query.homeProject = filters.value.homeProject;
	}

	void router.replace({
		query: Object.keys(query).length ? query : undefined,
	});
};

function isValidProjectId(availableProjects: ProjectSharingData[], projectId: string) {
	return availableProjects.some((project) => project.id === projectId);
}

const setFiltersFromQueryString = async () => {
	const { tags, status, search, homeProject } = route.query ?? {};

	const filtersToApply: { [key: string]: string | string[] | boolean } = {};

	if (homeProject && typeof homeProject === 'string') {
		const available = await projectsStore.getAvailableProjects();
		console.log('setting home project', homeProject);
		if (isValidProjectId(available, homeProject)) {
			console.log('valid home project', homeProject);
			filtersToApply.homeProject = homeProject;
		}
	}

	if (search && typeof search === 'string') {
		filtersToApply.search = search;
	}

	if (tags && typeof tags === 'string') {
		await tagsStore.fetchAll();
		const currentTags = tagsStore.allTags.map((tag) => tag.id);

		filtersToApply.tags = tags.split(',').filter((tag) => currentTags.includes(tag));
	}

	if (
		status &&
		typeof status === 'string' &&
		[StatusFilter.ACTIVE.toString(), StatusFilter.DEACTIVATED.toString()].includes(status)
	) {
		filtersToApply.status = status === 'true';
	}

	if (Object.keys(filtersToApply).length) {
		Object.assign(filters.value, filtersToApply);
	}

	void router.replace({ query: pickBy(route.query) });
};

sourceControlStore.$onAction(({ name, after }) => {
	if (name !== 'pullWorkfolder') return;
	after(async () => await initialize());
});

watch(filters, () => saveFiltersOnQueryString(), { deep: true });

watch(
	() => route.params?.projectId,
	async () => await initialize(),
);

onBeforeMount(async () => {});

onMounted(async () => {
	documentTitle.set(i18n.baseText('workflows.heading'));
	void usersStore.showPersonalizationSurvey();
});
</script>

<template>
	<ResourcesListLayout
		resource-key="workflows"
		:resources="allWorkflows"
		:filters="filters"
		:type-props="{ itemSize: 80 }"
		:shareable="isShareable"
		:initialize="initialize"
		:disabled="readOnlyEnv || !projectPermissions.workflow.create"
		:loading="loading"
		@click:add="addWorkflow"
		@update:filters="onFiltersUpdated"
	>
		<template #header>
			<ProjectTabs />
		</template>
		<template #add-button="{ disabled }">
			<N8nTooltip :disabled="!readOnlyEnv">
				<div>
					<N8nButton
						size="large"
						block
						:disabled="disabled"
						data-test-id="resources-list-add"
						@click="addWorkflow"
					>
						{{ addWorkflowButtonText }}
					</N8nButton>
				</div>
				<template #content>
					<i18n-t tag="span" keypath="mainSidebar.workflows.readOnlyEnv.tooltip">
						<template #link>
							<a target="_blank" href="https://docs.n8n.io/source-control-environments/">
								{{ i18n.baseText('mainSidebar.workflows.readOnlyEnv.tooltip.link') }}
							</a>
						</template>
					</i18n-t>
				</template>
			</N8nTooltip>
		</template>
		<template #default="{ data, updateItemSize }">
			<WorkflowCard
				data-test-id="resources-list-item"
				class="mb-2xs"
				:data="data"
				:read-only="readOnlyEnv"
				@expand:tags="updateItemSize(data)"
				@click:tag="onClickTag"
			/>
		</template>
		<template #empty>
			<div class="text-center mt-s">
				<N8nHeading tag="h2" size="xlarge" class="mb-2xs">
					{{
						currentUser.firstName
							? i18n.baseText('workflows.empty.heading', {
									interpolate: { name: currentUser.firstName },
								})
							: i18n.baseText('workflows.empty.heading.userNotSetup')
					}}
				</N8nHeading>
				<N8nText v-if="!isOnboardingExperimentEnabled" size="large" color="text-base">
					{{ emptyListDescription }}
				</N8nText>
			</div>
			<div
				v-if="!readOnlyEnv && projectPermissions.workflow.create"
				:class="['text-center', 'mt-2xl', $style.actionsContainer]"
			>
				<N8nCard
					:class="$style.emptyStateCard"
					hoverable
					data-test-id="new-workflow-card"
					@click="addWorkflow"
				>
					<N8nIcon :class="$style.emptyStateCardIcon" icon="file" />
					<N8nText size="large" class="mt-xs" color="text-dark">
						{{ i18n.baseText('workflows.empty.startFromScratch') }}
					</N8nText>
				</N8nCard>
				<a
					v-if="isSalesUser || isOnboardingExperimentEnabled"
					href="https://docs.n8n.io/courses/#available-courses"
					:class="$style.emptyStateCard"
					target="_blank"
				>
					<N8nCard
						hoverable
						data-test-id="browse-sales-templates-card"
						@click="trackEmptyCardClick('courses')"
					>
						<N8nIcon :class="$style.emptyStateCardIcon" icon="graduation-cap" />
						<N8nText size="large" class="mt-xs" color="text-dark">
							{{ i18n.baseText('workflows.empty.learnN8n') }}
						</N8nText>
					</N8nCard>
				</a>
				<a
					v-if="isSalesUser || isOnboardingExperimentEnabled"
					:href="getTemplateRepositoryURL()"
					:class="$style.emptyStateCard"
					target="_blank"
				>
					<N8nCard
						hoverable
						data-test-id="browse-sales-templates-card"
						@click="trackEmptyCardClick('templates')"
					>
						<N8nIcon :class="$style.emptyStateCardIcon" icon="box-open" />
						<N8nText size="large" class="mt-xs" color="text-dark">
							{{ i18n.baseText('workflows.empty.browseTemplates') }}
						</N8nText>
					</N8nCard>
				</a>
			</div>
		</template>
		<template #filters="{ setKeyValue }">
			<div v-if="settingsStore.areTagsEnabled" class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.tags')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<WorkflowTagsDropdown
						:placeholder="i18n.baseText('workflowOpen.filterWorkflows')"
						:model-value="filters.tags"
						:create-enabled="false"
						@update:model-value="setKeyValue('tags', $event)"
					/>
				</N8nInputLabel>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.status')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nSelect
						data-test-id="status-dropdown"
						:model-value="filters.status"
						:filterable="true"
						@update:model-value="setKeyValue('status', $event)"
					>
						<N8nOption
							v-for="option in statusFilterOptions"
							:key="option.label"
							:label="option.label"
							:value="option.value"
							data-test-id="status"
						>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
			</div>
			<div :class="['mb-xs', $style.sectionTitle]">
				{{ i18n.baseText('workflows.filter.credentialsAndNodes.sectionTitle') }}
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.credentials')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nSelect
						data-test-id="credentials-filter"
						:model-value="filters.credentials"
						:multiple="true"
						:filterable="true"
						:placeholder="i18n.baseText('workflows.filters.credentials.placeholder')"
						class="tags-container"
						@update:model-value="setKeyValue('credentials', $event)"
					>
						<N8nOption
							v-for="cred in credentialsStore.allCredentials"
							:key="cred.id"
							:label="cred.name"
							:value="cred.id"
							size="mini"
						>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.nodeTypes')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nSelect
						data-test-id="node-types-filter"
						:model-value="filters.nodeTypes"
						:multiple="true"
						:placeholder="i18n.baseText('workflows.filters.nodeTypes.placeholder')"
						class="tags-container"
						@update:model-value="setKeyValue('nodeTypes', $event)"
					>
						<N8nOption
							v-for="nodeType in nodeTypesStore.allLatestNodeTypes"
							:key="nodeType.name"
							:label="nodeType.displayName"
							:value="nodeType.name"
						>
						</N8nOption>
					</N8nSelect>
				</N8nInputLabel>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.nodeName')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nInput
						data-test-id="node-name-filter"
						:model-value="filters.nodeName"
						@update:model-value="setKeyValue('nodeName', $event)"
					/>
				</N8nInputLabel>
			</div>
			<div :class="['mb-xs', $style.sectionTitle]">
				{{ i18n.baseText('workflows.filter.urls.sectionTitle') }}
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.urlWebhook')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nInput
						data-test-id="url-webhook-filter"
						:model-value="filters.webhookUrl"
						@update:model-value="setKeyValue('webhookUrl', $event)"
					/>
				</N8nInputLabel>
			</div>
			<div class="mb-s">
				<N8nInputLabel
					:label="i18n.baseText('workflows.filters.urlHTTPRequest')"
					:bold="false"
					size="small"
					color="text-base"
					class="mb-3xs"
				>
					<N8nInput
						data-test-id="url-webhook-filter"
						:model-value="filters.httpRequestUrl"
						@update:model-value="setKeyValue('httpRequestUrl', $event)"
					/>
				</N8nInputLabel>
			</div>
		</template>
	</ResourcesListLayout>
</template>

<style lang="scss" module>
.actionsContainer {
	display: flex;
	justify-content: center;
}

.emptyStateCard {
	width: 192px;
	text-align: center;
	display: inline-flex;
	height: 230px;

	& + & {
		margin-left: var(--spacing-s);
	}

	&:hover {
		svg {
			color: var(--color-primary);
		}
	}
}

.sectionTitle {
	text-transform: uppercase;
	color: var(--color-text-dark);
	font-size: var(--font-size-3xs);
	font-weight: var(--font-weight-bold);
	border-bottom: var(--border-base);
	line-height: 2;
}

.emptyStateCardIcon {
	font-size: 48px;

	svg {
		width: 48px !important;
		color: var(--color-foreground-dark);
		transition: color 0.3s ease;
	}
}
</style>

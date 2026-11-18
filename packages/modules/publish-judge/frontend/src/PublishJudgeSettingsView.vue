<script setup lang="ts">
import { useDocumentTitle } from '@n8n/composables/useDocumentTitle';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nHeading,
	N8nOption,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import CreateJudgeDialog from './CreateJudgeDialog.vue';
import JudgeMonitoring from './JudgeMonitoring.vue';
import type { JudgeProjectOption } from './publish-judge.api';
import {
	createJudgeLibrary,
	fetchJudgeLibrary,
	fetchProjectJudges,
	fetchTeamProjects,
} from './publish-judge.api';
import { POLICIES_SETTINGS_VIEW } from './publish-judge.constants';
import PublishJudgeForm from './PublishJudgeForm.vue';

const i18n = useI18n();
const toast = useToast();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();
const rootStore = useRootStore();

const projects = ref<JudgeProjectOption[]>([]);
/** Projects that show a judge form: the ones with a stored judge, and the ones just added. */
const judgedProjectIds = ref<string[]>([]);
const libraryProjectId = ref<string | null>(null);
const isLoaded = ref(false);
const isCreateOpen = ref(false);
const isCreatingLibrary = ref(false);

type JudgesTab = 'settings' | 'monitoring';
const tabOptions = computed(() => [
	{ label: i18n.baseText('publishJudge.tab.settings'), value: 'settings' as const },
	{ label: i18n.baseText('publishJudge.tab.monitoring'), value: 'monitoring' as const },
]);
// Kept in the URL, so a reload and a shared link open the same tab.
const activeTab = computed<JudgesTab>({
	get: () => (route.query.tab === 'monitoring' ? 'monitoring' : 'settings'),
	set: (tab) => {
		void router.replace({ query: { ...route.query, tab } });
	},
});

/** The judges project holds judges. It is not a project to review. */
const reviewableProjects = computed(() =>
	projects.value.filter(({ id }) => id !== libraryProjectId.value),
);
const nameOf = (projectId: string) =>
	projects.value.find(({ id }) => id === projectId)?.name ?? projectId;
const projectsWithoutJudge = computed(() =>
	reviewableProjects.value.filter(({ id }) => !judgedProjectIds.value.includes(id)),
);

function addProject(projectId: string) {
	judgedProjectIds.value.push(projectId);
}

function removeProject(projectId: string) {
	judgedProjectIds.value = judgedProjectIds.value.filter((id) => id !== projectId);
}

async function createLibrary() {
	isCreatingLibrary.value = true;
	try {
		libraryProjectId.value = await createJudgeLibrary(rootStore.restApiContext);
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.library.createError'));
	} finally {
		isCreatingLibrary.value = false;
	}
}

function openLibrary(tab: 'workflows' | 'agents') {
	if (!libraryProjectId.value) return;
	void router.push(`/projects/${libraryProjectId.value}/${tab}`);
}

function onBack() {
	void router.push({ name: POLICIES_SETTINGS_VIEW });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.publishJudge'));
	try {
		const [teamProjects, projectJudges, library] = await Promise.all([
			fetchTeamProjects(rootStore.restApiContext),
			fetchProjectJudges(rootStore.restApiContext),
			fetchJudgeLibrary(rootStore.restApiContext),
		]);
		projects.value = teamProjects;
		judgedProjectIds.value = projectJudges.map(({ projectId }) => projectId);
		libraryProjectId.value = library;
	} catch (error) {
		toast.showError(error, i18n.baseText('publishJudge.loadError'));
	} finally {
		isLoaded.value = true;
	}
});
</script>

<template>
	<N8nSettingsLayout
		show-back
		:back-label="i18n.baseText('publishJudge.backToPolicies')"
		:class="$style.subpage"
		data-test-id="publish-judge-settings-view"
		@back="onBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.publishJudge')"
			:description="i18n.baseText('publishJudge.description')"
			:show-docs-link="false"
		/>
		<N8nSegmentControl
			v-model="activeTab"
			:options="tabOptions"
			:class="$style.tabs"
			data-test-id="publish-judge-tabs"
		/>
		<JudgeMonitoring v-if="activeTab === 'monitoring'" />
		<N8nSettingsSection
			v-if="activeTab === 'settings'"
			:title="i18n.baseText('publishJudge.library.title')"
			data-test-id="publish-judge-library"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					v-if="!libraryProjectId"
					:title="i18n.baseText('publishJudge.library.missing.title')"
					:description="i18n.baseText('publishJudge.library.description')"
				>
					<template #action>
						<N8nButton
							:label="i18n.baseText('publishJudge.library.create')"
							:loading="isCreatingLibrary"
							:disabled="!isLoaded"
							data-test-id="publish-judge-library-create"
							@click="createLibrary"
						/>
					</template>
				</N8nSettingsRow>
				<template v-else>
					<N8nSettingsRow
						:title="i18n.baseText('publishJudge.library.ready.title')"
						:description="i18n.baseText('publishJudge.library.description')"
					>
						<template #action>
							<div :class="$style.libraryActions">
								<N8nButton
									variant="outline"
									:label="i18n.baseText('publishJudge.library.openWorkflows')"
									data-test-id="publish-judge-library-workflows"
									@click="openLibrary('workflows')"
								/>
								<N8nButton
									variant="outline"
									:label="i18n.baseText('publishJudge.library.openAgents')"
									data-test-id="publish-judge-library-agents"
									@click="openLibrary('agents')"
								/>
							</div>
						</template>
					</N8nSettingsRow>
					<N8nSettingsRow
						:title="i18n.baseText('publishJudge.create.row.title')"
						:description="i18n.baseText('publishJudge.create.hint')"
					>
						<template #action>
							<N8nButton
								variant="outline"
								icon="sparkles"
								:label="i18n.baseText('publishJudge.create.button')"
								data-test-id="publish-judge-create-button"
								@click="isCreateOpen = true"
							/>
						</template>
					</N8nSettingsRow>
				</template>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
		<CreateJudgeDialog
			v-model:open="isCreateOpen"
			:projects="reviewableProjects"
			:library-project-id="libraryProjectId"
		/>
		<template v-if="isLoaded && activeTab === 'settings'">
			<N8nSettingsSection :title="i18n.baseText('publishJudge.section.instance')">
				<!-- Keyed, so a new judges project reloads the pickers. -->
				<PublishJudgeForm
					:key="libraryProjectId ?? 'all'"
					:project-id="null"
					:library-project-id="libraryProjectId"
				/>
			</N8nSettingsSection>
			<N8nSettingsSection
				:title="i18n.baseText('publishJudge.section.projects')"
				data-test-id="publish-judge-projects"
			>
				<N8nText tag="p" size="small" color="text-light" :class="$style.description">
					{{ i18n.baseText('publishJudge.section.projects.description') }}
				</N8nText>
				<div
					v-for="projectId in judgedProjectIds"
					:key="projectId"
					:class="$style.project"
					data-test-id="publish-judge-project"
				>
					<N8nHeading tag="h4" size="small" :class="$style.projectName">
						{{ nameOf(projectId) }}
					</N8nHeading>
					<PublishJudgeForm
						:key="libraryProjectId ?? 'all'"
						:project-id="projectId"
						:library-project-id="libraryProjectId"
						@removed="removeProject(projectId)"
					/>
				</div>
				<N8nSelect
					v-if="projectsWithoutJudge.length > 0"
					size="medium"
					:model-value="''"
					:class="$style.addProject"
					filterable
					:placeholder="i18n.baseText('publishJudge.addProject')"
					:aria-label="i18n.baseText('publishJudge.addProject')"
					data-test-id="publish-judge-add-project"
					@update:model-value="addProject"
				>
					<N8nOption
						v-for="project in projectsWithoutJudge"
						:key="project.id"
						:value="project.id"
						:label="project.name ?? project.id"
					/>
				</N8nSelect>
			</N8nSettingsSection>
		</template>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use './settings-subpage';

.subpage {
	@include settings-subpage.layout;
}

.tabs {
	margin-bottom: var(--spacing--lg);
}

.libraryActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.description {
	margin-bottom: var(--spacing--sm);
}

.project {
	margin-bottom: var(--spacing--lg);
}

.projectName {
	margin-bottom: var(--spacing--2xs);
}

.addProject {
	max-width: 320px;
}
</style>

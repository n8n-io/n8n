<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { AgentSkill, HubSkillListItem, HubSkillScope } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { AGENT_SKILL_MODAL_KEY } from '@/features/agents/constants';
import type {
	AgentSkillModalData,
	AgentSkillModalScopeOption,
} from '@/features/agents/components/AgentSkillModal.vue';

import SkillsTable from '../components/SkillsTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE } from '../context.constants';
import { canWriteInstanceScope, canWriteProjectScope } from '../context.utils';
import { useSkillsHubStore } from '../skills.store';

const USER_SCOPE = 'user';
const INSTANCE_SCOPE = 'instance';
const PROJECT_SCOPE_PREFIX = 'project:';

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();
const message = useMessage();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const skillsStore = useSkillsHubStore();
const { showError, showMessage } = useToast();

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
	sortBy: [],
});
const search = ref('');
const scopeFilter = ref<HubSkillScope | ''>('');
const loadFailed = ref(false);

// The list is small and comes back whole: filtering and paging happen here.
const filtered = computed(() => {
	const term = search.value.trim().toLowerCase();
	return skillsStore.skills.filter(
		(skill) =>
			(!scopeFilter.value || skill.scope === scopeFilter.value) &&
			(!term ||
				skill.name.toLowerCase().includes(term) ||
				skill.description.toLowerCase().includes(term)),
	);
});
const pageItems = computed(() => {
	const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
	return filtered.value.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
});
// A failed load also reports zero rows, so the empty state must not stand in for it.
const showEmptyState = computed(
	() => !skillsStore.loading && !loadFailed.value && skillsStore.count === 0,
);
const countLabel = computed(() =>
	i18n.baseText('settings.context.skills.count', {
		interpolate: { count: filtered.value.length },
		adjustToNumber: filtered.value.length,
	}),
);

/** Where a new skill can live: the user, the instance, and the team projects they can write to. */
const scopeOptions = computed<AgentSkillModalScopeOption[]>(() => {
	const options: AgentSkillModalScopeOption[] = [
		{ value: USER_SCOPE, label: i18n.baseText('settings.context.skills.scope.user') },
	];
	if (canWriteInstanceScope()) {
		options.push({
			value: INSTANCE_SCOPE,
			label: i18n.baseText('settings.context.skills.scope.instance'),
		});
	}
	for (const project of projectsStore.myProjects) {
		if (project.type !== 'team' || !canWriteProjectScope(project.id)) continue;
		options.push({
			value: `${PROJECT_SCOPE_PREFIX}${project.id}`,
			label: project.name ?? project.id,
		});
	}
	return options;
});

function parseScope(value: string): { scope: HubSkillScope; projectId?: string } {
	if (value === INSTANCE_SCOPE) return { scope: 'instance' };
	if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
		return { scope: 'project', projectId: value.slice(PROJECT_SCOPE_PREFIX.length) };
	}
	return { scope: 'user' };
}

async function load() {
	try {
		await skillsStore.fetchSkills();
		loadFailed.value = false;
		// Deleting the last rows of a page can leave the page past the end.
		const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
		const lastPage = Math.max(0, Math.ceil(filtered.value.length / itemsPerPage) - 1);
		if (page > lastPage) tableOptions.value = { ...tableOptions.value, page: lastPage };
	} catch (error) {
		loadFailed.value = true;
		showError(error, i18n.baseText('settings.context.skills.error.load'));
	}
}

function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
}

function resetPage() {
	tableOptions.value = { ...tableOptions.value, page: 0 };
}

function openModal(data: AgentSkillModalData) {
	uiStore.openModalWithData({ name: AGENT_SKILL_MODAL_KEY, data });
}

/** Starts at the SKILL.md upload step, which also offers "Add manually". */
function openCreateModal() {
	openModal({
		scopeOptions: scopeOptions.value,
		initialScope: USER_SCOPE,
		existingSkillNames: [],
		onConfirm: ({ skill, scope }) => void onCreate(skill, scope ?? USER_SCOPE),
	});
}

async function onCreate(skill: AgentSkill, scopeValue: string) {
	try {
		await skillsStore.createSkill({ ...parseScope(scopeValue), skill });
		showMessage({ title: i18n.baseText('settings.context.skills.save.success'), type: 'success' });
		await load();
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.save'));
	}
}

async function openEditModal(item: HubSkillListItem) {
	try {
		const detail = await skillsStore.fetchSkill(item.id);
		openModal({
			skill: detail.skill,
			skillId: detail.id,
			existingSkillNames: [],
			onConfirm: ({ skill }) => void onSave(detail.id, skill, detail.skillHash),
			// Remove is offered only when the backend would accept it: a used skill cannot go.
			...(detail.canDelete && detail.usedByAgents === 0
				? { onRemove: (id: string) => void onDelete(id, detail.name) }
				: {}),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.load'));
	}
}

/** The modal's Save writes the draft and saves it as the version agents read. */
async function onSave(id: string, skill: AgentSkill, baseSkillHash: string) {
	try {
		const saved = await skillsStore.updateAndSaveSkill(id, skill, baseSkillHash);
		showMessage({
			title: i18n.baseText(
				saved.created
					? 'settings.context.skills.save.success'
					: 'settings.context.skills.save.noChanges',
			),
			type: saved.created ? 'success' : 'info',
		});
		await load();
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.save'));
	}
}

async function onDelete(id: string, name: string) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.context.skills.delete.confirm.message'),
		`${i18n.baseText('settings.context.skills.delete.confirm.title')} ${name}`,
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('settings.context.skills.delete.confirm.button'),
			cancelButtonText: i18n.baseText('settings.context.preferences.modal.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await skillsStore.deleteSkill(id);
		showMessage({
			title: i18n.baseText('settings.context.skills.delete.success'),
			type: 'success',
		});
		await load();
	} catch (error) {
		// A skill an agent uses answers 409 with the agents that block the delete.
		showError(error, i18n.baseText('settings.context.skills.error.delete'));
	}
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.skills.title'));
	await Promise.all([load(), projectsStore.getMyProjects().catch(() => undefined)]);
	// Deep links from the assistant's input menu: one skill to open, or a new one to start.
	const { skillId, create } = route.query;
	if (typeof skillId === 'string') {
		const item = skillsStore.skills.find((skill) => skill.id === skillId);
		if (item) await openEditModal(item);
	} else if (create === 'true') {
		openCreateModal();
	}
});
</script>

<template>
	<N8nSettingsLayout
		:class="$style.layout"
		full-width
		show-back
		:back-label="i18n.baseText('settings.context.skills.back')"
		data-test-id="settings-skills-view"
		@back="goBack"
	>
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.context.skills.title')"
			:description="i18n.baseText('settings.context.skills.description')"
			:show-docs-link="false"
		/>

		<div :class="$style.toolbar">
			<N8nInput
				v-model="search"
				:class="$style.search"
				:placeholder="i18n.baseText('settings.context.skills.search.placeholder')"
				clearable
				data-test-id="skills-search"
				@update:model-value="resetPage"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<N8nSelect
				v-model="scopeFilter"
				:class="$style.scopeFilter"
				data-test-id="skills-scope-filter"
				@update:model-value="resetPage"
			>
				<N8nOption value="" :label="i18n.baseText('settings.context.skills.filter.allScopes')" />
				<N8nOption value="user" :label="i18n.baseText('settings.context.skills.scope.user')" />
				<N8nOption
					value="project"
					:label="i18n.baseText('settings.context.skills.scope.project')"
				/>
				<N8nOption
					value="instance"
					:label="i18n.baseText('settings.context.skills.scope.instance')"
				/>
			</N8nSelect>
			<span :class="$style.spacer" />
			<N8nButton
				icon="plus"
				:label="i18n.baseText('settings.context.skills.actions.create')"
				data-test-id="skills-create-button"
				@click="openCreateModal"
			/>
		</div>

		<SkillsTable
			v-model:table-options="tableOptions"
			:skills="pageItems"
			:items-length="filtered.length"
			:loading="skillsStore.loading"
			:show-empty="showEmptyState"
			@open="openEditModal"
			@delete="(item) => onDelete(item.id, item.name)"
			@update:options="onOptionsUpdate"
		>
			<template #empty>
				<div :class="$style.empty" data-test-id="skills-empty-state">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('settings.context.skills.empty.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.skills.empty.description') }}
					</N8nText>
					<N8nButton
						:label="i18n.baseText('settings.context.skills.actions.create')"
						data-test-id="skills-empty-create-button"
						@click="openCreateModal"
					/>
				</div>
			</template>
		</SkillsTable>

		<N8nText v-if="!showEmptyState" size="small" color="text-light" data-test-id="skills-count">
			{{ countLabel }}
		</N8nText>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
/* The settings shell insets the page; the header is pulled to the table's left edge. */
.layout {
	padding: 0;

	header {
		margin-inline: 0 auto;
	}
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
}

.spacer {
	flex: 1;
}

.search {
	max-width: 20rem;
}

.scopeFilter {
	width: 11rem;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}
</style>

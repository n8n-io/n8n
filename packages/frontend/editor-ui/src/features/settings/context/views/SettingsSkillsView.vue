<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import { saveAs } from 'file-saver';
import {
	SKILLS_SORT_OPTIONS,
	type AgentSkill,
	type SkillCreateMethod,
	type SkillAgentOption,
	type SkillListItem,
	type SkillUserDto,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { TableOptions } from '@n8n/design-system';

import ResourceFiltersDropdown from '@/app/components/forms/ResourceFiltersDropdown.vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useLatestFetch } from '@/app/composables/useLatestFetch';
import { useMessage } from '@/app/composables/useMessage';
import { DEBOUNCE_TIME, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useAssistantSkillsExperiment } from '@/experiments/assistantSkills/useAssistantSkillsExperiment';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { AGENT_SKILL_MODAL_KEY } from '@/features/agents/constants';
import { isSkillNameTakenError } from '@/features/agents/utils/agentSkill';
import { exportAgentSkill } from '@/features/agents/utils/agentSkillExport';
import type {
	AgentSkillConfirmFailure,
	AgentSkillModalData,
	AgentSkillModalScopeOption,
} from '@/features/agents/components/AgentSkillModal.vue';

import SkillsTable from '../components/SkillsTable.vue';
import { CONTEXT_DEFAULT_SORT_BY, SKILLS_DEFAULT_PAGE_SIZE } from '../context.constants';
import {
	canWriteInstanceSkillScope,
	canWriteProjectSkillScope,
	keepSortOnClear,
	preferenceUserName,
	toSortOption,
} from '../context.utils';
import type { SkillListQuery } from '../skills.api';
import { useSkillsStore } from '../skills.store';
import { useSkillScopeDisplay } from '../skills.utils';

const INSTANCE_SCOPE = 'instance';
const PROJECT_SCOPE_PREFIX = 'project:';

/** Empty means no filter, so the filters dropdown counts only the set ones. */
type SkillFilters = {
	/** A scope kind. */
	scope: string;
	agentId: string;
	createdById: string;
};

const FILTER_KEYS: Array<keyof SkillFilters> = ['scope', 'agentId', 'createdById'];
const NO_FILTERS: SkillFilters = { scope: '', agentId: '', createdById: '' };

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();
const message = useMessage();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const skillsStore = useSkillsStore();
const { isEnabled: assistantSkillsEnabled } = useAssistantSkillsExperiment();
const telemetry = useTelemetry();
const { showError, showMessage } = useToast();
const { scopeDisplay } = useSkillScopeDisplay();

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: SKILLS_DEFAULT_PAGE_SIZE,
	sortBy: CONTEXT_DEFAULT_SORT_BY,
});
const search = ref('');
const filters = ref<SkillFilters>({ ...NO_FILTERS });
const agentOptions = ref<SkillAgentOption[]>([]);
const selectedAgent = ref<SkillAgentOption | null>(null);
const agentsLoading = ref(false);
// The picked agent stays in the list when the current search does not return it.
const agentFilterOptions = computed(() =>
	selectedAgent.value && !agentOptions.value.some((agent) => agent.id === selectedAgent.value?.id)
		? [selectedAgent.value, ...agentOptions.value]
		: agentOptions.value,
);
const creators = ref<SkillUserDto[]>([]);
const loadFailed = ref(false);

// The empty states describe the rows on screen, so they follow the query that loaded
// them, not the live search input.
const loadedFiltered = ref(false);
const hasLoaded = ref(false);
// Each search reloads the list. Only the first load shows the loading rows, so a search
// keeps the previous rows until the new ones arrive.
const showLoading = computed(() => skillsStore.loading && !hasLoaded.value);
// A failed load also reports zero rows, so neither empty state must stand in for it.
const emptyState = computed<'none' | 'noSkills' | 'noResults'>(() => {
	if (!hasLoaded.value || loadFailed.value || skillsStore.count > 0) return 'none';
	return loadedFiltered.value ? 'noResults' : 'noSkills';
});

const scopeFilterOptions = computed(() =>
	(
		[
			['instance', 'settings.context.skills.filter.instance'],
			['project', 'settings.context.skills.filter.project'],
			['agent', 'settings.context.skills.filter.agent'],
		] as const
	).map(([value, key]) => ({ value, label: i18n.baseText(key) })),
);

/** The name of a creator, or the email when the name is unknown. */
function creatorLabel(creator: SkillUserDto): string {
	return preferenceUserName(creator) || creator.id;
}

function scopeQuery(scope: string): Pick<SkillListQuery, 'scope'> {
	return scope === 'instance' || scope === 'project' || scope === 'agent' ? { scope } : {};
}

// Paging, sort, search and filters run on the server: the count and the page both
// describe the matching skills, and the page is the only slice the browser holds.
function listQuery(page: number, itemsPerPage: number): SkillListQuery {
	const term = search.value.trim();
	const { scope, agentId, createdById } = filters.value;
	const sortBy = toSortOption(tableOptions.value.sortBy, SKILLS_SORT_OPTIONS);
	return {
		skip: page * itemsPerPage,
		take: itemsPerPage,
		...(term ? { search: term } : {}),
		...scopeQuery(scope),
		...(agentId ? { agentId } : {}),
		...(createdById ? { createdById } : {}),
		...(sortBy ? { sortBy } : {}),
	};
}

/**
 * Where a new skill can live: the instance, the personal project and the team projects
 * that the user may write to. An agent skill is made from inside its agent, not here.
 */
const scopeOptions = computed<AgentSkillModalScopeOption[]>(() => {
	const options: AgentSkillModalScopeOption[] = [];
	if (canWriteInstanceSkillScope()) {
		options.push({
			value: INSTANCE_SCOPE,
			label: i18n.baseText('settings.context.skills.scope.instance'),
			icon: 'globe',
			target: { projectId: null, agentId: null },
		});
	}
	const personalProject = projectsStore.personalProject;
	if (personalProject && canWriteProjectSkillScope(personalProject.id)) {
		options.push({
			value: `${PROJECT_SCOPE_PREFIX}${personalProject.id}`,
			label: i18n.baseText('settings.context.skills.scope.personalProject'),
			icon: 'user',
			target: { projectId: personalProject.id, agentId: null },
		});
	}
	for (const project of projectsStore.myProjects) {
		if (project.type !== 'team' || !canWriteProjectSkillScope(project.id)) continue;
		options.push({
			value: `${PROJECT_SCOPE_PREFIX}${project.id}`,
			label: project.name ?? project.id,
			icon: 'layers',
			target: { projectId: project.id, agentId: null },
		});
	}
	return options;
});

/** Settings creates and moves skills only to a project or the instance, never to one agent. */
function parseScope(value: string): { scope: 'project' | 'instance'; projectId?: string } {
	if (value.startsWith(PROJECT_SCOPE_PREFIX)) {
		return { scope: 'project', projectId: value.slice(PROJECT_SCOPE_PREFIX.length) };
	}
	return { scope: 'instance' };
}

// Only the newest load updates the page state, so a slow earlier search cannot win.
const { next: nextLoad } = useLatestFetch();

async function load() {
	const isLatest = nextLoad();
	const { page = 0, itemsPerPage = SKILLS_DEFAULT_PAGE_SIZE } = tableOptions.value;
	const query = listQuery(page, itemsPerPage);
	// Sort and paging do not narrow the list, so they do not count as filters.
	const filtered = [query.search, query.scope, query.agentId, query.createdById].some(
		(value) => value !== undefined,
	);
	try {
		await skillsStore.fetchSkills(query);
		if (!isLatest()) return;
		// Deleting the last rows of a page can leave the page past the end.
		const lastPage = Math.max(0, Math.ceil(skillsStore.count / itemsPerPage) - 1);
		if (page > lastPage) {
			tableOptions.value = { ...tableOptions.value, page: lastPage };
			await skillsStore.fetchSkills(listQuery(lastPage, itemsPerPage));
			if (!isLatest()) return;
		}
		loadFailed.value = false;
		loadedFiltered.value = filtered;
	} catch (error) {
		if (!isLatest()) return;
		loadFailed.value = true;
		showError(error, i18n.baseText('settings.context.skills.error.load'));
	} finally {
		if (isLatest()) hasLoaded.value = true;
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = {
		...options,
		sortBy: keepSortOnClear(tableOptions.value.sortBy, options.sortBy),
	};
	await load();
}

/** A new filter starts at the first page. */
async function resetPage() {
	tableOptions.value = { ...tableOptions.value, page: 0 };
	await load();
}

const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

async function setFilter(key: keyof SkillFilters, value: unknown) {
	// A cleared select reports an empty value, not an empty string.
	filters.value = { ...filters.value, [key]: typeof value === 'string' ? value : '' };
	await resetPage();
}

/** Keeps the picked agent, so its name still shows when a later search leaves it out. */
async function onAgentFilter(value: unknown) {
	selectedAgent.value = agentFilterOptions.value.find((agent) => agent.id === value) ?? null;
	await setFilter('agentId', value);
}

// Only the newest search fills the options, so a slow earlier one cannot win.
const { next: nextAgentSearch } = useLatestFetch();

/** The agent filter searches on the server and lists a capped page of matches. */
async function searchAgents(term = '') {
	const isLatest = nextAgentSearch();
	agentsLoading.value = true;
	try {
		const agents = await skillsStore.fetchAgents(term.trim() ? { search: term.trim() } : {});
		if (isLatest()) agentOptions.value = agents;
	} catch {
		// The filter is optional: a failed search leaves the previous options.
	} finally {
		if (isLatest()) agentsLoading.value = false;
	}
}

const onAgentSearch = useDebounceFn(searchAgents, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

// Only the newest read fills the creators, so a slow earlier one cannot win.
const { next: nextCreatorsLoad } = useLatestFetch();

async function loadCreators() {
	const isLatest = nextCreatorsLoad();
	try {
		const users = await skillsStore.fetchCreators();
		if (!isLatest()) return;
		creators.value = [...users].sort((a, b) => creatorLabel(a).localeCompare(creatorLabel(b)));
	} catch {
		// The filter is optional: a failed read leaves the previous options.
	}
}

async function resetFilters() {
	filters.value = { ...NO_FILTERS };
	await resetPage();
}

/** Options for the filters. Each one is optional, so a failed read leaves its list empty. */
async function loadFilterOptions() {
	await Promise.all([searchAgents(), loadCreators()]);
}

function openModal(data: AgentSkillModalData) {
	uiStore.openModalWithData({ name: AGENT_SKILL_MODAL_KEY, data });
}

/** Starts at the SKILL.md upload step, which also offers "Add manually". */
function openCreateModal() {
	const options = scopeOptions.value;
	if (options.length === 0) return;
	openModal({
		scopeOptions: options,
		initialScope: options[0].value,
		existingSkillNames: [],
		getDefaultName: async (scopeValue) =>
			await skillsStore.fetchNewSkillName({
				...parseScope(scopeValue),
				name: i18n.baseText('agents.builder.skills.defaultName'),
			}),
		onConfirm: async ({ skill, scope, method }) =>
			await onCreate(skill, scope ?? options[0].value, method),
	});
}

/**
 * The row is the feedback for a create or a save, as on the preferences page. The list
 * keeps the search and the scope filter, so a skill they hide gets a message instead.
 */
function confirmIfHidden(skillId: string, key: 'created' | 'saved') {
	if (skillsStore.skills.some((item) => item.id === skillId)) return;
	showMessage({
		title: i18n.baseText(
			key === 'created'
				? 'settings.context.skills.create.hidden'
				: 'settings.context.skills.save.hidden',
		),
		type: 'success',
	});
}

/**
 * A refused save keeps the modal open, so the user keeps what they typed. A taken name
 * shows on the name field, any other error in a toast.
 */
function saveFailed(error: unknown): AgentSkillConfirmFailure {
	if (isSkillNameTakenError(error)) {
		return { saved: false, nameError: i18n.baseText('settings.context.skills.error.nameTaken') };
	}
	showError(error, i18n.baseText('settings.context.skills.error.save'));
	return { saved: false };
}

async function onCreate(
	skill: AgentSkill,
	scopeValue: string,
	method?: SkillCreateMethod,
): Promise<AgentSkillConfirmFailure | undefined> {
	let createdId: string;
	try {
		createdId = (
			await skillsStore.createSkill({
				...parseScope(scopeValue),
				skill,
				...(method ? { method } : {}),
			})
		).id;
	} catch (error) {
		return saveFailed(error);
	}
	// The creator may be new to the list. The table does not wait for the filter options.
	void loadCreators();
	await load();
	confirmIfHidden(createdId, 'created');
	return undefined;
}

/** The value of the scope picker for a saved skill. An agent skill has no picker value of its own. */
function scopeValueOf(skill: Pick<SkillListItem, 'scope' | 'projectId'>): string {
	if (skill.scope === 'project' && skill.projectId)
		return `${PROJECT_SCOPE_PREFIX}${skill.projectId}`;
	return skill.scope;
}

/**
 * Why the scope of a saved skill cannot change, if it cannot. A move needs the delete
 * permission where the skill is, because it takes the skill out of that scope. A skill in
 * use can still move: the modal warns about a scope that drops an agent.
 */
function scopeLock(
	detail: Pick<SkillListItem, 'canDelete'>,
): Pick<AgentSkillModalData, 'scopeLockedReason'> {
	if (!detail.canDelete) {
		return { scopeLockedReason: i18n.baseText('settings.context.skills.modal.scope.noDelete') };
	}
	return {};
}

async function openEditModal(item: Pick<SkillListItem, 'id'>) {
	try {
		const detail = await skillsStore.fetchSkill(item.id);
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
			skill_id: detail.id,
			scope: detail.scope,
			...(detail.projectId ? { project_id: detail.projectId } : {}),
			read_only: !detail.canEdit,
		});
		const currentValue = scopeValueOf(detail);
		// The current scope is listed even when the user could not create a skill there,
		// such as an agent skill, which is only made from inside its agent.
		const options = scopeOptions.value.some((option) => option.value === currentValue)
			? scopeOptions.value
			: [{ value: currentValue, ...scopeDisplay(detail) }, ...scopeOptions.value];
		openModal({
			skill: detail.skill,
			skillId: detail.id,
			readOnly: !detail.canEdit,
			...(assistantSkillsEnabled.value
				? { availableToAssistant: detail.availableToAssistant }
				: {}),
			scopeOptions: options,
			initialScope: currentValue,
			...scopeLock(detail),
			usedBy: detail.usedBy,
			existingSkillNames: [],
			onConfirm: async ({ skill, scope, availableToAssistant }) =>
				await onSave(
					detail.id,
					skill,
					detail.skillHash,
					scope !== currentValue ? scope : undefined,
					availableToAssistant,
				),
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.loadOne'));
	}
}

/** Saves the next version. There are no drafts: what the modal shows is what gets saved. */
/** `newScope` is set when the user picked another scope: the save also moves the skill. */
async function onSave(
	id: string,
	skill: AgentSkill,
	baseSkillHash: string,
	newScope?: string,
	availableToAssistant?: boolean,
): Promise<AgentSkillConfirmFailure | undefined> {
	let created: boolean;
	try {
		({ created } = await skillsStore.saveSkill(id, {
			name: skill.name,
			description: skill.description,
			instructions: skill.instructions,
			// An empty list clears the references, where an absent one would keep them.
			references: skill.references ?? [],
			baseSkillHash,
			...(newScope ? parseScope(newScope) : {}),
			...(availableToAssistant !== undefined ? { availableToAssistant } : {}),
		}));
	} catch (error) {
		return saveFailed(error);
	}
	// Scope and availability changes do not create a content version.
	if (created || newScope !== undefined || availableToAssistant !== undefined) {
		await load();
		confirmIfHidden(id, 'saved');
	} else {
		showMessage({ title: i18n.baseText('settings.context.skills.save.noChanges'), type: 'info' });
	}
	return undefined;
}

/** The list row has no content, so the download reads the latest version first. */
async function onDownload(item: Pick<SkillListItem, 'id'>) {
	try {
		const detail = await skillsStore.fetchSkill(item.id);
		const { blob, fileName, format } = await exportAgentSkill(detail.skill);
		saveAs(blob, fileName);
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_DOWNLOADED_SKILL, {
			skill_id: detail.id,
			scope: detail.scope,
			...(detail.projectId ? { project_id: detail.projectId } : {}),
			format,
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.download'));
	}
}

async function onDelete(skill: SkillListItem) {
	const confirmed = await message.confirm(
		i18n.baseText('settings.context.skills.delete.confirm.message'),
		i18n.baseText('settings.context.skills.delete.confirm.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('settings.context.skills.delete.confirm.button'),
			cancelButtonText: i18n.baseText('settings.context.skills.delete.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await skillsStore.deleteSkill(skill.id);
		showMessage({
			title: i18n.baseText('settings.context.skills.delete.success'),
			type: 'success',
		});
	} catch (error) {
		// An agent may have attached the skill since the list loaded: that answers 409.
		showError(error, i18n.baseText('settings.context.skills.error.delete'));
	}
	// The deleted skill may have been the last one of its creator.
	void loadCreators();
	await load();
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.skills.title'));
	// The filter options are not needed for the first page or the deep links below.
	void loadFilterOptions();
	await Promise.all([load(), projectsStore.getMyProjects().catch(() => undefined)]);
	// Once for the visit, not once for each page. A failed load reports nothing, so a zero
	// here is an empty list and never a broken one.
	if (!loadFailed.value) {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILLS, { count: skillsStore.count });
	}
	// Deep links: one skill to open, or a new one to start. The skill may be on another
	// page, so it is read by id rather than from the list.
	const { skillId, create } = route.query;
	if (typeof skillId === 'string') {
		await openEditModal({ id: skillId });
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
				@update:model-value="onSearch"
			>
				<template #prefix>
					<N8nIcon icon="search" />
				</template>
			</N8nInput>
			<ResourceFiltersDropdown
				:model-value="filters"
				:keys="FILTER_KEYS"
				:reset="resetFilters"
				:shareable="false"
				just-icon
			>
				<div :class="$style.filter">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.filter.scope')"
						:bold="false"
						size="small"
						color="text-base"
					/>
					<N8nSelect
						:model-value="filters.scope"
						size="medium"
						filterable
						clearable
						:placeholder="i18n.baseText('settings.context.skills.filter.all')"
						data-test-id="skills-filter-scope"
						@update:model-value="setFilter('scope', $event)"
					>
						<N8nOption
							v-for="option in scopeFilterOptions"
							:key="option.value"
							:value="option.value"
							:label="option.label"
						/>
					</N8nSelect>
				</div>
				<div :class="$style.filter">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.filter.agentLabel')"
						:bold="false"
						size="small"
						color="text-base"
					/>
					<N8nSelect
						:model-value="filters.agentId"
						size="medium"
						filterable
						remote
						:remote-method="onAgentSearch"
						:loading="agentsLoading"
						clearable
						:placeholder="i18n.baseText('settings.context.skills.filter.anyAgent')"
						data-test-id="skills-filter-agent"
						@update:model-value="onAgentFilter"
					>
						<N8nOption
							v-for="agent in agentFilterOptions"
							:key="agent.id"
							:value="agent.id"
							:label="agent.name"
						/>
					</N8nSelect>
				</div>
				<div :class="$style.filter">
					<N8nInputLabel
						:label="i18n.baseText('settings.context.skills.filter.createdBy')"
						:bold="false"
						size="small"
						color="text-base"
					/>
					<N8nSelect
						:model-value="filters.createdById"
						size="medium"
						filterable
						clearable
						:placeholder="i18n.baseText('settings.context.skills.filter.anyone')"
						data-test-id="skills-filter-created-by"
						@update:model-value="setFilter('createdById', $event)"
					>
						<N8nOption
							v-for="creator in creators"
							:key="creator.id"
							:value="creator.id"
							:label="creatorLabel(creator)"
						/>
					</N8nSelect>
				</div>
			</ResourceFiltersDropdown>
			<span :class="$style.spacer" />
			<N8nButton
				v-if="scopeOptions.length > 0"
				:label="i18n.baseText('settings.context.skills.actions.create')"
				data-test-id="skills-create-button"
				@click="openCreateModal"
			/>
		</div>

		<SkillsTable
			v-model:table-options="tableOptions"
			:skills="skillsStore.skills"
			:items-length="skillsStore.count"
			:loading="showLoading"
			:show-empty="emptyState !== 'none'"
			:show-assistant-availability="assistantSkillsEnabled"
			@open="openEditModal"
			@download="onDownload"
			@delete="onDelete"
			@update:options="onOptionsUpdate"
		>
			<template #empty>
				<div
					v-if="emptyState === 'noResults'"
					:class="$style.empty"
					data-test-id="skills-no-results"
				>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.skills.search.noResults') }}
					</N8nText>
				</div>
				<div v-else :class="$style.empty" data-test-id="skills-empty-state">
					<N8nHeading tag="h2" size="medium" bold>
						{{ i18n.baseText('settings.context.skills.empty.title') }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText('settings.context.skills.empty.description') }}
					</N8nText>
					<N8nButton
						v-if="scopeOptions.length > 0"
						:label="i18n.baseText('settings.context.skills.actions.create')"
						data-test-id="skills-empty-create-button"
						@click="openCreateModal"
					/>
				</div>
			</template>
		</SkillsTable>
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

.filter {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);

	& + & {
		margin-top: var(--spacing--sm);
	}
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

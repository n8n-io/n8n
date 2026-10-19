<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { AgentSkill, SkillCreateMethod, SkillListItem, SkillScope } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
} from '@n8n/design-system';
import type { DropdownMenuItemProps, TableOptions } from '@n8n/design-system';

import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useMessage } from '@/app/composables/useMessage';
import { DEBOUNCE_TIME, MODAL_CONFIRM, VIEWS } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { AGENT_SKILL_MODAL_KEY } from '@/features/agents/constants';
import { isSkillNameTakenError } from '@/features/agents/utils/agentSkill';
import { isNotFoundError } from '@/features/agents/utils/errors';
import type {
	AgentSkillConfirmFailure,
	AgentSkillModalData,
	AgentSkillModalScopeOption,
} from '@/features/agents/components/AgentSkillModal.vue';

import SkillsTable from '../components/SkillsTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE } from '../context.constants';
import { canWriteInstanceSkillScope, canWriteProjectSkillScope } from '../context.utils';
import type { SkillListQuery } from '../skills.api';
import { useSkillsStore } from '../skills.store';
import { useSkillScopeDisplay } from '../skills.utils';

const INSTANCE_SCOPE = 'instance';
const PROJECT_SCOPE_PREFIX = 'project:';
const ALL_SCOPES = 'all';

type ScopeFilter = SkillScope | typeof ALL_SCOPES;

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();
const message = useMessage();
const uiStore = useUIStore();
const projectsStore = useProjectsStore();
const skillsStore = useSkillsStore();
const telemetry = useTelemetry();
const { showError, showMessage } = useToast();
const { scopeDisplay } = useSkillScopeDisplay();

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
	sortBy: [],
});
const search = ref('');
const scopeFilter = ref<ScopeFilter>(ALL_SCOPES);
const loadFailed = ref(false);

// Paging, search and the scope filter run on the server: the count and the page both
// describe the matching skills, and the page is the only slice the browser holds.
const isFiltered = computed(() => search.value.trim() !== '' || scopeFilter.value !== ALL_SCOPES);
// A failed load also reports zero rows, so the empty state must not stand in for it. A
// filter that matches nothing shows an empty table, not "No skills yet".
const showEmptyState = computed(
	() => !skillsStore.loading && !loadFailed.value && !isFiltered.value && skillsStore.count === 0,
);

const scopeFilterItems = computed<Array<DropdownMenuItemProps<ScopeFilter>>>(() =>
	(
		[
			[ALL_SCOPES, 'settings.context.skills.filter.all'],
			['instance', 'settings.context.skills.filter.instance'],
			['project', 'settings.context.skills.filter.project'],
			['agent', 'settings.context.skills.filter.agent'],
		] as const
	).map(([id, key]) => ({
		id,
		label: i18n.baseText(key),
		checked: scopeFilter.value === id,
	})),
);

function listQuery(page: number, itemsPerPage: number): SkillListQuery {
	const term = search.value.trim();
	return {
		skip: page * itemsPerPage,
		take: itemsPerPage,
		...(term ? { search: term } : {}),
		...(scopeFilter.value !== ALL_SCOPES ? { scope: scopeFilter.value } : {}),
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
		});
	}
	const personalProject = projectsStore.personalProject;
	if (personalProject && canWriteProjectSkillScope(personalProject.id)) {
		options.push({
			value: `${PROJECT_SCOPE_PREFIX}${personalProject.id}`,
			label: i18n.baseText('settings.context.skills.scope.personalProject'),
			icon: 'user',
		});
	}
	for (const project of projectsStore.myProjects) {
		if (project.type !== 'team' || !canWriteProjectSkillScope(project.id)) continue;
		options.push({
			value: `${PROJECT_SCOPE_PREFIX}${project.id}`,
			label: project.name ?? project.id,
			icon: 'layers',
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

async function load() {
	const { page = 0, itemsPerPage = PREFERENCES_DEFAULT_PAGE_SIZE } = tableOptions.value;
	try {
		await skillsStore.fetchSkills(listQuery(page, itemsPerPage));
		loadFailed.value = false;
		// Deleting the last rows of a page can leave the page past the end.
		const lastPage = Math.max(0, Math.ceil(skillsStore.count / itemsPerPage) - 1);
		if (page > lastPage) {
			tableOptions.value = { ...tableOptions.value, page: lastPage };
			await skillsStore.fetchSkills(listQuery(lastPage, itemsPerPage));
		}
	} catch (error) {
		loadFailed.value = true;
		showError(error, i18n.baseText('settings.context.skills.error.load'));
	}
}

async function onOptionsUpdate(options: TableOptions) {
	tableOptions.value = options;
	await load();
}

/** A new filter starts at the first page. */
async function resetPage() {
	tableOptions.value = { ...tableOptions.value, page: 0 };
	await load();
}

const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

async function onScopeFilter(value: ScopeFilter) {
	scopeFilter.value = value;
	await resetPage();
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
 * Why the scope of a saved skill cannot change, if it cannot. The backend refuses a move
 * while an agent uses the skill, and a move needs the delete permission where the skill is,
 * because it takes the skill out of that scope.
 */
function scopeLock(
	detail: Pick<SkillListItem, 'usedByAgents' | 'canDelete'>,
): Pick<AgentSkillModalData, 'scopeLockedReason'> {
	if (detail.usedByAgents > 0) {
		return {
			scopeLockedReason: i18n.baseText('settings.context.skills.modal.scope.inUse', {
				interpolate: { count: detail.usedByAgents },
				adjustToNumber: detail.usedByAgents,
			}),
		};
	}
	if (!detail.canDelete) {
		return { scopeLockedReason: i18n.baseText('settings.context.skills.modal.scope.noDelete') };
	}
	return {};
}

/** The skill that `?skillId` names. The URL drives the edit modal, so a link opens one skill. */
const routeSkillId = computed(() =>
	typeof route.query.skillId === 'string' && route.query.skillId !== ''
		? route.query.skillId
		: undefined,
);
/** The skill that the edit modal shows, if this page opened it. */
const openSkillId = ref<string>();
const isSkillModalOpen = computed(() => uiStore.modalsById[AGENT_SKILL_MODAL_KEY]?.open === true);

/** `replace`, not `push`: a closed modal must not come back with the browser's back button. */
async function setRouteSkillId(skillId: string | undefined) {
	if (routeSkillId.value === skillId) return;
	const query = { ...route.query };
	delete query.skillId;
	await router.replace({ query: skillId ? { ...query, skillId } : query });
}

/** Opening a row puts the skill in the URL, so the user can copy and share the link. */
async function onOpenSkill(item: Pick<SkillListItem, 'id'>) {
	if (routeSkillId.value === item.id) {
		await openEditModal(item.id);
		return;
	}
	await setRouteSkillId(item.id);
}

function onOpenSkillFailed(error: unknown) {
	// The API answers 404 both for a missing skill and for one the user cannot read.
	if (isNotFoundError(error)) {
		showMessage({
			title: i18n.baseText('settings.context.skills.error.notFound.title'),
			message: i18n.baseText('settings.context.skills.error.notFound.message'),
			type: 'warning',
		});
	} else {
		showError(error, i18n.baseText('settings.context.skills.error.loadOne'));
	}
}

async function openEditModal(skillId: string) {
	if (openSkillId.value === skillId && isSkillModalOpen.value) return;
	// The modal reads its data once, so another skill needs a fresh modal.
	if (openSkillId.value && isSkillModalOpen.value) uiStore.closeModal(AGENT_SKILL_MODAL_KEY);
	try {
		const detail = await skillsStore.fetchSkill(skillId);
		// The URL moved on while the skill loaded, so the user no longer wants it.
		if (routeSkillId.value !== skillId) return;
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
		openSkillId.value = detail.id;
		openModal({
			skill: detail.skill,
			skillId: detail.id,
			readOnly: !detail.canEdit,
			scopeOptions: options,
			initialScope: currentValue,
			...scopeLock(detail),
			existingSkillNames: [],
			onConfirm: async ({ skill, scope }) =>
				await onSave(
					detail.id,
					skill,
					detail.skillHash,
					scope !== currentValue ? scope : undefined,
				),
		});
	} catch (error) {
		onOpenSkillFailed(error);
		// The list stays, without a link that would fail again on refresh.
		if (routeSkillId.value === skillId) await setRouteSkillId(undefined);
	}
}

watch(routeSkillId, async (skillId) => {
	if (skillId) {
		await openEditModal(skillId);
	} else if (openSkillId.value && isSkillModalOpen.value) {
		openSkillId.value = undefined;
		uiStore.closeModal(AGENT_SKILL_MODAL_KEY);
	}
});

// A closed modal takes its skill out of the URL, so a refresh shows the list only.
watch(isSkillModalOpen, async (open) => {
	if (open || !openSkillId.value) return;
	const closedSkillId = openSkillId.value;
	openSkillId.value = undefined;
	if (routeSkillId.value === closedSkillId) await setRouteSkillId(undefined);
});

/** Saves the next version. There are no drafts: what the modal shows is what gets saved. */
/** `newScope` is set when the user picked another scope: the save also moves the skill. */
async function onSave(
	id: string,
	skill: AgentSkill,
	baseSkillHash: string,
	newScope?: string,
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
		}));
	} catch (error) {
		return saveFailed(error);
	}
	// A move is a change even when the content stays the same. Only "Nothing to save"
	// gets a message: a real change shows in the table.
	if (created || newScope !== undefined) {
		await load();
		confirmIfHidden(id, 'saved');
	} else {
		showMessage({ title: i18n.baseText('settings.context.skills.save.noChanges'), type: 'info' });
	}
	return undefined;
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
	await load();
}

async function goBack() {
	await router.push({ name: VIEWS.SETTINGS_CONTEXT });
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.context.skills.title'));
	await Promise.all([load(), projectsStore.getMyProjects().catch(() => undefined)]);
	// Once for the visit, not once for each page. A failed load reports nothing, so a zero
	// here is an empty list and never a broken one.
	if (!loadFailed.value) {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILLS, { count: skillsStore.count });
	}
	// Deep links: one skill to open, or a new one to start. The skill may be on another
	// page, so it is read by id rather than from the list.
	if (routeSkillId.value) {
		await openEditModal(routeSkillId.value);
	} else if (route.query.create === 'true') {
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
			<N8nDropdownMenu
				:items="scopeFilterItems"
				placement="bottom-start"
				content-test-id="skills-scope-filter-menu"
				@select="onScopeFilter"
			>
				<template #trigger>
					<span :class="$style.filterTrigger">
						<N8nIconButton
							variant="outline"
							icon="funnel"
							:aria-label="i18n.baseText('settings.context.skills.filter.label')"
							data-test-id="skills-scope-filter"
						/>
						<span
							v-if="scopeFilter !== 'all'"
							:class="$style.filterDot"
							data-test-id="skills-scope-filter-active"
						/>
					</span>
				</template>
			</N8nDropdownMenu>
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
			:loading="skillsStore.loading"
			:show-empty="showEmptyState"
			@open="onOpenSkill"
			@delete="onDelete"
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

.filterTrigger {
	position: relative;
	display: inline-flex;
}

/* Marks an active scope filter, since the button itself has no label. */
.filterDot {
	position: absolute;
	top: calc(-1 * var(--spacing--5xs));
	right: calc(-1 * var(--spacing--5xs));
	width: var(--spacing--2xs);
	height: var(--spacing--2xs);
	border-radius: 50%;
	background-color: var(--color--primary);
	pointer-events: none;
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

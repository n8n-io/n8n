<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type {
	AgentSkill,
	ImportGitHubSkillsResponse,
	SkillDetail,
	SkillCreateMethod,
	SkillListItem,
	SkillScope,
} from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import {
	N8nButton,
	N8nCallout,
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
import type {
	AgentSkillConfirmFailure,
	AgentSkillConfirmSuccess,
	AgentSkillModalData,
	AgentSkillModalScopeOption,
} from '@/features/agents/components/AgentSkillModal.vue';

import SkillGitHubImportModal from '../components/SkillGitHubImportModal.vue';
import SkillGitUpdateReviewModal from '../components/SkillGitUpdateReviewModal.vue';
import SkillShareImportModal from '../components/SkillShareImportModal.vue';
import SkillShareLinkModal from '../components/SkillShareLinkModal.vue';
import SkillsTable, { type SkillOpenView } from '../components/SkillsTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE } from '../context.constants';
import { canWriteInstanceSkillScope, canWriteProjectSkillScope } from '../context.utils';
import type { SkillListQuery } from '../skills.api';
import { useSkillsStore } from '../skills.store';
import { useSkillScopeDisplay } from '../skills.utils';
import { skillsWithPendingUpdate } from '../skillsGitHub.utils';
import { takeIncomingShare as readIncomingShare } from '../skillShare';

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
		onImportFromGitHub: openImport,
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

async function openEditModal(item: Pick<SkillListItem, 'id'>, view?: SkillOpenView) {
	try {
		const detail = await skillsStore.fetchSkill(item.id);
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_OPENED_SKILL, {
			skill_id: detail.id,
			scope: detail.scope,
			...(detail.projectId ? { project_id: detail.projectId } : {}),
			read_only: !detail.canEdit,
		});
		// A save that moves the skill makes the new scope the current one.
		let currentValue = scopeValueOf(detail);
		// The current scope is listed even when the user could not create a skill there,
		// such as an agent skill, which is only made from inside its agent.
		const options = scopeOptions.value.some((option) => option.value === currentValue)
			? scopeOptions.value
			: [{ value: currentValue, ...scopeDisplay(detail) }, ...scopeOptions.value];
		openModal({
			skill: detail.skill,
			skillId: detail.id,
			readOnly: !detail.canEdit,
			versioned: true,
			...(view ? { initialVersionView: view } : {}),
			scopeOptions: options,
			initialScope: currentValue,
			...scopeLock(detail),
			existingSkillNames: [],
			onReviewGitUpdate: (skillId) => openReview({ id: skillId }),
			onGitSyncChanged: () => void load(),
			onConfirm: async ({ skill, scope, label, baseSkillHash }) => {
				const newScope = scope !== currentValue ? scope : undefined;
				const result = await onSave(detail.id, skill, {
					// The modal reloads the skill after each save, so its hash is the newest one.
					baseSkillHash: baseSkillHash ?? detail.skillHash,
					...(newScope ? { newScope } : {}),
					...(label ? { label } : {}),
				});
				if (result.saved && newScope) currentValue = newScope;
				return result;
			},
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.error.loadOne'));
	}
}

/**
 * Saves the next version. There are no drafts: what the modal shows is what gets saved.
 * `newScope` is set when the user picked another scope: the save also moves the skill.
 * `label` names the new version.
 */
async function onSave(
	id: string,
	skill: AgentSkill,
	options: { baseSkillHash: string; newScope?: string; label?: string },
): Promise<AgentSkillConfirmFailure | AgentSkillConfirmSuccess> {
	const { baseSkillHash, newScope, label } = options;
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
			...(label ? { label } : {}),
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
	return { saved: true, created };
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

// ---- GitHub sync ----

const importOpen = ref(false);
const reviewSkillId = ref<string | null>(null);
const reviewOpen = computed({
	get: () => reviewSkillId.value !== null,
	set: (open: boolean) => {
		if (!open) reviewSkillId.value = null;
	},
});
/** Only skills the user can edit show an update, as only they can accept it. */
const pendingUpdates = computed(() =>
	skillsWithPendingUpdate(skillsStore.skills).filter((skill) => skill.canEdit),
);

function openImport() {
	if (scopeOptions.value.length > 0) importOpen.value = true;
}

async function onImported(response: ImportGitHubSkillsResponse) {
	await load();
	const added = response.created.length;
	const failures = response.failed.map((failure) => `${failure.path}: ${failure.message}`);
	showMessage({
		title: i18n.baseText('settings.context.skills.github.import.success', {
			interpolate: { count: String(added) },
			adjustToNumber: added,
		}),
		message: failures.join('\n'),
		type: failures.length > 0 ? 'warning' : 'success',
	});
}

function openReview(skill: Pick<SkillListItem, 'id'>) {
	reviewSkillId.value = skill.id;
}

async function onCheckGitHub(skill: SkillListItem) {
	try {
		const detail = await skillsStore.checkSkillGitHub(skill.id);
		const status = detail.gitSource?.status;
		showMessage({
			title: i18n.baseText(
				detail.gitSource?.update && !skill.gitSource?.update
					? 'settings.context.skills.github.check.found'
					: status === 'ok'
						? 'settings.context.skills.github.check.upToDate'
						: 'settings.context.skills.github.check.failed',
			),
			type: status === 'ok' ? 'success' : 'warning',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.github.check.error'));
	}
	await load();
}

async function onStopSync(skill: SkillListItem) {
	const confirmed = await message.confirm(
		i18n.baseText(
			skill.gitSource?.update
				? 'settings.context.skills.github.stop.confirm.messagePending'
				: 'settings.context.skills.github.stop.confirm.message',
		),
		i18n.baseText('settings.context.skills.github.stop.confirm.title'),
		{
			type: 'warning',
			confirmButtonText: i18n.baseText('settings.context.skills.github.stop.confirm.button'),
			cancelButtonText: i18n.baseText('settings.context.skills.delete.cancel'),
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	try {
		await skillsStore.stopSkillGitSync(skill.id);
		showMessage({
			title: i18n.baseText('settings.context.skills.github.stop.success'),
			type: 'success',
		});
	} catch (error) {
		showError(error, i18n.baseText('settings.context.skills.github.stop.error'));
	}
	await load();
}

// ---- Share links ----

const shareSkillId = ref<string | null>(null);
const shareOpen = computed({
	get: () => shareSkillId.value !== null,
	set: (open: boolean) => {
		if (!open) shareSkillId.value = null;
	},
});
const incomingShare = ref<{ id: string; key: string } | null>(null);
const shareImportOpen = computed({
	get: () => incomingShare.value !== null,
	set: (open: boolean) => {
		if (!open) incomingShare.value = null;
	},
});

function openShareLink(skill: Pick<SkillListItem, 'id'>) {
	shareSkillId.value = skill.id;
}

async function onSharedImported(skill: SkillDetail) {
	await load();
	showMessage({
		title: i18n.baseText('settings.context.skills.shareImport.success', {
			interpolate: { name: skill.name },
		}),
		type: 'success',
	});
}

/**
 * A share link lands here as `#share=<id>&k=<key>`, or comes back from sign-in through
 * session storage. The fragment is read once and then removed, so the key does not stay
 * in the address bar or in the history.
 */
async function takeIncomingShare() {
	const share = readIncomingShare(route.hash);
	if (!share) return;
	if (route.hash) await router.replace({ ...route, hash: '' });
	if (scopeOptions.value.length === 0) {
		showMessage({
			title: i18n.baseText('settings.context.skills.shareImport.noScope'),
			type: 'warning',
		});
		return;
	}
	incomingShare.value = share;
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
	await takeIncomingShare();
	const { skillId, create, view } = route.query;
	if (typeof skillId === 'string') {
		await openEditModal(
			{ id: skillId },
			view === 'timeline' || view === 'compare' ? view : undefined,
		);
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

		<N8nCallout
			v-if="pendingUpdates.length > 0"
			theme="warning"
			icon="github"
			:class="$style.banner"
			data-test-id="skills-github-banner"
		>
			<strong>
				{{
					i18n.baseText('settings.context.skills.github.banner.title', {
						interpolate: { count: String(pendingUpdates.length) },
						adjustToNumber: pendingUpdates.length,
					})
				}}
			</strong>
			{{ i18n.baseText('settings.context.skills.github.banner.description') }}
			<template #trailingContent>
				<N8nButton
					variant="outline"
					size="small"
					data-test-id="skills-github-banner-review"
					@click="openReview(pendingUpdates[0])"
				>
					{{ i18n.baseText('settings.context.skills.github.actions.review') }}
				</N8nButton>
			</template>
		</N8nCallout>

		<SkillsTable
			v-model:table-options="tableOptions"
			:skills="skillsStore.skills"
			:items-length="skillsStore.count"
			:loading="skillsStore.loading"
			:show-empty="showEmptyState"
			@open="openEditModal"
			@delete="onDelete"
			@share-link="openShareLink"
			@review="openReview"
			@check-git-hub="onCheckGitHub"
			@stop-sync="onStopSync"
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

		<SkillGitHubImportModal
			v-model:open="importOpen"
			:scope-options="scopeOptions"
			:resolve-scope="parseScope"
			@imported="onImported"
		/>
		<SkillShareLinkModal v-model:open="shareOpen" :skill-id="shareSkillId" />
		<SkillShareImportModal
			v-model:open="shareImportOpen"
			:share="incomingShare"
			:scope-options="scopeOptions"
			:resolve-scope="parseScope"
			@imported="onSharedImported"
		/>
		<SkillGitUpdateReviewModal
			v-model:open="reviewOpen"
			:skill-id="reviewSkillId"
			@decided="load"
		/>
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

.banner {
	width: 100%;
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

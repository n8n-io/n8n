<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDebounceFn } from '@vueuse/core';
import type { SkillListItem, SkillScope } from '@n8n/api-types';
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
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import SkillsTable from '../components/SkillsTable.vue';
import { PREFERENCES_DEFAULT_PAGE_SIZE } from '../context.constants';
import type { SkillListQuery } from '../skills.api';
import { useSkillsStore } from '../skills.store';
import {
	SKILLS_LIST_QUERY_STATE,
	readSavedSkillNotice,
	useSkillScopeOptions,
} from '../skills.utils';

const ALL_SCOPES = 'all';
const SCOPE_FILTERS = [ALL_SCOPES, 'instance', 'project', 'agent'] as const;

type ScopeFilter = SkillScope | typeof ALL_SCOPES;

const i18n = useI18n();
const router = useRouter();
const route = useRoute();
const documentTitle = useDocumentTitle();
const message = useMessage();
const projectsStore = useProjectsStore();
const skillsStore = useSkillsStore();
const telemetry = useTelemetry();
const { showError, showMessage } = useToast();
const { scopeOptions } = useSkillScopeOptions();

function isScopeFilter(value: unknown): value is ScopeFilter {
	return SCOPE_FILTERS.some((filter) => filter === value);
}

const tableOptions = ref<TableOptions>({
	page: 0,
	itemsPerPage: PREFERENCES_DEFAULT_PAGE_SIZE,
	sortBy: [],
});
const search = ref(typeof route.query.search === 'string' ? route.query.search : '');
const scopeFilter = ref<ScopeFilter>(
	isScopeFilter(route.query.scope) ? route.query.scope : ALL_SCOPES,
);
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

function filterQuery(): Record<string, string> {
	const term = search.value.trim();
	return {
		...(term ? { search: term } : {}),
		...(scopeFilter.value !== ALL_SCOPES ? { scope: scopeFilter.value } : {}),
	};
}

function listQuery(page: number, itemsPerPage: number): SkillListQuery {
	const term = search.value.trim();
	return {
		skip: page * itemsPerPage,
		take: itemsPerPage,
		...(term ? { search: term } : {}),
		...(scopeFilter.value !== ALL_SCOPES ? { scope: scopeFilter.value } : {}),
	};
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
	void router.replace({ query: filterQuery() });
	await load();
}

const onSearch = useDebounceFn(resetPage, getDebounceTime(DEBOUNCE_TIME.INPUT.SEARCH));

async function onScopeFilter(value: ScopeFilter) {
	scopeFilter.value = value;
	await resetPage();
}

const pageState = () => ({ state: { [SKILLS_LIST_QUERY_STATE]: filterQuery() } });

async function openCreate() {
	if (scopeOptions.value.length === 0) return;
	await router.push({ name: VIEWS.SETTINGS_CONTEXT_SKILL_NEW, ...pageState() });
}

async function openSkill(item: Pick<SkillListItem, 'id'>) {
	await router.push({
		name: VIEWS.SETTINGS_CONTEXT_SKILL,
		params: { skillId: item.id },
		...pageState(),
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
	const { skillId, create } = route.query;
	if (typeof skillId === 'string') {
		await router.replace({ name: VIEWS.SETTINGS_CONTEXT_SKILL, params: { skillId } });
		return;
	}
	if (create === 'true') {
		await router.replace({ name: VIEWS.SETTINGS_CONTEXT_SKILL_NEW });
		return;
	}
	documentTitle.set(i18n.baseText('settings.context.skills.title'));
	await Promise.all([load(), projectsStore.getMyProjects().catch(() => undefined)]);
	// Once for the visit, not once for each page. A failed load reports nothing, so a zero
	// here is an empty list and never a broken one.
	if (!loadFailed.value) {
		telemetry.track(TELEMETRY_EVENT.CONTEXT.USER_VIEWED_SKILLS, { count: skillsStore.count });
		const saved = readSavedSkillNotice(history.state);
		if (saved) confirmIfHidden(saved.id, saved.created ? 'created' : 'saved');
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
				@click="openCreate"
			/>
		</div>

		<SkillsTable
			v-model:table-options="tableOptions"
			:skills="skillsStore.skills"
			:items-length="skillsStore.count"
			:loading="skillsStore.loading"
			:show-empty="showEmptyState"
			@open="openSkill"
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
						@click="openCreate"
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

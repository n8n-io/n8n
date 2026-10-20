<script setup lang="ts">
import type {
	ProjectIcon,
	ScimTransferTarget,
	ScimTransferTargetPerson,
	ScimTransferTargetProject,
	ScimTransferTargetsResponse,
} from '@n8n/api-types';
import { N8nAvatar, N8nCombobox2, N8nIcon, N8nText } from '@n8n/design-system';
import type { ComboboxItem, ComboboxOptionBase } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { SCIM_TRANSFER_TARGET_SEARCH_DEBOUNCE_MS } from '../scim.constants';
import { useScimStore } from '../scim.store';
import type { ScimTransferPick } from '../scim.types';
import { formatPersonName, roleLabelKey } from '../scim.utils';

/** What the picker knows about a row. The stored target carries fewer fields than a search hit. */
type PersonEntry = {
	type: 'person';
	firstName: string | null;
	lastName: string | null;
	email: string | null;
	role: string | null;
};

type ProjectEntry = {
	type: 'project';
	name: string;
	icon: ProjectIcon | null;
	memberCount: number | null;
	workflowCount: number | null;
};

type PickerEntry = PersonEntry | ProjectEntry;

const CLEAR_SEARCH_VALUE = '__scim_clear_search__';

/**
 * Searches people and team projects through `GET /rest/scim/transfer-targets`.
 * One debounced request per query. A person maps to the id of their personal
 * project, so a pick is always a project id.
 */
const props = withDefaults(
	defineProps<{
		modelValue: string | null;
		/** The stored target, so the field can show it before the first search. */
		initialTarget?: ScimTransferTarget | null;
		autoFocus?: boolean;
	}>(),
	{ initialTarget: null, autoFocus: false },
);

const emit = defineEmits<{
	'update:modelValue': [pick: ScimTransferPick | null];
	/** Fires once, the first time the user types a search term. */
	searchUsed: [];
}>();

const i18n = useI18n();
const scimStore = useScimStore();

// Only the exposed method is needed, so the ref stays typed without the SFC's instance type.
const combobox = ref<{ clearSearch: () => void } | null>(null);
const results = ref<ScimTransferTargetsResponse | null>(null);
const loading = ref(false);
const query = ref('');
const failed = ref(false);
/** Everything the picker has seen, keyed by project id, so a selected row keeps its detail. */
const known = ref(new Map<string, PickerEntry>());
let requestId = 0;
let disposed = false;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let searchUsedEmitted = false;

function rememberPerson(person: ScimTransferTargetPerson) {
	known.value.set(person.projectId, {
		type: 'person',
		firstName: person.firstName,
		lastName: person.lastName,
		email: person.email,
		role: person.role,
	});
}

function rememberProject(project: ScimTransferTargetProject) {
	known.value.set(project.projectId, {
		type: 'project',
		name: project.name,
		icon: project.icon,
		memberCount: project.memberCount,
		workflowCount: project.workflowCount,
	});
}

function rememberStoredTarget(target: ScimTransferTarget | null) {
	if (!target?.kind || !target.name) return;
	if (target.kind === 'person') {
		const [firstName, ...rest] = target.name.split(' ');
		known.value.set(target.projectId, {
			type: 'person',
			firstName,
			lastName: rest.join(' ') || null,
			email: target.email ?? null,
			role: null,
		});
		return;
	}
	known.value.set(target.projectId, {
		type: 'project',
		name: target.name,
		icon: target.icon ?? null,
		memberCount: null,
		workflowCount: null,
	});
}

async function search(term: string) {
	const id = ++requestId;
	loading.value = true;
	failed.value = false;
	try {
		const response = await scimStore.searchTransferTargets(term ? { search: term } : {});
		if (disposed || id !== requestId) return;
		results.value = response;
		response.people?.items.forEach(rememberPerson);
		response.projects?.items.forEach(rememberProject);
	} catch {
		if (disposed || id !== requestId) return;
		failed.value = true;
		results.value = null;
	} finally {
		if (!disposed && id === requestId) loading.value = false;
	}
}

/** The label of the selected row. The input shows it, and it is not a search. */
function selectedLabel(): string {
	const entry = props.modelValue ? entryOf(props.modelValue) : null;
	if (!entry) return '';
	return entry.type === 'person' ? personLabel(entry) : entry.name;
}

function onSearchTerm(value: string) {
	// Reka sets the input to the selected label on open and on select. That is not a query.
	if (value && value === selectedLabel()) value = '';
	if (value === query.value) return;
	query.value = value;
	if (value && !searchUsedEmitted) {
		searchUsedEmitted = true;
		emit('searchUsed');
	}
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		void search(value);
	}, SCIM_TRANSFER_TARGET_SEARCH_DEBOUNCE_MS);
}

function clearSearch() {
	combobox.value?.clearSearch();
}

function groupLabel(group: 'people' | 'projects', count: number, total: number) {
	const name = i18n.baseText(`settings.scim.picker.${group}`);
	return query.value
		? i18n.baseText('settings.scim.picker.countOf', {
				interpolate: { group: name, count: String(count), total: String(total) },
			})
		: i18n.baseText('settings.scim.picker.count', {
				interpolate: { group: name, count: String(total) },
			});
}

function personLabel(entry: PersonEntry) {
	return formatPersonName(entry);
}

/** The stored target stays selectable while the search results do not contain it. */
function retainedOption(ids: Set<string>): ComboboxOptionBase | null {
	const value = props.modelValue;
	if (!value || ids.has(value)) return null;
	const entry = known.value.get(value);
	if (!entry) return null;
	return {
		value,
		label: entry.type === 'person' ? personLabel(entry) : entry.name,
	};
}

const items = computed<ComboboxItem[]>(() => {
	const people = results.value?.people;
	const projects = results.value?.projects;
	const peopleItems = (people?.items ?? []).map<ComboboxOptionBase>((person) => ({
		value: person.projectId,
		label: formatPersonName(person),
	}));
	const projectItems = (projects?.items ?? []).map<ComboboxOptionBase>((project) => ({
		value: project.projectId,
		label: project.name,
	}));

	if (peopleItems.length === 0 && projectItems.length === 0) {
		if (loading.value || !query.value) {
			const retained = retainedOption(new Set());
			return retained ? [retained] : [];
		}
		return [
			{
				type: 'group',
				label: i18n.baseText('settings.scim.picker.noMatch', {
					interpolate: { query: query.value },
				}),
				items: [
					{
						value: CLEAR_SEARCH_VALUE,
						label: i18n.baseText('settings.scim.picker.clearSearch'),
						onSelect(event) {
							// A row that clears the search, not a pick.
							event.preventDefault();
							clearSearch();
						},
					},
				],
			},
		];
	}

	const ids = new Set([...peopleItems, ...projectItems].map((item) => item.value));
	const retained = retainedOption(ids);
	const retainedEntry = retained ? known.value.get(retained.value) : null;
	if (retained && retainedEntry?.type === 'person') peopleItems.unshift(retained);
	if (retained && retainedEntry?.type === 'project') projectItems.unshift(retained);

	const groups: ComboboxItem[] = [];
	if (peopleItems.length > 0) {
		groups.push({
			type: 'group',
			label: groupLabel('people', people?.count ?? peopleItems.length, people?.total ?? 0),
			items: peopleItems,
		});
	}
	if (projectItems.length > 0) {
		groups.push({
			type: 'group',
			label: groupLabel('projects', projects?.count ?? projectItems.length, projects?.total ?? 0),
			items: projectItems,
		});
	}
	return groups;
});

const emptyText = computed(() =>
	failed.value ? i18n.baseText('settings.scim.picker.error') : i18n.baseText('generic.loading'),
);

function roleLabel(roleSlug: string) {
	const key = roleLabelKey(roleSlug);
	return key ? i18n.baseText(key) : (roleSlug.split(':').pop() ?? roleSlug);
}

function entryOf(value: string): PickerEntry | null {
	return known.value.get(value) ?? null;
}

function personOf(value: string): PersonEntry | null {
	const entry = entryOf(value);
	return entry?.type === 'person' ? entry : null;
}

function projectOf(value: string): ProjectEntry | null {
	const entry = entryOf(value);
	return entry?.type === 'project' ? entry : null;
}

function detail(value: string): string {
	const entry = entryOf(value);
	if (!entry) return '';
	if (entry.type === 'person') {
		const parts = [entry.role ? roleLabel(entry.role) : null, entry.email].filter(Boolean);
		return parts.join(' · ');
	}
	if (entry.memberCount === null || entry.workflowCount === null) return '';
	return i18n.baseText('settings.scim.picker.project.detail', {
		interpolate: {
			members: i18n.baseText('settings.scim.picker.project.members', {
				adjustToNumber: entry.memberCount,
				interpolate: { count: String(entry.memberCount) },
			}),
			workflows: i18n.baseText('settings.scim.picker.project.workflows', {
				adjustToNumber: entry.workflowCount,
				interpolate: { count: String(entry.workflowCount) },
			}),
		},
	});
}

function onUpdateModelValue(value: string | string[] | undefined) {
	if (typeof value !== 'string' || value === CLEAR_SEARCH_VALUE) {
		emit('update:modelValue', null);
		return;
	}
	const entry = entryOf(value);
	if (!entry) {
		emit('update:modelValue', null);
		return;
	}
	emit('update:modelValue', { projectId: value, type: entry.type });
}

// Seeded in setup, not on mount: reka reports the selected label as the search
// term during the first render, and the label must already be known by then.
rememberStoredTarget(props.initialTarget);

onMounted(() => {
	void search('');
});

onUnmounted(() => {
	disposed = true;
	clearTimeout(debounceTimer);
});
</script>

<template>
	<N8nCombobox2
		ref="combobox"
		:model-value="props.modelValue ?? undefined"
		:items="items"
		:placeholder="i18n.baseText('settings.scim.picker.placeholder')"
		:empty-text="emptyText"
		:loading="loading"
		:auto-focus="props.autoFocus"
		ignore-filter
		sticky-group-labels
		scroll-mask
		size="medium"
		data-test-id="scim-transfer-target-picker"
		@update:model-value="onUpdateModelValue"
		@update:search-term="onSearchTerm"
	>
		<template #item-leading="{ item, ui }">
			<N8nIcon v-if="item.value === CLEAR_SEARCH_VALUE" icon="x" size="small" :class="ui.class" />
			<N8nAvatar
				v-else-if="personOf(item.value)"
				:first-name="personOf(item.value)?.firstName"
				:last-name="personOf(item.value)?.lastName"
				size="xsmall"
				:class="ui.class"
			/>
			<span v-else :class="[ui.class, $style.projectIcon]" aria-hidden="true">
				<template v-if="projectOf(item.value)?.icon?.type === 'emoji'">
					{{ projectOf(item.value)?.icon?.value }}
				</template>
				<N8nIcon v-else :icon="projectOf(item.value)?.icon?.value ?? 'layers'" size="small" />
			</span>
		</template>
		<template #item-label="{ item }">
			<span :class="$style.itemLabel">
				<span>{{ item.label }}</span>
				<N8nText v-if="detail(item.value)" size="small" color="text-light">
					{{ detail(item.value) }}
				</N8nText>
			</span>
		</template>
	</N8nCombobox2>
</template>

<style lang="scss" module>
.itemLabel {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.projectIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	font-size: var(--font-size--sm);
}
</style>

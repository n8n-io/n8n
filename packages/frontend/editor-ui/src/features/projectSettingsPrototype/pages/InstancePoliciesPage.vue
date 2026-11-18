<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import {
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nInputNumber,
	N8nOption,
	N8nPagination,
	N8nSegmentControl,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSaveBar,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	N8nTooltip,
	useMessage,
} from '@n8n/design-system';
import type { SegmentOption } from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import ProjectIcon from '@/features/collaboration/projects/components/ProjectIcon.vue';
import { CREDENTIAL_TYPES, NODE_TYPES } from '@/features/projectSettingsPrototype/data/catalog';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type {
	CatalogIcon,
	InstanceLimits,
	InstanceRule,
	Project,
	ProjectLimits,
} from '@/features/projectSettingsPrototype/data/types';
import { projectPagePath } from '@/features/projectSettingsPrototype/nav/model';
import { resolveAccess } from '@/features/projectSettingsPrototype/state/resolve';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	instanceRule,
	projectAccessFlags,
	projectState,
	projects,
	projectsOverriding,
	setAllowProjects,
	setInstanceLimits,
	setInstanceRule,
	setProjectLimits,
	store,
	type AccessKind,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * Settings › Project policies: the rules every project starts from.
 *
 * Each section is the instance counterpart of a project page: which nodes and
 * credential types projects can use, and how many executions they can run.
 * Project pages link here by section, so the page scrolls to the hash.
 */

const ACCESS_SECTION_ID = 'node-and-credential-policies';
const LIMITS_SECTION_ID = 'execution-limits';
const SECTION_IDS = [ACCESS_SECTION_ID, LIMITS_SECTION_ID];

const can = useCan();
const toast = useToast();
const message = useMessage();
const route = useRoute();
const uiStore = useUIStore();

const canEdit = computed(() => can('instance:settings:edit'));
const isDark = computed(() => uiStore.appliedTheme === 'dark');

const plural = (count: number, one: string, many: string) =>
	`${formatNumber(count)} ${count === 1 ? one : many}`;

/* ── Sections ─────────────────────────────────────────────────────────── */

function scrollToSection(hash: string) {
	const id = hash.startsWith('#') ? hash.slice(1) : hash;
	if (!SECTION_IDS.includes(id)) return;
	document.getElementById(id)?.scrollIntoView({ block: 'start' });
}

onMounted(() => scrollToSection(route.hash));
watch(() => route.hash, scrollToSection, { flush: 'post' });

/* ── Let projects set their own access ────────────────────────────────── */

/** The projects a row names before the rest collapse into "+N more". */
const OVERRIDING_SHOWN = 5;

const projectsDecide = computed(() => store.instance.allowProjects.access);
const overriding = computed(() => projectsOverriding('access'));
const overridingShown = computed(() => overriding.value.slice(0, OVERRIDING_SHOWN));
const overridingMore = computed(() => overriding.value.length - overridingShown.value.length);

const overridingLabel = computed(() => {
	if (!projectsDecide.value) {
		return 'Every project follows the instance rules. A type left for projects to opt in stays off.';
	}
	const count = overriding.value.length;
	if (count === 0) return 'No project sets its own access yet.';
	return `${plural(count, 'project sets its own', 'projects set their own')}:`;
});

async function onAllowProjectsChange(allow: boolean) {
	if (!canEdit.value || allow === projectsDecide.value) return;

	if (!allow) {
		const count = overriding.value.length;
		const answer = await message.confirm(
			count > 0
				? `${plural(count, 'project sets its own access', 'projects set their own access')}. Turning this off removes their changes, and every project follows the instance rules.`
				: "Project admins can't restrict or enable nodes and credential types while this is off. Every project follows the instance rules.",
			'Stop projects from setting their own access?',
			{ confirmButtonText: 'Turn off', cancelButtonText: 'Cancel' },
		);
		if (answer !== 'confirm') return;
	}

	setAllowProjects('access', allow);
	toast.showMessage({
		title: allow
			? 'Projects can set their own access'
			: 'Every project now follows the instance rules',
		type: 'success',
	});
}

/* ── Instance rules ───────────────────────────────────────────────────── */

interface PolicyRow {
	id: string;
	name: string;
	/** Only node types have one. */
	category: string | undefined;
	iconUrl: string | undefined;
	glyph: string;
	rule: InstanceRule;
	/** Projects whose own choice for this type is in effect. */
	changedBy: number;
}

const RULES: Array<{ value: InstanceRule; label: string; description: string }> = [
	{ value: 'allowed', label: 'Allowed', description: 'Every project can use it' },
	{ value: 'restricted', label: 'Restricted', description: 'No project can use it' },
	{ value: 'opt-in', label: 'Projects opt in', description: 'Off until a project enables it' },
];

const RULE_TOASTS: Record<InstanceRule, (name: string) => string> = {
	allowed: (name) => `${name} allowed in every project`,
	restricted: (name) => `${name} restricted in every project`,
	'opt-in': (name) => `${name} left for projects to enable`,
};

/** How the copy names one type, and several, of each kind. */
const KIND_NOUNS: Record<AccessKind, { one: string; many: string }> = {
	node: { one: 'node', many: 'nodes' },
	credential: { one: 'credential type', many: 'credential types' },
};

const FALLBACK_GLYPHS: Record<AccessKind, string> = {
	node: 'box',
	credential: 'key-round',
};

const KIND_OPTIONS: Array<SegmentOption<AccessKind>> = [
	{ value: 'node', label: 'Nodes', data: { count: NODE_TYPES.length } },
	{ value: 'credential', label: 'Credentials', data: { count: CREDENTIAL_TYPES.length } },
];

const kind = ref<AccessKind>('node');
const typeSearch = ref('');

/** The file for the theme on show. A missing file falls back to the glyph. */
function iconUrlFor(icon: CatalogIcon): string | undefined {
	if (isDark.value && icon.darkFile) return icon.darkFile;
	return icon.file ? icon.file : undefined;
}

/**
 * Only the projects that set anything for themselves are read, and a
 * restricted type has nothing a project could have changed.
 */
function changedByFor(rowKind: AccessKind, typeId: string, rule: InstanceRule): number {
	if (rule === 'restricted') return 0;
	return overriding.value.filter(
		(project) =>
			resolveAccess(rule, projectAccessFlags(project.id, rowKind, typeId), projectsDecide.value)
				.source === 'project',
	).length;
}

function buildRow(
	rowKind: AccessKind,
	type: { id: string; name: string; icon: CatalogIcon },
	category: string | undefined,
): PolicyRow {
	const rule = instanceRule(rowKind, type.id);
	return {
		id: type.id,
		name: type.name,
		category,
		iconUrl: iconUrlFor(type.icon),
		glyph: type.icon.glyph ?? FALLBACK_GLYPHS[rowKind],
		rule,
		changedBy: changedByFor(rowKind, type.id, rule),
	};
}

const byName = (a: PolicyRow, b: PolicyRow) => a.name.localeCompare(b.name);

const nodeRows = computed(() =>
	NODE_TYPES.map((type) => buildRow('node', type, type.category)).sort(byName),
);

const credentialRows = computed(() =>
	CREDENTIAL_TYPES.map((type) => buildRow('credential', type, undefined)).sort(byName),
);

const rows = computed(() => (kind.value === 'node' ? nodeRows.value : credentialRows.value));

const typeQuery = computed(() => typeSearch.value.trim().toLowerCase());

const visibleRows = computed(() =>
	rows.value.filter(
		(row) =>
			!typeQuery.value ||
			row.name.toLowerCase().includes(typeQuery.value) ||
			(row.category?.toLowerCase().includes(typeQuery.value) ?? false),
	),
);

/** What the instance changed from the default: "3 restricted, 5 for projects to enable". */
const rulesSummary = computed(() => {
	const restricted = rows.value.filter((row) => row.rule === 'restricted').length;
	const optIn = rows.value.filter((row) => row.rule === 'opt-in').length;

	const parts: string[] = [];
	if (restricted > 0) parts.push(`${formatNumber(restricted)} restricted`);
	if (optIn > 0) parts.push(`${formatNumber(optIn)} for projects to enable`);
	return parts.length > 0
		? parts.join(', ')
		: `Every ${KIND_NOUNS[kind.value].one} is allowed in every project`;
});

const typesShownLabel = computed(() =>
	visibleRows.value.length === rows.value.length
		? undefined
		: `${formatNumber(visibleRows.value.length)} of ${formatNumber(rows.value.length)} shown`,
);

const changedLabel = (count: number) => `${plural(count, 'project', 'projects')} changed this`;

function onRuleChange(row: PolicyRow, value: unknown) {
	const rule = RULES.find((entry) => entry.value === value)?.value;
	if (!canEdit.value || !rule || rule === row.rule) return;
	setInstanceRule(kind.value, row.id, rule);
	toast.showMessage({ title: RULE_TOASTS[rule](row.name), type: 'success' });
}

/* ── Instance limits ──────────────────────────────────────────────────── */

interface LimitField {
	id: string;
	key: keyof InstanceLimits;
	title: string;
	description: string;
	/** What an empty field means. */
	placeholder: string;
	max: number | undefined;
	unit: string | undefined;
}

const LIMIT_FIELDS: LimitField[] = [
	{
		id: 'proto-policies-limit-monthly',
		key: 'monthlyExecutions',
		title: 'Monthly executions',
		description:
			'Production executions all projects together can run each calendar month. Leave empty for no limit.',
		placeholder: 'No limit',
		max: undefined,
		unit: undefined,
	},
	{
		id: 'proto-policies-limit-concurrency',
		key: 'concurrency',
		title: 'Concurrency',
		description:
			'Production executions the instance can run at the same time. Leave empty for no limit.',
		placeholder: 'No limit',
		max: undefined,
		unit: undefined,
	},
	{
		id: 'proto-policies-limit-alert',
		key: 'alertAtPercent',
		title: 'Alert at',
		description:
			'Instance admins get an email when this much of a monthly limit is used. Leave empty to send no alert.',
		placeholder: 'No alert',
		max: 100,
		unit: '%',
	},
];

/** An emptied number field reports `undefined`. The store's "no limit" is `null`. */
const toLimit = (value: number | null | undefined): number | null =>
	typeof value === 'number' && Number.isFinite(value) ? value : null;

const savedLimits = computed(() => store.instance.limits);

/** Edits stay here until the person saves them. */
const limitsDraft = ref<InstanceLimits>({ ...savedLimits.value });

function resetLimitsDraft() {
	limitsDraft.value = { ...savedLimits.value };
}

watch([savedLimits, canEdit], resetLimitsDraft);

const limitsDirty = computed(
	() =>
		canEdit.value &&
		LIMIT_FIELDS.some(({ key }) => limitsDraft.value[key] !== savedLimits.value[key]),
);

function onLimitInput(key: keyof InstanceLimits, value: number | null | undefined) {
	limitsDraft.value[key] = toLimit(value);
}

function saveLimits() {
	if (!limitsDirty.value) return;
	setInstanceLimits({ ...limitsDraft.value });
	resetLimitsDraft();
	toast.showMessage({ title: 'Instance limits saved', type: 'success' });
}

/* ── Limits per project ───────────────────────────────────────────────── */

const PAGE_SIZE = 10;

interface LimitRow {
	project: Project;
	to: string;
	used: number;
	/** The project's own limits. `null` follows the instance. */
	monthlyLimit: number | null;
	concurrencyLimit: number | null;
	/** Whole percent of the project's own monthly limit used. 0 without one. */
	percent: number;
	/** At or past the share of a limit that alerts instance admins. */
	atAlert: boolean;
}

const projectSearch = ref('');
const page = ref(1);
const tableTop = useTemplateRef<HTMLElement>('tableTop');

/** A short list needs no search. A search in use stays, so it can be cleared. */
const showProjectSearch = computed(
	() => projects.value.length > PAGE_SIZE || projectSearch.value !== '',
);

const filteredProjects = computed(() => {
	const query = projectSearch.value.trim().toLowerCase();
	if (!query) return projects.value;
	return projects.value.filter((project) => project.name.toLowerCase().includes(query));
});

const pageCount = computed(() => Math.max(1, Math.ceil(filteredProjects.value.length / PAGE_SIZE)));

watch(projectSearch, () => {
	page.value = 1;
});

// The list can shrink under the current page, for example when the project count changes.
watch(pageCount, (count) => {
	if (page.value > count) page.value = count;
});

const pageStart = computed(() => (page.value - 1) * PAGE_SIZE);

const projectCountLabel = computed(() => {
	const total = projects.value.length;
	const shown = filteredProjects.value.length;
	return shown === total
		? plural(total, 'project', 'projects')
		: `${formatNumber(shown)} of ${plural(total, 'project', 'projects')}`;
});

const rangeLabel = computed(() => {
	const total = filteredProjects.value.length;
	const first = pageStart.value + 1;
	const last = Math.min(pageStart.value + PAGE_SIZE, total);
	return `${formatNumber(first)}-${formatNumber(last)} of ${formatNumber(total)}`;
});

function goToPage(next: number) {
	page.value = next;
	tableTop.value?.scrollIntoView({ block: 'nearest' });
}

function toLimitRow(project: Project): LimitRow {
	const { limits, usage } = projectState(project.id);
	const used = usage.executionsThisMonth;
	const limit = limits.monthlyExecutions;
	const share = limit === null ? 0 : (used / Math.max(limit, 1)) * 100;
	const alertAt = savedLimits.value.alertAtPercent;

	return {
		project,
		to: projectPagePath(project.id, 'execution-limits'),
		used,
		monthlyLimit: limit,
		concurrencyLimit: limits.concurrency,
		percent: Math.floor(share),
		atAlert: limit !== null && alertAt !== null && share >= alertAt,
	};
}

/** Only the visible page: at most 10 projects have their limits read per render. */
const limitRows = computed(() =>
	filteredProjects.value.slice(pageStart.value, pageStart.value + PAGE_SIZE).map(toLimitRow),
);

/** Under the usage of a project without a monthly limit of its own. */
const sharedNote = computed(() =>
	savedLimits.value.monthlyExecutions === null ? 'No limit' : 'Shares the instance limit',
);

const alertHint = (row: LimitRow) =>
	`${formatNumber(row.percent)}% of the monthly limit used. Instance admins get an email at ${savedLimits.value.alertAtPercent ?? 0}%.`;

/** A project's limit saves when the field is left or Enter is pressed. */
function onProjectLimitChange(
	row: LimitRow,
	field: keyof ProjectLimits,
	value: number | null | undefined,
) {
	const current: ProjectLimits = {
		monthlyExecutions: row.monthlyLimit,
		concurrency: row.concurrencyLimit,
	};
	const limit = toLimit(value);
	if (!canEdit.value || limit === current[field]) return;

	setProjectLimits(row.project.id, { ...current, [field]: limit });
	toast.showMessage({ title: `Limits saved for ${row.project.name}`, type: 'success' });
}
</script>

<template>
	<N8nSettingsLayout data-test-id="proto-policies-page">
		<N8nSettingsPageHeader
			title="Project policies"
			description="These rules apply to every project, and a project can adjust only what you allow."
			:show-docs-link="false"
		/>

		<N8nCallout
			v-if="!canEdit"
			theme="secondary"
			icon="lock"
			data-test-id="proto-policies-read-only-callout"
		>
			Only instance owners and admins can change project policies.
		</N8nCallout>

		<N8nSettingsSection
			:id="ACCESS_SECTION_ID"
			title="Node and credential policies"
			description="The nodes and credential types projects can use in their workflows."
			:class="$style.section"
			data-test-id="proto-policies-access-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					title="Let projects set their own access"
					description="Project admins can restrict what you allow, and enable what you leave for projects to opt in. They can't use what you restrict."
				>
					<template #action>
						<N8nSwitch
							:model-value="projectsDecide"
							:disabled="!canEdit"
							aria-label="Let projects set their own access"
							data-test-id="proto-policies-allow-projects-switch"
							@update:model-value="onAllowProjectsChange"
						/>
					</template>
				</N8nSettingsRow>
				<N8nSettingsRow layout="custom" data-test-id="proto-policies-overriding">
					<div :class="$style.overriding">
						<N8nText size="small" color="text-light" data-test-id="proto-policies-overriding-count">
							{{ overridingLabel }}
						</N8nText>
						<ul v-if="overridingShown.length > 0" :class="$style.projectLinks">
							<li v-for="project in overridingShown" :key="project.id">
								<RouterLink
									:to="projectPagePath(project.id, 'node-and-credential-access')"
									:class="$style.link"
									data-test-id="proto-policies-overriding-project"
								>
									{{ project.name }}
								</RouterLink>
							</li>
							<li
								v-if="overridingMore > 0"
								:class="$style.subtle"
								data-test-id="proto-policies-overriding-more"
							>
								+{{ formatNumber(overridingMore) }} more
							</li>
						</ul>
					</div>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<div :class="$style.block">
				<div :class="$style.toolbar">
					<N8nSegmentControl
						v-model="kind"
						:options="KIND_OPTIONS"
						aria-label="Type"
						data-test-id="proto-policies-kind"
					>
						<template #option="option">
							<span :class="$style.kindOption">
								{{ option.label }}
								<span :class="$style.kindCount">{{ option.data?.count }}</span>
							</span>
						</template>
					</N8nSegmentControl>
					<N8nInput
						v-model="typeSearch"
						:class="$style.typeSearch"
						size="medium"
						:placeholder="kind === 'node' ? 'Search nodes' : 'Search credential types'"
						:aria-label="kind === 'node' ? 'Search nodes' : 'Search credential types'"
						clearable
						data-test-id="proto-policies-type-search"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
				</div>

				<div :class="$style.summary">
					<N8nText size="small" color="text-base" data-test-id="proto-policies-rules-summary">
						{{ rulesSummary }}
					</N8nText>
					<N8nText v-if="typesShownLabel" size="small" color="text-light">
						{{ typesShownLabel }}
					</N8nText>
				</div>

				<ul
					v-if="visibleRows.length > 0"
					:class="$style.list"
					data-test-id="proto-policies-type-list"
				>
					<li
						v-for="row in visibleRows"
						:key="`${kind}:${row.id}`"
						:class="$style.row"
						:data-test-id="`proto-policies-type-row-${row.id}`"
						:data-rule="row.rule"
					>
						<span :class="$style.icon" aria-hidden="true">
							<img v-if="row.iconUrl" :class="$style.iconImage" :src="row.iconUrl" alt="" />
							<N8nIcon v-else :icon="row.glyph" size="large" />
						</span>

						<div :class="$style.main">
							<N8nText :class="$style.name" bold color="text-dark">{{ row.name }}</N8nText>
							<N8nText v-if="row.category" size="small" color="text-light">
								{{ row.category }}
							</N8nText>
						</div>

						<span :class="$style.changed">
							<N8nText
								v-if="row.changedBy > 0"
								size="small"
								color="text-light"
								data-test-id="proto-policies-type-changed"
							>
								{{ changedLabel(row.changedBy) }}
							</N8nText>
						</span>

						<N8nSelect
							:model-value="row.rule"
							:class="$style.ruleSelect"
							size="small"
							:disabled="!canEdit"
							:aria-label="`Instance rule for ${row.name}`"
							data-test-id="proto-policies-rule-select"
							@update:model-value="onRuleChange(row, $event)"
						>
							<N8nOption
								v-for="rule in RULES"
								:key="rule.value"
								:value="rule.value"
								:label="rule.label"
								:class="$style.ruleOption"
							>
								<div :class="$style.ruleOptionText">
									<N8nText bold color="text-dark">{{ rule.label }}</N8nText>
									<N8nText size="small" color="text-light">{{ rule.description }}</N8nText>
								</div>
							</N8nOption>
						</N8nSelect>
					</li>
				</ul>
				<div v-else :class="$style.empty" data-test-id="proto-policies-type-empty">
					<N8nText size="small" color="text-light">
						No {{ KIND_NOUNS[kind].many }} match. Try a different search.
					</N8nText>
				</div>
			</div>
		</N8nSettingsSection>

		<N8nSettingsSection
			:id="LIMITS_SECTION_ID"
			title="Execution limits"
			description="How many production executions the instance and each project can run."
			:class="$style.section"
			data-test-id="proto-policies-limits-section"
		>
			<N8nSettingsRowGroup>
				<N8nSettingsRow v-for="field in LIMIT_FIELDS" :key="field.id">
					<template #info>
						<label :for="field.id">
							<N8nText bold size="medium" color="text-dark">{{ field.title }}</N8nText>
						</label>
						<N8nText size="small" color="text-light">{{ field.description }}</N8nText>
					</template>
					<template #action>
						<div :class="$style.limitField">
							<N8nInputNumber
								:id="field.id"
								:model-value="limitsDraft[field.key]"
								:min="1"
								:max="field.max"
								:precision="0"
								:controls="false"
								use-grouping
								:disabled="!canEdit"
								:placeholder="field.placeholder"
								:data-test-id="field.id"
								@update:model-value="onLimitInput(field.key, $event)"
							/>
							<N8nText v-if="field.unit" size="small" color="text-light" aria-hidden="true">
								{{ field.unit }}
							</N8nText>
						</div>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>

			<div
				:class="[$style.block, $style.projectLimits]"
				data-test-id="proto-policies-project-limits"
			>
				<div :class="$style.blockHeader">
					<N8nHeading tag="h3" step="sm" color="text-dark" bold>Limits per project</N8nHeading>
					<N8nText size="small" color="text-base">
						A project with an empty field follows the instance. A change saves when you leave the
						field.
					</N8nText>
				</div>

				<div
					v-if="projects.length === 0"
					:class="$style.empty"
					data-test-id="proto-policies-no-projects"
				>
					<N8nText size="small" color="text-light">No team projects yet.</N8nText>
				</div>

				<template v-else>
					<div ref="tableTop" :class="$style.toolbar">
						<N8nInput
							v-if="showProjectSearch"
							v-model="projectSearch"
							:class="$style.projectSearch"
							size="medium"
							clearable
							placeholder="Search by project name"
							aria-label="Search projects"
							data-test-id="proto-policies-project-search"
						>
							<template #prefix>
								<N8nIcon icon="search" />
							</template>
						</N8nInput>
						<N8nText
							:class="$style.count"
							size="small"
							color="text-light"
							role="status"
							data-test-id="proto-policies-project-count"
						>
							{{ projectCountLabel }}
						</N8nText>
					</div>

					<div :class="$style.tableWrap">
						<table
							v-if="limitRows.length > 0"
							:class="$style.table"
							data-test-id="proto-policies-project-table"
						>
							<colgroup>
								<col />
								<col :class="$style.colExecutions" />
								<col :class="$style.colLimit" />
								<col :class="$style.colLimit" />
							</colgroup>
							<thead>
								<tr>
									<th scope="col">Project</th>
									<th scope="col">Executions this month</th>
									<th scope="col">Monthly limit</th>
									<th scope="col">Concurrency</th>
								</tr>
							</thead>
							<tbody>
								<tr
									v-for="row in limitRows"
									:key="row.project.id"
									:data-project-id="row.project.id"
									data-test-id="proto-policies-project-row"
								>
									<td>
										<div :class="$style.project">
											<ProjectIcon
												:icon="row.project.icon"
												size="small"
												:class="$style.projectIcon"
											/>
											<RouterLink
												:to="row.to"
												:class="$style.projectName"
												:title="row.project.name"
												data-test-id="proto-policies-project-name"
											>
												{{ row.project.name }}
											</RouterLink>
										</div>
									</td>

									<td>
										<div v-if="row.monthlyLimit !== null" :class="$style.usage">
											<span :class="[$style.usageText, { [$style.warning]: row.atAlert }]">
												<N8nTooltip v-if="row.atAlert" :content="alertHint(row)" placement="top">
													<N8nIcon icon="triangle-alert" size="small" :class="$style.usageIcon" />
												</N8nTooltip>
												{{ formatNumber(row.used) }} of {{ formatNumber(row.monthlyLimit) }}
											</span>
											<progress
												:class="[$style.progress, { [$style.progressWarning]: row.atAlert }]"
												:value="Math.min(row.used, row.monthlyLimit)"
												:max="Math.max(row.monthlyLimit, 1)"
												:aria-label="`${row.percent}% of the monthly limit used`"
											/>
										</div>
										<div v-else :class="$style.usage">
											<span :class="$style.usageText">{{ formatNumber(row.used) }}</span>
											<span :class="$style.subtle">{{ sharedNote }}</span>
										</div>
									</td>

									<td>
										<label :for="`proto-policies-monthly-${row.project.id}`" :class="$style.srOnly">
											Monthly limit for {{ row.project.name }}
										</label>
										<N8nInputNumber
											:id="`proto-policies-monthly-${row.project.id}`"
											:model-value="row.monthlyLimit"
											size="small"
											:min="1"
											:precision="0"
											:controls="false"
											use-grouping
											:disabled="!canEdit"
											placeholder="Follows instance"
											data-test-id="proto-policies-project-monthly"
											@update:model-value="onProjectLimitChange(row, 'monthlyExecutions', $event)"
										/>
									</td>

									<td>
										<label
											:for="`proto-policies-concurrency-${row.project.id}`"
											:class="$style.srOnly"
										>
											Concurrency for {{ row.project.name }}
										</label>
										<N8nInputNumber
											:id="`proto-policies-concurrency-${row.project.id}`"
											:model-value="row.concurrencyLimit"
											size="small"
											:min="1"
											:precision="0"
											:controls="false"
											use-grouping
											:disabled="!canEdit"
											placeholder="Follows instance"
											data-test-id="proto-policies-project-concurrency"
											@update:model-value="onProjectLimitChange(row, 'concurrency', $event)"
										/>
									</td>
								</tr>
							</tbody>
						</table>

						<div v-else :class="$style.noResults" data-test-id="proto-policies-project-no-results">
							<N8nText size="small" color="text-light">
								No projects match. Try a different name.
							</N8nText>
						</div>
					</div>

					<div v-if="filteredProjects.length > PAGE_SIZE" :class="$style.footer">
						<N8nText size="small" color="text-light" data-test-id="proto-policies-project-range">
							{{ rangeLabel }}
						</N8nText>
						<N8nPagination
							:page="page"
							:total="filteredProjects.length"
							:items-per-page="PAGE_SIZE"
							:show-total="false"
							:show-sizes="false"
							size="small"
							data-test-id="proto-policies-project-pagination"
							@update:page="goToPage"
						/>
					</div>
				</template>
			</div>
		</N8nSettingsSection>

		<N8nSettingsSaveBar
			floating
			:visible="limitsDirty"
			message="Unsaved changes to instance limits"
			@save="saveLimits"
			@discard="resetLimitsDraft"
		/>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

/* A link to a section leaves room above its heading. */
.section {
	scroll-margin-block-start: var(--spacing--lg);
}

/* Everything in a section that isn't a row group: a toolbar and its list. */
.block {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-width: 0;
	margin-block-start: var(--spacing--2xs);
}

.projectLimits {
	margin-block-start: var(--spacing--sm);
}

.blockHeader {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);

	h3 {
		margin: 0;
	}
}

.subtle {
	color: var(--text-color--subtle);
	font-size: var(--font-size--2xs);
}

.srOnly {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
}

.link {
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-decoration-color: var(--border-color--stronger);
	text-underline-offset: var(--spacing--5xs);
	border-radius: var(--radius--4xs);

	&:hover {
		text-decoration-color: currentColor;
	}

	@include focus.focus-visible-ring-offset;
}

/* ── Projects that set their own ── */

.overriding {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--4xs) var(--spacing--2xs);
}

.projectLinks {
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: var(--spacing--4xs) var(--spacing--2xs);
	margin: 0;
	padding: 0;
	list-style: none;

	li:not(:last-child)::after {
		content: ',';
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
	}
}

/* ── Instance rules ── */

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.kindOption {
	display: inline-flex;
	align-items: baseline;
	gap: var(--spacing--3xs);
}

.kindCount {
	color: var(--text-color--subtler);
	font-variant-numeric: tabular-nums;
}

.typeSearch {
	flex: 1 1 var(--spacing--5xl);
	min-width: 0;
	margin-inline-start: auto;
	max-width: calc(var(--spacing--5xl) * 1.25);
}

.summary {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

/*
 * One grid for the whole list, so the count and the rule line up in every row.
 * The list scrolls inside itself, which keeps the limits below within reach.
 */
.list {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto;
	max-height: calc(var(--height--3xl) * 8.5);
	margin: 0;
	padding: 0;
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	list-style: none;
	overflow-y: auto;
}

.row {
	display: grid;
	grid-column: 1 / -1;
	grid-template-columns: subgrid;
	align-items: center;
	column-gap: var(--spacing--sm);
	min-height: var(--height--3xl);
	padding: var(--spacing--2xs) var(--spacing--sm);

	& + & {
		border-block-start: var(--border);
		border-block-start-color: var(--border-color--subtle);
	}
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
	color: var(--text-color--subtle);
}

.iconImage {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.main {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.changed {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}

.ruleSelect {
	width: 10rem;
}

/* Two lines an option: n8n's select reads its padding and line height from these. */
.ruleOption {
	--select--option--padding: var(--spacing--2xs) var(--spacing--sm);
	--select--option--line-height: var(--line-height--md);
}

.ruleOptionText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.empty {
	padding: var(--spacing--lg) var(--spacing--sm);
	border: var(--border);
	border-color: var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	text-align: center;
}

/* ── Instance limits ── */

.limitField {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	width: 10rem;

	/* The input gives way to the unit, so both stay inside the row. */
	> :first-child {
		flex: 1;
		min-width: 0;
	}
}

/* ── Limits per project ── */

.projectSearch {
	flex: 0 1 18rem;
	min-width: 12rem;
}

.count {
	margin-inline-start: auto;
	white-space: nowrap;
}

.tableWrap {
	border: var(--border);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	overflow-x: auto;
}

.table {
	width: 100%;
	min-width: 38rem;
	border-collapse: collapse;
	table-layout: fixed;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	color: var(--text-color);

	th {
		padding: var(--spacing--2xs) var(--spacing--sm);
		border-bottom: var(--border);
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		text-align: start;
		white-space: nowrap;
	}

	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		border-bottom: var(--border);
		vertical-align: middle;
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover {
		background-color: var(--background--hover);
	}
}

.colExecutions {
	width: 12rem;
}

.colLimit {
	width: 10rem;
}

.project {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	min-width: 0;
}

.projectIcon {
	flex-shrink: 0;
}

.projectName {
	min-width: 0;
	overflow: hidden;
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
	text-decoration: none;
	text-overflow: ellipsis;
	white-space: nowrap;
	border-radius: var(--radius--4xs);

	&:hover {
		text-decoration: underline;
	}

	@include focus.focus-visible-ring-offset;
}

.usage {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.usageText {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
}

.usageIcon {
	display: block;
}

.warning {
	color: var(--text-color--warning);
}

.progress {
	--progress--color--track: var(--background--active);
	--progress--color--fill: var(--icon-color--strong);

	display: block;
	width: 100%;
	height: var(--spacing--4xs);
	overflow: hidden;
	appearance: none;
	border: none;
	border-radius: var(--radius--full);
	background-color: var(--progress--color--track);

	&::-webkit-progress-bar {
		background-color: var(--progress--color--track);
	}

	&::-webkit-progress-value {
		border-radius: var(--radius--full);
		background-color: var(--progress--color--fill);
	}

	&::-moz-progress-bar {
		border-radius: var(--radius--full);
		background-color: var(--progress--color--fill);
	}
}

.progressWarning {
	--progress--color--fill: var(--icon-color--warning);
}

.noResults {
	padding: var(--spacing--lg) var(--spacing--sm);
	text-align: center;
}

.footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}
</style>

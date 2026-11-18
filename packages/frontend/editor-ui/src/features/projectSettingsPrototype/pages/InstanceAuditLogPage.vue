<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nAvatar,
	N8nBadge,
	N8nButton,
	N8nIcon,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useUsersStore } from '@n8n/stores/users.store';
import { AUDIT_CATEGORY_LABELS } from '@/features/projectSettingsPrototype/data/audit';
import {
	formatDateTime,
	formatNumber,
	formatRelative,
} from '@/features/projectSettingsPrototype/data/time';
import type {
	AuditCategory,
	AuditEvent,
	Project,
} from '@/features/projectSettingsPrototype/data/types';
import {
	CURRENT_USER_ID,
	fullName,
	userById,
} from '@/features/projectSettingsPrototype/data/users';
import { projectPagePath } from '@/features/projectSettingsPrototype/nav/model';
import {
	projectById,
	projects,
	seedKey,
	store,
} from '@/features/projectSettingsPrototype/state/store';

/**
 * Settings › Audit log: every change to instance settings and to any project,
 * newest first. Read-only.
 */

type CategoryFilter = AuditCategory | 'all';
type ScopeFilter = 'all' | 'instance' | 'projects';

const CATEGORIES: Array<{ value: CategoryFilter; label: string }> = [
	{ value: 'all', label: 'All categories' },
	...(Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((value) => ({
		value,
		label: AUDIT_CATEGORY_LABELS[value],
	})),
];

const SCOPES: Array<{ value: ScopeFilter; label: string }> = [
	{ value: 'all', label: 'Everything' },
	{ value: 'instance', label: 'Instance only' },
	{ value: 'projects', label: 'Projects only' },
];

const PAGE_SIZE = 50;

const usersStore = useUsersStore();

/* ── Who ──────────────────────────────────────────────────────────────── */

interface Person {
	firstName: string;
	lastName: string;
	name: string;
}

/** The fixtures' current user stands for whoever is signed in. */
const signedIn = computed<Person | undefined>(() => {
	const user = usersStore.currentUser;
	if (!user) return undefined;
	const firstName = user.firstName ?? '';
	const lastName = user.lastName ?? '';
	const name = `${firstName} ${lastName}`.trim();
	if (name) return { firstName, lastName, name };
	// No name yet: the email is the name, and gives the avatar its initials.
	return user.email ? { firstName: user.email, lastName: '', name: user.email } : undefined;
});

function personOf(actorId: string): Person {
	if (actorId === CURRENT_USER_ID && signedIn.value) return signedIn.value;
	const user = userById(actorId);
	return { firstName: user.firstName, lastName: user.lastName, name: fullName(user) };
}

/* ── Where ────────────────────────────────────────────────────────────── */

/** Seeded events name a fixture project by the slug of its name. Session events carry the real id. */
const projectsBySeedKey = computed(
	() => new Map(projects.value.map((project) => [seedKey(project.id), project])),
);

function projectOf(projectId: string): Project | undefined {
	return projectById(projectId) ?? projectsBySeedKey.value.get(projectId);
}

/* ── Events ───────────────────────────────────────────────────────────── */

interface Row {
	event: AuditEvent;
	actor: Person;
	/** Missing for instance events, and for a project this instance doesn't have. */
	project: Project | undefined;
	/** What the Where column reads. */
	where: string;
	/** Everything the search looks through, in lower case. */
	haystack: string;
}

const allRows = computed<Row[]>(() =>
	store.audit.map((event) => {
		const actor = personOf(event.actorId);
		const project = event.projectId === undefined ? undefined : projectOf(event.projectId);
		const where = project?.name ?? event.projectId ?? 'Instance';
		return {
			event,
			actor,
			project,
			where,
			haystack: [event.action, event.target, actor.name, where].join(' ').toLowerCase(),
		};
	}),
);

/* ── Search, filters, pages ───────────────────────────────────────────── */

const search = ref('');
const category = ref<CategoryFilter>('all');
const scope = ref<ScopeFilter>('all');
const shown = ref(PAGE_SIZE);

const hasFilters = computed(
	() => search.value.trim() !== '' || category.value !== 'all' || scope.value !== 'all',
);

const filtered = computed(() => {
	const query = search.value.trim().toLowerCase();
	return allRows.value.filter((row) => {
		if (category.value !== 'all' && row.event.category !== category.value) return false;
		if (scope.value === 'instance' && row.event.projectId !== undefined) return false;
		if (scope.value === 'projects' && row.event.projectId === undefined) return false;
		return query === '' || row.haystack.includes(query);
	});
});

watch([search, category, scope], () => {
	shown.value = PAGE_SIZE;
});

const rows = computed(() => filtered.value.slice(0, shown.value));
const hasMore = computed(() => filtered.value.length > shown.value);

const countLabel = computed(() => {
	const total = filtered.value.length;
	return `Showing ${formatNumber(rows.value.length)} of ${formatNumber(total)} ${total === 1 ? 'event' : 'events'}`;
});

const emptyCopy = computed(() =>
	store.audit.length === 0
		? {
				title: 'No changes yet',
				text: 'Changes to instance settings and to projects show up here.',
			}
		: {
				title: 'No matching events',
				text: 'Try another search, category, or scope.',
			},
);

function showMore() {
	shown.value += PAGE_SIZE;
}

function clearFilters() {
	search.value = '';
	category.value = 'all';
	scope.value = 'all';
}

const isoTime = (timestamp: number) => new Date(timestamp).toISOString();
</script>

<template>
	<N8nSettingsLayout full-width data-test-id="proto-instance-audit-log-page">
		<N8nSettingsPageHeader
			title="Audit log"
			description="Changes to instance settings and to every project."
			:show-docs-link="false"
		/>

		<div :class="$style.body">
			<div :class="$style.toolbar">
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					clearable
					placeholder="Search by action, person, or project"
					aria-label="Search the audit log"
					data-test-id="proto-instance-audit-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>

				<N8nSelect
					v-model="category"
					:class="$style.filter"
					size="medium"
					aria-label="Filter by category"
					data-test-id="proto-instance-audit-category"
				>
					<N8nOption
						v-for="option in CATEGORIES"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>

				<N8nSelect
					v-model="scope"
					:class="$style.scope"
					size="medium"
					aria-label="Filter by where the change was made"
					data-test-id="proto-instance-audit-scope"
				>
					<N8nOption
						v-for="option in SCOPES"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
			</div>

			<div :class="$style.tableWrap">
				<table
					v-if="rows.length > 0"
					:class="$style.table"
					data-test-id="proto-instance-audit-table"
				>
					<colgroup>
						<col :class="$style.colWhen" />
						<col :class="$style.colWho" />
						<col />
						<col :class="$style.colWhere" />
						<col :class="$style.colCategory" />
					</colgroup>
					<thead>
						<tr>
							<th scope="col">When</th>
							<th scope="col">Who</th>
							<th scope="col">What</th>
							<th scope="col">Where</th>
							<th scope="col">Category</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in rows"
							:key="row.event.id"
							:data-event-id="row.event.id"
							data-test-id="proto-instance-audit-row"
						>
							<td :class="$style.when">
								<N8nTooltip :content="formatDateTime(row.event.at)" placement="top">
									<time :datetime="isoTime(row.event.at)">{{ formatRelative(row.event.at) }}</time>
								</N8nTooltip>
							</td>

							<td>
								<div :class="$style.person">
									<N8nAvatar
										:first-name="row.actor.firstName"
										:last-name="row.actor.lastName"
										size="xsmall"
										:class="$style.avatar"
									/>
									<span :class="$style.truncate" :title="row.actor.name">{{ row.actor.name }}</span>
								</div>
							</td>

							<td>
								{{ row.event.action }}
								<span :class="$style.target">{{ row.event.target }}</span>
							</td>

							<td>
								<RouterLink
									v-if="row.project"
									:to="projectPagePath(row.project.id, 'audit-log')"
									:class="[$style.link, $style.truncate]"
									:title="row.project.name"
									data-test-id="proto-instance-audit-project-link"
								>
									{{ row.project.name }}
								</RouterLink>
								<span v-else :class="[$style.subtle, $style.truncate]" :title="row.where">
									{{ row.where }}
								</span>
							</td>

							<td>
								<N8nBadge variant="subtle" size="xsmall">
									{{ AUDIT_CATEGORY_LABELS[row.event.category] }}
								</N8nBadge>
							</td>
						</tr>
					</tbody>
				</table>

				<div v-else :class="$style.empty" data-test-id="proto-instance-audit-no-results">
					<N8nIcon icon="search" size="xlarge" color="text-light" />
					<N8nText tag="p" bold color="text-dark">{{ emptyCopy.title }}</N8nText>
					<N8nText tag="p" size="small" color="text-light">{{ emptyCopy.text }}</N8nText>
					<N8nButton
						v-if="hasFilters"
						variant="outline"
						size="small"
						:class="$style.emptyAction"
						data-test-id="proto-instance-audit-clear-filters"
						@click="clearFilters"
					>
						Clear filters
					</N8nButton>
				</div>
			</div>

			<div v-if="rows.length > 0" :class="$style.footer">
				<N8nText
					size="small"
					color="text-light"
					role="status"
					data-test-id="proto-instance-audit-count"
				>
					{{ countLabel }}
				</N8nText>
				<N8nButton
					v-if="hasMore"
					variant="outline"
					size="small"
					data-test-id="proto-instance-audit-show-more"
					@click="showMore"
				>
					Show more
				</N8nButton>
			</div>
		</div>
	</N8nSettingsLayout>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
	min-width: 0;
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--xs);
}

.search {
	flex: 0 1 20rem;
	min-width: 12rem;
}

.filter {
	flex: 0 0 15rem;
	width: 15rem;
}

.scope {
	flex: 0 0 10rem;
	width: 10rem;
}

/* ── Table ── */

.tableWrap {
	border: var(--border);
	border-radius: var(--radius--md);
	background-color: var(--background--surface);
	overflow-x: auto;
}

.table {
	width: 100%;
	min-width: 56rem;
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

.colWhen {
	width: 9rem;
}

.colWho {
	width: 13rem;
}

.colWhere {
	width: 14rem;
}

.colCategory {
	width: 13rem;
}

.when {
	color: var(--text-color--subtle);
	white-space: nowrap;
}

.subtle {
	color: var(--text-color--subtle);
}

.truncate {
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ── Who ── */

.person {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.avatar {
	flex-shrink: 0;
}

/* ── What ── */

.target {
	font-weight: var(--font-weight--medium);
}

/* ── Where ── */

.link {
	width: fit-content;
	color: var(--text-color);
	text-decoration: underline;
	text-decoration-color: var(--border-color--stronger);
	text-underline-offset: var(--spacing--5xs);
	border-radius: var(--radius--4xs);

	&:hover {
		text-decoration-color: currentColor;
	}

	@include focus.focus-visible-ring-offset;
}

/* ── No matches ── */

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	padding: var(--spacing--2xl) var(--spacing--lg);
	text-align: center;

	p {
		margin: 0;
	}
}

.emptyAction {
	margin-block-start: var(--spacing--xs);
}

/* ── Count and more ── */

.footer {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
}
</style>

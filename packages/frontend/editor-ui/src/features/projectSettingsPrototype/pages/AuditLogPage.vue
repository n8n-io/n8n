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
import type { AuditCategory, AuditEvent } from '@/features/projectSettingsPrototype/data/types';
import {
	CURRENT_USER_ID,
	fullName,
	userById,
} from '@/features/projectSettingsPrototype/data/users';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import { auditEventsFor } from '@/features/projectSettingsPrototype/state/store';

const props = defineProps<{ projectId: string }>();

const PAGE_SIZE = 25;
const ALL_CATEGORIES = 'all';

type CategoryFilter = AuditCategory | typeof ALL_CATEGORIES;

const CATEGORY_OPTIONS = (Object.keys(AUDIT_CATEGORY_LABELS) as AuditCategory[]).map((id) => ({
	id,
	label: AUDIT_CATEGORY_LABELS[id],
}));

const can = useCan();
const usersStore = useUsersStore();

const search = ref('');
const category = ref<CategoryFilter>(ALL_CATEGORIES);
const shownCount = ref(PAGE_SIZE);

interface Actor {
	firstName: string;
	lastName: string;
	name: string;
}

/** The fixtures' current user stands for whoever is signed in. */
function actorFor(userId: string): Actor {
	const fixture = userById(userId);
	const signedIn = userId === CURRENT_USER_ID ? usersStore.currentUser : null;
	if (!signedIn) {
		return { firstName: fixture.firstName, lastName: fixture.lastName, name: fullName(fixture) };
	}
	const firstName = signedIn.firstName ?? '';
	const lastName = signedIn.lastName ?? '';
	return {
		firstName,
		lastName,
		name: fullName({ firstName, lastName }).trim() || signedIn.email || fullName(fixture),
	};
}

interface Row {
	event: AuditEvent;
	actor: Actor;
	/** Lowercase, for the search. */
	text: string;
}

/** Newest first, as the store keeps them. */
const rows = computed<Row[]>(() =>
	auditEventsFor(props.projectId).map((event) => {
		const actor = actorFor(event.actorId);
		return {
			event,
			actor,
			text: `${event.action} ${event.target} ${actor.name}`.toLowerCase(),
		};
	}),
);

const isFiltering = computed(() => search.value.trim() !== '' || category.value !== ALL_CATEGORIES);

const matchingRows = computed(() => {
	const term = search.value.trim().toLowerCase();
	return rows.value.filter(
		(row) =>
			(category.value === ALL_CATEGORIES || row.event.category === category.value) &&
			row.text.includes(term),
	);
});

const shownRows = computed(() => matchingRows.value.slice(0, shownCount.value));
const hasMore = computed(() => matchingRows.value.length > shownRows.value.length);

const countLabel = computed(() => {
	const total = matchingRows.value.length;
	const noun = `${isFiltering.value ? 'matching ' : ''}event${total === 1 ? '' : 's'}`;
	return `Showing ${formatNumber(shownRows.value.length)} of ${formatNumber(total)} ${noun}`;
});

watch([search, category, () => props.projectId], () => {
	shownCount.value = PAGE_SIZE;
});

function showMore() {
	shownCount.value += PAGE_SIZE;
}

function clearFilters() {
	search.value = '';
	category.value = ALL_CATEGORIES;
}

const isoTime = (timestamp: number) => new Date(timestamp).toISOString();
</script>

<template>
	<div :class="$style.page" data-test-id="project-audit-log-page">
		<div v-if="rows.length > 0 || can('instance:settings:view')" :class="$style.toolbar">
			<div v-if="rows.length > 0" :class="$style.filters">
				<N8nInput
					v-model="search"
					:class="$style.search"
					size="medium"
					clearable
					placeholder="Search by change or person"
					aria-label="Search events"
					data-test-id="audit-log-search"
				>
					<template #prefix>
						<N8nIcon icon="search" size="small" />
					</template>
				</N8nInput>
				<N8nSelect
					v-model="category"
					:class="$style.category"
					size="medium"
					data-test-id="audit-log-category-select"
				>
					<N8nOption :value="ALL_CATEGORIES" label="All categories" />
					<N8nOption
						v-for="option in CATEGORY_OPTIONS"
						:key="option.id"
						:value="option.id"
						:label="option.label"
					/>
				</N8nSelect>
			</div>
			<RouterLink
				v-if="can('instance:settings:view')"
				to="/settings/audit-log"
				:class="$style.link"
				data-test-id="audit-log-instance-link"
			>
				View the instance audit log
			</RouterLink>
		</div>

		<div v-if="rows.length === 0" :class="$style.container" data-test-id="audit-log-empty">
			<div :class="$style.empty">
				<N8nIcon icon="scroll-text" size="xlarge" :class="$style.emptyIcon" />
				<N8nText tag="p" bold color="text-dark">No changes yet</N8nText>
				<N8nText tag="p" size="small" color="text-light">
					When someone changes this project's members or settings, the change shows up here.
				</N8nText>
			</div>
		</div>

		<div v-else :class="$style.container">
			<div
				v-if="matchingRows.length === 0"
				:class="$style.empty"
				data-test-id="audit-log-no-results"
			>
				<N8nText tag="p" bold color="text-dark">No events match your filters</N8nText>
				<N8nText tag="p" size="small" color="text-light">
					Try a different search or category.
				</N8nText>
				<N8nButton
					variant="outline"
					size="small"
					:class="$style.emptyAction"
					data-test-id="audit-log-clear-filters"
					@click="clearFilters"
				>
					Clear filters
				</N8nButton>
			</div>

			<template v-else>
				<div :class="$style.scroll">
					<table :class="$style.table" data-test-id="audit-log-table">
						<colgroup>
							<col :class="$style.whenColumn" />
							<col :class="$style.whoColumn" />
							<col />
							<col :class="$style.categoryColumn" />
						</colgroup>
						<thead>
							<tr>
								<th scope="col">When</th>
								<th scope="col">Who</th>
								<th scope="col">What</th>
								<th scope="col">Category</th>
							</tr>
						</thead>
						<tbody>
							<tr
								v-for="{ event, actor } in shownRows"
								:key="event.id"
								data-test-id="audit-log-row"
							>
								<td :class="$style.when">
									<N8nTooltip :content="formatDateTime(event.at)" placement="top">
										<time :datetime="isoTime(event.at)">{{ formatRelative(event.at) }}</time>
									</N8nTooltip>
								</td>
								<td>
									<span :class="$style.who">
										<N8nAvatar
											:first-name="actor.firstName"
											:last-name="actor.lastName"
											size="xsmall"
										/>
										<span :class="$style.whoName">{{ actor.name }}</span>
									</span>
								</td>
								<td>
									{{ event.action }}
									<span :class="$style.target">{{ event.target }}</span>
								</td>
								<td>
									<N8nBadge variant="subtle">{{ AUDIT_CATEGORY_LABELS[event.category] }}</N8nBadge>
								</td>
							</tr>
						</tbody>
					</table>
				</div>

				<div :class="$style.footer">
					<N8nText
						size="small"
						color="text-light"
						aria-live="polite"
						data-test-id="audit-log-count"
					>
						{{ countLabel }}
					</N8nText>
					<N8nButton
						v-if="hasMore"
						variant="outline"
						size="small"
						data-test-id="audit-log-show-more"
						@click="showMore"
					>
						Show more
					</N8nButton>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.toolbar {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs) var(--spacing--sm);
}

.filters {
	display: flex;
	flex: 1 1 auto;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.search,
.category {
	flex: 0 1 var(--spacing--5xl);
}

.link {
	// Stays at the end of the toolbar when the filters aren't there.
	margin-inline-start: auto;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	text-decoration: underline;
	text-underline-offset: var(--spacing--5xs);
	white-space: nowrap;

	&:hover {
		color: var(--text-color--subtle);
	}

	&:focus-visible {
		border-radius: var(--radius--4xs);
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: var(--spacing--5xs);
	}
}

// The same box as an N8nSettingsRowGroup, so tables and settings rows read as one family.
.container {
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: clip;
}

.scroll {
	overflow-x: auto;
}

.table {
	width: 100%;
	// Below this the table scrolls sideways instead of squeezing the "What" column away.
	min-width: calc(var(--spacing--5xl) * 2.75);
	border-collapse: collapse;
	table-layout: fixed;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: start;
		vertical-align: middle;
	}

	th {
		border-block-end: var(--border-width, 1px) solid var(--border-color--subtle);
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		white-space: nowrap;
	}

	td {
		overflow-wrap: anywhere;
	}

	tbody tr:not(:last-child) td {
		border-block-end: var(--border-width, 1px) solid var(--border-color--subtle);
	}
}

// Fixed columns keep the table still when "Show more" adds rows.
.whenColumn {
	width: calc(var(--spacing--4xl) + var(--spacing--lg));
}

.whoColumn {
	width: calc(var(--spacing--4xl) + var(--spacing--3xl) + var(--spacing--sm));
}

.categoryColumn {
	width: calc(var(--spacing--5xl) - var(--spacing--sm));
}

.when {
	color: var(--text-color--subtle);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.who {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.whoName {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.target {
	font-weight: var(--font-weight--medium);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--height--2xl);
	padding: var(--spacing--2xs) var(--spacing--sm);
	border-block-start: var(--border-width, 1px) solid var(--border-color--subtle);
}

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

.emptyIcon {
	margin-block-end: var(--spacing--2xs);
	color: var(--text-color--subtler);
}

.emptyAction {
	margin-block-start: var(--spacing--xs);
}
</style>

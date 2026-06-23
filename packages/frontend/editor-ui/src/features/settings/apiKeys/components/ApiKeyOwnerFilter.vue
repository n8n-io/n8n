<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useI18n } from '@n8n/i18n';
import type { IUser } from '@n8n/design-system';
import { N8nAvatar, N8nCheckbox, N8nIcon, N8nPopover, N8nText } from '@n8n/design-system';

interface ApiKeyOwnerFilterProps {
	/** Selected owner ids. Empty means "all" (no narrowing). */
	modelValue?: string[];
	users?: IUser[];
	currentUserId?: string;
	/** Per-owner key counts, keyed by owner id. */
	counts?: Record<string, number>;
	/** Total key count across all owners; defaults to the sum of `counts`. */
	totalCount?: number;
}

const props = withDefaults(defineProps<ApiKeyOwnerFilterProps>(), {
	modelValue: () => [],
	users: () => [],
	currentUserId: '',
	counts: () => ({}),
	totalCount: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string[]];
}>();

const i18n = useI18n();

const open = ref(false);
const filter = ref('');

const selectedSet = computed(() => new Set(props.modelValue));
const allOwnerIds = computed(() => props.users.map((user) => user.id));
const allSelected = computed(
	() => props.users.length > 0 && props.modelValue.length === props.users.length,
);
const someSelected = computed(
	() => props.modelValue.length > 0 && props.modelValue.length < props.users.length,
);
// An empty selection carries no filtering value, so it reads as "all" in the
// trigger and summary (and reverts to all when the panel closes).
const effectiveAll = computed(() => allSelected.value || props.modelValue.length === 0);

const displayName = (user: IUser) => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
	return name || user.email || '';
};

const filteredUsers = computed(() => {
	const needle = filter.value.trim().toLowerCase();
	if (!needle) return props.users;
	return props.users.filter((user) => {
		const nameMatch = displayName(user).toLowerCase().includes(needle);
		const emailMatch = user.email?.toLowerCase().includes(needle) ?? false;
		return nameMatch || emailMatch;
	});
});

const sortedUsers = computed(() =>
	[...filteredUsers.value].sort((a, b) => displayName(a).localeCompare(displayName(b))),
);

const effectiveTotalCount = computed(
	() => props.totalCount ?? Object.values(props.counts).reduce((sum, count) => sum + count, 0),
);

const selectedKeyCount = computed(() =>
	effectiveAll.value
		? effectiveTotalCount.value
		: props.modelValue.reduce((sum, id) => sum + (props.counts[id] ?? 0), 0),
);

const pillCount = computed(() =>
	effectiveAll.value ? props.users.length : props.modelValue.length,
);

const singleSelectedUser = computed(() =>
	props.modelValue.length === 1
		? props.users.find((user) => user.id === props.modelValue[0])
		: undefined,
);

const triggerLabel = computed(() => {
	if (effectiveAll.value) return i18n.baseText('settings.api.owners.all');
	if (singleSelectedUser.value) return displayName(singleSelectedUser.value);
	return i18n.baseText('settings.api.owners.selected', {
		interpolate: { count: props.modelValue.length },
		adjustToNumber: props.modelValue.length,
	});
});

const summaryLabel = computed(() =>
	effectiveAll.value
		? i18n.baseText('settings.api.owners.summary.all', {
				interpolate: { count: selectedKeyCount.value },
				adjustToNumber: selectedKeyCount.value,
			})
		: i18n.baseText('settings.api.owners.summary.filtered', {
				interpolate: { count: selectedKeyCount.value },
				adjustToNumber: selectedKeyCount.value,
			}),
);

function toggleUser(id: string) {
	const next = new Set(selectedSet.value);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	emit('update:modelValue', [...next]);
}

function toggleAll() {
	emit('update:modelValue', allSelected.value ? [] : allOwnerIds.value);
}

// "Clear" resets the filter to its no-narrowing state: every owner selected.
function clearFilter() {
	emit('update:modelValue', allOwnerIds.value);
}

// Selecting no owners carries no value, so revert to "all" once the panel
// closes rather than leaving the filter stuck on an empty selection.
watch(open, (isOpen, wasOpen) => {
	if (wasOpen && !isOpen && props.modelValue.length === 0) {
		emit('update:modelValue', allOwnerIds.value);
	}
});
</script>

<template>
	<N8nPopover
		:open="open"
		:enable-scrolling="false"
		width="300px"
		data-test-id="api-key-owner-filter"
		@update:open="open = $event"
	>
		<template #trigger>
			<button
				type="button"
				role="combobox"
				:aria-expanded="open"
				aria-haspopup="listbox"
				aria-controls="api-key-owner-filter-listbox"
				:class="[$style.trigger, { [$style.triggerOpen]: open }]"
				data-test-id="api-key-owner-filter-trigger"
			>
				<span :class="$style.triggerLeft">
					<N8nAvatar
						v-if="singleSelectedUser"
						:first-name="singleSelectedUser.firstName"
						:last-name="singleSelectedUser.lastName"
						size="xsmall"
					/>
					<N8nIcon v-else icon="users" :class="$style.triggerIcon" />
					<span :class="$style.triggerText">{{ triggerLabel }}</span>
				</span>
				<span :class="$style.triggerRight">
					<span :class="$style.pill">{{ pillCount }}</span>
					<N8nIcon icon="chevron-down" :class="$style.chevron" />
				</span>
			</button>
		</template>

		<template #content>
			<div :class="$style.panel">
				<div :class="$style.search">
					<N8nIcon icon="search" :class="$style.searchIcon" />
					<input
						v-model="filter"
						type="text"
						:placeholder="i18n.baseText('settings.api.owners.search')"
						:aria-label="i18n.baseText('settings.api.owners.search')"
						:class="$style.searchInput"
						data-test-id="api-key-owner-filter-search"
					/>
				</div>

				<div id="api-key-owner-filter-listbox" role="listbox" aria-multiselectable="true">
					<button
						type="button"
						role="option"
						:aria-selected="allSelected"
						:class="[$style.option, { [$style.optionSelected]: allSelected }]"
						data-test-id="api-key-owner-filter-all"
						@click="toggleAll"
					>
						<span :class="$style.optionLeft">
							<N8nCheckbox
								:model-value="allSelected"
								:indeterminate="someSelected"
								:class="$style.checkbox"
								aria-hidden="true"
								tabindex="-1"
							/>
							<span :class="$style.allAvatar"><N8nIcon icon="users" /></span>
							<N8nText :class="$style.allLabel" color="text-dark">{{
								i18n.baseText('settings.api.owners.all')
							}}</N8nText>
						</span>
						<span :class="$style.optionRight">
							<span :class="$style.count">{{ effectiveTotalCount }}</span>
						</span>
					</button>

					<div :class="$style.divider" />

					<div :class="$style.optionList">
						<button
							v-for="user in sortedUsers"
							:key="user.id"
							type="button"
							role="option"
							:aria-selected="selectedSet.has(user.id)"
							:class="[$style.option, { [$style.optionSelected]: selectedSet.has(user.id) }]"
							:data-test-id="`api-key-owner-filter-option-${user.id}`"
							@click="toggleUser(user.id)"
						>
							<span :class="[$style.optionLeft, $style.personLeft]">
								<N8nCheckbox
									:model-value="selectedSet.has(user.id)"
									:class="$style.checkbox"
									aria-hidden="true"
									tabindex="-1"
								/>
								<N8nAvatar :first-name="user.firstName" :last-name="user.lastName" size="xsmall" />
								<span :class="$style.personText">
									<N8nText :class="$style.personName" color="text-dark">
										{{ displayName(user) }}
										<span v-if="currentUserId === user.id" :class="$style.you">{{
											i18n.baseText('settings.api.owners.you')
										}}</span>
									</N8nText>
									<N8nText size="small" color="text-light" :class="$style.personEmail">{{
										user.email
									}}</N8nText>
								</span>
							</span>
							<span :class="$style.optionRight">
								<span :class="$style.count">{{ counts[user.id] ?? 0 }}</span>
							</span>
						</button>

						<div v-if="!sortedUsers.length" :class="$style.noResults">
							{{ i18n.baseText('settings.api.owners.noResults') }}
						</div>
					</div>
				</div>

				<div :class="$style.footer">
					<span :class="$style.summary">{{ summaryLabel }}</span>
					<button
						type="button"
						:class="$style.clear"
						:disabled="effectiveAll"
						data-test-id="api-key-owner-filter-clear"
						@click="clearFilter"
					>
						{{ i18n.baseText('settings.api.owners.clear') }}
					</button>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
// A subtle coral wash for selected rows / the count pill. Mixed into whatever
// surface sits behind it, so it stays light on the light panel and becomes a
// muted dark coral on the dark panel — unlike --color--primary--tint-3, which
// the design system never re-themes for dark mode. Declared on both .trigger
// and .panel since the panel is teleported and can't inherit from the trigger.
.trigger,
.panel {
	--owner-filter--accent-fill: color-mix(in srgb, var(--color--primary) 12%, transparent);
	--owner-filter--accent-ring: color-mix(in srgb, var(--color--primary) 22%, transparent);
}

.trigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	height: 36px;
	padding: 0 var(--spacing--xs);
	// Share N8nInput's resting surface, border and radius so the trigger and the
	// search box are visually identical at rest; coral only appears on open.
	background-color: var(--input--color--background, var(--color--foreground--tint-2));
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--input--radius, var(--radius));
	cursor: pointer;
	font-family: inherit;
	transition:
		border-color 0.12s ease,
		box-shadow 0.12s ease;
}

.triggerOpen {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 3px var(--owner-filter--accent-ring);
}

.triggerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.triggerIcon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--md);
}

.triggerText {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--shade-1);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.triggerRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.pill {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--primary);
	background-color: var(--owner-filter--accent-fill);
	padding: 1px 7px;
	border-radius: var(--radius--xlarge, 999px);
}

.chevron {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.triggerOpen .chevron {
	color: var(--color--primary);
	transform: rotate(180deg);
}

.panel {
	padding: var(--spacing--4xs);
}

.search {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs) var(--spacing--2xs);
	border-bottom: var(--border-width) solid var(--border-color);
	margin-bottom: var(--spacing--4xs);
}

.searchIcon {
	color: var(--color--text--tint-2);
	font-size: var(--font-size--sm);
}

.searchInput {
	flex: 1;
	min-width: 0;
	height: 24px;
	padding: 0;
	border: none;
	outline: none;
	background: transparent;
	font-family: inherit;
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
}

.optionList {
	max-height: 240px;
	overflow-y: auto;
}

.option {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border: none;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
	font-family: inherit;

	&:hover {
		background-color: var(--color--background--light-2);
	}
}

.optionSelected,
.optionSelected:hover {
	background-color: var(--owner-filter--accent-fill);
}

.optionLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.personLeft {
	gap: var(--spacing--2xs);
}

// The row itself is the interactive control; the checkbox is a decorative
// indicator, so clicks fall through to the row toggle.
.checkbox {
	pointer-events: none;
	flex-shrink: 0;
}

.allAvatar {
	// Bare glyph (no container) at avatar size, so it reads as deliberate next
	// to the real row avatars rather than a faint washed-out circle.
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	color: var(--color--text);
	font-size: var(--font-size--lg);
	flex-shrink: 0;
}

.allLabel {
	font-size: var(--font-size--sm);
}

.personText {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.personName {
	font-size: var(--font-size--sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.you {
	color: var(--color--text--tint-2);
}

.personEmail {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.optionRight {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
}

.count {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-2);
}

.divider {
	height: var(--border-width);
	background-color: var(--border-color);
	margin: var(--spacing--4xs) var(--spacing--2xs);
}

.noResults {
	padding: var(--spacing--sm) var(--spacing--2xs);
	text-align: center;
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-2);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--2xs) var(--spacing--4xs);
	border-top: var(--border-width) solid var(--border-color);
	margin-top: var(--spacing--4xs);
}

.summary {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
}

.clear {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium, 500);
	color: var(--color--primary);
	background: transparent;
	border: none;
	cursor: pointer;
	font-family: inherit;

	&:disabled {
		color: var(--color--text--tint-2);
		cursor: default;
	}
}
</style>

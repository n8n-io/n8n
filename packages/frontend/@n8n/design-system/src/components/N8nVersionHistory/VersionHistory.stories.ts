import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nCard from '../N8nCard';
import N8nHeading from '../N8nHeading/Heading.vue';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nInput from '../N8nInput/Input.vue';
import N8nInputLabel from '../N8nInputLabel';
import N8nOption from '../N8nOption';
import N8nSelect from '../N8nSelect';
import N8nSwitch from '../N8nSwitch';
import N8nText from '../N8nText/Text.vue';
import {
	isVersionHistoryGroup,
	isVersionHistoryHeading,
	type VersionHistoryEntry,
	type VersionHistoryItem,
} from './VersionHistory.types';
import N8nVersionHistory from './VersionHistory.vue';

const rowActions = [
	{ id: 'restore', label: 'Restore', icon: 'undo-2' as const },
	{ id: 'publish', label: 'Publish', icon: 'circle-check' as const },
];

const hiddenVersions: VersionHistoryItem[] = [
	{
		id: 'v2c',
		label: 'v2.3',
		author: 'Sam',
		createdAt: 'Oct 27 at 18:41:09',
		createdAtIso: '2026-10-27T18:41:09',
		status: 'default',
		actions: rowActions,
	},
	{
		id: 'v2b',
		label: 'v2.2',
		author: 'Sam',
		createdAt: 'Oct 27 at 11:02:33',
		createdAtIso: '2026-10-27T11:02:33',
		status: 'default',
		actions: rowActions,
	},
	{
		id: 'v2a',
		label: 'v2.1',
		author: 'Alex',
		createdAt: 'Oct 26 at 16:02:41',
		createdAtIso: '2026-10-26T16:02:41',
		status: 'default',
		actions: rowActions,
	},
];

const versions: VersionHistoryEntry[] = [
	{
		id: 'v3',
		label: 'v3',
		detail: 'Latest',
		author: 'Alex',
		createdAt: 'Oct 28 at 09:14:02',
		createdAtIso: '2026-10-28T09:14:02',
		status: 'latest',
		statusLabel: 'Latest version',
		actions: rowActions,
	},
	{
		type: 'group',
		id: 'unnamed',
		label: '3 versions',
		items: hiddenVersions,
	},
	{
		type: 'heading',
		id: 'earlier',
		label: 'Earlier',
	},
	{
		id: 'v1',
		label: 'v1',
		detail: 'In published agent',
		author: 'Alex',
		createdAt: 'Oct 24 at 14:28:10',
		createdAtIso: '2026-10-24T14:28:10',
		status: 'published',
		statusLabel: 'Published version',
		actions: [
			{ id: 'restore', label: 'Restore', icon: 'undo-2' as const },
			{ id: 'unpublish', label: 'Unpublish', icon: 'eye-off' as const },
		],
	},
];

function createVersion(version: number, latestVersion: number): VersionHistoryItem {
	const isLatest = version === latestVersion;
	const isPublished = version === 13;
	let detail: string | undefined;
	let status: VersionHistoryItem['status'] = 'default';
	let statusLabel: string | undefined;
	if (isLatest) {
		detail = 'Latest';
		status = 'latest';
		statusLabel = 'Latest version';
	} else if (isPublished) {
		detail = 'In published agent';
		status = 'published';
		statusLabel = 'Published version';
	}

	return {
		id: `v${version}`,
		label: `v${version}`,
		detail,
		author: version % 2 === 0 ? 'Alex' : 'Sam',
		createdAt: 'Oct 2 at 08:30:00',
		createdAtIso: '2026-10-02T08:30:00',
		status,
		statusLabel,
		actions: rowActions,
	};
}

function createManyVersions(): VersionHistoryEntry[] {
	const latestVersion = 40;
	const entries: VersionHistoryEntry[] = [{ type: 'heading', id: 'recent', label: 'Recent' }];

	for (let version = latestVersion; version >= 21; version -= 1) {
		entries.push(createVersion(version, latestVersion));
	}

	entries.push({ type: 'heading', id: 'older', label: 'Older' });

	for (let version = 20; version >= 13; version -= 1) {
		entries.push(createVersion(version, latestVersion));
	}

	// The tail stays collapsed until the user opens it, as workflow history does.
	const hidden: VersionHistoryItem[] = [];
	for (let version = 12; version >= 1; version -= 1) {
		hidden.push(createVersion(version, latestVersion));
	}
	entries.push({
		type: 'group',
		id: 'older-versions',
		label: `${hidden.length} versions`,
		items: hidden,
	});

	return entries;
}

const manyVersions = createManyVersions();

// This story uses 2026 as the current year.
const CURRENT_YEAR = 2026;

const MONTH_NAMES = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const;

const MONTH_SHORT_NAMES = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
] as const;

interface VersionMonth {
	year: number;
	/** Month number from 1 to 12. */
	month: number;
	count: number;
}

// 30 versions across four months in the current year, then 60 across six months in 2025.
const groupedMonths: VersionMonth[] = [
	{ year: 2026, month: 10, count: 8 },
	{ year: 2026, month: 9, count: 8 },
	{ year: 2026, month: 8, count: 7 },
	{ year: 2026, month: 7, count: 7 },
	{ year: 2025, month: 12, count: 10 },
	{ year: 2025, month: 11, count: 10 },
	{ year: 2025, month: 10, count: 10 },
	{ year: 2025, month: 9, count: 10 },
	{ year: 2025, month: 8, count: 10 },
	{ year: 2025, month: 7, count: 10 },
];

function padTime(value: number): string {
	return String(value).padStart(2, '0');
}

function monthHeading(year: number, month: number): string {
	const name = MONTH_NAMES[month - 1];
	if (year === CURRENT_YEAR) return name;
	return `${name} ${year}`;
}

function createGroupedByMonth(): VersionHistoryEntry[] {
	const total = groupedMonths.reduce((sum, group) => sum + group.count, 0);
	const latestVersion = total;
	const publishedVersion = 70;
	let version = latestVersion;
	const entries: VersionHistoryEntry[] = [];

	for (const group of groupedMonths) {
		entries.push({
			type: 'heading',
			id: `${group.year}-${padTime(group.month)}`,
			label: monthHeading(group.year, group.month),
		});

		const lastDay = group.year === CURRENT_YEAR && group.month === 10 ? 29 : 28;
		for (let index = 0; index < group.count; index += 1) {
			const day =
				group.count === 1
					? lastDay
					: lastDay - Math.floor((index * (lastDay - 1)) / (group.count - 1));
			const hour = 8 + ((version * 3) % 12);
			const minute = (version * 7) % 60;
			const second = (version * 11) % 60;
			const isLatest = version === latestVersion;
			const isPublished = version === publishedVersion;
			let detail: string | undefined;
			let status: VersionHistoryItem['status'] = 'default';
			let statusLabel: string | undefined;
			if (isLatest) {
				detail = 'Latest';
				status = 'latest';
				statusLabel = 'Latest version';
			} else if (isPublished) {
				detail = 'In published agent';
				status = 'published';
				statusLabel = 'Published version';
			}

			const stamp = `${padTime(hour)}:${padTime(minute)}:${padTime(second)}`;
			entries.push({
				id: `v${version}`,
				label: `v${version}`,
				detail,
				author: version % 2 === 0 ? 'Alex' : 'Sam',
				createdAt: `${MONTH_SHORT_NAMES[group.month - 1]} ${day} at ${stamp}`,
				createdAtIso: `${group.year}-${padTime(group.month)}-${padTime(day)}T${stamp}`,
				status,
				statusLabel,
				actions: isPublished
					? [
							{ id: 'restore', label: 'Restore', icon: 'undo-2' as const },
							{ id: 'unpublish', label: 'Unpublish', icon: 'eye-off' as const },
						]
					: rowActions,
			});
			version -= 1;
		}
	}

	return entries;
}

const groupedByMonth = createGroupedByMonth();

const meta = {
	title: 'Core/VersionHistory',
	component: N8nVersionHistory,
} satisfies Meta<typeof N8nVersionHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

// The list sits on the page. A border separates it from that surface.
// The pinned heading uses the same surface.
const frameStyle = [
	'box-sizing: border-box',
	'width: 20rem',
	'height: 28rem',
	'max-width: 100%',
	'overflow: hidden',
	'border: var(--border)',
	'border-radius: var(--radius)',
	'--version-history--heading--color--background: var(--color--background--light-2)',
].join('; ');

const panelStyle = [
	'display: flex',
	'flex-direction: column',
	'width: 22rem',
	'height: 32rem',
	'max-width: 100%',
	'overflow: hidden',
	'border: var(--border)',
	'border-radius: var(--radius)',
	'box-shadow: var(--shadow--xs)',
	'background-color: var(--background--surface)',
].join('; ');

const panelHeaderStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: space-between',
	'gap: var(--spacing--2xs)',
	'flex-shrink: 0',
	'padding: var(--spacing--xs)',
	'border-bottom: var(--border)',
].join('; ');

const searchHeaderStyle = [
	'display: flex',
	'align-items: center',
	'flex-shrink: 0',
	'padding: var(--spacing--xs)',
].join('; ');

const panelBodyStyle = ['display: flex', 'flex-direction: column', 'flex: 1', 'min-height: 0'].join(
	'; ',
);

const LOAD_DELAY_MS = 2000;

function filterVersions(entries: VersionHistoryEntry[], query: string): VersionHistoryEntry[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return entries;

	function matches(item: VersionHistoryItem) {
		return [item.label, item.detail, item.author].some((part) =>
			part?.toLowerCase().includes(needle),
		);
	}

	const filtered: VersionHistoryEntry[] = [];
	for (const entry of entries) {
		if (isVersionHistoryHeading(entry)) {
			filtered.push(entry);
			continue;
		}
		if (isVersionHistoryGroup(entry)) {
			const items = entry.items.filter(matches);
			if (items.length === 0) continue;
			const label = items.length === 1 ? '1 version' : `${items.length} versions`;
			filtered.push({ ...entry, label, items });
			continue;
		}
		if (matches(entry)) filtered.push(entry);
	}

	return filtered.filter((entry, index) => {
		if (!isVersionHistoryHeading(entry)) return true;
		const next = filtered[index + 1];
		return next !== undefined && !isVersionHistoryHeading(next);
	});
}

const emptyIconStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: center',
	'width: var(--spacing--3xl)',
	'height: var(--spacing--3xl)',
	'margin-bottom: var(--spacing--2xs)',
	'border-radius: var(--radius--lg)',
	'background-color: var(--color--background--light-2)',
].join('; ');

function useHistory(initialId = 'v3') {
	const selectedId = ref(initialId);

	function onSelect(id: string) {
		selectedId.value = id;
		action('select')(id);
	}

	return {
		selectedId,
		onSelect,
		onCompare: action('compare'),
		onAction: action('action'),
		onToggle: action('toggle'),
	};
}

export const Default: Story = {
	render: (args) => ({
		components: { N8nVersionHistory },
		setup() {
			return { args, ...useHistory() };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
					@compare="onCompare"
					@action="onAction"
					@toggle="onToggle"
				/>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

// The parent opens the list on the version the user is viewing.
// That version can sit inside a group. The group starts open.
export const Selected: Story = {
	render: (args) => ({
		components: { N8nVersionHistory },
		setup() {
			return { args, ...useHistory('v2b') };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
					@compare="onCompare"
					@action="onAction"
					@toggle="onToggle"
				/>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

export const Empty: Story = {
	render: (args) => ({
		components: { N8nVersionHistory, N8nIcon, N8nText },
		setup() {
			return { args };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory v-bind="args">
					<template #empty>
						<span style="${emptyIconStyle}">
							<N8nIcon icon="folder" size="xxlarge" color="text-light" />
						</span>
						<N8nText bold size="small" color="text-dark" align="center">No versions yet</N8nText>
						<N8nText size="small" color="text-light" align="center">
							Versions appear here after you save.
						</N8nText>
					</template>
				</N8nVersionHistory>
			</div>
		`,
	}),
	args: {
		items: [],
	},
};

export const CustomHeading: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The heading slot replaces the label. The pinned heading uses the same slot. This story sits on the main background, so the pin uses that color.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nText },
		setup() {
			return { args, ...useHistory() };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
					@compare="onCompare"
					@action="onAction"
					@toggle="onToggle"
				>
					<template #heading="{ label }">
						<N8nText size="small" bold color="text-light">{{ label }}</N8nText>
					</template>
				</N8nVersionHistory>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

export const CustomActions: Story = {
	render: (args) => ({
		components: { N8nVersionHistory, N8nButton },
		setup() {
			return { args, ...useHistory(), onOpen: action('open') };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
				>
					<template #actions="{ item }">
						<N8nButton
							size="xsmall"
							variant="ghost"
							:label="'Open ' + item.label"
							@click="onOpen(item.id)"
						/>
					</template>
				</N8nVersionHistory>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

const disabledVersions: VersionHistoryEntry[] = versions.map((entry) => {
	if (isVersionHistoryHeading(entry)) return entry;

	if (isVersionHistoryGroup(entry)) {
		return {
			...entry,
			items: entry.items.map((item) => ({
				...item,
				disabled: true,
				compareDisabled: true,
				actionsDisabled: true,
			})),
		};
	}

	return {
		...entry,
		disabled: true,
		compareDisabled: true,
		actionsDisabled: true,
	};
});

export const Disabled: Story = {
	...Default,
	args: {
		items: disabledVersions,
	},
};

export const ManyVersions: Story = {
	render: (args) => ({
		components: { N8nVersionHistory },
		setup() {
			return { args, ...useHistory('v40') };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
					@compare="onCompare"
					@action="onAction"
					@toggle="onToggle"
				/>
			</div>
		`,
	}),
	args: {
		items: manyVersions,
	},
};

const scrollSelectStyle = [
	'width: 20rem',
	'max-width: 100%',
	'margin-bottom: var(--spacing--2xs)',
].join('; ');

function versionChoices(entries: VersionHistoryEntry[]): Array<{ id: string; label: string }> {
	const choices: Array<{ id: string; label: string }> = [];

	for (const entry of entries) {
		if (isVersionHistoryHeading(entry)) {
			choices.push({ id: entry.id, label: entry.label });
			continue;
		}
		if (isVersionHistoryGroup(entry)) {
			for (const item of entry.items) {
				choices.push({ id: item.id, label: item.label });
			}
			continue;
		}
		choices.push({
			id: entry.id,
			label: entry.detail ? `${entry.label} · ${entry.detail}` : entry.label,
		});
	}

	return choices;
}

export const ScrollToVersion: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Choose a version to bring that row into view. A version in the closed group opens the group first. A heading above the row stays in view, and the row starts below it.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nSelect, N8nOption, N8nInputLabel },
		setup() {
			const history = useHistory('v40');
			const scrollToId = ref<string | undefined>();
			const choices = versionChoices(manyVersions);

			function onScrollTarget(value: unknown) {
				if (typeof value !== 'string' || value.length === 0) return;
				scrollToId.value = value;
				history.selectedId.value = value;
			}

			return {
				args,
				...history,
				scrollToId,
				choices,
				onScrollTarget,
			};
		},
		template: `
			<div>
				<div style="${scrollSelectStyle}">
					<N8nInputLabel label="Version" :bold="false" size="small" />
					<N8nSelect
						:model-value="scrollToId"
						size="small"
						placeholder="Choose a version"
						filterable
						@update:model-value="onScrollTarget"
					>
						<N8nOption
							v-for="choice in choices"
							:key="choice.id"
							:value="choice.id"
							:label="choice.label"
						/>
					</N8nSelect>
				</div>
				<div style="${frameStyle}">
					<N8nVersionHistory
						v-bind="args"
						:scroll-to-id="scrollToId"
						:selected-id="selectedId"
						@select="onSelect"
						@compare="onCompare"
						@action="onAction"
						@toggle="onToggle"
					/>
				</div>
			</div>
		`,
	}),
	args: {
		items: manyVersions,
	},
};

export const GroupedByMonth: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Headings break the list into months. A heading for the current year is the month name. A heading for a past year adds the year. Scroll and the current heading stays at the top until the next month pushes it up. The list has 30 versions across four months in 2026. It has 60 versions across six months in 2025.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory },
		setup() {
			return { args, ...useHistory('v90') };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory
					v-bind="args"
					:selected-id="selectedId"
					@select="onSelect"
					@compare="onCompare"
					@action="onAction"
					@toggle="onToggle"
				/>
			</div>
		`,
	}),
	args: {
		items: groupedByMonth,
	},
};

export const Loading: Story = {
	render: (args) => ({
		components: { N8nVersionHistory, N8nButton },
		setup() {
			const loading = ref(true);
			let timer: ReturnType<typeof setTimeout> | undefined;

			function reset() {
				loading.value = true;
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					loading.value = false;
				}, LOAD_DELAY_MS);
			}

			onMounted(reset);
			onUnmounted(() => {
				if (timer) clearTimeout(timer);
			});

			return { args, loading, reset, ...useHistory() };
		},
		template: `
			<div>
				<div style="margin-bottom: var(--spacing--2xs)">
					<N8nButton size="small" variant="outline" label="Reset" @click="reset" />
				</div>
				<div style="${frameStyle}">
					<N8nVersionHistory
						v-bind="args"
						:loading="loading"
						:selected-id="selectedId"
						@select="onSelect"
					/>
				</div>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

function namedVersions(entries: VersionHistoryEntry[]): VersionHistoryEntry[] {
	return entries.filter(
		(entry) => !isVersionHistoryGroup(entry) && 'detail' in entry && Boolean(entry.detail),
	);
}

function findVersion(entries: VersionHistoryEntry[], id: string): VersionHistoryItem | undefined {
	for (const entry of entries) {
		if (isVersionHistoryGroup(entry)) {
			const nested = entry.items.find((item) => item.id === id);
			if (nested) return nested;
			continue;
		}
		if (isVersionHistoryHeading(entry)) continue;
		if (entry.id === id) return entry;
	}
	return undefined;
}

const layoutStyle = [
	'display: grid',
	'grid-template-columns: minmax(0, 1fr) 22rem',
	'width: min(64rem, 100%)',
	'height: 36rem',
	'overflow: hidden',
	'border: var(--border)',
	'background-color: var(--color--background--light-3)',
].join('; ');

const contentStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--sm)',
	'min-width: 0',
	'min-height: 0',
	'padding: var(--spacing--lg)',
].join('; ');

const canvasStyle = [
	'flex: 1',
	'min-height: 0',
	'border: var(--border)',
	'border-radius: var(--radius)',
	'background-color: var(--background--surface)',
].join('; ');

const sidebarStyle = [
	'display: flex',
	'flex-direction: column',
	'min-width: 0',
	'min-height: 0',
	'background-color: var(--background--surface)',
	'border-left: var(--border)',
].join('; ');

export const InPanel: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The history sits in a side panel next to a content area. The header uses a switch. The content card uses the card radius.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nHeading, N8nSwitch, N8nCard, N8nText },
		setup() {
			const namedOnly = ref(false);
			const history = useHistory('v40');
			const visibleItems = computed(() =>
				namedOnly.value ? namedVersions(manyVersions) : manyVersions,
			);
			const selected = computed(() => findVersion(manyVersions, history.selectedId.value));
			const selectedTitle = computed(() => {
				const item = selected.value;
				if (!item) return 'No version open';
				return item.detail ? `${item.label} · ${item.detail}` : item.label;
			});
			const selectedMeta = computed(() => {
				const item = selected.value;
				if (!item) return '';
				return [item.author, item.createdAt].filter(Boolean).join(', ');
			});
			return {
				args,
				namedOnly,
				visibleItems,
				selectedTitle,
				selectedMeta,
				...history,
			};
		},
		template: `
			<div style="${layoutStyle}">
				<section style="${contentStyle}">
					<N8nHeading tag="h2" size="medium">Support agent</N8nHeading>
					<N8nCard>
						<N8nText bold>{{ selectedTitle }}</N8nText>
						<N8nText size="small" color="text-light">{{ selectedMeta }}</N8nText>
					</N8nCard>
					<div style="${canvasStyle}"></div>
				</section>
				<aside style="${sidebarStyle}">
					<header style="${panelHeaderStyle}">
						<N8nHeading tag="h2" size="small" bold>Versions</N8nHeading>
						<N8nSwitch v-model="namedOnly" label="Named versions" size="small" />
					</header>
					<div style="${panelBodyStyle}">
						<N8nVersionHistory
							v-bind="args"
							:items="visibleItems"
							:selected-id="selectedId"
							@select="onSelect"
							@compare="onCompare"
							@action="onAction"
							@toggle="onToggle"
						/>
					</div>
				</aside>
			</div>
		`,
	}),
	args: {
		items: manyVersions,
	},
};

export const Search: Story = {
	render: (args) => ({
		components: { N8nVersionHistory, N8nInput, N8nIcon, N8nText },
		setup() {
			const query = ref('');
			const visibleItems = computed(() => filterVersions(versions, query.value));
			return { args, query, visibleItems, ...useHistory() };
		},
		template: `
			<div style="${panelStyle}">
				<header style="${searchHeaderStyle}">
					<N8nInput v-model="query" placeholder="Search versions" clearable>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>
				</header>
				<div style="${panelBodyStyle}">
					<N8nVersionHistory
						v-bind="args"
						:items="visibleItems"
						:selected-id="selectedId"
						@select="onSelect"
						@compare="onCompare"
						@action="onAction"
						@toggle="onToggle"
					>
						<template #empty>
							<N8nText size="small" color="text-light" align="center">
								No versions match this search.
							</N8nText>
						</template>
					</N8nVersionHistory>
				</div>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

const PAGE_SIZE = 12;
const TOTAL_VERSIONS = 400;
const PAGE_DELAY_MS = 800;

interface VersionPage {
	items: VersionHistoryItem[];
	nextCursor: number | null;
}

/** Stand-in for a paged versions API. Newest versions come first. */
async function fetchVersionPage(cursor: number): Promise<VersionPage> {
	const start = cursor;
	const end = Math.min(cursor + PAGE_SIZE, TOTAL_VERSIONS);

	return await new Promise((resolve) => {
		window.setTimeout(() => {
			const page: VersionHistoryItem[] = [];
			for (let index = start; index < end; index += 1) {
				page.push(createVersion(TOTAL_VERSIONS - index, TOTAL_VERSIONS));
			}
			resolve({
				items: page,
				nextCursor: end < TOTAL_VERSIONS ? end : null,
			});
		}, PAGE_DELAY_MS);
	});
}

const loadMoreToolbarStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: space-between',
	'gap: var(--spacing--2xs)',
	'width: 20rem',
	'max-width: 100%',
	'margin-bottom: var(--spacing--2xs)',
].join('; ');

export const LoadMore: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The list loads the first page from a mock API. Scroll to the end to load the next page. Each page returns 12 versions. There are 400 versions in total. The request waits before it resolves.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nButton, N8nText },
		setup() {
			const items = ref<VersionHistoryEntry[]>([]);
			const hasMore = ref(false);
			const loading = ref(true);
			const loadingMore = ref(false);
			const selectedId = ref<string | undefined>();
			let cursor = 0;
			let requestId = 0;

			async function reset() {
				const id = ++requestId;
				loading.value = true;
				loadingMore.value = false;
				hasMore.value = false;
				items.value = [];
				cursor = 0;
				const page = await fetchVersionPage(0);
				if (id !== requestId) return;
				items.value = page.items;
				cursor = page.nextCursor ?? 0;
				hasMore.value = page.nextCursor !== null;
				selectedId.value = page.items[0]?.id;
				loading.value = false;
			}

			async function onLoadMore() {
				if (loading.value || loadingMore.value || !hasMore.value) return;
				const id = requestId;
				loadingMore.value = true;
				action('loadMore')(cursor);
				const page = await fetchVersionPage(cursor);
				if (id !== requestId) return;
				items.value = [...items.value, ...page.items];
				cursor = page.nextCursor ?? cursor;
				hasMore.value = page.nextCursor !== null;
				loadingMore.value = false;
			}

			onMounted(() => {
				void reset();
			});
			onUnmounted(() => {
				requestId += 1;
			});

			return {
				args,
				items,
				hasMore,
				loading,
				loadingMore,
				selectedId,
				total: TOTAL_VERSIONS,
				reset,
				onLoadMore,
				onSelect(id: string) {
					selectedId.value = id;
					action('select')(id);
				},
				onCompare: action('compare'),
				onAction: action('action'),
			};
		},
		template: `
			<div>
				<div style="${loadMoreToolbarStyle}">
					<N8nText size="small" color="text-light">{{ items.length }} of {{ total }}</N8nText>
					<N8nButton size="small" variant="outline" label="Reset" @click="reset" />
				</div>
				<div style="${frameStyle}">
					<N8nVersionHistory
						v-bind="args"
						:items="items"
						:loading="loading"
						:loading-more="loadingMore"
						:has-more="hasMore"
						:selected-id="selectedId"
						@select="onSelect"
						@compare="onCompare"
						@action="onAction"
						@load-more="onLoadMore"
					/>
				</div>
			</div>
		`,
	}),
	args: {
		items: [],
	},
};

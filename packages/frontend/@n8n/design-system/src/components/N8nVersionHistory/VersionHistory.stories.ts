import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { computed, onMounted, onUnmounted, ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nIconButton from '../N8nIconButton/IconButton.vue';
import N8nInput from '../N8nInput/Input.vue';
import N8nTabs from '../N8nTabs/Tabs.vue';
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

const meta = {
	title: 'Core/VersionHistory',
	component: N8nVersionHistory,
	parameters: {
		docs: {
			description: {
				component:
					'A version list. A line connects the marks. A group starts collapsed and opens to show more versions. The list virtualizes rows. The caller formats each time and supplies the empty state. Each version has a compare control and a menu. The actions slot replaces both. The parent sets the height and the background.',
			},
		},
	},
} satisfies Meta<typeof N8nVersionHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameStyle = ['width: 20rem', 'height: 28rem', 'max-width: 100%'].join('; ');

const panelStyle = [
	'display: flex',
	'flex-direction: column',
	'width: 22rem',
	'height: 32rem',
	'max-width: 100%',
	'overflow: hidden',
	'border: var(--border)',
	'border-radius: var(--radius--lg)',
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

export const CustomActions: Story = {
	parameters: {
		docs: {
			description: {
				story: 'The actions slot replaces the compare control and the menu on every row.',
			},
		},
	},
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
	parameters: {
		docs: {
			description: {
				story:
					'Each version sets disabled, so the row cannot be selected. Compare and the menu are disabled on their own.',
			},
		},
	},
	...Default,
	args: {
		items: disabledVersions,
	},
};

export const ManyVersions: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The last row is a collapsed group, as in workflow history. Open it to show the older versions. A heading ends the line, then the next mark starts a new one.',
			},
		},
	},
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

export const Loading: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Skeleton rows show for two seconds, then the list appears. Reset starts the wait again.',
			},
		},
	},
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

export const InPanel: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The list fills a panel. The header switches between versions and a timeline, as the history demo does.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nTabs, N8nIconButton, N8nText },
		setup() {
			const tab = ref('versions');
			const tabOptions = [
				{ label: 'Versions', value: 'versions' },
				{ label: 'Timeline', value: 'timeline' },
			];
			return { args, tab, tabOptions, onClose: action('close'), ...useHistory() };
		},
		template: `
			<div style="${panelStyle}">
				<header style="${panelHeaderStyle}">
					<N8nTabs v-model="tab" :options="tabOptions" size="small" />
					<N8nIconButton
						icon="x"
						variant="ghost"
						size="medium"
						aria-label="Close"
						@click="onClose"
					/>
				</header>
				<div style="${panelBodyStyle}">
					<N8nVersionHistory
						v-if="tab === 'versions'"
						v-bind="args"
						:selected-id="selectedId"
						@select="onSelect"
						@compare="onCompare"
						@action="onAction"
						@toggle="onToggle"
					/>
					<div v-else style="padding: var(--spacing--sm)">
						<N8nText size="small" color="text-light">Publish events appear here.</N8nText>
					</div>
				</div>
			</div>
		`,
	}),
	args: {
		items: versions,
	},
};

export const Search: Story = {
	parameters: {
		docs: {
			description: {
				story: 'The parent filters the list. A group stays when one of its versions matches.',
			},
		},
	},
	render: (args) => ({
		components: { N8nVersionHistory, N8nInput, N8nIcon, N8nText },
		setup() {
			const query = ref('');
			const visibleItems = computed(() => filterVersions(versions, query.value));
			return { args, query, visibleItems, ...useHistory() };
		},
		template: `
			<div style="${panelStyle}">
				<header style="${panelHeaderStyle}">
					<N8nInput v-model="query" size="small" placeholder="Search versions" clearable>
						<template #prefix>
							<N8nIcon icon="search" size="small" />
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

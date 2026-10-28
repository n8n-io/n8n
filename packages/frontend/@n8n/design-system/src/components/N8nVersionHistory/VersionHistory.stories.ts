import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { action } from 'storybook/actions';
import { ref } from 'vue';

import N8nButton from '../N8nButton';
import N8nIcon from '../N8nIcon/Icon.vue';
import N8nText from '../N8nText/Text.vue';
import type { VersionHistoryItem } from './VersionHistory.types';
import N8nVersionHistory from './VersionHistory.vue';

const rowActions = [
	{ id: 'restore', label: 'Restore' },
	{ id: 'publish', label: 'Publish' },
];

const versions: VersionHistoryItem[] = [
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
		id: 'v2',
		label: 'v2',
		author: 'Alex',
		createdAt: 'Oct 26 at 16:02:41',
		createdAtIso: '2026-10-26T16:02:41',
		status: 'default',
		actions: rowActions,
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
			{ id: 'restore', label: 'Restore' },
			{ id: 'unpublish', label: 'Unpublish' },
		],
	},
];

const meta = {
	title: 'Core/VersionHistory',
	component: N8nVersionHistory,
	parameters: {
		docs: {
			description: {
				component:
					'A version list. The caller formats each time, supplies the empty state, and can replace the row actions. Add menu entries on each item. The parent sets the height and the background.',
			},
		},
	},
} satisfies Meta<typeof N8nVersionHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameStyle = ['width: 20rem', 'height: 28rem', 'max-width: 100%'].join('; ');

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

function useHistory() {
	const selectedId = ref('v3');

	function onSelect(id: string) {
		selectedId.value = id;
		action('select')(id);
	}

	return {
		selectedId,
		onSelect,
		onCompare: action('compare'),
		onAction: action('action'),
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
				/>
			</div>
		`,
	}),
	args: {
		items: versions,
		showCompare: true,
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

const disabledVersions: VersionHistoryItem[] = versions.map((item) => ({
	...item,
	compareDisabled: true,
	actionsDisabled: true,
}));

export const Disabled: Story = {
	...Default,
	args: {
		items: disabledVersions,
		showCompare: true,
	},
};

export const Loading: Story = {
	render: (args) => ({
		components: { N8nVersionHistory },
		setup() {
			return { args };
		},
		template: `
			<div style="${frameStyle}">
				<N8nVersionHistory v-bind="args" loading />
			</div>
		`,
	}),
	args: {
		items: [],
		loading: true,
	},
};

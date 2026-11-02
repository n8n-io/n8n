import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nButton from '../N8nButton';
import {
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
} from '../N8nDialog';
import N8nDropdownMenu from '../N8nDropdownMenu/DropdownMenu.vue';
import type { DropdownMenuItemProps } from '../N8nDropdownMenu/DropdownMenu.types';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nInputLabel from '../N8nInputLabel';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import N8nListbox from '../../v2/components/Listbox/Listbox.vue';
import N8nListboxItem from '../../v2/components/Listbox/ListboxItem.vue';
import N8nModalSidebar from './ModalSidebar.vue';
import type { IMenuItem } from '../../types';

function menuIcon(item: IMenuItem) {
	return typeof item.icon === 'string' ? item.icon : undefined;
}

const links: IMenuItem[] = [
	{ id: 'overview', label: 'Overview', icon: 'house' },
	{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
	{ id: 'executions', label: 'Executions', icon: 'clock' },
	{ id: 'settings', label: 'Settings', icon: 'settings' },
];

const meta = {
	title: 'Core/ModalSidebar',
	component: N8nModalSidebar,
	parameters: {
		docs: {
			description: {
				component:
					'A resizable sidebar with its own background. Place it inside a modal or any other layout. The parent sets the height. The slot supplies the content. Put a listbox in the slot when the rows are selectable. Arrow keys then move the highlight.',
			},
		},
	},
	argTypes: {
		side: { control: 'select', options: ['left', 'right'] },
		resizable: { control: 'boolean' },
		minWidth: { control: 'number' },
		maxWidth: { control: 'number' },
	},
} satisfies Meta<typeof N8nModalSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const frameStyle = [
	'display: flex',
	'height: 28rem',
	'width: 48rem',
	'max-width: 100%',
	'border: var(--border)',
	'border-radius: var(--radius--lg)',
	'overflow: hidden',
	'background: var(--background--surface)',
].join('; ');

const editorFrameStyle = frameStyle.replace('height: 28rem', 'height: 36rem');

const mainStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--2xs)',
	'flex: 1',
	'min-width: 0',
	'padding: var(--spacing--md)',
	'color: var(--color--text)',
].join('; ');

const contentStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--sm)',
	'padding: var(--spacing--md) var(--spacing--xs) var(--spacing--2xs)',
].join('; ');

// A menu item is 32px tall. The icon sits 12px in from the highlight.
// The flush highlight bleeds by that 12px, so the wrapper adds it back.
// The highlight then sits 12px in from the sidebar edge.
const listboxStyle = [
	'width: 100%',
	'--listbox-flush-highlight-inset-inline: var(--spacing--xs)',
	'--listbox-flush-highlight-inset-block: 0px',
	'--listbox-flush-gap: var(--spacing--5xs)',
	'--listbox-row-min-height: var(--spacing--xl)',
	'--listbox-row-padding-block: var(--spacing--4xs)',
	'--listbox-label-line-height: var(--font-size--lg)',
].join('; ');

const listPaddingStyle = [
	'padding-block: var(--spacing--xs)',
	'padding-inline: calc(var(--spacing--xs) + var(--spacing--xs))',
].join('; ');

const sectionHeaderStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: space-between',
	'gap: var(--spacing--4xs)',
	'margin-top: var(--spacing--xs)',
	'padding-block: var(--spacing--4xs)',
].join('; ');

const rowActions: Array<DropdownMenuItemProps<'rename' | 'duplicate' | 'delete'>> = [
	{ id: 'rename', label: 'Rename', icon: { type: 'icon', value: 'pencil' } },
	{ id: 'duplicate', label: 'Duplicate', icon: { type: 'icon', value: 'copy' } },
	{
		id: 'delete',
		label: 'Delete',
		icon: { type: 'icon', value: 'trash-2' },
		destructive: true,
		divided: true,
	},
];

export const Links: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nListbox, N8nListboxItem, N8nIcon, N8nText },
		setup() {
			const width = ref(240);
			const activeId = ref(links[0]?.id ?? '');
			return { args, links, width, activeId, menuIcon, listboxStyle };
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Sections">
					<div style="${listPaddingStyle}">
						<N8nListbox
							v-model="activeId"
							variant="flush"
							size="small"
							max-height="none"
							aria-label="Sections"
							:style="listboxStyle"
						>
							<N8nListboxItem
								v-for="item in links"
								:key="item.id"
								:value="item.id"
								:label="item.label"
							>
								<template #leading>
									<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
								</template>
							</N8nListboxItem>
						</N8nListbox>
					</div>
				</N8nModalSidebar>
				<div style="${mainStyle}">
					<N8nText bold size="medium">{{ links.find((item) => item.id === activeId)?.label }}</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 160,
		maxWidth: 480,
	},
};

export const WithActions: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Each row has a delete button and an actions menu. The delete button has a tooltip. The menu can rename, duplicate, or delete the row. These controls sit outside the option, so they do not change the selection.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nModalSidebar,
			N8nListbox,
			N8nListboxItem,
			N8nIcon,
			N8nIconButton,
			N8nDropdownMenu,
			N8nTooltip,
			N8nText,
		},
		setup() {
			const width = ref(240);
			const items = ref(links.map((item) => ({ ...item })));
			const activeId = ref(items.value[0]?.id ?? '');
			let copyCount = 0;

			function selectNext(id: string, index: number) {
				if (activeId.value !== id) {
					return;
				}

				const next = items.value[index] ?? items.value[index - 1];
				activeId.value = next?.id ?? '';
			}

			function deleteItem(id: string) {
				const index = items.value.findIndex((item) => item.id === id);
				items.value = items.value.filter((item) => item.id !== id);
				selectNext(id, index);
			}

			function duplicateItem(id: string) {
				const index = items.value.findIndex((item) => item.id === id);
				const source = items.value[index];
				if (!source) {
					return;
				}

				copyCount += 1;
				const copy = {
					...source,
					id: `${source.id}-copy-${copyCount}`,
					label: `${source.label} copy`,
				};
				items.value = [...items.value.slice(0, index + 1), copy, ...items.value.slice(index + 1)];
			}

			function renameItem(id: string) {
				items.value = items.value.map((item) =>
					item.id === id ? { ...item, label: `${item.label} renamed` } : item,
				);
			}

			function onRowAction(id: string, actionId: 'rename' | 'duplicate' | 'delete') {
				if (actionId === 'delete') {
					deleteItem(id);
					return;
				}

				if (actionId === 'duplicate') {
					duplicateItem(id);
					return;
				}

				renameItem(id);
			}

			return {
				args,
				width,
				items,
				activeId,
				deleteItem,
				onRowAction,
				rowActions,
				menuIcon,
				listboxStyle,
			};
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Sections">
					<div style="${listPaddingStyle}">
					<N8nListbox
						v-model="activeId"
						variant="flush"
						size="small"
						max-height="none"
						aria-label="Sections"
						:style="listboxStyle"
					>
						<N8nListboxItem
							v-for="item in items"
							:key="item.id"
							:value="item.id"
							:label="item.label"
						>
							<template #leading>
								<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
							</template>
							<template #trailing="{ setMenuOpen }">
								<N8nTooltip content="Delete" placement="top" as-child>
									<N8nIconButton
										icon="trash-2"
										variant="ghost"
										size="xsmall"
										:aria-label="'Delete ' + item.label"
										@click="deleteItem(item.id)"
									/>
								</N8nTooltip>
								<N8nDropdownMenu
									:items="rowActions"
									placement="bottom-end"
									width="12rem"
									:modal="false"
									@update:model-value="setMenuOpen"
									@select="(actionId) => onRowAction(item.id, actionId)"
								>
									<template #trigger>
										<N8nTooltip content="Actions" placement="top" as-child>
											<N8nIconButton
												icon="ellipsis-vertical"
												variant="ghost"
												size="xsmall"
												:aria-label="'Actions for ' + item.label"
											/>
										</N8nTooltip>
									</template>
								</N8nDropdownMenu>
							</template>
						</N8nListboxItem>
					</N8nListbox>
					</div>
				</N8nModalSidebar>
				<div style="${mainStyle}">
					<N8nText bold size="medium">{{ items.find((item) => item.id === activeId)?.label || 'No sections' }}</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 160,
		maxWidth: 480,
	},
};

export const Sections: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nListbox, N8nListboxItem, N8nIcon, N8nText, N8nIconButton },
		setup() {
			const width = ref(240);
			const guide: IMenuItem = { id: 'guide', label: 'Guide.md', icon: 'file' };
			const activeId = ref(guide.id);
			return { args, width, guide, activeId, listboxStyle };
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Files">
					<div style="${contentStyle}">
						<N8nListbox
							v-model="activeId"
							variant="flush"
							size="small"
							max-height="none"
							aria-label="Files"
							:style="listboxStyle"
						>
							<N8nListboxItem :value="guide.id" :label="guide.label">
								<template #leading>
									<N8nIcon icon="file" />
								</template>
							</N8nListboxItem>
						</N8nListbox>
						<div style="display: flex; flex-direction: column; gap: var(--spacing--2xs);">
							<div style="display: flex; align-items: center; justify-content: space-between; gap: var(--spacing--2xs);">
								<N8nText size="small" color="text-light">References</N8nText>
								<N8nIconButton icon="plus" variant="ghost" size="xsmall" aria-label="Add reference" />
							</div>
							<N8nText size="small" color="text-light">No references yet</N8nText>
						</div>
					</div>
				</N8nModalSidebar>
				<div style="${mainStyle}">
					<N8nText bold size="medium">Guide.md</N8nText>
					<N8nText size="small" color="text-base">The sidebar can hold a selected item, a section, and an empty state.</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
	},
};

export const CustomContent: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nText, N8nInput, N8nInputLabel },
		setup() {
			const width = ref(280);
			const name = ref('Weekly digest');
			const note = ref('Send the digest every Monday.');
			return { args, width, name, note };
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Details">
					<div style="${contentStyle}">
						<N8nText bold size="medium">Details</N8nText>
						<div>
							<N8nInputLabel label="Name" input-name="sidebar-name" />
							<N8nInput id="sidebar-name" v-model="name" size="small" />
						</div>
						<div>
							<N8nInputLabel label="Note" input-name="sidebar-note" />
							<N8nInput id="sidebar-note" v-model="note" type="textarea" size="small" :rows="3" />
						</div>
					</div>
				</N8nModalSidebar>
				<div style="${mainStyle}">
					<N8nText size="small" color="text-base">Drag the inner edge to change the sidebar width.</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 200,
		maxWidth: 420,
	},
};

export const RightSide: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nListbox, N8nListboxItem, N8nIcon, N8nText },
		setup() {
			const width = ref(240);
			const activeId = ref(links[1]?.id ?? '');
			return { args, links, width, activeId, menuIcon, listboxStyle };
		},
		template: `
			<div style="${frameStyle}">
				<div style="${mainStyle}">
					<N8nText bold size="medium">Main</N8nText>
					<N8nText size="small" color="text-base">The handle sits on the inner edge when the sidebar is on the right.</N8nText>
				</div>
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Sections">
					<div style="${listPaddingStyle}">
						<N8nListbox
							v-model="activeId"
							variant="flush"
							size="small"
							max-height="none"
							aria-label="Sections"
							:style="listboxStyle"
						>
							<N8nListboxItem
								v-for="item in links"
								:key="item.id"
								:value="item.id"
								:label="item.label"
							>
								<template #leading>
									<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
								</template>
							</N8nListboxItem>
						</N8nListbox>
					</div>
				</N8nModalSidebar>
			</div>
		`,
	}),
	args: {
		side: 'right',
		resizable: true,
	},
};

type FileSection = {
	id: string;
	label: string;
	addLabel: string;
	items: IMenuItem[];
};

const readme: IMenuItem = { id: 'readme', label: 'README.md', icon: 'file-text' };

const fileSections: FileSection[] = [
	{
		id: 'skills',
		label: 'Skills',
		addLabel: 'Add skill',
		items: [
			{ id: 'skill-search', label: 'search', icon: 'book-open' },
			{ id: 'skill-recruiting', label: 'recruiting', icon: 'book-open' },
			{ id: 'skill-studies', label: 'studies', icon: 'book-open' },
			{ id: 'skill-survey', label: 'survey-insights', icon: 'book-open' },
		],
	},
	{
		id: 'workflows',
		label: 'Workflows',
		addLabel: 'Add workflow',
		items: [
			{ id: 'wf-search', label: 'Hybrid search', icon: 'workflow' },
			{ id: 'wf-transcript', label: 'Get transcript', icon: 'workflow' },
			{ id: 'wf-recruit', label: 'Recruiting wizard', icon: 'workflow' },
			{ id: 'wf-project', label: 'Create project', icon: 'workflow' },
			{ id: 'wf-report', label: 'Monthly report', icon: 'workflow' },
		],
	},
	{
		id: 'agents',
		label: 'Sub-agents',
		addLabel: 'Add sub-agent',
		items: [{ id: 'agent-research', label: 'Research agent', icon: 'bot' }],
	},
	{
		id: 'tables',
		label: 'Data tables',
		addLabel: 'Add data table',
		items: [
			{ id: 'table-transcripts', label: 'Transcripts', icon: 'table' },
			{ id: 'table-candidates', label: 'Candidates', icon: 'table' },
			{ id: 'table-responses', label: 'Responses', icon: 'table' },
		],
	},
	{
		id: 'mcps',
		label: 'MCPs',
		addLabel: 'Add MCP',
		items: [
			{ id: 'mcp-slack', label: 'Slack', icon: 'plug' },
			{ id: 'mcp-notion', label: 'Notion', icon: 'plug' },
			{ id: 'mcp-gmail', label: 'Gmail', icon: 'plug' },
		],
	},
	{
		id: 'credentials',
		label: 'Credentials',
		addLabel: 'Add credential',
		items: [
			{ id: 'cred-slack', label: 'Slack account', icon: 'key-round' },
			{ id: 'cred-gmail', label: 'Gmail account', icon: 'key-round' },
			{ id: 'cred-notion', label: 'Notion account', icon: 'key-round' },
		],
	},
];

const fileDetails: Record<string, string> = {
	readme: 'What this plugin does, and how an agent uses it.',
	'skill-search': 'When to search the corpus, and how to cite a result.',
	'skill-recruiting': 'Who can be invited, and how often.',
	'skill-studies': 'How a study moves from draft to close-out.',
	'skill-survey': 'How to read the monthly survey, including its bias.',
	'wf-search': 'Search sessions, calls, and forum threads in one step.',
	'wf-transcript': 'Load one session and the text around a quote.',
	'wf-recruit': 'Pick an audience, review the batch, and send invites.',
	'wf-project': 'Draft the script and create the project folder.',
	'wf-report': 'Group the month’s comments by theme.',
	'agent-research': 'A sub-agent that reads the corpus and writes a brief.',
	'table-transcripts': 'Session rows the search workflows read.',
	'table-candidates': 'People who can be invited to a study.',
	'table-responses': 'Survey comments for the monthly report.',
	'mcp-slack': 'Slack tools this plugin can call.',
	'mcp-notion': 'Notion tools this plugin can call.',
	'mcp-gmail': 'Gmail tools this plugin can call.',
	'cred-slack': 'The Slack account this plugin uses.',
	'cred-gmail': 'The Gmail account this plugin uses.',
	'cred-notion': 'The Notion account this plugin uses.',
};

const pluginFiles = [readme, ...fileSections.flatMap((section) => section.items)];

export const SkillEditor: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'A file list with sections. Each section has a heading and an add button. Arrow keys move through the files. Select a file to show it in the main area.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nModalSidebar,
			N8nListbox,
			N8nListboxItem,
			N8nIcon,
			N8nText,
			N8nIconButton,
		},
		setup() {
			const width = ref(240);
			const activeId = ref(readme.id);
			return {
				args,
				width,
				activeId,
				readme,
				fileSections,
				fileDetails,
				pluginFiles,
				menuIcon,
				listboxStyle,
			};
		},
		template: `
			<div style="${editorFrameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Plugin files">
					<div style="${listPaddingStyle}">
					<N8nListbox
						v-model="activeId"
						variant="flush"
						size="small"
						max-height="none"
						aria-label="Plugin files"
						:style="listboxStyle"
					>
						<N8nListboxItem :value="readme.id" :label="readme.label">
							<template #leading>
								<N8nIcon v-if="menuIcon(readme)" :icon="menuIcon(readme)" />
							</template>
						</N8nListboxItem>
						<template v-for="section in fileSections" :key="section.id">
							<div style="${sectionHeaderStyle}" @keydown.stop>
								<N8nText size="small" color="text-light" bold>{{ section.label }}</N8nText>
								<N8nIconButton
									icon="plus"
									variant="ghost"
									size="xsmall"
									:aria-label="section.addLabel"
								/>
							</div>
							<N8nListboxItem
								v-for="item in section.items"
								:key="item.id"
								:value="item.id"
								:label="item.label"
							>
								<template #leading>
									<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
								</template>
							</N8nListboxItem>
						</template>
					</N8nListbox>
					</div>
				</N8nModalSidebar>
				<div style="${mainStyle}">
					<N8nText bold size="large">{{ pluginFiles.find((item) => item.id === activeId)?.label }}</N8nText>
					<N8nText size="small" color="text-base">{{ fileDetails[activeId] }}</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 180,
		maxWidth: 360,
	},
};

export const InDialog: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The dialog starts closed. Open it to edit the plugin files. The add button opens a dialog on top. The body does not scroll. The sidebar and the main area scroll on their own.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogFooter,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nButton,
			N8nModalSidebar,
			N8nListbox,
			N8nListboxItem,
			N8nIcon,
			N8nIconButton,
			N8nInput,
			N8nInputLabel,
			N8nText,
		},
		setup() {
			const isOpen = ref(false);
			const addOpen = ref(false);
			const addSectionId = ref('');
			const addName = ref('');
			const width = ref(240);
			const activeId = ref(readme.id);
			const sections = ref(
				fileSections.map((section) => ({
					...section,
					items: section.items.map((item) => ({ ...item })),
				})),
			);
			let addedCount = 0;

			const files = computed(() => [readme, ...sections.value.flatMap((section) => section.items)]);
			const addTitle = computed(() => {
				return (
					sections.value.find((section) => section.id === addSectionId.value)?.addLabel ?? 'Add'
				);
			});
			const activeFile = computed(() => files.value.find((item) => item.id === activeId.value));

			function openAdd(sectionId: string) {
				addSectionId.value = sectionId;
				addName.value = '';
				addOpen.value = true;
			}

			function confirmAdd() {
				const section = sections.value.find((item) => item.id === addSectionId.value);
				const label = addName.value.trim();
				if (!section || label === '') {
					return;
				}

				addedCount += 1;
				const icon = section.items[0]?.icon;
				const item: IMenuItem = {
					id: `${section.id}-new-${addedCount}`,
					label,
					icon: typeof icon === 'string' ? icon : 'file',
				};
				section.items = [...section.items, item];
				activeId.value = item.id;
				addOpen.value = false;
			}

			return {
				args,
				isOpen,
				addOpen,
				addName,
				addTitle,
				width,
				activeId,
				activeFile,
				readme,
				sections,
				fileDetails,
				menuIcon,
				listboxStyle,
				openAdd,
				confirmAdd,
			};
		},
		template: `
			<div>
				<N8nButton variant="solid" label="Open dialog" @click="isOpen = true" />
				<N8nDialog v-model:open="isOpen" size="full" aria-label="Research plugin" style="height: 70vh;">
					<N8nDialogHeader style="flex-direction: row; align-items: center; gap: var(--spacing--xs);">
						<N8nDialogTitle style="flex: 1; min-width: 0;">Research plugin</N8nDialogTitle>
						<N8nButton label="Done" @click="isOpen = false" />
					</N8nDialogHeader>
					<N8nDialogBody style="padding: 0; overflow: hidden; border-block: var(--border);">
						<div style="display: flex; flex: 1; min-height: 0; overflow: hidden;">
							<N8nModalSidebar v-model:width="width" v-bind="args" label="Plugin files">
								<div style="${listPaddingStyle}">
									<N8nListbox
										v-model="activeId"
										variant="flush"
										size="small"
										max-height="none"
										aria-label="Plugin files"
										:style="listboxStyle"
									>
										<N8nListboxItem :value="readme.id" :label="readme.label">
											<template #leading>
												<N8nIcon v-if="menuIcon(readme)" :icon="menuIcon(readme)" />
											</template>
										</N8nListboxItem>
										<template v-for="section in sections" :key="section.id">
											<div style="${sectionHeaderStyle}" @keydown.stop>
												<N8nText size="small" color="text-light" bold>{{ section.label }}</N8nText>
												<N8nIconButton
													icon="plus"
													variant="ghost"
													size="xsmall"
													:aria-label="section.addLabel"
													@click="openAdd(section.id)"
												/>
											</div>
											<N8nListboxItem
												v-for="item in section.items"
												:key="item.id"
												:value="item.id"
												:label="item.label"
											>
												<template #leading>
													<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
												</template>
											</N8nListboxItem>
										</template>
									</N8nListbox>
								</div>
							</N8nModalSidebar>
							<div style="${mainStyle}">
								<N8nText bold size="large">{{ activeFile?.label }}</N8nText>
								<N8nText size="small" color="text-base">{{ fileDetails[activeId] || 'A new file in this plugin.' }}</N8nText>
							</div>
						</div>
					</N8nDialogBody>
				</N8nDialog>
				<N8nDialog v-model:open="addOpen" stacked size="small" :header="addTitle">
					<N8nDialogBody>
						<N8nInputLabel label="Name" input-name="add-file-name">
							<N8nInput id="add-file-name" v-model="addName" name="add-file-name" size="small" />
						</N8nInputLabel>
					</N8nDialogBody>
					<N8nDialogFooter>
						<N8nButton variant="outline" label="Cancel" @click="addOpen = false" />
						<N8nButton label="Add" :disabled="addName.trim() === ''" @click="confirmAdd" />
					</N8nDialogFooter>
				</N8nDialog>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 160,
		maxWidth: 480,
	},
};

import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { ref } from 'vue';

import N8nIconButton from '../N8nIconButton';
import N8nInput from '../N8nInput';
import N8nInputLabel from '../N8nInputLabel';
import N8nMenuItem from '../N8nMenuItem';
import N8nText from '../N8nText';
import N8nModalSidebar from './ModalSidebar.vue';
import type { IMenuItem } from '../../types';

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
					'A resizable sidebar with its own background. Place it inside a modal or any other layout. The parent sets the height. The slot supplies the content.',
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

// Menu items already keep 2px under each row. A flex gap here would add more space.
const linkListStyle = [
	'display: flex',
	'flex-direction: column',
	'padding: var(--spacing--2xs) var(--spacing--3xs)',
].join('; ');

const navStyle = ['display: flex', 'flex-direction: column', 'padding: var(--spacing--2xs) 0'].join(
	'; ',
);

const readmeGroupStyle = ['padding: 0 var(--spacing--3xs) var(--spacing--2xs)'].join('; ');

const sectionHeaderStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: space-between',
	'gap: var(--spacing--4xs)',
	'margin: var(--spacing--4xs) var(--spacing--3xs) 0',
	'padding: var(--spacing--4xs) var(--spacing--3xs)',
].join('; ');

export const Links: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nMenuItem, N8nText },
		setup() {
			const width = ref(240);
			const activeId = ref(links[0]?.id ?? '');
			return { args, links, width, activeId };
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Sections">
					<div style="${linkListStyle}">
						<N8nMenuItem
							v-for="item in links"
							:key="item.id"
							:item="item"
							:active="item.id === activeId"
							@click="activeId = item.id"
						/>
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

export const Sections: Story = {
	render: (args) => ({
		components: { N8nModalSidebar, N8nMenuItem, N8nText, N8nIconButton },
		setup() {
			const width = ref(240);
			const guide: IMenuItem = { id: 'guide', label: 'Guide.md', icon: 'file' };
			return { args, width, guide };
		},
		template: `
			<div style="${frameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Files">
					<div style="${contentStyle}">
						<N8nMenuItem :item="guide" active />
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
		components: { N8nModalSidebar, N8nMenuItem, N8nText },
		setup() {
			const width = ref(240);
			const activeId = ref(links[1]?.id ?? '');
			return { args, links, width, activeId };
		},
		template: `
			<div style="${frameStyle}">
				<div style="${mainStyle}">
					<N8nText bold size="medium">Main</N8nText>
					<N8nText size="small" color="text-base">The handle sits on the inner edge when the sidebar is on the right.</N8nText>
				</div>
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Sections">
					<div style="${linkListStyle}">
						<N8nMenuItem
							v-for="item in links"
							:key="item.id"
							:item="item"
							:active="item.id === activeId"
							@click="activeId = item.id"
						/>
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
					'A file list with sections. Each section has a heading and an add button. The rows are menu items. Select a file to show it in the main area.',
			},
		},
	},
	render: (args) => ({
		components: { N8nModalSidebar, N8nMenuItem, N8nText, N8nIconButton },
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
			};
		},
		template: `
			<div style="${editorFrameStyle}">
				<N8nModalSidebar v-model:width="width" v-bind="args" label="Plugin files">
					<div style="${navStyle}">
						<div style="${readmeGroupStyle}">
							<N8nMenuItem
								:item="readme"
								:active="activeId === readme.id"
								@click="activeId = readme.id"
							/>
						</div>
						<section v-for="section in fileSections" :key="section.id">
							<div style="${sectionHeaderStyle}">
								<N8nText size="small" color="text-light" bold>{{ section.label }}</N8nText>
								<N8nIconButton
									icon="plus"
									variant="ghost"
									size="xsmall"
									:aria-label="section.addLabel"
								/>
							</div>
							<div style="${linkListStyle}">
								<N8nMenuItem
									v-for="item in section.items"
									:key="item.id"
									:item="item"
									:active="item.id === activeId"
									@click="activeId = item.id"
								/>
							</div>
						</section>
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

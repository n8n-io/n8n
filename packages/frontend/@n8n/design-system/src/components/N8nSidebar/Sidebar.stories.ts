import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, defineComponent, nextTick, onMounted, ref, watch, type PropType } from 'vue';

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
import { N8nRadioGroup, N8nRadioGroupItem } from '../N8nRadioGroup';
import N8nText from '../N8nText';
import N8nTooltip from '../N8nTooltip';
import N8nListbox from '../N8nListbox/Listbox.vue';
import N8nListboxItem from '../N8nListbox/ListboxItem.vue';
import N8nSidebar from './Sidebar.vue';

type SidebarFile = {
	id: string;
	label: string;
	icon?: string;
};

function menuIcon(item: SidebarFile) {
	return item.icon;
}

const links: SidebarFile[] = [
	{ id: 'overview', label: 'Overview', icon: 'house' },
	{ id: 'workflows', label: 'Workflows', icon: 'workflow' },
	{ id: 'executions', label: 'Executions', icon: 'clock' },
	{ id: 'settings', label: 'Settings', icon: 'settings' },
];

const meta = {
	title: 'Core/Sidebar',
	component: N8nSidebar,
	parameters: {
		docs: {
			description: {
				component:
					'A resizable sidebar with its own background. Place it inside a modal or any other layout. The parent sets the height. The slot supplies the content. Put a listbox in the slot when the rows are selectable. Arrow keys then move the highlight. Bind v-model:width and the parent stores the width. Omit width and the sidebar stores the width. A story with a storage key saves its width. Drag the inner edge, then reload the canvas. That sidebar opens at the saved width.',
			},
		},
	},
	argTypes: {
		side: { control: 'select', options: ['left', 'right'] },
		resizable: { control: 'boolean' },
		minWidth: { control: 'number' },
		maxWidth: { control: 'number' },
		widthStorageId: { control: 'text' },
	},
} satisfies Meta<typeof N8nSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

const hairline = '1px solid var(--border-color--subtle)';

// The sidebar border is translucent and sits on the sidebar fill.
// This solid pair is that same line, so the frame matches it on the page.
const frameBorder = '1px solid light-dark(var(--color--neutral-200), var(--color--neutral-700))';

const widthModesStyle = ['display: flex', 'flex-direction: column', 'gap: var(--spacing--xl)'].join(
	'; ',
);

const widthModeSectionStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--sm)',
].join('; ');

const frameStyle = [
	'display: flex',
	'height: 28rem',
	'width: 48rem',
	'max-width: 100%',
	`border: ${frameBorder}`,
	'border-radius: var(--radius--lg)',
	'overflow: hidden',
].join('; ');

const editorFrameStyle = frameStyle.replace('height: 28rem', 'height: 36rem');

const mainStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--2xs)',
	'flex: 1',
	'min-width: 0',
	'padding: var(--spacing--md)',
	'color: var(--text-color)',
].join('; ');

const editorLayoutStyle = [
	'display: flex',
	'flex: 1',
	'min-width: 0',
	'min-height: 0',
	'height: 100%',
	'overflow: hidden',
].join('; ');

const sidebarColumnStyle = ['display: flex', 'height: 100%', 'min-height: 0', 'min-width: 0'].join(
	'; ',
);

const dialogSidebarFill = 'var(--background--subtle)';

const dialogBodyStyle = [
	'padding: 0',
	'overflow: hidden',
	`border-block-start: ${hairline}`,
	`--n8n-sidebar--color--background: ${dialogSidebarFill}`,
].join('; ');

const dialogMainStyle = [
	'display: flex',
	'flex-direction: column',
	'gap: var(--spacing--sm)',
	'flex: 1',
	'min-width: 0',
	'min-height: 0',
	'overflow: auto',
	'padding: var(--spacing--md)',
	'color: var(--text-color)',
].join('; ');

const contentStyle = ['display: flex', 'flex-direction: column', 'gap: var(--spacing--sm)'].join(
	'; ',
);

const pinnedBarStyle = [
	'display: flex',
	'flex: none',
	'align-items: center',
	'min-width: 0',
	'padding-block: var(--spacing--xs)',
	'padding-inline: var(--spacing--sm)',
].join('; ');

const pinnedHeaderStyle = `${pinnedBarStyle}; border-block-end: ${hairline}`;

const pinnedFooterStyle = `${pinnedBarStyle}; border-block-start: ${hairline}`;

const pinnedListStyle = ['padding: var(--spacing--2xs)'].join('; ');

const sectionHeaderStyle = [
	'display: flex',
	'align-items: center',
	'justify-content: space-between',
	'gap: var(--spacing--4xs)',
	'margin-top: var(--spacing--4xs)',
	'padding-block: var(--spacing--4xs) 0',
	'padding-inline: var(--spacing--xs) 0',
].join('; ');

const singleLineStyle = [
	'min-width: 0',
	'overflow: hidden',
	'text-overflow: ellipsis',
	'white-space: nowrap',
].join('; ');

const sectionToggleStyle = [
	'appearance: none',
	'border: 0',
	'display: flex',
	'flex: none',
	'align-items: center',
	'gap: var(--spacing--4xs)',
	'min-width: 0',
	'max-width: 100%',
	'cursor: pointer',
	'color: inherit',
	'font: inherit',
	'text-align: start',
].join('; ');

function stopSectionKeys(event: KeyboardEvent) {
	if (event.key !== 'Tab') event.stopPropagation();
}

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

export const WithLinks: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Each row shows a delete button and an actions menu. The menu opens. Choosing an item does not change the list.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nSidebar,
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
			const activeId = ref(links[0]?.id ?? '');

			return { args, width, activeId, links, rowActions, menuIcon };
		},
		template: `
			<div style="${frameStyle}">
				<N8nSidebar v-model:width="width" v-bind="args" label="Links">
					<N8nListbox v-model="activeId" label="Links" style="width: 100%">
						<N8nListboxItem
							v-for="item in links"
							:key="item.id"
							:value="item.id"
						>
							<template #leading>
								<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
							</template>
							{{ item.label }}
							<template #trailing>
								<span
									style="display: inline-flex; align-items: center"
									@click.stop
									@keydown.enter.stop
									@keydown.space.stop
								>
									<N8nTooltip content="Delete" placement="top" as-child>
										<N8nIconButton
											icon="trash-2"
											variant="ghost"
											size="xsmall"
											:aria-label="'Delete ' + item.label"
										/>
									</N8nTooltip>
									<N8nDropdownMenu
										:items="rowActions"
										placement="bottom-end"
										width="12rem"
										:modal="false"
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
								</span>
							</template>
						</N8nListboxItem>
					</N8nListbox>
				</N8nSidebar>
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
		widthStorageId: 'n8n-sidebar-with-links-width',
	},
};

type FileSection = {
	id: string;
	label: string;
	addLabel: string;
	collapsible: boolean;
	items: SidebarFile[];
};

const readme: SidebarFile = { id: 'readme', label: 'README.md', icon: 'file-text' };

const fileSections: FileSection[] = [
	{
		id: 'skills',
		label: 'Skills',
		addLabel: 'Add skill',
		collapsible: true,
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
		collapsible: false,
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
		collapsible: true,
		items: [{ id: 'agent-research', label: 'Research agent', icon: 'bot' }],
	},
	{
		id: 'tables',
		label: 'Data tables',
		addLabel: 'Add data table',
		collapsible: false,
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
		collapsible: true,
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
		collapsible: true,
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

type FileBlock = {
	heading?: string;
	text: string;
};

const readmeBlocks: FileBlock[] = [
	{ text: 'What this plugin does, and how an agent uses it.' },
	{
		heading: 'Purpose',
		text: 'This plugin helps an agent research a product. It keeps the skills, the workflows, the tables, and the accounts in one place.',
	},
	{
		text: 'An agent starts here. It reads a skill before it runs a workflow. It uses a table when it needs rows. It uses an account only when a step must send or read a message.',
	},
	{
		heading: 'Skills',
		text: 'A skill is a short instruction. It says when to act, what to skip, and how to cite a source.',
	},
	{
		text: 'Search tells the agent when the corpus has an answer. Recruiting tells it who can be invited, and how often. Studies tells it how a study moves from draft to close-out.',
	},
	{
		text: 'Survey insights tells the agent how to read the monthly survey, including its bias. The agent names that bias in the brief.',
	},
	{
		heading: 'Workflows',
		text: 'A workflow is the step the agent runs. Hybrid search looks across sessions, calls, and forum threads.',
	},
	{
		text: 'Get transcript loads one session and the lines around a quote. Recruiting wizard picks an audience, shows the batch, and sends the invites.',
	},
	{
		text: 'Create project drafts the script and makes the folder. Monthly report groups comments by theme.',
	},
	{
		heading: 'Sub-agents',
		text: 'The research agent reads the corpus and writes a brief. It names the session it used. It does not invent a quote.',
	},
	{
		text: 'The parent agent checks the citations before it uses the brief. A brief without a file name goes back.',
	},
	{
		heading: 'Data',
		text: 'Transcripts, candidates, and survey responses each have a table. Workflows read those tables. They do not paste the whole table into the prompt.',
	},
	{
		text: 'Each row is one session, one person, or one comment. Columns stay stable. Add a column only when a skill needs it.',
	},
	{
		heading: 'Connections',
		text: 'Slack, Notion, and Gmail are connected through MCP. Each connection uses the matching account in Credentials.',
	},
	{
		text: 'The Slack account posts a study update. The Gmail account sends an invite. The Notion account files the brief.',
	},
	{
		text: 'A skill names the tool it may call. Other tools on that connection stay unused.',
	},
	{
		heading: 'Rules',
		text: 'Do not invite the same person twice in one month. Do not quote a session the caller cannot open. Do not send a message that a skill did not ask for.',
	},
	{
		text: 'Say which file you used. A later run should be able to open that file and see the same note.',
	},
	{
		text: 'If two files disagree, follow the skill. Then update the workflow so the two files match.',
	},
	{
		heading: 'Upkeep',
		text: 'Change a skill when the process changes. Add a workflow when a task repeats. Remove an account the plugin no longer uses.',
	},
	{
		text: 'After a change, read this file again. The first lines should still say what the plugin is for.',
	},
	{
		text: 'Keep names stable. Other files point at a skill, a workflow, or a table by that name.',
	},
	{
		text: 'Leave a new file free of secrets. Put keys in Credentials. A workflow only names the account.',
	},
];

const sectionNotes: Record<string, FileBlock[]> = {
	skills: [
		{
			heading: 'When to use it',
			text: 'Read this skill before the matching workflow runs. The skill wins when the two files disagree.',
		},
		{
			text: 'The skill names the inputs, the output, and what the agent must not do. Keep that list short.',
		},
		{
			text: 'Cite the row or the session you used. A citation is a name and a date. A paraphrase alone is not enough.',
		},
		{
			text: 'Skip a source you cannot open. Say that you skipped it. Do not fill the gap with a guess.',
		},
		{
			heading: 'How to write the result',
			text: 'Write the decision in one sentence. List the evidence under it. Stop when the evidence runs out.',
		},
		{
			text: 'Do not add a rule here for a one-off case. Put that case in the workflow notes.',
		},
		{
			text: 'One skill covers one job. Split the file when the job has two owners.',
		},
		{
			text: 'Link the workflow that carries the skill out. Do not copy the workflow steps into the skill.',
		},
		{
			heading: 'Checks',
			text: 'The agent can name the workflow this skill belongs to.',
		},
		{ text: 'The agent can name the table it reads, or say that this skill reads no table.' },
		{ text: 'The agent can say who must not be contacted.' },
		{ text: 'The agent can point at the last session it is allowed to cite.' },
		{
			text: 'Review this skill when the study process changes. Keep the language plain. Another agent will read it without this chat.',
		},
	],
	workflows: [
		{
			heading: 'Steps',
			text: 'Open the skill first. This workflow should not invent a rule the skill does not have.',
		},
		{
			text: 'Each step has one output. Name that output so the next step can use it.',
		},
		{
			text: 'Fail in the open. If a step cannot run, stop and say which input was missing.',
		},
		{
			text: 'Do not loop over a whole table when the skill asked for one row.',
		},
		{
			heading: 'Writes',
			text: 'Write the result back to the table the skill names. Do not create a second copy of the row.',
		},
		{
			text: 'A person confirms a send step. The workflow shows the batch before it sends.',
		},
		{
			text: 'Keep the account on the credential file. This workflow only names that account.',
		},
		{
			heading: 'After a run',
			text: 'The brief points at the rows it used. A run with no row ids is incomplete.',
		},
		{ text: 'Test with a small batch. Then run the full set.' },
		{ text: 'If a later step repeats an earlier one, delete the repeat.' },
		{
			text: 'Keep the old workflow only when a live study still calls it. Otherwise replace the steps in this file.',
		},
		{
			text: 'Record the skill name at the top of the run log so a person can open the matching file.',
		},
	],
	agents: [
		{
			heading: 'Scope',
			text: 'This sub-agent gets a narrow job and a short brief. It does not take a second goal in the same run.',
		},
		{
			text: 'It can read the skills and the tables. It cannot send mail or post to Slack.',
		},
		{
			text: 'Pass file names into the run. Do not paste the file bodies into the prompt.',
		},
		{
			heading: 'Brief',
			text: 'The brief has a finding, the evidence, and the files it opened. It stops when the evidence is thin.',
		},
		{
			text: 'It says what it could not find. It does not invent a quote to fill that gap.',
		},
		{
			text: 'The parent agent checks the citations before it uses the brief.',
		},
		{
			text: 'If the brief is longer than the evidence, cut the brief.',
		},
		{
			heading: 'Runs',
			text: 'One sub-agent does not call another sub-agent. The parent starts each run.',
		},
		{ text: 'Keep the prompt in this file. The workflow only starts the run.' },
		{ text: 'Record the run id on the brief so a person can open it later.' },
		{
			text: 'Retire this sub-agent when a workflow can do the same job in one step.',
		},
		{
			text: 'A failed run names the file it could not open. It does not retry with a wider search.',
		},
	],
	tables: [
		{
			heading: 'Rows',
			text: 'This table is the source the workflows read. Each row is one session, one person, or one comment.',
		},
		{
			text: 'Columns stay stable. Add a column only when a skill needs it. Say why in this file.',
		},
		{
			text: 'Do not store a secret in a cell. Secrets live in Credentials.',
		},
		{
			text: 'Workflows filter rows. They do not export the table into the chat.',
		},
		{
			heading: 'Quality',
			text: 'A row the agent cannot open is missing. Say so. Do not fill the gap.',
		},
		{
			text: 'Keep dates in one format. The monthly report groups by that date.',
		},
		{
			text: 'If two rows share a person, keep both. Do not merge them in the table.',
		},
		{
			text: 'Sample rows are marked. A run skips a row marked sample.',
		},
		{
			heading: 'Use',
			text: 'The table name matches this file name. Workflows look the table up by that name.',
		},
		{ text: 'Delete a row only when the skill says the record is done.' },
		{
			text: 'Note the last workflow that wrote to the table, and when it wrote.',
		},
		{
			text: 'A new column needs a default for the rows that already exist. Do not leave those cells blank.',
		},
	],
	mcps: [
		{
			heading: 'Tools',
			text: 'This connection exposes a few tools. The plugin does not get the whole product.',
		},
		{
			text: 'A skill names the tool it may call. Other tools stay unused until a skill names them.',
		},
		{
			text: 'Read stays available. Send and post stay behind a confirm step.',
		},
		{
			text: 'The account for this connection is in Credentials. Do not paste a token here.',
		},
		{
			heading: 'Failures',
			text: 'If the tool returns nothing, the workflow stops. It does not guess a result.',
		},
		{
			text: 'Rate limits apply. A batch waits. It does not retry in a tight loop.',
		},
		{
			text: 'Errors name the tool and the account. They do not include the payload.',
		},
		{
			heading: 'Change',
			text: 'Log the tool name and the id it returned. Do not log the message body.',
		},
		{ text: 'A new tool needs a line in the skill before a workflow may call it.' },
		{ text: 'Test with one record. Then allow the batch.' },
		{ text: 'Disconnect the tool when the plugin no longer uses it.' },
		{
			text: 'This connection is shared by every workflow in the plugin. A change here changes all of them.',
		},
	],
	credentials: [
		{
			heading: 'Account',
			text: 'This account is the only place the secret lives. Workflows and connections refer to it by name.',
		},
		{
			text: 'Do not copy the account into a skill, a workflow, or a table.',
		},
		{
			text: 'One account serves one product. Do not reuse it for a second product.',
		},
		{
			text: 'The name on this file matches the name the workflow asks for.',
		},
		{
			heading: 'Access',
			text: 'Access is limited to the channels and pages this plugin uses. Widen it only when a skill asks.',
		},
		{
			text: 'A person confirms the first send from a new account.',
		},
		{
			text: 'A failed login stops the run. The run does not fall back to another account.',
		},
		{
			heading: 'Care',
			text: 'Note who owns the account, and when it was last checked.',
		},
		{
			text: 'Rotate the account when a person who used it leaves the project.',
		},
		{
			text: 'If another plugin also uses this account, say so here.',
		},
		{ text: 'Remove the account when no workflow still names it.' },
		{
			text: 'A replacement account gets a new file. Do not overwrite this one while a live workflow still points here.',
		},
	],
};

const newFileNotes: FileBlock[] = [
	{
		heading: 'Start',
		text: 'Write the job of this file in one sentence. Then name the skill, workflow, or table it belongs to.',
	},
	{
		text: 'Keep secrets out of this file. Put an account in Credentials and refer to it by name.',
	},
	{
		text: 'Use the same names as the files that will call this one. A new name needs a link from those files.',
	},
	{
		heading: 'Notes for the agent',
		text: 'Say when to open this file. Say what a finished result looks like. Say what to skip.',
	},
	{
		text: 'Cite a source with a name and a date. Skip a source the caller cannot open.',
	},
	{
		text: 'One file covers one job. Split it when a second owner appears.',
	},
	{
		heading: 'Checks',
		text: 'Another person can tell what this file is for from the first three lines.',
	},
	{ text: 'The matching section in the sidebar is the section this file belongs to.' },
	{ text: 'No step in this file sends a message without a confirm.' },
	{ text: 'No line in this file repeats a rule that already lives in a skill.' },
];

function blocksFor(id: string): FileBlock[] {
	if (id === readme.id) return readmeBlocks;

	const lead =
		fileDetails[id] ?? 'A new file in this plugin. Write the notes the agent should follow.';
	const sectionId =
		fileSections.find((section) => section.items.some((item) => item.id === id))?.id ??
		id.split('-new-')[0] ??
		'';

	return [{ text: lead }, ...(sectionNotes[sectionId] ?? newFileNotes)];
}

const PluginFilesEditor = defineComponent({
	name: 'PluginFilesEditor',
	components: {
		N8nSidebar,
		N8nListbox,
		N8nListboxItem,
		N8nIcon,
		N8nText,
		N8nIconButton,
		N8nDialog,
		N8nDialogBody,
		N8nDialogFooter,
		N8nButton,
		N8nInput,
		N8nInputLabel,
	},
	props: {
		side: { type: String as PropType<'left' | 'right'>, default: 'left' },
		resizable: { type: Boolean, default: true },
		minWidth: { type: Number, default: 180 },
		maxWidth: { type: Number, default: 360 },
		widthStorageId: { type: String, default: undefined },
		width: { type: Number, default: undefined },
		uncontrolled: { type: Boolean, default: false },
	},
	emits: ['update:width'],
	setup(props, { emit }) {
		const width = ref(props.width ?? 240);
		watch(
			() => props.width,
			function applyExternalWidth(value) {
				if (value !== undefined) width.value = value;
			},
		);
		function setWidth(value: number) {
			width.value = value;
			emit('update:width', value);
		}
		const sidebarWidthAttrs = computed(() =>
			props.uncontrolled ? {} : { width: width.value, 'onUpdate:width': setWidth },
		);
		const activeId = ref(readme.id);
		const sections = ref(
			fileSections.map((section) => ({
				...section,
				items: section.items.map((item) => ({ ...item })),
			})),
		);
		const openSectionIds = ref(
			fileSections
				.filter((section) => section.collapsible && section.id !== 'credentials')
				.map((section) => section.id),
		);
		const addOpen = ref(false);
		const addSectionId = ref('');
		const addName = ref('');
		let addedCount = 0;
		const filePane = ref<HTMLElement | null>(null);

		const files = computed(() => [readme, ...sections.value.flatMap((section) => section.items)]);
		const activeFile = computed(() => files.value.find((item) => item.id === activeId.value));
		const activeBlocks = computed(() => blocksFor(activeId.value));
		const addTitle = computed(
			() => sections.value.find((section) => section.id === addSectionId.value)?.addLabel ?? 'Add',
		);

		watch(activeId, async () => {
			await nextTick();
			if (filePane.value) filePane.value.scrollTop = 0;
		});

		function isSectionOpen(id: string) {
			return openSectionIds.value.includes(id);
		}

		function toggleSection(id: string) {
			openSectionIds.value = isSectionOpen(id)
				? openSectionIds.value.filter((sectionId) => sectionId !== id)
				: [...openSectionIds.value, id];
		}

		function chevronStyle(id: string) {
			return {
				display: 'inline-flex',
				flex: 'none',
				transform: isSectionOpen(id) ? 'rotate(90deg)' : 'none',
			};
		}

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
			const item: SidebarFile = {
				id: `${section.id}-new-${addedCount}`,
				label,
				icon: typeof icon === 'string' ? icon : 'file',
			};
			section.items = [...section.items, item];
			if (section.collapsible && !isSectionOpen(section.id)) {
				openSectionIds.value = [...openSectionIds.value, section.id];
			}
			activeId.value = item.id;
			addOpen.value = false;
		}

		onMounted(() => {
			const id = 'plugin-files-editor-focus';
			let style = document.getElementById(id);
			if (!style) {
				style = document.createElement('style');
				style.id = id;
				document.head.appendChild(style);
			}
			// Negative start margin cancels the pill padding, so the label stays aligned.
			style.textContent = [
				'.plugin-files-editor .section-toggle {',
				'box-sizing: border-box;',
				'height: var(--height--xs);',
				'margin: 0;',
				'margin-inline-start: calc(var(--spacing--2xs) * -1);',
				'padding: 0 var(--spacing--2xs);',
				'border-radius: var(--radius--full);',
				'background-color: transparent;',
				'}',
				'.plugin-files-editor .section-toggle:hover {',
				'background-color: var(--background--hover);',
				'}',
				'.plugin-files-editor .section-toggle:active {',
				'background-color: var(--background--active);',
				'}',
				'.plugin-files-editor .section-toggle:focus-visible {',
				'outline: var(--focus--border-width) solid var(--focus--outline-color);',
				'outline-offset: calc(var(--focus--border-width) * -1);',
				'}',
				// The dialog does not clip. Round the sidebar corner that sits on the frame.
				'.sidebar-dialog [data-test-id="sidebar"] {',
				'border-end-start-radius: var(--radius--lg);',
				'}',
			].join(' ');
		});

		return {
			sidebarWidthAttrs,
			activeId,
			sections,
			addOpen,
			addName,
			addTitle,
			filePane,
			readme,
			activeFile,
			activeBlocks,
			menuIcon,
			stopSectionKeys,
			isSectionOpen,
			toggleSection,
			chevronStyle,
			openAdd,
			confirmAdd,
		};
	},
	template: `
		<div class="plugin-files-editor" style="${editorLayoutStyle}">
			<div style="${sidebarColumnStyle}">
			<N8nSidebar
				v-bind="sidebarWidthAttrs"
				:side="side"
				:resizable="resizable"
				:min-width="minWidth"
				:max-width="maxWidth"
				:width-storage-id="widthStorageId"
				label="Plugin files"
			>
				<N8nListbox v-model="activeId" label="Plugin files" style="width: 100%">
					<N8nListboxItem :value="readme.id">
						<template #leading>
							<N8nIcon v-if="menuIcon(readme)" :icon="menuIcon(readme)" />
						</template>
						{{ readme.label }}
					</N8nListboxItem>
					<template v-for="section in sections" :key="section.id">
						<div style="${sectionHeaderStyle}" @keydown="stopSectionKeys">
							<button
								v-if="section.collapsible"
								type="button"
								class="section-toggle"
								style="${sectionToggleStyle}"
								:aria-expanded="isSectionOpen(section.id)"
								@click="toggleSection(section.id)"
							>
								<N8nText size="small" color="text-light" bold style="${singleLineStyle}">{{ section.label }}</N8nText>
								<span class="section-chevron" :style="chevronStyle(section.id)">
									<N8nIcon icon="chevron-right" size="xsmall" color="text-light" />
								</span>
							</button>
							<N8nText v-else size="small" color="text-light" bold style="${singleLineStyle}">{{ section.label }}</N8nText>
							<N8nIconButton
								icon="plus"
								variant="ghost"
								size="xsmall"
								:aria-label="section.addLabel"
								@click.stop="openAdd(section.id)"
							/>
						</div>
						<template v-if="!section.collapsible || isSectionOpen(section.id)">
							<N8nListboxItem
								v-for="item in section.items"
								:key="item.id"
								:value="item.id"
							>
								<template #leading>
									<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
								</template>
								{{ item.label }}
							</N8nListboxItem>
						</template>
					</template>
				</N8nListbox>
			</N8nSidebar>
			</div>
			<div ref="filePane" style="${dialogMainStyle}">
				<N8nText bold size="large" tag="h2" style="margin: 0;">{{ activeFile?.label }}</N8nText>
				<template v-for="(block, index) in activeBlocks" :key="index">
					<N8nText v-if="block.heading" bold size="medium" tag="h3" style="margin: var(--spacing--2xs) 0 0;">
						{{ block.heading }}
					</N8nText>
					<N8nText size="medium" color="text-base" tag="p" style="margin: 0;">
						{{ block.text }}
					</N8nText>
				</template>
			</div>
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
});

export const WithSections: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'Some sections collapse. Click the section name to hide its files. Credentials starts collapsed. Other sections stay open. The add button opens a dialog and adds a file to that section. Tab from an add button moves to the next file in that section. Arrow keys move through the open files.',
			},
		},
	},
	render: (args) => ({
		components: { PluginFilesEditor },
		setup: () => ({ args }),
		template: `
			<div style="${editorFrameStyle}">
				<PluginFilesEditor v-bind="args" />
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 180,
		maxWidth: 360,
		widthStorageId: 'n8n-sidebar-with-sections-width',
	},
};

export const WithCustomContent: Story = {
	parameters: {
		docs: {
			description: {
				story: 'A form. The sidebar padding token is larger here than the padding around a list.',
			},
		},
	},
	render: (args) => ({
		components: { N8nSidebar, N8nText, N8nInput, N8nInputLabel },
		setup() {
			const width = ref(280);
			const name = ref('Weekly digest');
			const note = ref('Send the digest every Monday.');
			return { args, width, name, note };
		},
		template: `
			<div style="${frameStyle}">
				<N8nSidebar v-model:width="width" v-bind="args" label="Details" style="--n8n-sidebar--padding: var(--spacing--sm)">
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
				</N8nSidebar>
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
		widthStorageId: 'n8n-sidebar-details-width',
	},
};

const pinnedFiles = [
	'README.md',
	'package.json',
	'workflow.ts',
	'credentials.ts',
	'trigger.ts',
	'actions.ts',
	'schema.json',
	'icon.svg',
	'locales/en.json',
	'locales/de.json',
	'locales/fr.json',
	'tests/run.spec.ts',
	'tests/auth.spec.ts',
	'docs/setup.md',
	'docs/api.md',
	'CHANGELOG.md',
];

export const WithHeaderAndFooter: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The search stays at the top. The footer stays at the bottom. The list between them scrolls. The list fades at the top and the bottom.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nSidebar,
			N8nListbox,
			N8nListboxItem,
			N8nIcon,
			N8nInput,
			N8nText,
			N8nButton,
		},
		setup() {
			const width = ref(240);
			const query = ref('');
			const activeId = ref(pinnedFiles[0] ?? '');
			const visibleFiles = computed(() => {
				const term = query.value.trim().toLowerCase();
				if (term === '') return pinnedFiles;
				return pinnedFiles.filter((file) => file.toLowerCase().includes(term));
			});
			return { args, width, query, activeId, visibleFiles };
		},
		template: `
			<div style="${frameStyle}">
				<N8nSidebar v-model:width="width" v-bind="args" label="Files" style="--n8n-sidebar--padding: 0">
					<template #header>
						<div style="${pinnedHeaderStyle}">
							<N8nInput v-model="query" size="small" placeholder="Search files" aria-label="Search files" style="width: 100%">
								<template #prefix>
									<N8nIcon icon="search" size="small" />
								</template>
							</N8nInput>
						</div>
					</template>
					<div style="${pinnedListStyle}">
						<N8nListbox v-if="visibleFiles.length > 0" v-model="activeId" label="Files" style="width: 100%">
							<N8nListboxItem v-for="file in visibleFiles" :key="file" :value="file">
								<template #leading>
									<N8nIcon icon="file-text" />
								</template>
								{{ file }}
							</N8nListboxItem>
						</N8nListbox>
						<N8nText v-else size="small" color="text-base">No matching files</N8nText>
					</div>
					<template #footer>
						<div style="${pinnedFooterStyle}">
							<N8nButton variant="outline" size="small" label="Add file" style="width: 100%" />
						</div>
					</template>
				</N8nSidebar>
				<div style="${mainStyle}">
					<N8nText bold size="medium">{{ activeId }}</N8nText>
					<N8nText size="small" color="text-base">Scroll the file list. The search and the footer stay in place.</N8nText>
				</div>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 180,
		maxWidth: 360,
		widthStorageId: 'n8n-sidebar-header-footer-width',
	},
};

export const RightSide: Story = {
	render: (args) => ({
		components: { N8nSidebar, N8nListbox, N8nListboxItem, N8nIcon, N8nText },
		setup() {
			const width = ref(240);
			const activeId = ref(links[1]?.id ?? '');
			return { args, links, width, activeId, menuIcon };
		},
		template: `
			<div style="${frameStyle}">
				<div style="${mainStyle}">
					<N8nText bold size="medium">Main</N8nText>
					<N8nText size="small" color="text-base">The handle sits on the inner edge when the sidebar is on the right.</N8nText>
				</div>
				<N8nSidebar v-model:width="width" v-bind="args" label="Sections">
						<N8nListbox v-model="activeId" label="Sections" style="width: 100%">
							<N8nListboxItem
								v-for="item in links"
								:key="item.id"
								:value="item.id"
							>
								<template #leading>
									<N8nIcon v-if="menuIcon(item)" :icon="menuIcon(item)" />
								</template>
								{{ item.label }}
							</N8nListboxItem>
						</N8nListbox>
				</N8nSidebar>
			</div>
		`,
	}),
	args: {
		side: 'right',
		resizable: true,
		widthStorageId: 'n8n-sidebar-right-width',
	},
};

export const InDialog: Story = {
	parameters: {
		docs: {
			description: {
				story:
					'The dialog starts closed. Open it to edit the plugin files. The editor is the same one as With Sections. The add button opens a dialog on top. The body does not scroll. The sidebar and the file on the right scroll on their own.',
			},
		},
	},
	render: (args) => ({
		components: {
			N8nDialog,
			N8nDialogBody,
			N8nDialogHeader,
			N8nDialogTitle,
			N8nButton,
			PluginFilesEditor,
		},
		setup() {
			const isOpen = ref(false);
			return { args, isOpen };
		},
		template: `
			<div>
				<N8nButton variant="solid" label="Open dialog" @click="isOpen = true" />
				<N8nDialog class="sidebar-dialog" v-model:open="isOpen" size="cover" aria-label="Research plugin">
					<N8nDialogHeader>
						<N8nDialogTitle>Research plugin</N8nDialogTitle>
					</N8nDialogHeader>
					<N8nDialogBody style="${dialogBodyStyle}">
						<PluginFilesEditor v-bind="args" />
					</N8nDialogBody>
				</N8nDialog>
			</div>
		`,
	}),
	args: {
		side: 'left',
		resizable: true,
		minWidth: 160,
		maxWidth: 480,
		widthStorageId: 'n8n-sidebar-dialog-width',
	},
};

export const ControlledUncontrolled: Story = {
	name: 'Controlled/Uncontrolled',
	parameters: {
		docs: {
			description: {
				story:
					'Both editors use the plugin file list. Choose a width in the radio group. That sets the controlled width. Drag the inner edge to change the same value. The option stays selected when the width matches it. The uncontrolled sidebar omits width and keeps the size itself.',
			},
		},
	},
	render: () => ({
		components: { PluginFilesEditor, N8nText, N8nRadioGroup, N8nRadioGroupItem },
		setup() {
			const controlledWidth = ref(240);
			const widthPresets = [
				{ value: '160', width: 160 },
				{ value: '240', width: 240 },
				{ value: '400', width: 400 },
			];
			const selectedPreset = computed({
				get(): string | undefined {
					return widthPresets.find((preset) => preset.width === controlledWidth.value)?.value;
				},
				set(value: string | undefined) {
					const preset = widthPresets.find((item) => item.value === value);
					if (preset) controlledWidth.value = preset.width;
				},
			});
			return { controlledWidth, widthPresets, selectedPreset };
		},
		template: `
			<div style="${widthModesStyle}">
				<section style="${widthModeSectionStyle}">
					<N8nText bold size="medium">Controlled</N8nText>
					<N8nRadioGroup
						v-model="selectedPreset"
						orientation="horizontal"
						name="controlled-sidebar-width"
						aria-label="Sidebar width"
					>
						<N8nRadioGroupItem
							v-for="preset in widthPresets"
							:key="preset.value"
							:value="preset.value"
							:label="preset.value"
						/>
					</N8nRadioGroup>
					<div style="${editorFrameStyle}">
						<PluginFilesEditor v-model:width="controlledWidth" :min-width="160" :max-width="480" />
					</div>
				</section>
				<section style="${widthModeSectionStyle}">
					<N8nText bold size="medium">Uncontrolled</N8nText>
					<N8nText size="small" color="text-base">This sidebar stores its own width.</N8nText>
					<div style="${editorFrameStyle}">
						<PluginFilesEditor uncontrolled :min-width="160" :max-width="480" />
					</div>
				</section>
			</div>
		`,
	}),
};

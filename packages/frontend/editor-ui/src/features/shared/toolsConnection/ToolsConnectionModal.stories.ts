import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { provide, ref } from 'vue';
import { N8nButton } from '@n8n/design-system';

import ToolsConnectionModal from './ToolsConnectionModal.vue';
import McpToolSettingsContent from './McpToolSettingsContent.vue';
import {
	connectedMcpFixture,
	makeLargeMcpList,
	realisticItems,
	sampleCredentials,
} from './fixtures';
import {
	TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY,
	type ToolConnectionCredentialAdapter,
	type NodeConnectionItem,
	type SectionKey,
	type ToolConnectionItem,
	type WorkflowConnectionItem,
} from './types';

/**
 * Stand-in for the editor-ui `NodeToolSettingsContent` / `WorkflowToolConfigContent`
 * — those pull in workflow stores that can't load in Storybook. The stub renders
 * a simple labelled placeholder so the inline-settings flow can be exercised
 * end-to-end without dragging in app dependencies.
 */
const PlaceholderSettingsBody = {
	props: ['title'],
	template: `
		<div style="padding: var(--spacing--md); border: 1px dashed var(--color--foreground); border-radius: var(--border-radius--base); display: flex; flex-direction: column; gap: var(--spacing--2xs);">
			<strong>{{ title }}</strong>
			<span style="color: var(--color--text--tint-1); font-size: var(--font-size--xs);">
				Consumer-supplied settings body would render here (NodeToolSettingsContent,
				WorkflowToolConfigContent, custom form, etc.).
			</span>
		</div>
	`,
};

const INSTANCE_AI_SECTIONS: SectionKey[] = ['connected', 'nodes'];
const AGENT_BUILDER_SECTIONS: SectionKey[] = ['connected', 'nodes', 'agents', 'data', 'workflows'];

const meta = {
	title: 'Modules/ToolsConnectionModal',
	component: ToolsConnectionModal,
	parameters: {
		docs: {
			description: {
				component:
					'Shared modal for connecting MCP servers, nodes, and workflows. Same component serves Instance AI and Agent Builder — driven by the `sections` prop. When the user types in the search input, a Services / Workflows tab strip appears as scroll-to-section navigation.',
			},
		},
	},
	argTypes: {
		sections: {
			control: { type: 'check' },
			options: ['connected', 'nodes', 'agents', 'data', 'workflows'],
		},
	},
} satisfies Meta<typeof ToolsConnectionModal>;
export default meta;

type Story = StoryObj<typeof meta>;

/**
 * All stories share the same shell: a primary "Open Tools modal" button toggles
 * `isOpen` so the modal can be opened/closed at will while the props
 * documentation stays visible. `v-bind="args"` comes BEFORE the v-model
 * bindings so the local refs win over any default args.
 */
function renderWithTrigger(
	initialDetail: ToolConnectionItem | null = null,
	initialDetailMode: 'detail' | 'settings' | undefined = undefined,
) {
	return (args: Record<string, unknown>) => ({
		components: {
			ToolsConnectionModal,
			McpToolSettingsContent,
			PlaceholderSettingsBody,
			N8nButton,
		},
		setup() {
			const isOpen = ref(false);
			const detailItem = ref<ToolConnectionItem | null>(initialDetail);
			const detailMode = ref(initialDetailMode);

			// Provide a fake credential adapter so the credential-picker dropdown
			// has realistic entries (Jake's Notion, etc.) in Storybook without
			// importing editor-ui stores (which would pull in the n8n-workflow ->
			// @n8n/tournament chain that breaks Storybook's dev server).
			const fakeAdapter: ToolConnectionCredentialAdapter = {
				getCredentialsByType: (authType) =>
					sampleCredentials.filter((cred) => cred.type === authType),
				openNewCredential: (authType) => {
					console.log('[story] would open credential editor for', authType);
				},
			};
			provide(TOOL_CONNECTION_CREDENTIAL_ADAPTER_KEY, fakeAdapter);

			function onOpenDetail(item: ToolConnectionItem) {
				console.log('[story] open-detail', item);
				detailMode.value = item.isConnected ? 'settings' : 'detail';
			}

			function onConnect(item: ToolConnectionItem) {
				console.log('[story] connect', item);
			}

			return { args, isOpen, detailItem, detailMode, onOpenDetail, onConnect };
		},
		template: `
			<div style="padding: var(--spacing--md); display: flex; flex-direction: column; gap: var(--spacing--sm); align-items: flex-start;">
				<N8nButton variant="solid" label="Open Tools modal" @click="isOpen = true" />
				<ToolsConnectionModal
					v-bind="args"
					v-model:open="isOpen"
					v-model:detailItem="detailItem"
					:detail-mode="detailMode"
					@open-detail="onOpenDetail"
					@connect="onConnect"
					@disconnect="(item) => console.log('[story] disconnect', item)"
					@save="(item, settings) => console.log('[story] save', item, settings)"
					@select-credential="(item, authType, credentialId) => console.log('[story] select-credential', item, authType, credentialId)"
				>
					<template #settings-body="{ item, onSave, onDisconnect }">
						<McpToolSettingsContent
							v-if="item.kind === 'mcp-server'"
							:item="item"
							@save="onSave"
							@disconnect="onDisconnect"
						/>
						<PlaceholderSettingsBody
							v-else-if="item.kind === 'node'"
							title="Node tool settings"
						/>
						<PlaceholderSettingsBody
							v-else-if="item.kind === 'workflow'"
							title="Workflow tool settings"
						/>
						<PlaceholderSettingsBody
							v-else
							:title="item.kind + ' settings'"
						/>
					</template>
				</ToolsConnectionModal>
			</div>
		`,
	});
}

/**
 * Default story — full Agent Builder shape (connected MCPs, available MCPs,
 * available nodes, available workflows) with realistic fixture data so every
 * piece of UX can be exercised: rows, connected pill, configure gear, search,
 * tabs, detail navigation, workflow rows.
 */
export const Default: Story = {
	render: renderWithTrigger(),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

export const InstanceAi: Story = {
	render: renderWithTrigger(),
	args: {
		items: realisticItems,
		sections: INSTANCE_AI_SECTIONS,
	},
};

/**
 * Demonstrates all five section keys side by side — connected items at the top,
 * then services, agents, data stores, and workflows.
 */
export const AllSections: Story = {
	render: renderWithTrigger(),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

export const Empty: Story = {
	render: renderWithTrigger(),
	args: {
		items: [],
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Detail view shown when an item is NOT connected — preview-style with the big
 * orange Connect button.
 */
export const McpDetail: Story = {
	render: renderWithTrigger({
		...connectedMcpFixture,
		isConnected: false,
		settings: undefined,
	}),
	args: {
		items: realisticItems,
		sections: INSTANCE_AI_SECTIONS,
	},
};

/**
 * Settings view shown when a connected MCP item is selected — Settings/Details
 * internal tabs, tool inclusion + multi-select, Disconnect / Save settings.
 */
export const McpSettings: Story = {
	render: renderWithTrigger(connectedMcpFixture, 'settings'),
	args: {
		items: realisticItems,
		sections: INSTANCE_AI_SECTIONS,
	},
};

export const LargeList: Story = {
	render: renderWithTrigger(),
	args: {
		items: makeLargeMcpList(300),
		sections: ['nodes'],
	},
};

/**
 * Demonstrates the inline settings flow for a non-MCP kind. The shared modal's
 * `#settings-body` slot is wired to a placeholder body component — consumers
 * (Agent Builder etc.) drop their own form here. The header still renders a
 * credential picker because the node item carries a `credentials` entry.
 */
export const NodeToolInlineSettings: Story = {
	render: renderWithTrigger(
		{
			id: 'node-openai',
			kind: 'node',
			title: 'OpenAI',
			isConnected: true,
			nodeTypeName: '@n8n/n8n-nodes-langchain.openAi',
			iconSource: {
				type: 'file',
				src: 'https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg',
			},
			credentials: [
				{
					authType: 'openAiApi',
					credentialId: 'cred-openai-1',
					required: true,
				},
			],
		} satisfies NodeConnectionItem,
		'settings',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Multi-credential header — an HTTP-style tool that accepts both OAuth2 and a
 * bearer token. The header stacks two credential pickers, each filtered by its
 * own auth type. Real two-credential nodes are rare but this confirms the
 * iteration + per-credential labelling works.
 */
export const MultiCredentialHeader: Story = {
	render: renderWithTrigger(
		{
			id: 'node-http-multi',
			kind: 'node',
			title: 'HTTP Request',
			description: 'Make HTTP requests with OAuth2 or a bearer token.',
			isConnected: true,
			nodeTypeName: 'n8n-nodes-base.httpRequestTool',
			credentials: [
				{ authType: 'oAuth2Api', required: false },
				{ authType: 'httpBearerAuth', required: false },
			],
		} satisfies NodeConnectionItem,
		'settings',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Workflow / agent / data-store kinds carry no `credentials` — the header
 * renders no credential picker (just the back arrow, icon, title, and close X).
 */
export const NoCredentialsHeader: Story = {
	render: renderWithTrigger(
		{
			id: 'wf-summariser',
			kind: 'workflow',
			title: 'Summariser',
			description: 'Summarises long-form content into bullet points.',
			isConnected: true,
			workflowId: 'wf-summariser-1',
		} satisfies WorkflowConnectionItem,
		'settings',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Rich node detail view — long description, version, docs link, operations
 * chips grouped by resource, required-credentials chips. Pulled from the
 * `availableOpenAi` fixture which carries the full detail-field set.
 */
export const NodeDetail: Story = {
	render: renderWithTrigger(
		realisticItems.find((i) => i.id === 'node-openai') as ToolConnectionItem,
		'detail',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Workflow detail uses the shared default body — just the long description
 * (no metadata cells, no chips). Demonstrates the minimal default for kinds
 * that haven't earned a dedicated body component yet.
 */
export const WorkflowDetail: Story = {
	render: renderWithTrigger(
		realisticItems.find((i) => i.id === 'workflow-summariser') as ToolConnectionItem,
		'detail',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

/**
 * Default body's empty state — exercised by a sparse fixture (no
 * `longDescription`). Confirms the "No additional details" placeholder
 * renders inside the modal body.
 */
export const EmptyDetail: Story = {
	render: renderWithTrigger(
		realisticItems.find((i) => i.id === 'workflow-email-parser') as ToolConnectionItem,
		'detail',
	),
	args: {
		items: realisticItems,
		sections: AGENT_BUILDER_SECTIONS,
	},
};

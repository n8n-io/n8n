<script setup lang="ts">
/**
 * Demo view used for iterative-ui-development pixel-diff loop only.
 * NOT a user-facing route — registered only in DEV builds, not linked from the app.
 * Mounts AgentToolsModal against hand-seeded node types so Playwright can
 * snapshot the modal at production fidelity without needing auth or a real
 * agent. The `iconUrl` paths are served by the backend without auth.
 */
import { nextTick, onMounted } from 'vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useUIStore } from '@/app/stores/ui.store';
import * as modalRegistry from '@/app/moduleInitializer/modalRegistry';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import { AGENT_TOOLS_MODAL_KEY } from '../constants';
import type { AgentJsonToolRef } from '../types';

/** Build a fixture node type that renders a real brand icon via `iconUrl`. */
function makeNodeType(cfg: {
	name: string;
	displayName: string;
	description: string;
	iconPath: string;
	credentialType?: string;
}): INodeTypeDescription {
	return {
		displayName: cfg.displayName,
		name: cfg.name,
		group: ['output'],
		version: 1,
		description: cfg.description,
		defaults: { name: cfg.displayName },
		inputs: [],
		outputs: [{ type: NodeConnectionTypes.AiTool }],
		properties: [],
		iconUrl: cfg.iconPath,
		credentials: cfg.credentialType ? [{ name: cfg.credentialType, required: true }] : [],
	} as unknown as INodeTypeDescription;
}

// Node-type fixtures — fewer than prod's 240 but enough to exercise search + both sections.
const FIXTURES: INodeTypeDescription[] = [
	makeNodeType({
		name: 'n8n-nodes-base.salesforce',
		displayName: 'Salesforce',
		description: 'Salesforce CRM',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Salesforce/salesforce.svg',
		credentialType: 'salesforceOAuth2Api',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.slack',
		displayName: 'Slack',
		description: 'Send messages to Slack',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Slack/slack.svg',
		credentialType: 'slackApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.gmail',
		displayName: 'Gmail',
		description: 'Send emails via Gmail',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Google/Gmail/gmail.svg',
		credentialType: 'gmailOAuth2',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.github',
		displayName: 'GitHub',
		description: 'Some descriptor about what GitHub can do',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Github/github.svg',
		credentialType: 'githubApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.notion',
		displayName: 'Notion',
		description: 'Some descriptor about what Notion can do',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Notion/notion.svg',
		credentialType: 'notionApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.airtable',
		displayName: 'Airtable',
		description: 'Some descriptor about what Airtable can do',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Airtable/airtable.svg',
		credentialType: 'airtableApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.googleDrive',
		displayName: 'Google Drive',
		description: 'Read and write Google Drive files',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Google/Drive/googleDrive.svg',
		credentialType: 'googleDriveOAuth2Api',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.hubspot',
		displayName: 'HubSpot',
		description: 'Manage HubSpot CRM',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Hubspot/hubspot.svg',
		credentialType: 'hubspotApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.clickUp',
		displayName: 'ClickUp',
		description: 'Work with ClickUp tasks',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/ClickUp/clickUp.svg',
		credentialType: 'clickUpApi',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.bitly',
		displayName: 'Bitly',
		description: 'Shorten URLs via Bitly',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Bitly/bitly.svg',
		credentialType: 'bitlyApi',
	}),
];

// Starting tools exercise every Connected-section state:
// - Salesforce/Slack: node tools with valid creds
// - Gmail: node tool missing creds → "Add credentials" warning chip
// - Daily digest: workflow tool with description (renders in Connected section)
const STARTING_TOOLS: AgentJsonToolRef[] = [
	{
		type: 'node',
		name: 'Salesforce',
		node: {
			nodeType: 'n8n-nodes-base.salesforce',
			nodeTypeVersion: 1,
			credentials: { salesforceOAuth2Api: { id: 'demo-cred', name: 'Salesforce Account' } },
		},
	},
	{
		type: 'node',
		name: 'Slack',
		node: {
			nodeType: 'n8n-nodes-base.slack',
			nodeTypeVersion: 1,
			credentials: { slackApi: { id: 'demo-cred', name: 'Slack Token' } },
		},
	},
	{
		type: 'node',
		name: 'Gmail',
		node: {
			nodeType: 'n8n-nodes-base.gmail',
			nodeTypeVersion: 1,
			// credentials intentionally omitted
		},
	},
	{
		type: 'workflow',
		workflow: 'Daily digest',
		name: 'Daily digest',
		description: 'Summarise yesterday and post to Slack',
		allOutputs: false,
	},
];

onMounted(async () => {
	const nodeTypesStore = useNodeTypesStore();
	const uiStore = useUIStore();

	// Seed the node types store so the AiTool filter + icon rendering works
	// without going through the auth-gated /types/nodes.json endpoint.
	nodeTypesStore.setNodeTypes(FIXTURES);

	if (!modalRegistry.has(AGENT_TOOLS_MODAL_KEY)) {
		modalRegistry.register({
			key: AGENT_TOOLS_MODAL_KEY,
			component: async () => await import('../components/AgentToolsModal.vue'),
			initialState: {
				open: false,
				data: { tools: [], onConfirm: () => {} },
			},
		});
	}

	await nextTick();
	await new Promise((resolve) => setTimeout(resolve, 50));

	uiStore.openModalWithData({
		name: AGENT_TOOLS_MODAL_KEY,
		data: {
			tools: STARTING_TOOLS,
			onConfirm: (tools: AgentJsonToolRef[]) => {
				// eslint-disable-next-line no-console -- demo-only logging
				console.log('[demo] onConfirm tools:', tools);
			},
		},
	});
});
</script>

<template>
	<div :class="$style.harness">
		<p>Agent Tools Modal demo — modal should be open automatically.</p>
	</div>
</template>

<style module>
.harness {
	width: 100vw;
	height: 100vh;
	background: var(--color--background);
	padding: var(--spacing--xl);
	font-family: var(--font-family);
}
</style>

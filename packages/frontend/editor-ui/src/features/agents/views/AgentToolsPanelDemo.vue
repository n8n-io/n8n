<script setup lang="ts">
/**
 * Demo view — iterative-ui-development pixel-diff loop only.
 * Not registered in prod builds, not linked from the app.
 *
 * Mounts AgentToolsPanel inside a minimal Tools-section scaffold that mirrors
 * the real sidebar (section header + sectionContent padding) so we can
 * self-verify pixel fidelity against the Figma reference without needing
 * auth, a real agent, or the full AgentSettingsSidebar component tree.
 */
import { onMounted, ref } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';

import AgentToolsPanel from '../components/AgentToolsPanel.vue';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';
import type { CustomToolEntry } from '../agent.types';

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

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
		name: 'n8n-nodes-base.googleDrive',
		displayName: 'Google Drive',
		description: 'Read and write Google Drive files',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Google/Drive/googleDrive.svg',
		credentialType: 'googleDriveOAuth2Api',
	}),
	makeNodeType({
		name: 'n8n-nodes-base.gmail',
		displayName: 'Gmail',
		description: 'Send emails via Gmail',
		iconPath: 'icons/n8n-nodes-base/dist/nodes/Google/Gmail/gmail.svg',
		credentialType: 'gmailOAuth2',
	}),
];

const config = ref<AgentJsonConfig>({
	name: 'Demo Agent',
	model: 'openai/gpt-4o-mini',
	instructions: '',
	tools: [
		{
			type: 'node',
			name: 'Salesforce',
			node: {
				nodeType: 'n8n-nodes-base.salesforce',
				nodeTypeVersion: 1,
				credentials: { salesforceOAuth2Api: { id: 'c-1', name: 'Salesforce Account' } },
			},
		},
		{
			type: 'node',
			name: 'Slack',
			node: {
				nodeType: 'n8n-nodes-base.slack',
				nodeTypeVersion: 1,
				credentials: { slackApi: { id: 'c-2', name: 'Slack Token' } },
			},
		},
		{
			type: 'node',
			name: 'Google Drive',
			node: {
				nodeType: 'n8n-nodes-base.googleDrive',
				nodeTypeVersion: 1,
				credentials: { googleDriveOAuth2Api: { id: 'c-3', name: 'Google OAuth' } },
			},
		},
		{
			type: 'workflow',
			name: 'Share with Sales team',
			description: 'Sales',
			workflow: 'workflow-sales',
		},
		{
			type: 'node',
			name: 'Gmail',
			node: {
				nodeType: 'n8n-nodes-base.gmail',
				nodeTypeVersion: 1,
				// credentials intentionally omitted — exercises the missing-creds chip
			},
		},
	],
});

const agentTools: Record<string, CustomToolEntry> = {};

onMounted(() => {
	nodeTypesStore.setNodeTypes(FIXTURES);
});

function onUpdate(changes: Partial<AgentJsonConfig>) {
	config.value = { ...config.value, ...changes };
}

function onConfigure(ref: AgentJsonToolRef) {
	// eslint-disable-next-line no-console -- demo-only logging
	console.log('[demo] configure', ref);
}
</script>

<template>
	<div :class="$style.harness">
		<!-- Mimic the real Sidebar's section layout (header + content with padding). -->
		<aside :class="$style.sidebar">
			<div :class="$style.section">
				<button type="button" :class="$style.sectionHeader">
					<div :class="$style.sectionHeaderLeft">
						<N8nIcon icon="chevron-down" :size="16" />
						<N8nText tag="span" bold size="small">{{
							i18n.baseText('agents.settings.tools')
						}}</N8nText>
					</div>
					<span :class="$style.addBtn">
						<N8nIcon icon="plus" :size="16" />
					</span>
				</button>
				<div :class="$style.sectionContent">
					<AgentToolsPanel
						:config="config"
						:agent-tools="agentTools"
						@update:config="onUpdate"
						@configure="onConfigure"
					/>
				</div>
			</div>
		</aside>
	</div>
</template>

<style module>
.harness {
	width: 100vw;
	height: 100vh;
	padding: var(--spacing--xl);
	background: var(--color--background);
	font-family: var(--font-family);
}

.sidebar {
	width: 561px;
	border: var(--border-width) var(--border-style) var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background);
	overflow: hidden;
}

.section {
	border-top: none;
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	background: none;
	border: none;
	cursor: pointer;
	text-align: left;
}

.sectionHeaderLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.addBtn {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	color: var(--color--text--tint-1);
	border-radius: var(--radius);
}

.sectionContent {
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}
</style>

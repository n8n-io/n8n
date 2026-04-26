<script setup lang="ts">
/**
 * Rendered list of the agent's tools. Shown when the Tools folder is
 * selected in the tree. Reuses AgentToolItem (node tools) and
 * WorkflowToolRow (workflow tools) — the same row components the Agent
 * Tools modal uses — plus a minimal row for custom tools.
 *
 * Clicking a row emits `open-tool` with the tool's index in the original
 * config.tools array; the parent swaps the Tools tab in place.
 */
import { computed } from 'vue';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nSwitch2,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import type { INodeUi } from '@/Interface';

import AgentToolItem from './AgentToolItem.vue';
import WorkflowToolRow from './WorkflowToolRow.vue';
import shared from '../styles/agent-panel.module.scss';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';

const props = withDefaults(
	defineProps<{
		tools: AgentJsonToolRef[];
		config: AgentJsonConfig | null;
		disabled?: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'open-tool': [index: number];
	'update:config': [changes: Partial<AgentJsonConfig>];
	'add-tool': [];
	'remove-tool': [index: number];
}>();

const settingsStore = useSettingsStore();
const nodeToolsFeatureEnabled = computed(() => settingsStore.isAgentsNodeToolsFeatureEnabled);

const nodeToolsEnabled = computed<boolean>(
	() => props.config?.config?.nodeTools?.enabled !== false,
);

function setNodeToolsEnabled(enabled: boolean) {
	emit('update:config', {
		config: {
			...(props.config?.config ?? {}),
			nodeTools: { enabled },
		},
	});
}

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();

interface NodeRow {
	index: number;
	node: INode;
	nodeType: INodeTypeDescription;
	missingCredentials: boolean;
}

interface WorkflowRow {
	index: number;
	name: string;
	description?: string;
}

interface CustomRow {
	index: number;
	label: string;
	description?: string;
}

const nodeRows = computed<NodeRow[]>(() => {
	const out: NodeRow[] = [];
	props.tools.forEach((ref, index) => {
		if (ref.type !== 'node') return;
		const node = toolRefToNode(ref);
		if (!node) return;
		const nodeType = nodeTypesStore.getNodeType(node.type, node.typeVersion);
		if (!nodeType) return;
		const issues = nodeHelpers.getNodeCredentialIssues(node as INodeUi, nodeType);
		out.push({
			index,
			node,
			nodeType,
			missingCredentials: !!issues?.credentials && Object.keys(issues.credentials).length > 0,
		});
	});
	return out;
});

const workflowRows = computed<WorkflowRow[]>(() =>
	props.tools
		.map((ref, index) => ({ ref, index }))
		.filter(({ ref }) => ref.type === 'workflow')
		.map(({ ref, index }) => ({
			index,
			name: ref.name ?? (ref.workflow as string),
			description: ref.description,
		})),
);

const customRows = computed<CustomRow[]>(() =>
	props.tools
		.map((ref, index) => ({ ref, index }))
		.filter(({ ref }) => ref.type === 'custom')
		.map(({ ref, index }) => ({
			index,
			label: ref.name?.trim() || ref.id || `Custom tool ${index + 1}`,
			description: ref.description,
		})),
);

const totalCount = computed(() => props.tools.length);
</script>

<template>
	<div
		:class="[$style.panel, shared.scrollbarThin, props.disabled && $style.disabled]"
		data-testid="agent-tools-list-panel"
	>
		<div :class="$style.header">
			<div :class="$style.headerText">
				<N8nText tag="h3" size="large" :bold="true">{{
					i18n.baseText('agents.builder.tools.title')
				}}</N8nText>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('agents.builder.tools.count', {
							adjustToNumber: totalCount,
							interpolate: { count: String(totalCount) },
						})
					}}
				</N8nText>
			</div>
			<N8nButton
				type="primary"
				size="small"
				:disabled="props.disabled"
				data-testid="agent-tools-add"
				@click="emit('add-tool')"
			>
				<template #prefix><N8nIcon icon="plus" :size="14" /></template>
				{{ i18n.baseText('agents.builder.tools.add') }}
			</N8nButton>
		</div>

		<div v-if="nodeToolsFeatureEnabled" :class="$style.toggleRow">
			<div :class="$style.toggleText">
				<N8nText :bold="true">{{ i18n.baseText('agents.builder.tools.builtIn.title') }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.tools.builtIn.hint') }}
				</N8nText>
			</div>
			<N8nSwitch2
				size="large"
				data-testid="node-tools-toggle"
				:model-value="nodeToolsEnabled"
				@update:model-value="setNodeToolsEnabled"
			/>
		</div>

		<div v-if="totalCount === 0" :class="$style.empty">
			<N8nText size="small" color="text-light">{{
				i18n.baseText('agents.builder.tools.empty')
			}}</N8nText>
		</div>

		<div v-if="nodeRows.length > 0" :class="$style.section">
			<div :class="$style.rows">
				<div
					v-for="row in nodeRows"
					:key="`node-${row.index}`"
					:class="$style.rowWrap"
					data-testid="agent-tools-list-row"
					@click="emit('open-tool', row.index)"
				>
					<AgentToolItem
						:class="$style.rowContent"
						:node-type="row.nodeType"
						:configured-node="row.node"
						:missing-credentials="row.missingCredentials"
						mode="configured"
						@configure="emit('open-tool', row.index)"
					/>
					<N8nTooltip :content="i18n.baseText('agents.builder.tools.remove')" placement="top">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="mini"
							text
							:aria-label="i18n.baseText('agents.builder.tools.remove')"
							data-testid="agent-tools-list-remove"
							@click.stop="emit('remove-tool', row.index)"
						/>
					</N8nTooltip>
				</div>
			</div>
		</div>

		<div v-if="workflowRows.length > 0" :class="$style.section">
			<N8nHeading size="small" color="text-light" tag="h3">{{
				i18n.baseText('agents.builder.tools.workflows.title')
			}}</N8nHeading>
			<div :class="$style.rows">
				<div
					v-for="row in workflowRows"
					:key="`wf-${row.index}`"
					:class="$style.rowWrap"
					data-testid="agent-tools-list-row"
					@click="emit('open-tool', row.index)"
				>
					<WorkflowToolRow
						:class="$style.rowContent"
						mode="configured"
						:name="row.name"
						:description="row.description"
						@configure="emit('open-tool', row.index)"
					/>
					<N8nTooltip :content="i18n.baseText('agents.builder.tools.remove')" placement="top">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="mini"
							text
							:aria-label="i18n.baseText('agents.builder.tools.remove')"
							data-testid="agent-tools-list-remove"
							@click.stop="emit('remove-tool', row.index)"
						/>
					</N8nTooltip>
				</div>
			</div>
		</div>

		<div v-if="customRows.length > 0" :class="$style.section">
			<N8nHeading size="small" color="text-light" tag="h3">{{
				i18n.baseText('agents.builder.tree.customBadge')
			}}</N8nHeading>
			<div :class="$style.rows">
				<button
					v-for="row in customRows"
					:key="`custom-${row.index}`"
					type="button"
					:class="$style.customRow"
					data-testid="agent-tools-list-row"
					@click="emit('open-tool', row.index)"
				>
					<N8nIcon icon="code" :size="14" :class="$style.customIcon" />
					<div :class="$style.customLabels">
						<N8nText size="small" color="text-dark" :class="$style.customName">{{
							row.label
						}}</N8nText>
						<N8nText
							v-if="row.description"
							size="small"
							color="text-light"
							:class="$style.customDescription"
							>{{ row.description }}</N8nText
						>
					</div>
					<N8nTooltip :content="i18n.baseText('agents.builder.tools.remove')" placement="top">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="mini"
							text
							:aria-label="i18n.baseText('agents.builder.tools.remove')"
							data-testid="agent-tools-list-remove"
							@click.stop="emit('remove-tool', row.index)"
						/>
					</N8nTooltip>
					<N8nIcon icon="chevron-right" :size="14" :class="$style.chevron" />
				</button>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.panel.disabled > :not(.header) {
	pointer-events: none;
	opacity: 0.6;
}

.panel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--lg);
	height: 100%;
	overflow-y: auto;
}

.toggleRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) 0;
	border-bottom: var(--border);
}

.toggleText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	flex: 1;
	min-width: 0;
}

.empty {
	padding: var(--spacing--lg);
	text-align: center;
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.rows {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.rowWrap {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	padding: 0 var(--spacing--2xs) 0 var(--spacing--xs);
	background: transparent;
	border: var(--border);
	border-radius: var(--radius);

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.rowContent {
	flex: 1;
	min-width: 0;
}

.customRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--2xs) var(--spacing--2xs) var(--spacing--xs);
	background: transparent;
	border: var(--border);
	border-radius: var(--radius);
	color: var(--color--text);
	text-align: left;
	cursor: pointer;
	width: 100%;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}
}

.customIcon {
	flex-shrink: 0;
	color: var(--color--text--tint-1);
}

.customLabels {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
}

.customName,
.customDescription {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: var(--line-height--md);
}

.chevron {
	color: var(--color--text--tint-2);
	flex-shrink: 0;
}
</style>

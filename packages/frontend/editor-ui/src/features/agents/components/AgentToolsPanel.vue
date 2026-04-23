<script setup lang="ts">
/**
 * Sidebar tools list for the Agent builder — Figma-aligned flat rows.
 *
 * Renders one compact row per configured tool:
 *   [icon]  Name  Subtitle                                         [gear]
 *
 * The subtitle is inline (credential name for node tools, workflow
 * name/description for workflow tools, descriptor for custom tools). Tools
 * missing required credentials render dimmed with an "Add credentials" chip
 * in place of the subtitle. The gear icon is hover-revealed and emits
 * `configure` so the sidebar shell can open the shared config modal.
 */
import { computed } from 'vue';
import { N8nIcon, N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeHelpers } from '@/app/composables/useNodeHelpers';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import type { INodeUi } from '@/Interface';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';
import type { CustomToolEntry } from '../agent.types';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import ToolCredsMissingChip from './ToolCredsMissingChip.vue';

const props = defineProps<{
	config: AgentJsonConfig | null;
	agentTools: Record<string, CustomToolEntry>;
}>();
const emit = defineEmits<{
	'update:config': [changes: Partial<AgentJsonConfig>];
	configure: [ref: AgentJsonToolRef];
	remove: [ref: AgentJsonToolRef];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();
const nodeHelpers = useNodeHelpers();

const tools = computed<AgentJsonToolRef[]>(() => props.config?.tools ?? []);

interface ToolRowView {
	key: string;
	ref: AgentJsonToolRef;
	name: string;
	subtitle: string | undefined;
	/** Resolved node type description for `type: 'node'` tools — null otherwise. */
	nodeType: ReturnType<typeof nodeTypesStore.getNodeType> | null;
	/** Lucide icon key for non-node tools. */
	fallbackIcon: 'workflow' | 'code' | 'wrench';
	fallbackIconClass: 'workflowIcon' | 'customIcon';
	missingCredentials: boolean;
	configurable: boolean;
}

const rows = computed<ToolRowView[]>(() =>
	tools.value.map((ref, idx) => {
		const key = ref.id ?? ref.name ?? `tool-${idx}`;

		if (ref.type === 'node' && ref.node) {
			const nt = nodeTypesStore.getNodeType(ref.node.nodeType, ref.node.nodeTypeVersion);
			const creds = ref.node.credentials ?? {};
			const firstCred = Object.values(creds)[0];
			// Route missing-creds detection through the canvas's own validator so
			// we inherit its handling of `displayOptions`-gated creds, proxy auth
			// (`nodeCredentialType`), and gateway-managed creds. The simpler
			// "is every required slot filled" check produced false positives for
			// nodes whose cred requirement depends on another parameter's value.
			const node = toolRefToNode(ref);
			const issues = node && nt ? nodeHelpers.getNodeCredentialIssues(node as INodeUi, nt) : null;
			const missing = !!issues?.credentials && Object.keys(issues.credentials).length > 0;
			return {
				key,
				ref,
				name: ref.name ?? nt?.displayName ?? ref.node.nodeType,
				subtitle: missing ? undefined : (firstCred?.name ?? ref.description),
				nodeType: nt,
				fallbackIcon: 'workflow',
				fallbackIconClass: 'workflowIcon',
				missingCredentials: missing,
				configurable: true,
			};
		}

		if (ref.type === 'workflow') {
			return {
				key,
				ref,
				name: ref.name ?? ref.workflow ?? 'Workflow',
				subtitle: ref.description ?? ref.workflow,
				nodeType: null,
				fallbackIcon: 'workflow',
				fallbackIconClass: 'workflowIcon',
				missingCredentials: false,
				// Workflow tools round-trip through `WorkflowToolConfigContent`
				// in the shared config modal (name / description / allOutputs),
				// so the sidebar's gear button must remain active — per AGENT-26
				// scope, existing tools are editable in-place.
				configurable: true,
			};
		}

		// custom
		const descriptor = props.agentTools[ref.id ?? '']?.descriptor;
		return {
			key,
			ref,
			name: descriptor?.name ?? ref.id ?? 'Custom tool',
			subtitle: descriptor?.description ?? ref.description,
			nodeType: null,
			fallbackIcon: 'code',
			fallbackIconClass: 'customIcon',
			missingCredentials: false,
			configurable: false,
		};
	}),
);

function removeTool(ref: AgentJsonToolRef) {
	const updated = tools.value.filter((t) => t !== ref);
	emit('update:config', { tools: updated });
	emit('remove', ref);
}
</script>

<template>
	<div :class="$style.panel">
		<div v-if="rows.length === 0" :class="$style.emptyState">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.tools.sidebar.empty') }}
			</N8nText>
		</div>

		<div v-else :class="$style.list">
			<div v-for="row in rows" :key="row.key" :class="$style.item" data-test-id="agent-tool-row">
				<div :class="[$style.label, { [$style.labelDimmed]: row.missingCredentials }]">
					<div :class="$style.iconWrapper">
						<NodeIcon v-if="row.nodeType" :node-type="row.nodeType" :size="20" />
						<N8nIcon
							v-else
							:icon="row.fallbackIcon"
							:size="16"
							:class="$style[row.fallbackIconClass]"
						/>
					</div>

					<div :class="$style.textWrapper">
						<N8nText :class="$style.name" size="small" color="text-dark">{{ row.name }}</N8nText>
						<N8nText v-if="row.subtitle" :class="$style.subtitle" size="small" color="text-light">
							{{ row.subtitle }}
						</N8nText>
					</div>
				</div>

				<div :class="$style.actions">
					<!-- Missing-creds chip is the primary CTA to fix the tool.
						 Always visible so the row communicates its broken state. -->
					<ToolCredsMissingChip
						v-if="row.missingCredentials"
						variant="pill"
						data-test-id="agent-sidebar-add-credentials-chip"
						@click="emit('configure', row.ref)"
					/>

					<!-- Gear is hidden on missing-creds rows because the chip already opens
						 the same config modal — showing both would duplicate the CTA. -->
					<N8nTooltip
						v-if="row.configurable && !row.missingCredentials"
						:content="i18n.baseText('agents.tools.configure')"
					>
						<N8nIconButton
							icon="settings"
							variant="ghost"
							text
							size="small"
							:class="$style.gearBtn"
							data-test-id="agent-sidebar-configure-btn"
							@click="emit('configure', row.ref)"
						/>
					</N8nTooltip>

					<!-- Trash is hover-revealed for every row, including broken ones —
						 users must be able to remove a tool that failed to configure. -->
					<N8nTooltip :content="i18n.baseText('agents.tools.remove')">
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							text
							size="small"
							:class="$style.removeBtn"
							data-test-id="agent-sidebar-remove-btn"
							@click="removeTool(row.ref)"
						/>
					</N8nTooltip>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	// Escape the enclosing section's horizontal padding so rows can sit flush
	// with the section header text and extend the full sidebar width.
	margin: 0 calc(-1 * var(--spacing--sm));
}

.emptyState {
	padding: var(--spacing--xs) var(--spacing--sm);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--2xs);
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	height: 36px;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius--lg);

	&:hover {
		background-color: var(--color--foreground--tint-2);

		.gearBtn,
		.removeBtn {
			opacity: 1;
			pointer-events: auto;
		}
	}
}

.label {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--4xs);
	min-width: 0;
	flex: 1;
}

.labelDimmed {
	opacity: 0.5;
}

.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	flex-shrink: 0;
}

.workflowIcon {
	color: var(--color--primary);
}

.customIcon {
	color: var(--color--text--tint-1);
}

.textWrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	overflow: hidden;
}

.name {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--xl);
}

.subtitle {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	line-height: var(--line-height--xl);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
}

.gearBtn,
.removeBtn {
	opacity: 0;
	pointer-events: none;
	transition: opacity 120ms ease;
}
</style>

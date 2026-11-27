<script setup lang="ts">
import type {
	AgentConfigValidationIssue,
	AgentToolGuardrailConfig,
	AgentToolGuardrailKind,
} from '@n8n/api-types';
import { N8nIcon } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';
import type { INodeTypeDescription } from 'n8n-workflow';

import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { useAgentCapabilityIssueMessages } from '../composables/useAgentCapabilityIssueMessages';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';
import {
	configuredToolGuardrails,
	guardrailDisplayName,
	guardrailRefMatchesTool,
	withToolGuardrails,
} from '../utils/guardrails';
import AgentBudgetPanel from './AgentBudgetPanel.vue';
import AgentChipButton from './AgentChipButton.vue';
import AgentGuardrailAddMenu from './AgentGuardrailAddMenu.vue';
import AgentGuardrailModal from './AgentGuardrailModal.vue';
import AgentItemContextMenu from './AgentItemContextMenu.vue';
import AgentPanelDisclosure from './AgentPanelDisclosure.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		/** The agent's configured tools, for the modal's tool picker. */
		tools?: AgentJsonToolRef[];
		projectId: string;
		agentId: string;
		disabled?: boolean;
		/** Structured backend validation issues — drives the invalid state on guardrail chips. */
		validationIssues?: AgentConfigValidationIssue[];
	}>(),
	{
		tools: () => [],
		disabled: false,
		validationIssues: () => [],
	},
);

const emit = defineEmits<{
	'update:config': [updates: Partial<AgentJsonConfig>];
	'update:budget-config': [updates: Partial<AgentJsonConfig>];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const guardrails = computed(() => configuredToolGuardrails(props.config));
const { groupIssueMessages } = useAgentCapabilityIssueMessages(() => props.validationIssues);
const guardrailIssueMessages = computed(() =>
	groupIssueMessages('guardrail', (issue) => issue.capability.id),
);

const modalOpen = ref(false);
/** The entry being edited, or null in create mode. */
const editingGuardrail = ref<AgentToolGuardrailConfig | null>(null);
const createKind = ref<AgentToolGuardrailKind>('keywords');

/** One icon per covered-tool kind on a guardrail chip. */
interface GuardrailToolIconGroup {
	/** Grouping key: the node type, or the shared fallback icon. */
	key: string;
	/** Covered tool names, shown as the group's tooltip. */
	title: string;
	count: number;
	nodeType: INodeTypeDescription | null;
	fallbackIcon: IconName;
}

/**
 * Icons of the tools a guardrail covers, grouped where they share one look:
 * node tools by node type (several Slack tools collapse into one icon plus a
 * count), workflows behind their shared workflow icon, unresolved node refs
 * behind a help mark. Refs that match no configured tool stay silent — the
 * invalid state from validation issues already names them.
 */
function toolIconGroups(guardrail: AgentToolGuardrailConfig): GuardrailToolIconGroup[] {
	if (!guardrail.tools) return [];
	const groups = new Map<string, GuardrailToolIconGroup>();
	const label = (tool: AgentJsonToolRef): string => {
		if (tool.type === 'workflow') return tool.name ?? tool.workflow;
		// Custom tools carry an id, not a display name; node tools carry both.
		return tool.type === 'node' ? tool.name : tool.id;
	};

	for (const ref of guardrail.tools) {
		const tool = props.tools.find((candidate) => guardrailRefMatchesTool(ref, candidate));
		if (!tool) continue;

		let key = 'unresolved-node';
		let fallbackIcon: IconName = 'circle-help';
		let nodeType: INodeTypeDescription | null = null;
		if (tool.type === 'workflow') {
			key = 'workflow';
			fallbackIcon = 'workflow';
		} else if (tool.type === 'node') {
			const node = toolRefToNode(tool);
			const resolved = node ? nodeTypesStore.getNodeType(node.type, node.typeVersion) : null;
			if (resolved) {
				key = resolved.name;
				nodeType = resolved;
			}
		}

		const group = groups.get(key);
		if (group) {
			group.count += 1;
			group.title += `, ${label(tool)}`;
		} else {
			groups.set(key, {
				key,
				title: label(tool),
				count: 1,
				nodeType,
				fallbackIcon,
			});
		}
	}
	return [...groups.values()];
}

function onAddSelect(kind: AgentToolGuardrailKind) {
	if (props.disabled) return;
	createKind.value = kind;
	editingGuardrail.value = null;
	modalOpen.value = true;
}

function onOpenGuardrail(guardrail: AgentToolGuardrailConfig) {
	if (props.disabled) return;
	editingGuardrail.value = guardrail;
	modalOpen.value = true;
}

function onModalSave(guardrail: AgentToolGuardrailConfig) {
	const next = editingGuardrail.value
		? guardrails.value.map((entry) => (entry.id === guardrail.id ? guardrail : entry))
		: [...guardrails.value, guardrail];
	emit('update:config', withToolGuardrails(props.config, next));
}

function removeGuardrail(id: string) {
	emit(
		'update:config',
		withToolGuardrails(
			props.config,
			guardrails.value.filter((entry) => entry.id !== id),
		),
	);
}

function onModalRemove() {
	const id = editingGuardrail.value?.id;
	if (id) removeGuardrail(id);
}
</script>

<template>
	<div :class="$style.section" data-testid="agent-guardrails-section">
		<AgentPanelDisclosure
			:title="i18n.baseText('agents.builder.guardrails.title')"
			:description="i18n.baseText('agents.builder.guardrails.description')"
			default-open
			data-testid="agent-guardrails-disclosure"
		>
			<div :class="$style.chips">
				<div v-for="guardrail in guardrails" :key="guardrail.id" :class="$style.chipGroup">
					<AgentItemContextMenu :disabled="disabled" @remove="removeGuardrail(guardrail.id)">
						<AgentChipButton
							:invalid="(guardrailIssueMessages.get(guardrail.id) ?? []).length > 0"
							:invalid-reasons="guardrailIssueMessages.get(guardrail.id) ?? []"
							:disabled="disabled"
							data-testid="agent-guardrails-chip"
							@click="onOpenGuardrail(guardrail)"
						>
							<span :class="$style.chipLabel">
								<span :class="$style.chipName">{{ guardrailDisplayName(guardrail, i18n) }}</span>
								<span :class="$style.chipMeta">
									<span aria-hidden="true">·</span>
									<template v-if="guardrail.tools">
										<span
											v-for="group in toolIconGroups(guardrail)"
											:key="group.key"
											:class="$style.toolIcon"
											:title="group.title"
											data-testid="guardrail-chip-tool-group"
										>
											<NodeIcon
												v-if="group.nodeType"
												:node-type="group.nodeType"
												:size="14"
												data-testid="guardrail-chip-tool-icon"
											/>
											<N8nIcon
												v-else
												:icon="group.fallbackIcon"
												:size="14"
												data-testid="guardrail-chip-tool-fallback-icon"
											/>
											<span v-if="group.count > 1" :class="$style.toolIconCount">
												{{ group.count }}
											</span>
										</span>
									</template>
									<template v-else>
										{{ i18n.baseText('agents.builder.guardrails.chip.allTools') }}
									</template>
								</span>
							</span>
						</AgentChipButton>
					</AgentItemContextMenu>
				</div>

				<AgentGuardrailAddMenu
					test-id="agent-guardrails-add"
					:icon-only="guardrails.length > 0"
					:disabled="disabled"
					@select="onAddSelect"
				/>
			</div>
		</AgentPanelDisclosure>

		<AgentPanelDisclosure
			v-if="$slots.approval"
			:title="i18n.baseText('agents.hitl.title')"
			:description="i18n.baseText('agents.hitl.description')"
			:default-open="!!config?.hitlConfigurations?.length"
			:class="$style.divided"
			data-testid="agent-approval-disclosure"
		>
			<slot name="approval" />
		</AgentPanelDisclosure>

		<AgentBudgetPanel
			embedded
			:class="$style.divided"
			:config="config"
			:project-id="projectId"
			:agent-id="agentId"
			:disabled="disabled"
			@update:config="emit('update:budget-config', $event)"
		/>

		<AgentGuardrailModal
			:open="modalOpen"
			:guardrail="editingGuardrail"
			:kind="createKind"
			:tools="tools"
			:review-configurations="config?.hitlConfigurations ?? []"
			:project-id="projectId"
			:existing-ids="guardrails.map((guardrail) => guardrail.id)"
			:disabled="disabled"
			@update:open="modalOpen = $event"
			@save="onModalSave"
			@remove="onModalRemove"
		/>
	</div>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	width: 100%;
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.chipGroup {
	display: inline-flex;
	align-items: center;
	flex-wrap: nowrap;
	gap: var(--spacing--3xs);
	min-width: 0;
	/** Truncates the chip so long guardrail names cannot stretch the row. */
	max-width: min(var(--spacing--5xl), 100%);

	/* The context menu's Slot renders the chip button in place, so the button
	   is this group's own child and must take the group's capped width. */
	> button {
		width: 100%;
	}
}

.chipLabel {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	max-width: 100%;
}

.chipName {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chipMeta {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	color: var(--text-color--subtler);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--normal);
	white-space: nowrap;
}

/* One covered-tool kind: an icon and, when several tools share it, a count. */
.toolIcon {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
}

.toolIconCount {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
	line-height: 1;
}

.divided {
	margin-inline: calc(-1 * var(--agent-panel-padding-inline, var(--spacing--sm)));
	padding-inline: var(--agent-panel-padding-inline, var(--spacing--sm));
	border-block-start: var(--border-width) var(--border-style) var(--border-color--subtle);
	padding-block-start: var(--spacing--sm);
}
</style>

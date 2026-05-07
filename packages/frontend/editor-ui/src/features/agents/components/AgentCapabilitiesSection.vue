<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { AGENT_SCHEDULE_TRIGGER_TYPE } from '@n8n/api-types';
import { N8nButton, N8nIcon, N8nText, N8nTooltip } from '@n8n/design-system';
import { updatedIconSet, type IconName } from '@n8n/design-system/components/N8nIcon';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import type { AgentJsonConfig, AgentJsonToolRef } from '../types';
import type { AgentSkill, CustomToolEntry } from '../types';
import { useAgentIntegrationsCatalog } from '../composables/useAgentIntegrationsCatalog';
import { toolRefToNode } from '../composables/useAgentToolRefAdapter';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';
import AgentChipButton from './AgentChipButton.vue';

const props = withDefaults(
	defineProps<{
		config: AgentJsonConfig | null;
		tools: AgentJsonToolRef[];
		customTools?: Record<string, CustomToolEntry>;
		skills: Array<{ id: string; skill: AgentSkill }>;
		connectedTriggers: string[];
		disabled?: boolean;
		projectId: string;
		agentId: string;
		isPublished: boolean;
	}>(),
	{ disabled: false },
);

const emit = defineEmits<{
	'open-tool': [index: number];
	'open-skill': [id: string];
	'open-trigger': [triggerType: string];
	'add-tool': [];
	'add-skill': [];
	'add-trigger': [];
	'remove-tool': [index: number];
	'remove-skill': [id: string];
	'update:connected-triggers': [triggers: string[]];
	'trigger-added': [{ triggerType: string; triggers: string[] }];
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const { catalog } = useAgentIntegrationsCatalog();

function isIconName(icon: unknown): icon is IconName {
	return typeof icon === 'string' && icon in updatedIconSet;
}

function triggerIcon(trigger: string, integrationIcon?: string): IconName {
	if (isIconName(integrationIcon)) return integrationIcon;
	if (trigger === AGENT_SCHEDULE_TRIGGER_TYPE) return 'clock';
	return 'zap';
}

const triggerRows = computed<Array<{ type: string; label: string; icon: IconName }>>(() =>
	props.connectedTriggers.map((trigger) => {
		const integration = catalog.value?.find(({ type }) => type === trigger);
		return {
			type: trigger,
			label:
				integration?.label ??
				(trigger === AGENT_SCHEDULE_TRIGGER_TYPE
					? i18n.baseText('agents.schedule.title')
					: trigger),
			icon: triggerIcon(trigger, integration?.icon),
		};
	}),
);

const hasTriggers = computed(() => triggerRows.value.length > 0);
const hasTools = computed(() => props.tools.length > 0);
const hasSkills = computed(() => props.skills.length > 0);

function toolLabel(tool: AgentJsonToolRef, index: number) {
	if (tool.type === 'custom') {
		return formatToolNameForDisplay(
			(tool.id ? props.customTools?.[tool.id]?.descriptor.name : undefined) ??
				tool.name ??
				tool.id ??
				`${tool.type}-${index + 1}`,
		);
	}

	if (tool.type === 'workflow') {
		return formatToolNameForDisplay(tool.name ?? tool.workflow ?? `${tool.type}-${index + 1}`);
	}

	return formatToolNameForDisplay(tool.name ?? `${tool.type}-${index + 1}`);
}

function toolIcon(tool: AgentJsonToolRef): IconName {
	if (tool.type === 'workflow') return 'workflow';
	if (tool.type === 'custom') return 'code';
	return 'globe';
}

function toolNodeType(tool: AgentJsonToolRef) {
	const node = toolRefToNode(tool);
	if (!node) return null;
	return nodeTypesStore.getNodeType(node.type, node.typeVersion) ?? null;
}

const toolRows = computed(() =>
	props.tools.map((tool, index) => ({
		index,
		label: toolLabel(tool, index),
		nodeType: toolNodeType(tool),
		fallbackIcon: toolIcon(tool),
	})),
);
</script>

<template>
	<div
		:class="[$style.section, props.disabled && $style.disabled]"
		:inert="props.disabled || undefined"
		data-testid="agent-capabilities-section"
	>
		<div :class="$style.capabilityRow">
			<N8nText size="small" color="text-light" :class="$style.rowLabel">
				{{ i18n.baseText('agents.builder.triggers.title') }}
			</N8nText>

			<div :class="$style.chips">
				<AgentChipButton
					v-for="trigger in triggerRows"
					:key="trigger.type"
					:icon="trigger.icon"
					data-testid="agent-capabilities-trigger-row"
					@click="emit('open-trigger', trigger.type)"
				>
					{{ trigger.label }}
				</AgentChipButton>

				<N8nTooltip
					:disabled="!hasTriggers"
					:content="i18n.baseText('agents.builder.triggers.add')"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						:icon-only="hasTriggers"
						:disabled="props.disabled"
						data-testid="agent-capabilities-add-trigger"
						@click="emit('add-trigger')"
					>
						<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
						<template v-if="!hasTriggers">
							{{ i18n.baseText('agents.builder.triggers.add') }}
						</template>
					</N8nButton>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.capabilityRow">
			<N8nText size="small" color="text-light" :class="$style.rowLabel">
				{{ i18n.baseText('agents.builder.tools.title') }}
			</N8nText>

			<div :class="$style.chips">
				<template v-for="tool in toolRows" :key="`tool-${tool.index}`">
					<AgentChipButton
						v-if="tool.nodeType"
						data-testid="agent-capabilities-tool-row"
						@click="emit('open-tool', tool.index)"
					>
						<template #icon>
							<NodeIcon :node-type="tool.nodeType" :size="16" />
						</template>
						{{ tool.label }}
					</AgentChipButton>
					<AgentChipButton
						v-else
						:icon="tool.fallbackIcon"
						data-testid="agent-capabilities-tool-row"
						@click="emit('open-tool', tool.index)"
					>
						{{ tool.label }}
					</AgentChipButton>
				</template>

				<N8nTooltip
					:disabled="!hasTools"
					:content="i18n.baseText('agents.builder.tools.add')"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						:icon-only="hasTools"
						:disabled="props.disabled"
						data-testid="agent-capabilities-add-tool"
						@click="emit('add-tool')"
					>
						<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
						<template v-if="!hasTools">
							{{ i18n.baseText('agents.builder.tools.add') }}
						</template>
					</N8nButton>
				</N8nTooltip>
			</div>
		</div>

		<div :class="$style.capabilityRow">
			<N8nText size="small" color="text-light" :class="$style.rowLabel">
				{{ i18n.baseText('agents.builder.skills.title') }}
			</N8nText>

			<div :class="$style.chips">
				<AgentChipButton
					v-for="{ id, skill } in skills"
					:key="id"
					icon="sparkles"
					data-testid="agent-capabilities-skill-row"
					@click="emit('open-skill', id)"
				>
					{{ skill.name || id }}
				</AgentChipButton>

				<N8nTooltip
					:disabled="!hasSkills"
					:content="i18n.baseText('agents.builder.skills.add')"
					placement="top"
				>
					<N8nButton
						variant="ghost"
						size="medium"
						:icon-only="hasSkills"
						:disabled="props.disabled"
						data-testid="agent-capabilities-add-skill"
						@click="emit('add-skill')"
					>
						<template #icon><N8nIcon icon="plus" :size="16" color="text-light" /></template>
						<template v-if="!hasSkills">
							{{ i18n.baseText('agents.builder.skills.add') }}
						</template>
					</N8nButton>
				</N8nTooltip>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	width: 100%;
}

.capabilityRow {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--lg);
	margin-bottom: var(--spacing--xs);
	min-height: var(--height--lg);

	&:last-child {
		margin-bottom: 0;
	}
}

.rowLabel {
	flex: 0 0 var(--spacing--3xl);
	line-height: var(--height--lg);
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
}

.chips {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.disabled {
	opacity: 0.5;
	pointer-events: none;
}

@media (max-width: 768px) {
	.capabilityRow {
		flex-direction: column;
		gap: var(--spacing--xs);
	}

	.rowLabel {
		flex-basis: auto;
		line-height: var(--line-height--sm);
	}
}
</style>

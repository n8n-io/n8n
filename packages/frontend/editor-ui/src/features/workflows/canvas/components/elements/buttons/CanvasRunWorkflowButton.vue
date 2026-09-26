<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { type INodeUi } from '@/Interface';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { useI18n } from '@n8n/i18n';
import { type INodeTypeDescription } from 'n8n-workflow';
import { computed } from 'vue';
import { isChatNode } from '@/app/utils/aiUtils';

import { N8nActionDropdown, N8nButton, type ActionDropdownItem } from '@n8n/design-system';
const emit = defineEmits<{
	mouseenter: [event: MouseEvent];
	mouseleave: [event: MouseEvent];
	execute: [];
	selectTriggerNode: [name: string];
}>();

const props = withDefaults(
	defineProps<{
		selectedTriggerNodeName?: string;
		triggerNodes: INodeUi[];
		waitingForWebhook?: boolean;
		executing?: boolean;
		disabled?: boolean;
		hideTooltip?: boolean;
		label?: string;
		size?: 'small' | 'medium' | 'large';
		includeChatTrigger?: boolean;
		/** `'secondary'` renders the button as a secondary action instead of the
		 * primary CTA (e.g. in the Instance AI artifact or the demo view, where
		 * the canvas isn't the primary surface). */
		type?: 'primary' | 'secondary';
		getNodeType: (type: string, typeVersion: number) => INodeTypeDescription | null;
	}>(),
	{ type: 'primary' },
);

const buttonVariant = computed(() => (props.type === 'secondary' ? 'subtle' : 'solid'));

const i18n = useI18n();

const selectableTriggerNodes = computed(() =>
	props.triggerNodes.filter(
		(node) => !node.disabled && (props.includeChatTrigger ? true : !isChatNode(node)),
	),
);
const label = computed(() => {
	if (!props.executing) {
		return props.label ?? i18n.baseText('nodeView.runButtonText.execute');
	}

	if (props.waitingForWebhook) {
		return i18n.baseText('nodeView.runButtonText.waitingForTriggerEvent');
	}

	return i18n.baseText('nodeView.runButtonText.executingWorkflow');
});
const actions = computed(() =>
	props.triggerNodes
		.filter((node) => (props.includeChatTrigger ? true : !isChatNode(node)))
		.toSorted((a, b) => {
			const [aX, aY] = a.position;
			const [bX, bY] = b.position;

			return aY === bY ? aX - bX : aY - bY;
		})
		.map<ActionDropdownItem<string>>((node) => ({
			label: truncateBeforeLast(node.name, 50),
			disabled: !!node.disabled || props.executing,
			id: node.name,
			checked: props.selectedTriggerNodeName === node.name,
		})),
);
const isSplitButton = computed(
	() => selectableTriggerNodes.value.length > 1 && props.selectedTriggerNodeName !== undefined,
);

// The button has no room for the trigger name, so the icon and the tooltip identify it
const currentTriggerNode = computed(
	() =>
		props.triggerNodes.find((node) => node.name === props.selectedTriggerNodeName) ??
		selectableTriggerNodes.value[0],
);
const currentTriggerNodeType = computed(() =>
	currentTriggerNode.value
		? props.getNodeType(currentTriggerNode.value.type, currentTriggerNode.value.typeVersion)
		: null,
);
const tooltipLabel = computed(() =>
	isSplitButton.value && currentTriggerNode.value
		? i18n.baseText('nodeView.runButtonText.executeWorkflowFrom', {
				interpolate: { nodeName: truncateBeforeLast(currentTriggerNode.value.name, 50) },
			})
		: i18n.baseText('nodeView.runButtonText.executeWorkflow'),
);
const buttonSize = computed(() => props.size ?? 'large');
const triggerIconSize = computed(() => (buttonSize.value === 'large' ? 20 : 16));

function getNodeTypeByName(name: string): INodeTypeDescription | null {
	const node = props.triggerNodes.find((trigger) => trigger.name === name);

	if (!node) {
		return null;
	}

	return props.getNodeType(node.type, node.typeVersion);
}

function onSelectTriggerNode(name: string) {
	emit('selectTriggerNode', name);
	emit('execute');
}
</script>

<template>
	<div :class="[$style.component, isSplitButton ? $style.split : '']">
		<KeyboardShortcutTooltip
			:label="tooltipLabel"
			:shortcut="{ metaKey: true, keys: ['↵'] }"
			:disabled="executing || hideTooltip"
		>
			<N8nButton
				:variant="buttonVariant"
				:class="$style.button"
				:loading="executing"
				:iconOnly="executing"
				:aria-label="tooltipLabel"
				:disabled="disabled"
				:size="buttonSize"
				icon="flask-conical"
				data-test-id="execute-workflow-button"
				@mouseenter="$emit('mouseenter', $event)"
				@mouseleave="$emit('mouseleave', $event)"
				@click="emit('execute')"
			>
				<template v-if="currentTriggerNodeType" #icon>
					<NodeIcon
						:class="$style.triggerIcon"
						:size="triggerIconSize"
						:node-type="currentTriggerNodeType"
						data-test-id="execute-workflow-button-trigger-icon"
					/>
				</template>
				{{ label }}
			</N8nButton>
		</KeyboardShortcutTooltip>
		<N8nActionDropdown
			v-if="isSplitButton"
			:class="$style.menu"
			:items="actions"
			:disabled="disabled"
			placement="top"
			:extra-popper-class="$style.menuPopper"
			@select="onSelectTriggerNode"
		>
			<template #activator>
				<N8nButton
					:variant="buttonVariant"
					:size="buttonSize"
					icon-size="large"
					:disabled="disabled"
					:class="$style.chevron"
					aria-label="Select trigger node"
					icon="chevron-down"
				/>
			</template>
			<template #menuItem="item">
				<div :class="[$style.menuItem, item.disabled ? $style.disabled : '']">
					<NodeIcon :class="$style.menuIcon" :size="16" :node-type="getNodeTypeByName(item.id)" />
					<span>
						{{
							i18n.baseText('nodeView.runButtonText.from', {
								interpolate: { nodeName: item.label },
							})
						}}
					</span>
				</div>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style lang="scss" module>
.component {
	position: relative;
	display: flex;
	align-items: stretch;
}

.component .button:not([data-icon-only]) {
	padding-inline: var(--spacing--xs);
}

.split .button {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.triggerIcon {
	// Tint font icons with the button text color and tone image icons to match the button
	--node-creator--icon--color: currentColor;
	mix-blend-mode: luminosity;
}

.component .chevron {
	position: relative;
	width: var(--height--sm);
	padding: 0;
	// Overlap the button border so the two halves share one edge
	margin-inline-start: -1px;
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;

	&::before {
		content: '';
		position: absolute;
		inset-block: 0;
		inset-inline-start: 0;
		width: 1px;
		background-color: var(--color--black-alpha-100);
	}
}

.menu :global(.el-dropdown) {
	height: 100%;
}

.menuPopper {
	// Width upper bound is enforced by char count instead
	max-width: none !important;
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.menuItem.disabled .menuIcon {
	opacity: 0.2;
}
</style>

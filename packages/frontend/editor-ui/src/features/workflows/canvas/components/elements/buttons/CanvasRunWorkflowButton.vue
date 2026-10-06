<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { type INodeUi } from '@/Interface';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { useI18n } from '@n8n/i18n';
import { type INodeTypeDescription } from 'n8n-workflow';
import { computed, ref, useId, watch } from 'vue';
import { isChatNode } from '@/app/utils/aiUtils';
import { useNodeIconSource } from '@/app/composables/useNodeIconSource';
import {
	FULL_LUMA_RANGE,
	LUMA_MATRIX,
	getLumaRemapTable,
	measureIconLumaRange,
	type LumaRange,
} from '../../../iconLuma.utils';

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
		/** Why the button is disabled, shown in place of the shortcut tooltip. */
		disabledReason?: string;
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
// Picking an item runs it, so the menu shows no selection state.
// The button's trigger icon and tooltip show the current trigger.
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

// On the primary button, luminosity alone turns darker icon parts brown and hides
// parts close to the button's own brightness. Remap each image icon's measured
// tonal range into a light band first, so every icon ends up as a warm tint.
const TRIGGER_ICON_LUMA_FLOOR = 0.7;
const triggerIconFilterId = useId();
const triggerIconSource = useNodeIconSource(() => currentTriggerNodeType.value);
// Font icons already use the button text color, so only image icons get a treatment
const isTriggerIconImage = computed(() => triggerIconSource.value?.type === 'file');
const triggerIconRemapSrc = computed(() =>
	props.type === 'primary' && triggerIconSource.value?.type === 'file'
		? triggerIconSource.value.src
		: undefined,
);
const triggerIconLumaRange = ref<LumaRange>(FULL_LUMA_RANGE);
const triggerIconRemapTable = computed(() =>
	getLumaRemapTable(triggerIconLumaRange.value, TRIGGER_ICON_LUMA_FLOOR),
);

watch(
	triggerIconRemapSrc,
	async (src) => {
		triggerIconLumaRange.value = FULL_LUMA_RANGE;
		if (!src) return;
		const range = await measureIconLumaRange(src);
		if (range && src === triggerIconRemapSrc.value) triggerIconLumaRange.value = range;
	},
	{ immediate: true },
);

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
		<svg v-if="triggerIconRemapSrc" :class="$style.filterDefs" aria-hidden="true">
			<filter :id="triggerIconFilterId" color-interpolation-filters="sRGB">
				<feColorMatrix type="matrix" :values="LUMA_MATRIX" />
				<feComponentTransfer>
					<feFuncR type="table" :tableValues="triggerIconRemapTable" />
					<feFuncG type="table" :tableValues="triggerIconRemapTable" />
					<feFuncB type="table" :tableValues="triggerIconRemapTable" />
				</feComponentTransfer>
			</filter>
		</svg>
		<KeyboardShortcutTooltip
			:label="disabledReason || tooltipLabel"
			:shortcut="disabledReason ? undefined : { metaKey: true, keys: ['↵'] }"
			:disabled="!disabledReason && (executing || hideTooltip)"
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
						:class="[
							$style.triggerIcon,
							{ [$style.secondaryTriggerIcon]: type === 'secondary' && isTriggerIconImage },
						]"
						:style="triggerIconRemapSrc ? { filter: `url(#${triggerIconFilterId})` } : undefined"
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

.secondaryTriggerIcon {
	// Luminosity on the neutral button leaves grayscale icons; lift their contrast a little
	filter: contrast(1.2);
}

.filterDefs {
	position: absolute;
	width: 0;
	height: 0;
	overflow: hidden;
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

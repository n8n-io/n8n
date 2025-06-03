<script setup lang="ts">
import { isChatNode } from '@/components/CanvasChat/utils';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { type INodeUi } from '@/Interface';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { type ActionDropdownItem, N8nActionDropdown, N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type INodeTypeDescription } from 'n8n-workflow';
import { watch, ref, computed } from 'vue';
import { findTriggerNodeToAutoSelect } from '@/utils/executionUtils';

const emit = defineEmits<{
	mouseenter: [event: MouseEvent];
	mouseleave: [event: MouseEvent];
	click: [triggerNodeName: string];
}>();

const props = defineProps<{
	triggerNodes: INodeUi[];
	waitingForWebhook?: boolean;
	executing?: boolean;
	disabled?: boolean;
	getNodeType: (type: string, typeVersion: number) => INodeTypeDescription | null;
}>();

const i18n = useI18n();

const selectedTriggerNode = ref<string>();

const triggerNodes = computed(() => props.triggerNodes.filter((node) => !isChatNode(node)));
const selectableTriggerNodes = computed(() => triggerNodes.value.filter((node) => !node.disabled));
const label = computed(() => {
	if (!props.executing) {
		return i18n.baseText('nodeView.runButtonText.executeWorkflow');
	}

	if (props.waitingForWebhook) {
		return i18n.baseText('nodeView.runButtonText.waitingForTriggerEvent');
	}

	return i18n.baseText('nodeView.runButtonText.executingWorkflow');
});
const actions = computed(() =>
	triggerNodes.value
		.toSorted((a, b) => {
			const [aX, aY] = a.position;
			const [bX, bY] = b.position;

			return aY === bY ? aX - bX : aY - bY;
		})
		.map<ActionDropdownItem>((node) => ({
			label: truncateBeforeLast(node.name, 25),
			disabled: !!node.disabled,
			id: node.name,
			checked: selectedTriggerNode.value === node.name,
		})),
);

function handleClickButton() {
	if (selectedTriggerNode.value) {
		emit('click', selectedTriggerNode.value);
	}
}

function handleSelectTrigger(nodeName: string) {
	selectedTriggerNode.value = nodeName;
}

function getNodeTypeByName(name: string): INodeTypeDescription | null {
	const node = triggerNodes.value.find((trigger) => trigger.name === name);

	if (!node) {
		return null;
	}

	return props.getNodeType(node.type, node.typeVersion);
}

watch(
	selectableTriggerNodes,
	(newSelectable, oldSelectable) => {
		if (
			selectedTriggerNode.value === undefined ||
			newSelectable.every((node) => node.name !== selectedTriggerNode.value)
		) {
			selectedTriggerNode.value = findTriggerNodeToAutoSelect(
				selectableTriggerNodes.value,
				props.getNodeType,
			)?.name;
			return;
		}

		const newTrigger = newSelectable?.find((node) =>
			oldSelectable?.every((old) => old.name !== node.name),
		);

		if (newTrigger !== undefined) {
			// Select newly added node
			selectedTriggerNode.value = newTrigger.name;
		}
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="[$style.component, selectableTriggerNodes.length > 1 ? $style.split : '']">
		<KeyboardShortcutTooltip
			:label="label"
			:shortcut="{ metaKey: true, keys: ['↵'] }"
			:disabled="executing"
		>
			<N8nButton
				:class="$style.button"
				:loading="executing"
				:disabled="disabled"
				size="large"
				icon="flask"
				type="primary"
				@click="handleClickButton"
			>
				<span :class="$style.buttonContent">
					{{ label }}
					<N8nText
						v-if="selectedTriggerNode && selectableTriggerNodes.length > 1"
						:class="$style.subText"
						:bold="false"
					>
						<I18nT keypath="nodeView.runButtonText.from">
							<template #nodeName>
								<N8nText bold size="mini">
									{{ truncateBeforeLast(selectedTriggerNode, 25) }}
								</N8nText>
							</template>
						</I18nT>
					</N8nText>
				</span>
			</N8nButton>
		</KeyboardShortcutTooltip>
		<template v-if="selectableTriggerNodes.length > 1">
			<div role="presentation" :class="$style.divider" />
			<N8nActionDropdown
				:class="$style.menu"
				:items="actions"
				placement="top"
				@select="handleSelectTrigger"
			>
				<template #activator>
					<N8nButton size="large" :class="$style.chevron" icon="angle-down" />
				</template>
				<template #menuItem="item">
					<div :class="[$style.menuItem, item.disabled ? $style.disabled : '']">
						<NodeIcon :class="$style.menuIcon" :size="16" :node-type="getNodeTypeByName(item.id)" />
						<span>
							<I18nT keypath="nodeView.runButtonText.from">
								<template #nodeName>
									<N8nText bold size="small">{{ item.label }}</N8nText>
								</template>
							</I18nT>
						</span>
					</div>
				</template>
			</N8nActionDropdown>
		</template>
	</div>
</template>

<style lang="scss" module>
.component {
	display: flex;
	align-items: stretch;
}

.button {
	/* Disable animation of size and spacing when switching between split button and normal button */
	transition: none;

	.split & {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
		padding-block: var(--spacing-2xs);
	}
}

.divider {
	width: var(--border-width-base);
	background-color: var(--color-background-light);
}

.chevron {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
	padding-inline: var(--spacing-2xs);
}

.menu :global(.el-dropdown) {
	height: 100%;
}

.menuItem {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
}

.menuItem.disabled .menuIcon {
	opacity: 0.2;
}

.buttonContent {
	display: flex;
	flex-direction: column;
	align-items: flex-start !important;
	gap: var(--spacing-3xs);
}

.subText {
	font-size: var(--font-size-3xs);
}
</style>

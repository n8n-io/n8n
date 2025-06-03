<script setup lang="ts">
import { isChatNode } from '@/components/CanvasChat/utils';
import KeyboardShortcutTooltip from '@/components/KeyboardShortcutTooltip.vue';
import { type INodeUi } from '@/Interface';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { type ActionDropdownItem, N8nActionDropdown, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { type INodeTypeDescription } from 'n8n-workflow';
import { ref, computed } from 'vue';

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
}>();

const i18n = useI18n();
const typeStore = useNodeTypesStore();

const manuallySelectedTriggerNodeName = ref<string>();

const triggerNodes = computed(() => props.triggerNodes.filter((node) => !isChatNode(node)));
const selectableTriggerNodes = computed(() => triggerNodes.value.filter((node) => !node.disabled));
const selectedTriggerNode = computed(() =>
	manuallySelectedTriggerNodeName.value &&
	selectableTriggerNodes.value.some((node) => node.name === manuallySelectedTriggerNodeName.value)
		? manuallySelectedTriggerNodeName.value
		: getAutoSelectedTrigger()?.name,
);
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
	manuallySelectedTriggerNodeName.value = nodeName;
	emit('click', nodeName);
}

function getAutoSelectedTrigger() {
	return selectableTriggerNodes.value.find((node) => !node.disabled);
}

function getNodeTypeByName(name: string): INodeTypeDescription | null {
	const node = triggerNodes.value.find((trigger) => trigger.name === name);

	if (!node) {
		return null;
	}

	return typeStore.getNodeType(node.type, node.typeVersion);
}
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
					<span
						v-if="selectedTriggerNode && selectableTriggerNodes.length > 1"
						:class="$style.subText"
					>
						<I18nT keypath="nodeView.runButtonText.from">
							<template #nodeName>
								<b>{{ truncateBeforeLast(selectedTriggerNode, 25) }}</b>
							</template>
						</I18nT>
					</span>
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
									<b>{{ item.label }}</b>
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

.split .button {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	padding-block: var(--spacing-2xs);
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

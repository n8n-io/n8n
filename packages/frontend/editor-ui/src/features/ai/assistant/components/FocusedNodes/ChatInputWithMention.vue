<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import { N8nPromptInput, N8nIconButton, N8nIcon, N8nPopover } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeMention } from '../../composables/useNodeMention';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import NodeIcon from '@/app/components/NodeIcon.vue';
import NodeMentionDropdown from './NodeMentionDropdown.vue';
import FocusedNodeChip from './FocusedNodeChip.vue';

interface Props {
	modelValue?: string;
	placeholder?: string;
	disabled?: boolean;
	disabledTooltip?: string;
	streaming?: boolean;
	creditsQuota?: number;
	creditsRemaining?: number;
	showAskOwnerTooltip?: boolean;
	maxLength?: number;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: '',
	placeholder: '',
	disabled: false,
	disabledTooltip: undefined,
	streaming: false,
	creditsQuota: undefined,
	creditsRemaining: undefined,
	showAskOwnerTooltip: false,
	maxLength: undefined,
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	submit: [];
	stop: [];
	'upgrade-click': [];
}>();

const i18n = useI18n();
const focusedNodesStore = useFocusedNodesStore();
const nodeTypesStore = useNodeTypesStore();
const isFeatureEnabled = computed(() => focusedNodesStore.isFeatureEnabled);

function getNodeType(nodeTypeName: string) {
	return nodeTypesStore.getNodeType(nodeTypeName);
}

const inputRef = ref<InstanceType<typeof N8nPromptInput> | null>(null);
const textValue = ref(props.modelValue);

watch(
	() => props.modelValue,
	(newValue) => {
		textValue.value = newValue;
	},
);

watch(textValue, (newValue) => {
	emit('update:modelValue', newValue);
});

const {
	showDropdown,
	searchQuery,
	highlightedIndex,
	dropdownPosition,
	filteredNodes,
	openedViaButton,
	handleInput,
	handleKeyDown,
	selectNode,
	closeDropdown,
	openDropdown,
} = useNodeMention();

const confirmedNodeIds = computed(() => focusedNodesStore.confirmedNodeIds);
const confirmedNodes = computed(() => focusedNodesStore.confirmedNodes);
const unconfirmedNodes = computed(() => focusedNodesStore.filteredUnconfirmedNodes);
const hasConfirmedNodes = computed(() => confirmedNodes.value.length > 0);
const hasUnconfirmedNodes = computed(() => unconfirmedNodes.value.length > 0);
const confirmedCount = computed(() => confirmedNodes.value.length);
const unconfirmedCount = computed(() => unconfirmedNodes.value.length);

const shouldBundleConfirmed = computed(() => confirmedCount.value >= 4);
const shouldBundleUnconfirmed = computed(() => unconfirmedCount.value >= 4);
const individualConfirmedNodes = computed(() =>
	confirmedCount.value >= 1 && confirmedCount.value <= 3 ? confirmedNodes.value : [],
);
const individualUnconfirmedNodes = computed(() =>
	unconfirmedCount.value >= 1 && unconfirmedCount.value <= 3 ? unconfirmedNodes.value : [],
);

function handleChipClick(nodeId: string) {
	const node = focusedNodesStore.focusedNodesMap[nodeId];
	if (node?.state === 'confirmed') {
		canvasEventBus.emit('nodes:select', { ids: [nodeId], panIntoView: true });
	} else {
		const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
		focusedNodesStore.toggleNode(nodeId, isSelectedOnCanvas);
	}
}

function confirmAllUnconfirmed() {
	focusedNodesStore.confirmAllUnconfirmed();
}

function removeAllConfirmed() {
	focusedNodesStore.removeAllConfirmed();
}

function handleRemove(nodeId: string) {
	const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
	if (isSelectedOnCanvas) {
		focusedNodesStore.setState(nodeId, 'unconfirmed');
	} else {
		focusedNodesStore.removeNode(nodeId);
	}
}

function onInput(event: Event) {
	if (!isFeatureEnabled.value) {
		return;
	}
	const inputEvent = event as InputEvent;
	const target = event.target as HTMLTextAreaElement;
	if (target) {
		handleInput(inputEvent, target);
	}
}

function onKeyDown(event: KeyboardEvent) {
	const handled = handleKeyDown(event);
	if (handled) {
		event.preventDefault();
	}
}

function onSubmit() {
	if (!showDropdown.value) {
		emit('submit');
	}
}

function onStop() {
	emit('stop');
}

function onUpgradeClick() {
	emit('upgrade-click');
}

function handleDropdownKeyDown(event: KeyboardEvent) {
	handleKeyDown(event);
}

function handleDropdownSelect(node: { id: string; name: string; type: string }) {
	selectNode(node as Parameters<typeof selectNode>[0]);
	void nextTick(() => {
		focusInput();
	});
}

function handleSearchQueryUpdate(query: string) {
	searchQuery.value = query;
}

function handleClose() {
	closeDropdown(filteredNodes.value.length === 0);
}

function focusInput() {
	inputRef.value?.focusInput?.();
}

function handleMentionButtonClick(event: MouseEvent) {
	event.stopPropagation();
	const button = event.currentTarget as HTMLElement;
	if (button) {
		openDropdown(button, { viaButton: true, alignRight: true });
	}
}

defineExpose({
	focusInput,
});
</script>

<template>
	<div :class="$style.wrapper">
		<N8nPromptInput
			ref="inputRef"
			v-model="textValue"
			:placeholder="placeholder"
			:disabled="disabled"
			:disabled-tooltip="disabledTooltip"
			:streaming="streaming"
			:credits-quota="creditsQuota"
			:credits-remaining="creditsRemaining"
			:show-ask-owner-tooltip="showAskOwnerTooltip"
			:max-length="maxLength"
			:refocus-after-send="true"
			data-test-id="chat-input-with-mention"
			autofocus
			@input="onInput"
			@keydown="onKeyDown"
			@submit="onSubmit"
			@stop="onStop"
			@upgrade-click="onUpgradeClick"
		>
			<!-- Confirmed chips - inline with text input (only when feature enabled) -->
			<template v-if="isFeatureEnabled && hasConfirmedNodes" #inline-chips>
				<!-- Individual confirmed chips (1-3 nodes) -->
				<FocusedNodeChip
					v-for="node in individualConfirmedNodes"
					:key="node.nodeId"
					:node="node"
					@click="handleChipClick(node.nodeId)"
					@remove="handleRemove(node.nodeId)"
				/>
				<!-- Bundled confirmed chip (4+ nodes) with expandable popover -->
				<N8nPopover v-if="shouldBundleConfirmed" side="top" width="220px">
					<template #trigger>
						<span :class="$style.bundledConfirmedChip">
							<N8nIcon icon="layers" size="small" :class="$style.bundledConfirmedIcon" />
							<span>{{
								i18n.baseText('focusedNodes.nodesCount', {
									interpolate: { count: confirmedCount },
								})
							}}</span>
							<button type="button" :class="$style.removeButton" @click.stop="removeAllConfirmed">
								<N8nIcon icon="x" size="xsmall" />
							</button>
						</span>
					</template>
					<template #content>
						<div :class="$style.expandedNodeList">
							<div
								v-for="node in confirmedNodes"
								:key="node.nodeId"
								:class="$style.expandedNodeItem"
							>
								<NodeIcon :node-type="getNodeType(node.nodeType)" :size="12" />
								<span :class="$style.expandedNodeName">{{ node.nodeName }}</span>
								<button
									type="button"
									:class="$style.expandedRemoveButton"
									@click.stop="handleRemove(node.nodeId)"
								>
									<N8nIcon icon="x" size="xsmall" />
								</button>
							</div>
						</div>
					</template>
				</N8nPopover>
			</template>

			<!-- Mention button (only when feature enabled) -->
			<template v-if="isFeatureEnabled" #extra-actions>
				<N8nIconButton
					icon="at-sign"
					type="tertiary"
					size="small"
					:title="i18n.baseText('focusedNodes.mentionTooltip')"
					data-test-id="mention-node-button"
					@click="handleMentionButtonClick"
				/>
			</template>

			<!-- Unconfirmed chips - in bottom actions row (only when feature enabled) -->
			<template v-if="isFeatureEnabled && hasUnconfirmedNodes" #bottom-actions-chips>
				<!-- Individual unconfirmed chips (1-3 nodes) -->
				<FocusedNodeChip
					v-for="node in individualUnconfirmedNodes"
					:key="node.nodeId"
					:node="node"
					@click="handleChipClick(node.nodeId)"
					@remove="handleRemove(node.nodeId)"
				/>
				<!-- Bundled unconfirmed chip (4+ nodes) -->
				<button
					v-if="shouldBundleUnconfirmed"
					type="button"
					:class="$style.bundledUnconfirmedChip"
					@click="confirmAllUnconfirmed"
				>
					<N8nIcon icon="plus" size="xsmall" :class="$style.bundledUnconfirmedIcon" />
					<span>{{
						i18n.baseText('focusedNodes.nodesCount', { interpolate: { count: unconfirmedCount } })
					}}</span>
				</button>
			</template>
		</N8nPromptInput>

		<NodeMentionDropdown
			v-if="isFeatureEnabled && showDropdown"
			:nodes="filteredNodes"
			:selected-node-ids="confirmedNodeIds"
			:highlighted-index="highlightedIndex"
			:position="dropdownPosition"
			:search-query="searchQuery"
			:via-button="openedViaButton"
			@select="handleDropdownSelect"
			@highlight="highlightedIndex = $event"
			@keydown="handleDropdownKeyDown"
			@close="handleClose"
			@update:search-query="handleSearchQueryUpdate"
		/>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	width: 100%;
}

.overflowText {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	padding: var(--spacing--4xs) 0;
}

.bundledConfirmedChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background-color: var(--background--success);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	border: 1px solid var(--background--success);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
	white-space: nowrap;
}

.bundledConfirmedIcon {
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);
}

.removeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	min-height: 24px;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	color: var(--text-color--success);

	&:hover {
		/* stylelint-disable-next-line @n8n/css-var-naming */
		color: var(--text-color--success);
	}
}

.bundledUnconfirmedChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	font-style: italic;
	color: var(--color--text--tint-1);
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.bundledUnconfirmedIcon {
	color: var(--color--text--tint-1);
}

.expandedNodeList {
	padding: var(--spacing--4xs);
	max-height: 240px;
	overflow-y: auto;
}

.expandedNodeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.expandedNodeName {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1;
}

.expandedRemoveButton {
	display: flex;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	min-height: 24px;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--text--tint-2);

	&:hover {
		color: var(--color--text);
	}
}
</style>

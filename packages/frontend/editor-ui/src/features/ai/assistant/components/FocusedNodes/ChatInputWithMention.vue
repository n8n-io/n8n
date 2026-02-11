<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import { N8nPromptInput, N8nIconButton, N8nIcon, N8nPopover, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeMention } from '../../composables/useNodeMention';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import { useFocusedNodesChipUI } from '../../composables/useFocusedNodesChipUI';
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
const isFeatureEnabled = computed(() => focusedNodesStore.isFeatureEnabled);

const {
	confirmedNodes,
	unconfirmedNodes,
	confirmedCount,
	unconfirmedCount,
	allNodesConfirmed,
	allNodesUnconfirmed,
	shouldBundleConfirmed,
	shouldBundleUnconfirmed,
	individualConfirmedNodes,
	individualUnconfirmedNodes,
	getNodeType,
	handleChipClick,
	handleRemove,
} = useFocusedNodesChipUI();

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
const hasConfirmedNodes = computed(() => confirmedNodes.value.length > 0);
const hasUnconfirmedNodes = computed(() => unconfirmedNodes.value.length > 0);

function confirmAllUnconfirmed() {
	focusedNodesStore.confirmAllUnconfirmed();
}

function removeAllConfirmed() {
	focusedNodesStore.removeAllConfirmed();
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
	const handled = handleKeyDown(event);
	if (handled && (event.key === 'Enter' || event.key === 'Tab')) {
		void nextTick(() => {
			focusInput();
		});
	}
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
			<template v-if="isFeatureEnabled && hasConfirmedNodes" #inline-chips>
				<!-- All nodes confirmed: single "All nodes" chip -->
				<span v-if="allNodesConfirmed" :class="$style.bundledConfirmedChip">
					<span :class="$style.bundledIconWrapper">
						<N8nIcon icon="layers" size="small" :class="$style.bundledConfirmedIcon" />
						<button
							type="button"
							:class="$style.bundledRemoveButton"
							@click.stop="removeAllConfirmed"
						>
							<N8nIcon icon="x" size="small" />
						</button>
					</span>
					<span>{{ i18n.baseText('focusedNodes.allNodes') }}</span>
				</span>
				<!-- Individual confirmed chips (1-3 nodes, not all) -->
				<template v-else>
					<FocusedNodeChip
						v-for="node in individualConfirmedNodes"
						:key="node.nodeId"
						:node="node"
						@click="handleChipClick(node.nodeId)"
						@remove="handleRemove(node.nodeId)"
					/>
					<N8nPopover v-if="shouldBundleConfirmed" side="top" width="220px" :z-index="2000">
						<template #trigger>
							<span :class="$style.bundledConfirmedChip">
								<span :class="$style.bundledIconWrapper">
									<N8nIcon icon="layers" size="small" :class="$style.bundledConfirmedIcon" />
									<button
										type="button"
										:class="$style.bundledRemoveButton"
										@click.stop="removeAllConfirmed"
									>
										<N8nIcon icon="x" size="small" />
									</button>
								</span>
								<span>{{
									i18n.baseText('focusedNodes.nodesCount', {
										interpolate: { count: confirmedCount },
									})
								}}</span>
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
			</template>

			<!-- Extra actions: parent slot content + mention button -->
			<template v-if="isFeatureEnabled || $slots['extra-actions']" #extra-actions>
				<slot name="extra-actions" />
				<N8nIconButton
					v-if="isFeatureEnabled"
					icon="at-sign"
					type="tertiary"
					:text="true"
					size="small"
					:title="i18n.baseText('focusedNodes.mentionTooltip')"
					data-test-id="mention-node-button"
					@click="handleMentionButtonClick"
				/>
			</template>

			<!-- Unconfirmed chips - in bottom actions row (only when feature enabled) -->
			<template v-if="isFeatureEnabled && hasUnconfirmedNodes" #bottom-actions-chips>
				<!-- All nodes unconfirmed: single "All nodes" chip -->
				<N8nTooltip
					v-if="allNodesUnconfirmed"
					:content="i18n.baseText('focusedNodes.unconfirmedTooltip')"
					placement="top"
				>
					<button
						type="button"
						:class="$style.bundledUnconfirmedChip"
						@click="confirmAllUnconfirmed"
					>
						<N8nIcon icon="plus" size="xsmall" :class="$style.bundledUnconfirmedIcon" />
						<span>{{ i18n.baseText('focusedNodes.allNodes') }}</span>
					</button>
				</N8nTooltip>
				<template v-else>
					<!-- Individual unconfirmed chips (1-3 nodes) -->
					<FocusedNodeChip
						v-for="node in individualUnconfirmedNodes"
						:key="node.nodeId"
						:node="node"
						@click="handleChipClick(node.nodeId)"
						@remove="handleRemove(node.nodeId)"
					/>
					<!-- Bundled unconfirmed chip (4+ nodes) -->
					<N8nTooltip
						v-if="shouldBundleUnconfirmed"
						:content="i18n.baseText('focusedNodes.unconfirmedTooltip')"
						placement="top"
					>
						<button
							type="button"
							:class="$style.bundledUnconfirmedChip"
							@click="confirmAllUnconfirmed"
						>
							<N8nIcon icon="plus" size="xsmall" :class="$style.bundledUnconfirmedIcon" />
							<span>{{
								i18n.baseText('focusedNodes.nodesCount', {
									interpolate: { count: unconfirmedCount },
								})
							}}</span>
						</button>
					</N8nTooltip>
				</template>
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
	background-color: light-dark(var(--color--green-100), var(--color--green-900));
	border: 1px solid light-dark(var(--color--green-100), var(--color--green-900));
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: light-dark(var(--color--green-800), var(--color--green-200));
	white-space: nowrap;
	cursor: pointer;
}

.bundledIconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 14px;
	height: 14px;
}

.bundledConfirmedIcon {
	color: light-dark(var(--color--green-800), var(--color--green-200));

	.bundledConfirmedChip:hover & {
		display: none;
	}
}

.bundledRemoveButton {
	display: none;
	align-items: center;
	justify-content: center;
	min-width: 24px;
	min-height: 24px;
	margin: -5px;
	padding: 0;
	background: none;
	border: none;
	cursor: pointer;
	color: light-dark(var(--color--green-800), var(--color--green-200));

	.bundledConfirmedChip:hover & {
		display: flex;
	}
}

.bundledUnconfirmedChip {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
	height: 24px;
	padding: 0 var(--spacing--2xs);
	background-color: var(--color--background--light-3);
	border: 1px dashed light-dark(var(--color--foreground--shade-2), var(--color--foreground));
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	font-style: italic;
	color: light-dark(var(--color--foreground--shade-2), var(--color--text--tint-1));
	cursor: pointer;
	white-space: nowrap;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.bundledUnconfirmedIcon {
	color: light-dark(var(--color--foreground--shade-2), var(--color--text--tint-1));
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

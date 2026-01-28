<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nPromptInput, N8nIconButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeMention } from '../../composables/useNodeMention';
import { useFocusedNodesStore } from '../../focusedNodes.store';
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

const inputRef = ref<InstanceType<typeof N8nPromptInput> | null>(null);
const textValue = ref(props.modelValue);

// Sync with prop
watch(
	() => props.modelValue,
	(newValue) => {
		textValue.value = newValue;
	},
);

// Emit on change
watch(textValue, (newValue) => {
	emit('update:modelValue', newValue);
});

const {
	showDropdown,
	searchQuery,
	highlightedIndex,
	dropdownPosition,
	filteredNodes,
	handleInput,
	handleKeyDown,
	selectNode,
	closeDropdown,
	openDropdown,
} = useNodeMention();

const confirmedNodeIds = computed(() => focusedNodesStore.confirmedNodeIds);
const confirmedNodes = computed(() => focusedNodesStore.confirmedNodes);
const unconfirmedNodes = computed(() => focusedNodesStore.unconfirmedNodes);
const hasConfirmedNodes = computed(() => confirmedNodes.value.length > 0);
const hasUnconfirmedNodes = computed(() => unconfirmedNodes.value.length > 0);
const confirmedCount = computed(() => confirmedNodes.value.length);
const unconfirmedCount = computed(() => unconfirmedNodes.value.length);

// Bundling logic: show bundled chip when 2+ nodes
const shouldBundleConfirmed = computed(() => confirmedCount.value >= 2);
const shouldBundleUnconfirmed = computed(() => unconfirmedCount.value >= 2);
const singleConfirmedNode = computed(() =>
	confirmedCount.value === 1 ? confirmedNodes.value[0] : null,
);
const singleUnconfirmedNode = computed(() =>
	unconfirmedCount.value === 1 ? unconfirmedNodes.value[0] : null,
);

function handleChipClick(nodeId: string) {
	const isSelectedOnCanvas = focusedNodesStore.isNodeSelectedOnCanvas(nodeId);
	focusedNodesStore.toggleNode(nodeId, isSelectedOnCanvas);
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
}

function handleSearchQueryUpdate(query: string) {
	searchQuery.value = query;
}

function handleClose() {
	// Remove @query text if there are no matches when closing via click outside
	closeDropdown(filteredNodes.value.length === 0);
}

function focusInput() {
	inputRef.value?.focusInput?.();
}

function handleMentionButtonClick(event: MouseEvent) {
	// Stop propagation to prevent the click outside handler from immediately closing the dropdown
	event.stopPropagation();
	// Use the button element for positioning the dropdown
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
			<!-- Confirmed chips - inline with text input -->
			<template v-if="hasConfirmedNodes" #inline-chips>
				<!-- Single confirmed: show individual chip -->
				<FocusedNodeChip
					v-if="singleConfirmedNode"
					:node="singleConfirmedNode"
					@click="handleChipClick(singleConfirmedNode.nodeId)"
					@remove="handleRemove(singleConfirmedNode.nodeId)"
				/>
				<!-- Multiple confirmed: show bundled chip -->
				<span v-else-if="shouldBundleConfirmed" :class="$style.bundledConfirmedChip">
					<N8nIcon icon="layers" size="small" :class="$style.bundledConfirmedIcon" />
					<span>{{
						i18n.baseText('focusedNodes.nodesCount', { interpolate: { count: confirmedCount } })
					}}</span>
					<button type="button" :class="$style.removeButton" @click.stop="removeAllConfirmed">
						<N8nIcon icon="x" size="xsmall" />
					</button>
				</span>
			</template>

			<!-- Mention button -->
			<template #extra-actions>
				<N8nIconButton
					icon="at-sign"
					type="tertiary"
					size="small"
					:title="i18n.baseText('focusedNodes.mentionTooltip')"
					data-test-id="mention-node-button"
					@click="handleMentionButtonClick"
				/>
			</template>

			<!-- Unconfirmed chips - in bottom actions row -->
			<template v-if="hasUnconfirmedNodes" #bottom-actions-chips>
				<!-- Single unconfirmed: show individual chip -->
				<FocusedNodeChip
					v-if="singleUnconfirmedNode"
					:node="singleUnconfirmedNode"
					@click="handleChipClick(singleUnconfirmedNode.nodeId)"
					@remove="handleRemove(singleUnconfirmedNode.nodeId)"
				/>
				<!-- Multiple unconfirmed: show bundled chip -->
				<button
					v-else-if="shouldBundleUnconfirmed"
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
			v-if="showDropdown"
			:nodes="filteredNodes"
			:selected-node-ids="confirmedNodeIds"
			:highlighted-index="highlightedIndex"
			:position="dropdownPosition"
			:search-query="searchQuery"
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
	background-color: var(--color--green-100);
	border: 1px solid var(--color--green-100);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--green-800);
	white-space: nowrap;
}

.bundledConfirmedIcon {
	color: var(--color--green-800);
}

.removeButton {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0;
	margin-left: var(--spacing--4xs);
	background: none;
	border: none;
	cursor: pointer;
	color: var(--color--green-800);
	transition: color 0.15s ease;

	&:hover {
		color: var(--color--green-800);
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
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition: background-color 0.15s ease;
	white-space: nowrap;

	&:hover {
		background-color: var(--color--background--light-1);
	}
}

.bundledUnconfirmedIcon {
	color: var(--color--text--tint-1);
}
</style>

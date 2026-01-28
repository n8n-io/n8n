<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { N8nPromptInput } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useNodeMention } from '../../composables/useNodeMention';
import { useFocusedNodesStore } from '../../focusedNodes.store';
import NodeMentionDropdown from './NodeMentionDropdown.vue';

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
} = useNodeMention();

const confirmedNodeIds = computed(() => focusedNodesStore.confirmedNodeIds);

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
		/>

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
</style>

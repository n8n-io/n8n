<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import { N8nPromptInput, N8nIcon, N8nTooltip } from '@n8n/design-system';
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
	openDropdown,
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

function openMentionDropdown() {
	// Get the textarea element from the N8nPromptInput
	const promptInput = inputRef.value?.$el as HTMLElement | undefined;
	const textarea = promptInput?.querySelector('textarea');
	if (textarea) {
		// Insert @ at cursor position and open dropdown
		const start = textarea.selectionStart ?? textValue.value.length;
		const end = textarea.selectionEnd ?? textValue.value.length;
		const before = textValue.value.substring(0, start);
		const after = textValue.value.substring(end);
		textValue.value = `${before}@${after}`;

		// Focus and set cursor after @
		void nextTick(() => {
			textarea.focus();
			const newPosition = start + 1;
			textarea.setSelectionRange(newPosition, newPosition);
			openDropdown(textarea);
		});
	}
}

function handleDropdownKeyDown(event: KeyboardEvent) {
	handleKeyDown(event);
}

function handleDropdownSelect(node: { id: string; name: string; type: string }) {
	selectNode(node as Parameters<typeof selectNode>[0]);
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
		<N8nTooltip :content="i18n.baseText('focusedNodes.mentionTooltip')" placement="top">
			<button
				type="button"
				:class="$style.atButton"
				data-test-id="mention-button"
				@click="openMentionDropdown"
			>
				<N8nIcon icon="at-sign" :size="16" />
			</button>
		</N8nTooltip>

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
			@close="closeDropdown"
		/>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--4xs);
	width: 100%;
}

.atButton {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-top: var(--spacing--2xs);
	width: 28px;
	height: 28px;
	padding: 0;
	background: transparent;
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: 50%;
	color: var(--color--text--tint-1);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		color 0.15s ease;

	&:hover {
		border-color: var(--color--text--tint-1);
		color: var(--color--text);
	}
}
</style>

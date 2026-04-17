<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps<{
	anchor: Element;
	sending: boolean;
	channelAvailable: boolean;
}>();

const emit = defineEmits<{
	send: [prompt: string];
	copy: [prompt: string];
	cancel: [];
}>();

const prompt = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const anchorRect = ref<DOMRect>(props.anchor.getBoundingClientRect());

function updateAnchorRect() {
	anchorRect.value = props.anchor.getBoundingClientRect();
}

const popoverStyle = computed(() => {
	const rect = anchorRect.value;
	const popoverWidth = 360;
	const popoverHeightGuess = 180;
	const margin = 8;
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	let top = rect.bottom + margin;
	if (top + popoverHeightGuess > viewportHeight) {
		top = Math.max(margin, rect.top - popoverHeightGuess - margin);
	}

	let left = rect.left;
	if (left + popoverWidth > viewportWidth - margin) {
		left = Math.max(margin, viewportWidth - popoverWidth - margin);
	}

	return {
		top: `${top}px`,
		left: `${left}px`,
		width: `${popoverWidth}px`,
	};
});

function handleKeyDown(event: KeyboardEvent) {
	if (event.key === 'Escape') {
		event.preventDefault();
		emit('cancel');
		return;
	}
	if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
		event.preventDefault();
		handleSend();
	}
}

function handleSend() {
	const text = prompt.value.trim();
	if (!text || props.sending) return;
	emit('send', text);
}

function handleCopy() {
	const text = prompt.value.trim();
	if (!text) return;
	emit('copy', text);
}

onMounted(() => {
	void nextTick(() => textareaRef.value?.focus());
	window.addEventListener('resize', updateAnchorRect);
	window.addEventListener('scroll', updateAnchorRect, true);
});

watch(
	() => props.anchor,
	() => updateAnchorRect(),
);
</script>

<template>
	<div
		class="dev-panel-popover"
		:style="popoverStyle"
		role="dialog"
		aria-label="AI prompt"
		@keydown="handleKeyDown"
	>
		<textarea
			ref="textareaRef"
			v-model="prompt"
			class="dev-panel-textarea"
			placeholder="Describe the change. ⌘↵ to send, Esc to cancel."
			:disabled="sending"
			rows="4"
		/>
		<div class="dev-panel-actions">
			<button type="button" class="dev-panel-button" :disabled="sending" @click="emit('cancel')">
				Cancel
			</button>
			<button
				type="button"
				class="dev-panel-button"
				:disabled="!prompt.trim() || sending"
				title="Copy prompt + element context to clipboard"
				@click="handleCopy"
			>
				Copy
			</button>
			<button
				type="button"
				class="dev-panel-button dev-panel-button--primary"
				:disabled="!prompt.trim() || sending || !channelAvailable"
				:title="channelAvailable ? 'Send to Claude' : 'Claude channel not running'"
				@click="handleSend"
			>
				{{ sending ? 'Sending…' : 'Send' }}
			</button>
		</div>
	</div>
</template>

<style scoped>
.dev-panel-popover {
	position: fixed;
	z-index: 2147483646;
	background: var(--color--background);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 10px 30px rgb(0 0 0 / 18%);
	padding: var(--spacing--xs);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	color: var(--color--text);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.dev-panel-textarea {
	width: 100%;
	resize: vertical;
	padding: var(--spacing--2xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-3);
	color: var(--color--text);
	font-family: inherit;
	font-size: inherit;
	line-height: var(--line-height--md);
}

.dev-panel-textarea:focus {
	outline: 2px solid var(--color--primary);
	outline-offset: -2px;
}

.dev-panel-actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
}

.dev-panel-button {
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius);
	background: var(--color--background--light-2);
	color: var(--color--text);
	cursor: pointer;
	font-family: inherit;
	font-size: var(--font-size--xs);
}

.dev-panel-button:hover:not(:disabled) {
	background: var(--color--background--light-3);
}

.dev-panel-button:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.dev-panel-button--primary {
	background: var(--color--primary);
	border-color: var(--color--primary);
	color: var(--color--background);
}

.dev-panel-button--primary:hover:not(:disabled) {
	background: var(--color--primary--shade-1);
}
</style>

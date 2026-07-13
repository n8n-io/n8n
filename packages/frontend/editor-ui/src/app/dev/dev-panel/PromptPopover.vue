<script setup lang="ts">
import { N8nButton, N8nInput } from '@n8n/design-system';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = withDefaults(
	defineProps<{
		anchor: Element;
		initialPrompt?: string;
		isEditing?: boolean;
	}>(),
	{ initialPrompt: '', isEditing: false },
);

const emit = defineEmits<{
	add: [prompt: string];
	cancel: [];
}>();

const prompt = ref(props.initialPrompt);

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
		handleAdd();
	}
}

function handleFocus(event: FocusEvent) {
	const target = event.target as HTMLTextAreaElement | null;
	if (!target) return;
	const end = target.value.length;
	target.setSelectionRange(end, end);
}

function handleAdd() {
	const text = prompt.value.trim();
	if (!text) return;
	emit('add', text);
}

onMounted(() => {
	window.addEventListener('resize', updateAnchorRect);
	window.addEventListener('scroll', updateAnchorRect, true);
});

onUnmounted(() => {
	window.removeEventListener('resize', updateAnchorRect);
	window.removeEventListener('scroll', updateAnchorRect, true);
});

watch(
	() => props.anchor,
	() => updateAnchorRect(),
);

watch(
	() => props.initialPrompt,
	(value) => {
		prompt.value = value;
	},
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
		<N8nInput
			v-model="prompt"
			type="textarea"
			size="small"
			autofocus
			:rows="4"
			:placeholder="
				isEditing
					? 'Edit the annotation. ⌘↵ to save, Esc to cancel.'
					: 'Describe the change. ⌘↵ to add, Esc to cancel.'
			"
			@focus="handleFocus"
		/>
		<div class="dev-panel-actions">
			<N8nButton variant="outline" size="small" @click="emit('cancel')"> Cancel </N8nButton>
			<N8nButton
				variant="solid"
				size="small"
				:disabled="!prompt.trim()"
				:title="isEditing ? 'Save changes (⌘↵)' : 'Add to annotations list (⌘↵)'"
				@click="handleAdd"
			>
				{{ isEditing ? 'Save' : 'Add' }}
			</N8nButton>
		</div>
	</div>
</template>

<style scoped>
.dev-panel-popover {
	position: fixed;
	z-index: 2147483646;
	/* stylelint-disable-next-line @n8n/css-var-naming */
	background: var(--background--surface);
	border: var(--border);
	border-radius: var(--radius--lg);
	box-shadow: 0 10px 30px var(--color--black-alpha-300);
	padding: var(--spacing--xs);
	font-family: var(--font-family);
	font-size: var(--font-size--sm);
	color: var(--color--text--shade-1);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.dev-panel-actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--3xs);
}
</style>

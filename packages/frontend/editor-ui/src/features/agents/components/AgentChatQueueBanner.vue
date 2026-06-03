<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nIcon, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { QueuedMessage } from '../composables/useAgentChatStream';

const props = defineProps<{
	queue: QueuedMessage[];
}>();

const emit = defineEmits<{
	sendNow: [index: number];
	remove: [id: string];
	update: [id: string, text: string];
}>();

const expanded = ref(true);
const editingId = ref<string | null>(null);
const editText = ref('');
const i18n = useI18n();

const label = computed(() =>
	props.queue.length === 1
		? i18n.baseText('agents.chat.queue.count.singular')
		: i18n.baseText('agents.chat.queue.count.plural', {
				interpolate: { count: String(props.queue.length) },
			}),
);

function toggleExpanded() {
	expanded.value = !expanded.value;
}

function startEdit(msg: QueuedMessage) {
	editingId.value = msg.id;
	editText.value = msg.text;
}

function commitEdit(id: string) {
	const trimmed = editText.value.trim();
	if (trimmed) emit('update', id, trimmed);
	editingId.value = null;
}

function cancelEdit() {
	editingId.value = null;
}

function onEditKeydown(event: KeyboardEvent, id: string) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		commitEdit(id);
	} else if (event.key === 'Escape') {
		cancelEdit();
	}
}
</script>

<template>
	<div :class="$style.banner">
		<div :class="$style.header">
			<button
				:class="$style.chevronButton"
				type="button"
				:aria-expanded="expanded"
				@click="toggleExpanded"
			>
				<N8nIcon :icon="expanded ? 'chevron-down' : 'chevron-right'" size="small" />
				<span :class="$style.label">{{ label }}</span>
			</button>
		</div>

		<ul v-if="expanded" :class="$style.list">
			<li v-for="(msg, index) in queue" :key="msg.id" :class="$style.item">
				<template v-if="editingId === msg.id">
					<textarea
						v-model="editText"
						:class="$style.editInput"
						rows="2"
						autofocus
						@keydown="(e) => onEditKeydown(e, msg.id)"
					/>
					<div :class="$style.editActions">
						<N8nIconButton
							icon="check"
							size="small"
							variant="ghost"
							:title="i18n.baseText('agents.chat.queue.save')"
							@click="commitEdit(msg.id)"
						/>
						<N8nIconButton
							icon="x"
							size="small"
							variant="ghost"
							:title="i18n.baseText('agents.chat.queue.cancel')"
							@click="cancelEdit"
						/>
					</div>
				</template>
				<template v-else>
					<span :class="$style.itemText">{{ msg.text }}</span>
					<div :class="$style.itemActions">
						<N8nIconButton
							icon="trash-2"
							size="small"
							variant="ghost"
							:title="i18n.baseText('agents.chat.queue.remove')"
							@click="emit('remove', msg.id)"
						/>
						<N8nIconButton
							icon="pencil"
							size="small"
							variant="ghost"
							:title="i18n.baseText('agents.chat.queue.edit')"
							@click="startEdit(msg)"
						/>
						<N8nIconButton
							icon="arrow-up"
							size="small"
							variant="ghost"
							:title="i18n.baseText('agents.chat.queue.sendNow')"
							@click="emit('sendNow', index)"
						/>
					</div>
				</template>
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.banner {
	margin: 0 var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xs) var(--radius--xs) 0 0;
	border-bottom: none;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--3xs) var(--spacing--xs);
	gap: var(--spacing--xs);
}

.chevronButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	background: none;
	border: none;
	cursor: pointer;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	padding: 0;
}

.label {
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--normal);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
}

.list {
	list-style: none;
	padding: var(--spacing--3xs);
	border-top: var(--border);
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs);
	cursor: default;
	border-radius: var(--radius--2xs);

	&:hover {
		background-color: var(--background--hover);
	}
}

.itemText {
	flex: 1;
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--normal);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtle);
	white-space: pre-wrap;
	word-break: break-word;
}

.itemActions {
	display: flex;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
}

.editInput {
	flex: 1;
	resize: none;
	border: var(--border);
	border-radius: var(--radius--3xs);
	padding: var(--spacing--3xs);
	font-size: var(--font-size--sm);
	font-family: inherit;
	color: var(--text-color);
	background: var(--background--surface);

	&:focus {
		outline: none;
		border-color: var(--color--primary);
	}
}

.editActions {
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;
	flex-shrink: 0;
}
</style>

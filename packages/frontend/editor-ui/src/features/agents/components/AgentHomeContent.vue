<script setup lang="ts">
import { ref } from 'vue';
import { truncate } from '@n8n/utils';
import { N8nIcon, N8nIconPicker, N8nText } from '@n8n/design-system';
import type { IconOrEmoji } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';
import type { ExecutionThread } from '@/features/agents/composables/useAgentThreadsApi';

const locale = useI18n();

const props = withDefaults(
	defineProps<{
		agentName: string;
		agentDescription: string | null;
		agentIcon: IconOrEmoji;
		projectId: string;
		agentId: string;
		sessions?: ExecutionThread[];
		showRecent?: boolean;
	}>(),
	{
		showRecent: false,
	},
);

const emit = defineEmits<{
	'send-message': [message: string];
	'update:name': [name: string];
	'update:description': [description: string];
	'update:icon': [icon: IconOrEmoji];
	'select-session': [threadId: string];
}>();

function timeAgo(dateStr: string): string {
	const diff = Date.now() - new Date(dateStr).getTime();
	const minutes = Math.floor(diff / 60000);
	if (minutes < 1) return 'just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	return `${days}d ago`;
}

const inputText = ref('');
const editingName = ref(false);
const editingDescription = ref(false);
const localName = ref(props.agentName);
const localDescription = ref(props.agentDescription ?? '');

function saveName() {
	const trimmed = localName.value.trim();
	if (trimmed && trimmed !== props.agentName) {
		emit('update:name', trimmed);
	} else {
		localName.value = props.agentName;
	}
	editingName.value = false;
}

function saveDescription() {
	const trimmed = localDescription.value.trim();
	if (trimmed !== (props.agentDescription ?? '')) {
		emit('update:description', trimmed);
	}
	editingDescription.value = false;
}

function onNameKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter') {
		event.preventDefault();
		saveName();
	} else if (event.key === 'Escape') {
		localName.value = props.agentName;
		editingName.value = false;
	}
}

function onDescriptionKeydown(event: KeyboardEvent) {
	if (event.key === 'Enter' && !event.shiftKey) {
		event.preventDefault();
		saveDescription();
	} else if (event.key === 'Escape') {
		localDescription.value = props.agentDescription ?? '';
		editingDescription.value = false;
	}
}

function submitMessage() {
	if (!inputText.value.trim()) return;
	emit('send-message', inputText.value.trim());
	inputText.value = '';
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.hero">
			<div :class="$style.agentIcon">
				<N8nIconPicker
					:model-value="agentIcon"
					button-size="xlarge"
					:button-tooltip="locale.baseText('agents.home.iconPicker.tooltip')"
					@update:model-value="emit('update:icon', $event)"
				/>
			</div>

			<input
				v-if="editingName"
				v-model="localName"
				:class="$style.nameInput"
				autofocus
				@blur="saveName"
				@keydown="onNameKeydown"
			/>
			<h2
				v-else
				:class="$style.agentName"
				@click="
					localName = agentName;
					editingName = true;
				"
			>
				{{ agentName || locale.baseText('agents.home.untitledAgent') }}
			</h2>

			<textarea
				v-if="editingDescription"
				v-model="localDescription"
				:class="$style.descriptionInput"
				:placeholder="locale.baseText('agents.home.addDescription')"
				rows="3"
				autofocus
				@blur="saveDescription"
				@keydown="onDescriptionKeydown"
			/>
			<N8nText
				v-else
				:class="$style.description"
				size="small"
				color="text-light"
				@click="
					localDescription = agentDescription ?? '';
					editingDescription = true;
				"
			>
				{{ agentDescription || locale.baseText('agents.home.addDescription') }}
			</N8nText>
		</div>

		<div :class="$style.chatInput">
			<ChatInputBase
				v-model="inputText"
				:placeholder="locale.baseText('agents.home.sendMessage')"
				:is-streaming="false"
				:can-submit="inputText.trim().length > 0"
				:show-voice="true"
				:show-attach="true"
				@submit="submitMessage"
			/>
		</div>

		<div v-if="showRecent" :class="$style.recent">
			<div :class="$style.recentHeader">
				<N8nText size="small" color="text-light" bold
					>{{ locale.baseText('agents.home.recent') }}
				</N8nText>
			</div>
			<div v-if="!sessions?.length" :class="$style.emptyState">
				<N8nText size="small" color="text-light">
					{{ locale.baseText('agents.home.emptyState') }}
				</N8nText>
			</div>
			<div
				v-for="session in sessions"
				v-else
				:key="session.id"
				:class="$style.sessionItem"
				@click="emit('select-session', session.id)"
			>
				<span v-if="session.emoji" :class="$style.sessionEmoji">{{ session.emoji }}</span>
				<N8nIcon v-else icon="message-square" :class="$style.sessionIcon" />
				<span :class="$style.sessionText">
					<strong>{{ truncate(session.title ?? `Session ${session.sessionNumber}`, 30) }}</strong>
					<span v-if="session.firstMessage" :class="$style.sessionMessage">{{
						truncate(session.firstMessage, 60)
					}}</span>
				</span>
				<span :class="$style.sessionTime">{{ timeAgo(session.updatedAt) }}</span>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: var(--spacing--2xl) var(--spacing--lg) var(--spacing--lg);
	overflow-y: auto;
}

.hero {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-bottom: var(--spacing--lg);
}

.agentIcon {
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--2xs);

	> * > * :global(.button) {
		--button--color--background: transparent;
		--button--color--background-hover: var(--color--foreground--tint-2);
		--button--color--background-active: var(--color--foreground--tint-1);
		--button--shadow: none;
		--button--shadow--hover: none;
		--button--shadow--active: none;
		--button--border--shadow: none;
		--button--border--shadow--hover: none;
		--button--border--shadow--active: none;
	}
}

.agentName {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	margin: 0;
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
}

.agentName:hover {
	background-color: var(--color--foreground--tint-2);
}

.nameInput {
	font-size: var(--font-size--xl);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
	background: none;
	border: var(--border-width) var(--border-style) var(--color--primary);
	border-radius: var(--radius);
	padding: var(--spacing--4xs) var(--spacing--2xs);
	outline: none;
	text-align: center;
	font-family: var(--font-family);
}

.description {
	cursor: pointer;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	border-radius: var(--radius);
}

.description:hover {
	background-color: var(--color--foreground--tint-2);
}

.descriptionInput {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-1);
	background: none;
	border: var(--border-width) var(--border-style) var(--color--primary);
	border-radius: var(--radius);
	padding: var(--spacing--2xs) var(--spacing--xs);
	outline: none;
	font-family: var(--font-family);
	resize: vertical;
	min-width: 300px;
	line-height: var(--line-height--xl);
}

.chatInput {
	width: 100%;
	max-width: 600px;
	margin-bottom: var(--spacing--xl);
}

.recent {
	width: 100%;
	max-width: 600px;
}

.recentHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--3xs);
}

.emptyState {
	text-align: center;
	padding: var(--spacing--lg) 0;
}

.sessionItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--3xs) 0;
	border-radius: var(--radius--lg);
	cursor: pointer;
	transition: background-color 0.15s;

	&:hover {
		background-color: var(--color--foreground--tint-2);
	}
}

.sessionEmoji {
	font-size: var(--font-size--md);
	flex-shrink: 0;
}

.sessionIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.sessionText {
	flex: 1;
	min-width: 0;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sessionMessage {
	margin-left: var(--spacing--2xs);
}

.sessionTime {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	white-space: nowrap;
	flex-shrink: 0;
}
</style>

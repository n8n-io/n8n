<script setup lang="ts">
import { ref } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ChatInputBase from '@/features/ai/shared/components/ChatInputBase.vue';

const locale = useI18n();

const props = defineProps<{
	agentName: string;
	agentDescription: string | null;
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	'send-message': [message: string];
	'update:name': [name: string];
	'update:description': [description: string];
}>();

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
	if (event.key === 'Enter') {
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
				<N8nIcon icon="robot" :size="32" />
			</div>

			<input
				v-if="editingName"
				v-model="localName"
				:class="$style.nameInput"
				autofocus
				@blur="saveName"
				@keydown="onNameKeydown"
			/>
			<h2 v-else :class="$style.agentName" @click="editingName = true">
				{{ agentName || locale.baseText('agents.home.untitledAgent') }}
			</h2>

			<input
				v-if="editingDescription"
				v-model="localDescription"
				:class="$style.descriptionInput"
				:placeholder="locale.baseText('agents.home.addDescription')"
				autofocus
				@blur="saveDescription"
				@keydown="onDescriptionKeydown"
			/>
			<N8nText
				v-else
				:class="$style.description"
				size="small"
				color="text-light"
				@click="editingDescription = true"
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

		<div :class="$style.recent">
			<div :class="$style.recentHeader">
				<N8nText size="small" color="text-light" bold>{{
					locale.baseText('agents.home.recent')
				}}</N8nText>
			</div>
			<div :class="$style.emptyState">
				<N8nText size="small" color="text-light">
					{{ locale.baseText('agents.home.emptyState') }}
				</N8nText>
			</div>
		</div>
	</div>
</template>

<style module>
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
	width: 56px;
	height: 56px;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color--text--tint-1);
	margin-bottom: var(--spacing--2xs);
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
	padding: var(--spacing--4xs) var(--spacing--2xs);
	outline: none;
	text-align: center;
	font-family: var(--font-family);
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
	margin-bottom: var(--spacing--xs);
}

.emptyState {
	text-align: center;
	padding: var(--spacing--lg) 0;
}
</style>

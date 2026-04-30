<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentSseEvent } from '@n8n/api-types';

const props = defineProps<{
	projectId: string;
	agentId: string;
	initialMessage: string;
}>();

const emit = defineEmits<{
	done: [];
	configUpdated: [];
	'update:streaming': [streaming: boolean];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const MAX_LINES = 7;
const logLines = ref<string[]>([]);
const isStreaming = ref(false);
const hasError = ref(false);

function pushLine(line: string) {
	const trimmed = line.replace(/\s+/g, ' ').trim();
	if (!trimmed) return;
	logLines.value.push(trimmed);
	if (logLines.value.length > MAX_LINES) {
		logLines.value = logLines.value.slice(-MAX_LINES);
	}
}

interface StreamState {
	textBuffer: string;
	doneSeen: boolean;
}

function handleEvent(event: AgentSseEvent, state: StreamState): void {
	switch (event.type) {
		case 'text-delta': {
			state.textBuffer += event.delta;
			while (state.textBuffer.includes('\n')) {
				const idx = state.textBuffer.indexOf('\n');
				pushLine(state.textBuffer.slice(0, idx));
				state.textBuffer = state.textBuffer.slice(idx + 1);
			}
			break;
		}
		case 'tool-call': {
			if (state.textBuffer) {
				pushLine(state.textBuffer);
				state.textBuffer = '';
			}
			pushLine(`→ ${event.toolName}`);
			break;
		}
		case 'tool-result': {
			pushLine(`${event.isError ? '✗' : '✓'} ${event.toolName}`);
			break;
		}
		case 'config-updated':
		case 'tool-updated':
			emit('configUpdated');
			break;
		case 'error':
			hasError.value = true;
			pushLine(`Error: ${event.message}`);
			break;
		case 'done':
			state.doneSeen = true;
			break;
		default:
			break;
	}
}

async function streamBuild(message: string) {
	isStreaming.value = true;
	emit('update:streaming', true);

	const { baseUrl } = rootStore.restApiContext;
	const browserId = localStorage.getItem('n8n-browserId') ?? '';
	const url = `${baseUrl}/projects/${props.projectId}/agents/v2/${props.agentId}/build`;
	const state: StreamState = { textBuffer: '', doneSeen: false };

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'browser-id': browserId },
			credentials: 'include',
			body: JSON.stringify({ message }),
		});

		if (!response.ok || !response.body) {
			hasError.value = true;
			pushLine(`Error: ${response.statusText || 'Failed to reach builder'}`);
			return;
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		readerLoop: while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				let event: AgentSseEvent;
				try {
					event = JSON.parse(line.slice(6)) as AgentSseEvent;
				} catch {
					continue;
				}
				handleEvent(event, state);
				if (state.doneSeen) break readerLoop;
			}
		}

		if (state.textBuffer.trim()) pushLine(state.textBuffer);
	} catch (e) {
		hasError.value = true;
		pushLine(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
	} finally {
		isStreaming.value = false;
		emit('update:streaming', false);
		// Always hand off to the parent so suspended-tool streams (which close
		// without a final `done`) still route into the builder where the
		// interactive card can actually be answered. Distinguishing genuine
		// failure from suspension needs more thought — tracking separately.
		emit('done');
	}
}

onMounted(() => {
	void streamBuild(props.initialMessage);
});
</script>

<template>
	<div :class="$style.progress">
		<div :class="$style.centerColumn">
			<div :class="$style.spinner">
				<N8nIcon
					:icon="hasError ? 'triangle-alert' : 'spinner'"
					:size="40"
					:spin="!hasError && isStreaming"
				/>
			</div>
			<N8nText tag="p" bold size="large" :class="$style.heading">
				{{
					hasError
						? i18n.baseText('agents.builder.progress.error.title')
						: i18n.baseText('agents.builder.progress.building.title')
				}}
			</N8nText>
			<N8nText size="small" color="text-light" :class="$style.subheading">
				{{
					hasError
						? i18n.baseText('agents.builder.progress.error.hint')
						: i18n.baseText('agents.builder.progress.building.hint')
				}}
			</N8nText>

			<div :class="$style.logBox" aria-live="polite">
				<TransitionGroup name="builder-line" tag="div" :class="$style.logInner">
					<div v-for="(line, i) in logLines" :key="line + i" :class="$style.line">
						{{ line }}
					</div>
				</TransitionGroup>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.progress {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl) var(--spacing--xl);
	overflow: hidden;
}

.centerColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	max-width: 720px;
	gap: var(--spacing--2xs);
}

.spinner {
	color: var(--color--primary);
	margin-bottom: var(--spacing--sm);
}

.heading {
	margin: 0;
	color: var(--color--text);
}

.subheading {
	margin-bottom: var(--spacing--xl);
	text-align: center;
}

.logBox {
	width: 42ch;
	max-width: 100%;
	max-height: 140px;
	overflow: hidden;
	position: relative;
	/* Soft fade at the top so older lines visually dissolve */
	mask-image: linear-gradient(to bottom, transparent 0, black 32px, black 100%);
	-webkit-mask-image: linear-gradient(to bottom, transparent 0, black 32px, black 100%);
}

.logInner {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.line {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--xl);
	color: var(--color--text);
	text-align: center;
	max-width: 100%;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

:global(.builder-line-enter-active),
:global(.builder-line-leave-active) {
	transition:
		opacity 200ms ease,
		transform 200ms ease;
}
:global(.builder-line-enter-from) {
	opacity: 0;
	transform: translateY(4px);
}
:global(.builder-line-leave-to) {
	opacity: 0;
	transform: translateY(-4px);
}
:global(.builder-line-leave-active) {
	position: absolute;
}
</style>

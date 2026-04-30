<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { AgentSseEvent } from '@n8n/api-types';
import { formatToolNameForDisplay } from '../utils/toolDisplayName';

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
			pushLine(`→ ${formatToolNameForDisplay(event.toolName)}`);
			break;
		}
		case 'tool-result': {
			pushLine(`${event.isError ? '✗' : '✓'} ${formatToolNameForDisplay(event.toolName)}`);
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
			<div :class="$style.loader" aria-hidden="true">
				<N8nIcon v-if="hasError" icon="triangle-alert" :size="40" />
				<svg
					v-else
					:class="[$style.nodeLoader, isStreaming ? $style.nodeLoaderActive : '']"
					width="32"
					height="26"
					viewBox="0 0 32 26"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path pathLength="1" d="M4.8 13H8" />
					<path
						pathLength="1"
						d="M14.4 13H15.6C16.9 13 17.9 12.1 18.1 10.9L18.2 10.3C18.5 8.6 19.9 7.4 21.6 7.4H24"
					/>
					<path
						pathLength="1"
						d="M14.4 13H15.6C16.9 13 17.9 13.9 18.1 15.1L18.2 15.7C18.5 17.4 19.9 18.6 21.6 18.6H22.4"
					/>
					<circle pathLength="1" cx="3.2" cy="13" r="2.4" />
					<circle pathLength="1" cx="11.2" cy="13" r="2.4" />
					<circle pathLength="1" cx="27.2" cy="8.2" r="2.4" />
					<circle pathLength="1" cx="24" cy="17.8" r="2.4" />
				</svg>
			</div>
			<N8nText tag="h3" bold step="xl" :class="$style.heading">
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

.loader {
	color: #ea4b71;
	margin-bottom: var(--spacing--sm);
}

.nodeLoader {
	display: block;
	width: var(--spacing--3xl);
	height: auto;
	overflow: visible;
}

.nodeLoader path,
.nodeLoader circle {
	stroke: currentColor;
	stroke-width: 1.6;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-dasharray: 1;
	stroke-dashoffset: 1;
}

.nodeLoaderActive path,
.nodeLoaderActive circle {
	animation: drawNode 2400ms cubic-bezier(0.65, 0, 0.35, 1) infinite;
}

.nodeLoaderActive path:nth-of-type(1) {
	animation-delay: 0ms;
}

.nodeLoaderActive circle:nth-of-type(1) {
	animation-delay: 0ms;
}

.nodeLoaderActive path:nth-of-type(2) {
	animation-delay: 280ms;
}

.nodeLoaderActive path:nth-of-type(3) {
	animation-delay: 420ms;
}

.nodeLoaderActive circle:nth-of-type(2) {
	animation-delay: 200ms;
}

.nodeLoaderActive circle:nth-of-type(3) {
	animation-delay: 620ms;
}

.nodeLoaderActive circle:nth-of-type(4) {
	animation-delay: 760ms;
}

@keyframes drawNode {
	0% {
		stroke-dashoffset: 1;
		opacity: 0;
	}

	16% {
		stroke-dashoffset: 0;
		opacity: 1;
	}

	46% {
		stroke-dashoffset: 0;
		opacity: 1;
	}

	58% {
		stroke-dashoffset: -1;
		opacity: 0;
	}

	100% {
		stroke-dashoffset: -1;
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.nodeLoader path,
	.nodeLoader circle {
		animation: none;
		stroke-dashoffset: 0;
		opacity: 1;
	}
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

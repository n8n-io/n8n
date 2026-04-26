<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

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

async function streamBuild(message: string) {
	isStreaming.value = true;
	emit('update:streaming', true);

	const { baseUrl } = rootStore.restApiContext;
	const browserId = localStorage.getItem('n8n-browserId') ?? '';
	const url = `${baseUrl}/projects/${props.projectId}/agents/v2/${props.agentId}/build`;

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
		let textBuffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				let data: Record<string, unknown>;
				try {
					data = JSON.parse(line.slice(6)) as Record<string, unknown>;
				} catch {
					continue;
				}
				if (data.done) continue;

				if (typeof data.text === 'string') {
					textBuffer += data.text;
					while (textBuffer.includes('\n')) {
						const idx = textBuffer.indexOf('\n');
						pushLine(textBuffer.slice(0, idx));
						textBuffer = textBuffer.slice(idx + 1);
					}
				}

				if (data.toolCall && typeof data.toolCall === 'object') {
					if (textBuffer) {
						pushLine(textBuffer);
						textBuffer = '';
					}
					const tc = data.toolCall as { tool: string };
					pushLine(`→ ${tc.tool}`);
				}

				if (data.toolResult && typeof data.toolResult === 'object') {
					const tr = data.toolResult as { tool: string };
					pushLine(`✓ ${tr.tool}`);
				}

				if (data.configUpdated !== undefined || data.toolUpdated !== undefined) {
					emit('configUpdated');
				}

				if (typeof data.error === 'string') {
					hasError.value = true;
					pushLine(`Error: ${data.error}`);
				}
			}
		}

		if (textBuffer.trim()) pushLine(textBuffer);
	} catch (e) {
		hasError.value = true;
		pushLine(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
	} finally {
		isStreaming.value = false;
		emit('update:streaming', false);
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
	width: 100%;
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
	color: var(--color--text--tint-2);
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

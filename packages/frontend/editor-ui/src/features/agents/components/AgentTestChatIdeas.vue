<script setup lang="ts">
/**
 * Messages to try in an empty test chat. Asked for by a click, never on load,
 * because the ideas cost one model call on the agent's credential. Picking one
 * sends it; the person then judges the reply.
 */
import { ref } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';

import { suggestTestIdeas } from '../agentEvals.api';
import type { AgentTestIdea } from '../agentEvals.types';
import { useAgentTelemetry } from '../composables/useAgentTelemetry';

const props = defineProps<{
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	select: [prompt: string];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const agentTelemetry = useAgentTelemetry();

const ideas = ref<AgentTestIdea[] | null>(null);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

async function onAsk() {
	loading.value = true;
	errorMessage.value = null;
	try {
		const result = await suggestTestIdeas(rootStore.restApiContext, props.projectId, props.agentId);
		ideas.value = result.ideas;
		agentTelemetry.trackAskedForTestIdeas({
			agentId: props.agentId,
			ideaCount: result.ideas.length,
		});
	} catch (error) {
		errorMessage.value = error instanceof Error ? error.message : String(error);
	} finally {
		loading.value = false;
	}
}

function onPick(idea: AgentTestIdea) {
	agentTelemetry.trackPickedTestIdea({ agentId: props.agentId, kind: idea.kind });
	emit('select', idea.prompt);
}

function ideaTitle(idea: AgentTestIdea): string {
	return `${i18n.baseText(`agents.testChat.ideas.kind.${idea.kind}`)}: ${idea.why}`;
}
</script>

<template>
	<div :class="$style.ideas" data-testid="agent-test-ideas">
		<template v-if="ideas === null">
			<N8nText size="small" color="text-light" :class="$style.hint">
				{{ i18n.baseText('agents.testChat.ideas.hint') }}
			</N8nText>
			<N8nButton
				variant="outline"
				size="small"
				icon="sparkles"
				:loading="loading"
				:disabled="loading"
				data-testid="agent-test-ideas-ask"
				@click="onAsk"
			>
				{{
					errorMessage
						? i18n.baseText('agents.testChat.ideas.retry')
						: i18n.baseText('agents.testChat.ideas.ask')
				}}
			</N8nButton>
			<N8nText
				v-if="errorMessage"
				size="small"
				color="danger"
				role="alert"
				data-testid="agent-test-ideas-error"
			>
				{{
					i18n.baseText('agents.testChat.ideas.error', { interpolate: { message: errorMessage } })
				}}
			</N8nText>
		</template>
		<N8nText
			v-else-if="ideas.length === 0"
			size="small"
			color="text-light"
			data-testid="agent-test-ideas-empty"
		>
			{{ i18n.baseText('agents.testChat.ideas.empty') }}
		</N8nText>
		<div v-else :class="$style.chips">
			<!-- A plain button: N8nButton keeps its label on one line, and a prompt can run long. -->
			<button
				v-for="idea in ideas"
				:key="idea.kind"
				type="button"
				:title="ideaTitle(idea)"
				:class="$style.chip"
				data-testid="agent-test-idea"
				@click="onPick(idea)"
			>
				{{ idea.prompt }}
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.ideas {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	max-width: 32rem;
	box-sizing: border-box;
	margin-top: var(--spacing--sm);
	padding: 0 var(--spacing--sm);
	text-align: center;
}

.hint {
	max-width: 24rem;
}

.chips {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	gap: var(--spacing--2xs);
	width: 100%;
}

.chip {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius--lg);
	background: transparent;
	color: var(--text-color);
	font-family: inherit;
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
	text-align: left;
	overflow-wrap: anywhere;
	cursor: pointer;

	&:hover {
		background-color: var(--background--subtle);
		border-color: var(--border-color--strong);
	}

	&:focus-visible {
		outline: var(--focus--border-width, 2px) solid var(--color--primary);
		outline-offset: 2px;
	}
}
</style>

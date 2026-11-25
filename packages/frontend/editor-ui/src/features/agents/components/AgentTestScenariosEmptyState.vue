<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref, watch } from 'vue';

import { generateAgentTestScenarios } from '@/features/agents/composables/useAgentApi';

type ScenarioState = 'idle' | 'loading' | 'ready' | 'error';

const props = withDefaults(
	defineProps<{
		projectId: string;
		agentId: string;
		beforeGenerate?: () => Promise<void> | void;
		autoRun?: boolean;
	}>(),
	{
		beforeGenerate: undefined,
		autoRun: false,
	},
);

const emit = defineEmits<{
	select: [prompt: string];
	'auto-run-consumed': [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const state = ref<ScenarioState>('idle');
const scenarios = ref<string[]>([]);
const seenScenarios = ref<string[]>([]);
let requestVersion = 0;

function resetState() {
	requestVersion += 1;
	state.value = 'idle';
	scenarios.value = [];
	seenScenarios.value = [];
}

async function generate(different: boolean, options: { autoSelectFirst?: boolean } = {}) {
	if (state.value === 'loading') return;

	const currentRequest = ++requestVersion;
	const targetProjectId = props.projectId;
	const targetAgentId = props.agentId;
	const previousScenarios = different ? [...seenScenarios.value] : [];

	state.value = 'loading';

	try {
		await props.beforeGenerate?.();

		if (currentRequest !== requestVersion) return;

		const response = await generateAgentTestScenarios(
			rootStore.restApiContext,
			targetProjectId,
			targetAgentId,
			previousScenarios.length > 0 ? { previousScenarios } : {},
		);

		if (currentRequest !== requestVersion) return;

		if (response.scenarios.length === 0) {
			state.value = 'error';
			return;
		}

		scenarios.value = response.scenarios;
		seenScenarios.value = [...new Set([...seenScenarios.value, ...response.scenarios])];

		if (options.autoSelectFirst) {
			emit('select', response.scenarios[0]);
			return;
		}

		state.value = 'ready';
	} catch {
		if (currentRequest !== requestVersion) return;
		state.value = 'error';
	}
}

function selectScenario(scenario: string) {
	emit('select', scenario);
}

watch(
	[() => props.projectId, () => props.agentId],
	([nextProjectId, nextAgentId], [prevProjectId, prevAgentId]) => {
		if (nextProjectId !== prevProjectId || nextAgentId !== prevAgentId) {
			resetState();
		}
	},
);

watch(
	() => props.autoRun,
	(shouldAutoRun) => {
		if (!shouldAutoRun) return;

		emit('auto-run-consumed');
		void generate(false, { autoSelectFirst: true });
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.root" data-testid="agent-test-scenarios-empty-state">
		<template v-if="state === 'ready'">
			<N8nText tag="p" step="sm" color="text-dark" :class="$style.prompt">
				{{ i18n.baseText('agents.chat.testScenarios.selectPrompt') }}
			</N8nText>

			<div :class="$style.scenarioList" data-testid="agent-test-scenarios-list">
				<button
					v-for="(scenario, index) in scenarios"
					:key="`${index}-${scenario}`"
					type="button"
					:class="$style.scenarioRow"
					data-testid="agent-test-scenario-row"
					data-attr="agent-test-scenario-row"
					@click="selectScenario(scenario)"
				>
					{{ scenario }}
				</button>
			</div>

			<N8nButton
				variant="ghost"
				size="small"
				icon="sparkle"
				:class="$style.differentButton"
				data-testid="agent-test-scenarios-different-btn"
				data-attr="agent-test-scenarios-different-btn"
				@click="generate(true)"
			>
				{{ i18n.baseText('agents.chat.testScenarios.writeDifferent') }}
			</N8nButton>
		</template>

		<template v-else>
			<N8nText tag="p" step="sm" color="text-dark" :class="$style.prompt">
				{{ i18n.baseText('agents.chat.testScenarios.prompt') }}
			</N8nText>

			<div
				v-if="state === 'loading'"
				:class="$style.loadingRow"
				role="status"
				data-testid="agent-test-scenarios-loading"
			>
				<N8nIcon
					icon="loader-circle"
					spin
					size="medium"
					:class="$style.spinner"
					aria-hidden="true"
				/>
				<N8nText step="sm" color="text-light">
					{{ i18n.baseText('agents.chat.testScenarios.generating') }}
				</N8nText>
			</div>

			<template v-else>
				<N8nText
					v-if="state === 'error'"
					tag="p"
					step="sm"
					color="danger"
					role="alert"
					:class="$style.errorText"
					data-testid="agent-test-scenarios-error"
				>
					{{ i18n.baseText('agents.chat.testScenarios.error') }}
				</N8nText>

				<N8nButton
					variant="solid"
					size="medium"
					icon="sparkle"
					:class="$style.writeButton"
					data-testid="agent-test-scenarios-write-btn"
					data-attr="agent-test-scenarios-write-btn"
					@click="generate(false)"
				>
					{{ i18n.baseText('agents.chat.testScenarios.writeAction') }}
				</N8nButton>
			</template>
		</template>
	</div>
</template>

<style module lang="scss">
.root {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 100%;
	max-width: var(--agent-chat-max-width, 800px);
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--md);
}

.prompt {
	margin: 0;
	line-height: var(--line-height--xl);
}

.writeButton {
	border-radius: var(--radius--full);
}

.loadingRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.spinner {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.errorText {
	margin: 0;
}

.scenarioList {
	display: flex;
	flex-direction: column;
	width: 100%;
	border: var(--border);
	border-radius: var(--radius--sm);
	background-color: var(--background--surface);
	overflow: hidden;
}

.scenarioRow {
	width: 100%;
	padding: var(--spacing--xs) var(--spacing--sm);
	border: 0;
	border-bottom: var(--border);
	background-color: transparent;
	color: var(--color--text--shade-1);
	font: inherit;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);
	text-align: left;
	cursor: pointer;
	transition: background-color var(--duration--fast) var(--easing--ease-out);

	&:last-child {
		border-bottom: 0;
	}

	&:hover {
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: calc(-1 * var(--focus--border-width));
	}
}

.differentButton {
	margin-left: calc(-1 * var(--spacing--2xs));
	color: var(--color--text);
}
</style>

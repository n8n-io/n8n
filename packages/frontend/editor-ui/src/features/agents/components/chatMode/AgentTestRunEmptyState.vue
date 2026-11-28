<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { AgentJsonConfig } from '../../types';
import AgentPersonalisationIcon from '../AgentPersonalisationIcon.vue';

const props = withDefaults(
	defineProps<{
		agentConfig: AgentJsonConfig | null;
		agentName?: string;
		starterPrompts?: string[];
	}>(),
	{
		agentName: undefined,
		starterPrompts: undefined,
	},
);

const emit = defineEmits<{
	'select-prompt': [prompt: string];
}>();

const i18n = useI18n();

const resolvedName = computed(() => (props.agentConfig?.name || props.agentName || '').trim());

const title = computed(() =>
	resolvedName.value
		? i18n.baseText('agents.testRun.holdReplay.emptyState.title', {
				interpolate: { agentName: resolvedName.value },
			})
		: i18n.baseText('agents.testRun.holdReplay.emptyState.titleFallback'),
);

const chips = computed<string[]>(() => {
	if (props.starterPrompts && props.starterPrompts.length > 0) {
		return props.starterPrompts;
	}
	return [
		i18n.baseText('agents.testRun.holdReplay.emptyState.defaultStarter.summarize'),
		i18n.baseText('agents.testRun.holdReplay.emptyState.defaultStarter.draft'),
	];
});
</script>

<template>
	<div :class="$style.emptyState" data-testid="agent-test-run-empty-state">
		<div :class="$style.hero">
			<AgentPersonalisationIcon
				:personalisation="props.agentConfig?.personalisation"
				:class="$style.icon"
				:size="56"
			/>
			<N8nText tag="h3" step="xl" :class="$style.title" data-testid="agent-test-run-empty-title">
				{{ title }}
			</N8nText>
			<ul :class="$style.bullets" data-testid="agent-test-run-empty-bullets">
				<li :class="$style.bullet">
					<span :class="$style.bulletIcon" aria-hidden="true">
						<N8nIcon icon="check" :size="12" />
					</span>
					<span>{{ i18n.baseText('agents.testRun.holdReplay.emptyState.bulletReads') }}</span>
				</li>
				<li :class="$style.bullet">
					<span :class="$style.bulletIcon" aria-hidden="true">
						<N8nIcon icon="pause" :size="12" />
					</span>
					<span>{{ i18n.baseText('agents.testRun.holdReplay.emptyState.bulletHolds') }}</span>
				</li>
			</ul>
		</div>
		<div v-if="chips.length > 0" :class="$style.chips" data-testid="agent-test-run-starter-chips">
			<button
				v-for="(prompt, index) in chips"
				:key="`${index}-${prompt}`"
				type="button"
				:class="$style.chip"
				data-testid="agent-test-run-starter-chip"
				@click="emit('select-prompt', prompt)"
			>
				{{ prompt }}
			</button>
		</div>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

/* The hero sits in the middle of the free space. The starters stay by the composer. */
.emptyState {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-height: 100%;
	padding: var(--spacing--lg) var(--spacing--sm) var(--spacing--xs);
	box-sizing: border-box;
}

.hero {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;

	> * {
		@include motion.fade-in-up;
		animation-fill-mode: backwards;
	}

	> :nth-child(2) {
		animation-delay: 0.1s;
	}

	> :nth-child(3) {
		animation-delay: 0.2s;
	}
}

.icon {
	margin-bottom: var(--spacing--sm);
}

.title {
	margin: 0 0 var(--spacing--xs);
	font-weight: var(--font-weight--medium);
	text-wrap: balance;
}

.bullets {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
	text-align: start;
}

.bullet {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--md);
}

.bulletIcon {
	display: inline-flex;
	flex-shrink: 0;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	color: var(--text-color--subtle);
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
	padding-top: var(--spacing--md);
}

.chip {
	max-width: 100%;
	padding: var(--spacing--3xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--surface);
	color: var(--text-color);
	font: inherit;
	font-size: var(--font-size--xs);
	line-height: var(--line-height--md);
	text-align: start;
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background: var(--background--hover);
	}

	&:active {
		background: var(--background--active);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
		outline-offset: var(--spacing--5xs);
	}
}

@media (prefers-reduced-motion: reduce) {
	.hero > * {
		animation: none;
	}

	.chip {
		transition: none;
	}
}
</style>

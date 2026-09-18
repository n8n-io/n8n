<script lang="ts" setup>
/**
 * Welcome state for the agent builder's embedded assistant panel: says what the
 * assistant does to the agent (builds and configures it, rather than only
 * chatting about it) and offers examples that start a build in one click.
 */
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import type { InstanceAiPrefillDeclaration } from '../prefills';

/** Structurally matches what `InstanceAiInput` exposes as `submitSuggestion`. */
type AgentIntroSuggestionPayload = InstanceAiPrefillDeclaration & {
	promptKey: BaseTextKey;
	suggestionId: string;
	suggestionKind: 'prompt' | 'quick_example';
	position: number;
};

const EXAMPLES: ReadonlyArray<{ id: string; promptKey: BaseTextKey }> = [
	{ id: 'triage-tickets', promptKey: 'instanceAi.embed.agentIntro.examples.triageTickets' },
	{ id: 'summarize-standups', promptKey: 'instanceAi.embed.agentIntro.examples.summarizeStandups' },
	{ id: 'competitor-report', promptKey: 'instanceAi.embed.agentIntro.examples.competitorReport' },
];

const emit = defineEmits<{ select: [payload: AgentIntroSuggestionPayload] }>();

const i18n = useI18n();

function handleSelect(example: (typeof EXAMPLES)[number], index: number) {
	emit('select', {
		promptKey: example.promptKey,
		suggestionId: example.id,
		suggestionKind: 'quick_example',
		position: index + 1,
		prefillType: 'suggestion_catalog',
	});
}
</script>

<template>
	<div :class="$style.intro" data-test-id="instance-ai-agent-intro">
		<N8nHeading tag="h2" size="large" bold>
			{{ i18n.baseText('instanceAi.embed.agentIntro.title') }}
		</N8nHeading>
		<N8nText size="small" :class="$style.subtitle">
			{{ i18n.baseText('instanceAi.embed.agentIntro.subtitle') }}
		</N8nText>
		<div :class="$style.examples">
			<button
				v-for="(example, index) in EXAMPLES"
				:key="example.id"
				type="button"
				:class="$style.example"
				:data-test-id="`instance-ai-agent-intro-example-${example.id}`"
				@click="handleSelect(example, index)"
			>
				<N8nText size="small" :class="$style.exampleLabel">
					{{ i18n.baseText(example.promptKey) }}
				</N8nText>
				<span :class="$style.exampleArrow" aria-hidden="true">
					<N8nIcon icon="arrow-up" size="xsmall" />
				</span>
			</button>
		</div>
	</div>
</template>

<style lang="scss" module>
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.subtitle {
	color: var(--color--text--tint-1);
}

.examples {
	display: flex;
	flex-direction: column;
	margin-top: var(--spacing--xs);
}

.example {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) 0;
	border: 0;
	border-bottom: var(--border-width) dashed var(--border-color);
	background: transparent;
	color: var(--color--text);
	text-align: left;
	cursor: pointer;

	&:last-child {
		border-bottom: 0;
	}

	&:hover,
	&:focus-visible {
		.exampleArrow {
			border-color: var(--color--primary);
			color: var(--color--primary);
		}
	}
}

.exampleLabel {
	flex: 1;
	min-width: 0;
	font-weight: var(--font-weight--medium);
}

.exampleArrow {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	height: var(--spacing--md);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: 50%;
	color: var(--color--text--tint-1);
	transition:
		border-color 0.12s ease,
		color 0.12s ease;
}
</style>

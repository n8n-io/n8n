<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';

import {
	ensurePersonalProjectId,
	useInstanceAiHandoff,
} from '@/features/ai/instanceAi/composables/useInstanceAiHandoff';

const emit = defineEmits<{ 'write-own': [] }>();

const i18n = useI18n();
const instanceAiHandoff = useInstanceAiHandoff();
const isStartingThread = ref(false);

const steps = [
	{
		title: i18n.baseText('experiments.preferencesEmptyState.assistant.steps.read.title'),
		description: i18n.baseText(
			'experiments.preferencesEmptyState.assistant.steps.read.description',
		),
	},
	{
		title: i18n.baseText('experiments.preferencesEmptyState.assistant.steps.save.title'),
		description: i18n.baseText(
			'experiments.preferencesEmptyState.assistant.steps.save.description',
		),
	},
	{
		title: i18n.baseText('experiments.preferencesEmptyState.assistant.steps.review.title'),
		description: i18n.baseText(
			'experiments.preferencesEmptyState.assistant.steps.review.description',
		),
	},
];

async function suggestPreferences() {
	if (isStartingThread.value) return;
	isStartingThread.value = true;
	try {
		const projectId = await ensurePersonalProjectId();
		if (!projectId) return;
		await instanceAiHandoff.startThread(
			projectId,
			i18n.baseText('experiments.preferencesEmptyState.assistant.message'),
			{ kind: 'prefill', prefillType: 'preferences_suggestion' },
			{ source: 'preferences_empty_state', origin: 'internal' },
		);
	} finally {
		isStartingThread.value = false;
	}
}
</script>

<template>
	<div :class="$style.emptyState" data-test-id="preferences-empty-state-assistant">
		<N8nHeading tag="h2" size="medium" bold>
			{{ i18n.baseText('experiments.preferencesEmptyState.assistant.title') }}
		</N8nHeading>
		<N8nText tag="p" color="text-light" :class="$style.description">
			{{ i18n.baseText('experiments.preferencesEmptyState.assistant.description') }}
		</N8nText>
		<ol :class="$style.steps">
			<li
				v-for="(step, index) in steps"
				:key="step.title"
				:class="$style.step"
				data-test-id="preferences-empty-state-assistant-step"
			>
				<span :class="$style.stepNumber">{{ index + 1 }}</span>
				<div>
					<N8nText tag="p" size="small" bold>{{ step.title }}</N8nText>
					<N8nText tag="p" size="small" color="text-base">{{ step.description }}</N8nText>
				</div>
			</li>
		</ol>
		<div :class="$style.actions">
			<N8nButton
				:loading="isStartingThread"
				data-test-id="preferences-empty-state-suggest"
				@click="suggestPreferences"
			>
				<template #icon><N8nIcon icon="sparkles" /></template>
				{{ i18n.baseText('experiments.preferencesEmptyState.assistant.suggest') }}
			</N8nButton>
			<N8nButton
				variant="ghost"
				data-test-id="preferences-empty-state-write-own"
				@click="emit('write-own')"
			>
				{{ i18n.baseText('experiments.preferencesEmptyState.writeOwn') }}
			</N8nButton>
		</div>
	</div>
</template>

<style lang="scss" module>
.emptyState {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--2xl) var(--spacing--md);
	text-align: center;
}

.description {
	max-width: 34rem;
}

.steps {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	width: 100%;
	max-width: 42rem;
	margin: var(--spacing--2xs) 0 var(--spacing--4xs);
	padding: 0;
	list-style: none;
	border: var(--border);
	border-radius: var(--radius--xs);
	text-align: left;
}

.step {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	& + & {
		border-left: var(--border);
	}
}

.stepNumber {
	display: grid;
	flex: none;
	place-items: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	color: var(--text-color);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>

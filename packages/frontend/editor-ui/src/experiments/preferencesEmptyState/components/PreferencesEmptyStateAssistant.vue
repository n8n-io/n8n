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
	i18n.baseText('experiments.preferencesEmptyState.assistant.steps.review'),
	i18n.baseText('experiments.preferencesEmptyState.assistant.steps.suggest'),
	i18n.baseText('experiments.preferencesEmptyState.assistant.steps.apply'),
];

async function suggestPreferences() {
	if (isStartingThread.value) return;
	isStartingThread.value = true;
	try {
		const projectId = await ensurePersonalProjectId();
		if (!projectId) return;
		await instanceAiHandoff.openThreadWithDraft(
			projectId,
			{
				text: i18n.baseText('experiments.preferencesEmptyState.assistant.message'),
				prefillType: 'preferences_suggestion',
			},
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
		<ol :class="$style.steps">
			<li
				v-for="(step, index) in steps"
				:key="step"
				:class="$style.step"
				data-test-id="preferences-empty-state-assistant-step"
			>
				<span :class="$style.stepNumber">{{ index + 1 }}</span>
				<N8nText>{{ step }}</N8nText>
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
	gap: var(--spacing--lg);
	padding: var(--spacing--2xl) var(--spacing--md);
}

.steps {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.step {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.stepNumber {
	display: grid;
	flex: none;
	place-items: center;
	width: var(--height--xs);
	height: var(--height--xs);
	border: var(--border);
	border-radius: var(--radius--full);
	background: var(--background--subtle);
	color: var(--text-color);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>

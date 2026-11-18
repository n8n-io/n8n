<script setup lang="ts">
import {
	N8nButton,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nText,
	N8nTooltip,
	type EmptyStateIconCards,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** The Tests tab of a workflow without a test file: an invitation, or the Assistant at work. */
defineProps<{
	isAssistantWorking: boolean;
	canGenerate: boolean;
}>();

const emit = defineEmits<{
	generate: [];
	write: [];
}>();

const i18n = useI18n();

const ICON: EmptyStateIconCards = {
	type: 'cards',
	center: 'flask-conical',
	sides: ['circle-check', 'sparkles', 'circle-x'],
};
</script>

<template>
	<div :class="$style.container">
		<div
			v-if="isAssistantWorking"
			:class="$style.working"
			role="status"
			data-testid="workflow-tests-generating"
		>
			<N8nHeading tag="h2" size="medium" :class="$style.workingTitle">
				<N8nIcon icon="sparkles" />
				<span :class="$style.shimmer">{{ i18n.baseText('workflowTests.generating.title') }}</span>
			</N8nHeading>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('workflowTests.generating.description') }}
			</N8nText>
			<N8nLoading :rows="4" :class="$style.skeleton" />
		</div>

		<N8nEmptyState
			v-else
			:icon="ICON"
			:heading="i18n.baseText('workflowTests.empty.title')"
			:description="i18n.baseText('workflowTests.empty.description')"
			data-testid="workflow-tests-empty"
		>
			<template #additionalContent>
				<div :class="$style.actions">
					<N8nTooltip
						:disabled="canGenerate"
						:content="i18n.baseText('workflowTests.generate.unavailable')"
					>
						<N8nButton
							variant="brand"
							:disabled="!canGenerate"
							data-testid="workflow-tests-generate"
							data-attr="workflow-tests-generate"
							@click="emit('generate')"
						>
							<template #icon><N8nIcon icon="sparkles" /></template>
							{{ i18n.baseText('workflowTests.generate') }}
						</N8nButton>
					</N8nTooltip>
					<N8nButton variant="outline" data-testid="workflow-tests-write" @click="emit('write')">
						{{ i18n.baseText('workflowTests.empty.write') }}
					</N8nButton>
				</div>
			</template>
		</N8nEmptyState>
	</div>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';

.container {
	width: 100%;
	// No size token fits a reading column.
	max-width: 40rem;
	margin: var(--spacing--2xl) auto 0;
}

.actions {
	display: flex;
	gap: var(--spacing--xs);
}

.working {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.workingTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	color: var(--color--primary);
}

.shimmer {
	--animation--shimmer--background: var(--color--text--shade-1);
	--animation--shimmer--foreground: var(--color--text--tint-1);

	@include motion.shimmer;
}

.skeleton {
	margin-top: var(--spacing--sm);
}
</style>

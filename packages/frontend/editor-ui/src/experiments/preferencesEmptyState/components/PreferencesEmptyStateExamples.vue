<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nHeading } from '@n8n/design-system';

const emit = defineEmits<{ 'write-own': [] }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.emptyState" data-test-id="preferences-empty-state-examples">
		<N8nHeading tag="h2" size="medium" bold>
			{{ i18n.baseText('experiments.preferencesEmptyState.examples.title') }}
		</N8nHeading>
		<N8nButton
			variant="ghost"
			:label="i18n.baseText('experiments.preferencesEmptyState.writeOwn')"
			data-test-id="preferences-empty-state-write-own"
			@click="emit('write-own')"
		/>
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
</style>

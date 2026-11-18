<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const emit = defineEmits<{ fix: [] }>();

const i18n = useI18n();
</script>

<template>
	<N8nButton
		variant="outline"
		size="small"
		:class="$style.button"
		:label="i18n.baseText('publishJudge.fix.action')"
		data-test-id="publish-judge-fix"
		@click="emit('fix')"
	>
		<template #prefix>
			<N8nIcon icon="n8n-assistant" :size="12" />
		</template>
	</N8nButton>
</template>

<style lang="scss" module>
.button {
	margin-top: var(--spacing--xs);
}
</style>

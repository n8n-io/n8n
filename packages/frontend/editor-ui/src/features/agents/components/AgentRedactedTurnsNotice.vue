<script setup lang="ts">
import { N8nButton, N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

/** Tells the reader that some turns of the session are redacted for them. */
defineProps<{
	canReveal: boolean;
	revealing?: boolean;
}>();

const emit = defineEmits<{
	reveal: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nCallout theme="secondary" icon="lock" slim data-test-id="agent-session-redacted-notice">
		{{ i18n.baseText('agentSessions.timeline.redactedNotice') }}
		<template v-if="canReveal" #trailingContent>
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('ndv.redacted.revealButton')"
				:loading="revealing"
				data-test-id="agent-session-reveal-data"
				@click="emit('reveal')"
			/>
		</template>
	</N8nCallout>
</template>

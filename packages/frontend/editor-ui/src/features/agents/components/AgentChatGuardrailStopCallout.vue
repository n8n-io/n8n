<script setup lang="ts">
import { N8nCallout } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	guardrailStopLabelKey,
	guardrailStopType,
	type GuardrailStop,
} from '../utils/guardrail-stop';

const props = defineProps<{
	stop: GuardrailStop;
}>();

const i18n = useI18n();

const label = computed(() =>
	i18n.baseText(guardrailStopLabelKey(props.stop), {
		interpolate: { type: i18n.baseText(guardrailStopType(props.stop)) },
	}),
);
</script>

<template>
	<N8nCallout
		theme="info"
		icon="crosshair"
		:class="$style.blue"
		data-test-id="agent-chat-guardrail-stop-callout"
	>
		{{ label }}
	</N8nCallout>
</template>

<style module lang="scss">
/* The guardrail-blue theme, built from the shared semantic info palette so
   light and dark modes both stay blue. Scoped here until a second surface
   wants it; then it moves to the design system as a named callout theme. */
.blue {
	--callout--border-color--info: var(--border-color--info);
	--callout--color--background--info: var(--background--info);
	--callout--color--text--info: var(--text-color--info);
	--callout--icon-color--info: var(--icon-color--info);
}
</style>

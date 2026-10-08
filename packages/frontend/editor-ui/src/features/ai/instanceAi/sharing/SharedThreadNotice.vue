<script setup lang="ts">
/** Takes the place of the composer for a teammate: only the owner sends messages to a shared chat. */
import { N8nNotice } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSharingText } from './useSharingText';

defineProps<{
	ownerName: string;
}>();

const i18n = useI18n();
const text = useSharingText();
</script>

<template>
	<N8nNotice theme="info" :class="$style.notice" data-test-id="instance-ai-shared-thread-notice">
		{{
			i18n.baseText('instanceAi.sharing.composerNotice', {
				interpolate: { owner: text.owner(ownerName) },
			})
		}}
	</N8nNotice>
</template>

<style lang="scss" module>
// The composer column has its own padding, so the notice needs no outer space of its own.
.notice {
	--notice--margin: 0;
}
</style>

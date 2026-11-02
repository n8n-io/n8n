<script setup lang="ts">
import type { SlotInstanceAiAppChatProps } from '@n8n/frontend-module-sdk';
import { N8nHeading, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, watch } from 'vue';

import { useInstanceAiReady } from '../composables/useInstanceAiAvailability';
import InstanceAiChatPanel from './InstanceAiChatPanel.vue';
import type { InstanceAiEmbedSubject } from './instanceAiEmbed.types';

const props = defineProps<SlotInstanceAiAppChatProps>();
const i18n = useI18n();

const emit = defineEmits<{
	'update:threadId': [threadId: string];
	'update:available': [available: boolean];
	close: [];
	updated: [];
}>();

const ready = useInstanceAiReady();
const subject = computed<InstanceAiEmbedSubject>(() => ({
	type: 'app',
	id: props.appId,
	projectId: props.projectId,
	...(props.appName ? { name: props.appName } : {}),
	...(props.pending ? { pending: true } : {}),
}));
const launch = computed(() => ({
	source: 'app_builder_page' as const,
	origin: 'internal' as const,
	sourceContext: { appId: props.appId },
}));

let wasWorking = false;
function onWorking(working: boolean) {
	if (working) {
		wasWorking = true;
	} else if (wasWorking) {
		wasWorking = false;
		emit('updated');
	}
}

watch(ready, (available) => emit('update:available', available), { immediate: true });
</script>

<template>
	<InstanceAiChatPanel
		v-if="ready"
		:subject="subject"
		:launch="launch"
		:thread-id="threadId"
		:show-open-full-assistant="false"
		data-test-id="instance-ai-app-chat"
		@update:thread-id="emit('update:threadId', $event)"
		@update:working="onWorking"
		@close="emit('close')"
	>
		<template v-if="pending" #empty>
			<div :class="$style.intro">
				<N8nHeading size="xlarge">{{ i18n.baseText('apps.assistant.intro.heading') }}</N8nHeading>
				<N8nText color="text-light">{{
					i18n.baseText('apps.assistant.intro.description')
				}}</N8nText>
			</div>
		</template>
	</InstanceAiChatPanel>
</template>

<style lang="scss" module>
.intro {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--lg);
	text-align: center;
}
</style>

<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import WouldHaveHappenedCard from './WouldHaveHappenedCard.vue';
import WouldHaveHappenedField from './WouldHaveHappenedField.vue';
import WouldHaveHappenedText from './WouldHaveHappenedText.vue';
import type { WouldHaveHappenedChatMessagePreview } from './wouldHaveHappened.types';
import { presentText } from './wouldHaveHappened.utils';

const props = defineProps<{
	preview: WouldHaveHappenedChatMessagePreview;
}>();

const i18n = useI18n();

const channel = computed(() => presentText(props.preview.channel)?.trim());
const recipient = computed(() => presentText(props.preview.recipient)?.trim());
const text = computed(() => presentText(props.preview.text));

const isEmpty = computed(() => !channel.value && !recipient.value && !text.value);
</script>

<template>
	<WouldHaveHappenedCard
		:preview="preview"
		:heading="i18n.baseText('agents.testRun.preview.kind.chatMessage')"
		icon="message-square"
		:empty="isEmpty"
	>
		<dl v-if="channel || recipient" :class="$style.fields">
			<WouldHaveHappenedField
				v-if="channel"
				:label="i18n.baseText('agents.testRun.preview.field.channel')"
			>
				{{ channel }}
			</WouldHaveHappenedField>
			<WouldHaveHappenedField
				v-if="recipient"
				:label="i18n.baseText('agents.testRun.preview.field.to')"
			>
				{{ recipient }}
			</WouldHaveHappenedField>
		</dl>
		<WouldHaveHappenedText v-if="text" :text="text" />
	</WouldHaveHappenedCard>
</template>

<style module lang="scss">
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
}
</style>

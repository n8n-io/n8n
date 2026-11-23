<script setup lang="ts">
/**
 * The details of an approval card that the "Approve for me" mode showed: the
 * description of the action, then why the review asked.
 */
import type { InstanceAiApprovalAskReason } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	reason: InstanceAiApprovalAskReason;
	description?: string;
}>();

const i18n = useI18n();

/** The judge explains its own decision. Each fixed cause has one text. */
const reasonText = computed(() => {
	switch (props.reason.kind) {
		case 'judge':
			return props.reason.text;
		case 'always-ask':
			return i18n.baseText('instanceAi.approvalAskReason.alwaysAsk');
		case 'too-long':
			return i18n.baseText('instanceAi.approvalAskReason.tooLong');
		case 'judge-failed':
			return i18n.baseText('instanceAi.approvalAskReason.judgeFailed');
	}
});
</script>

<template>
	<div>
		<N8nText v-if="description" step="sm" :class="$style.description">{{ description }}</N8nText>
		<N8nText
			tag="p"
			step="sm"
			color="text-light"
			:class="$style.reason"
			data-test-id="approval-ask-reason"
		>
			{{ reasonText }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
/* The card shows its default description in the same way: plain text that keeps its line breaks. */
.description {
	white-space: pre-line;
}

.reason {
	margin: 0;
}

.description + .reason {
	margin-top: var(--spacing--2xs);
}
</style>

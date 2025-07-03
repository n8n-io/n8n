<script setup lang="ts">
import { useI18n } from '@n8n/design-system/composables/useI18n';

import BaseWorkflowMessage from './BaseWorkflowMessage.vue';
import type { ChatUI } from '../../../../types/assistant';

interface Props {
	message: (ChatUI.WorkflowGeneratedMessage | ChatUI.WorkflowUpdatedMessage) & {
		id: string;
		read: boolean;
	};
	isFirstOfRole: boolean;
	user?: {
		firstName: string;
		lastName: string;
	};
}

defineProps<Props>();
const { t } = useI18n();
</script>

<template>
	<BaseWorkflowMessage :message="message" :is-first-of-role="isFirstOfRole" :user="user">
		Workflow Updated
	</BaseWorkflowMessage>
</template>

<style lang="scss" module>
.code {
	white-space: pre-wrap;
}
</style>
